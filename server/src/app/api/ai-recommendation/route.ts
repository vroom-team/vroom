import { errorHandler } from "@/server/helpers/ErrorHandler"
import { NextRequest } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import AiRecommendation from "@/server/models/Ai"

// Types
interface RecommendationRequest {
    location: string
    budget?: string
    duration?: string
    interests?: string
    travelType?: string
    userId?: string
}

interface AIResponse {
    recommendations: Array<{
        name: string
        description: string
        location: string
        category: string
        estimatedCost: string
        rating: number
        highlights: string[]
    }>
    summary: string
    tips: string[]
}

// Helper functions
function validateRequestBody(body: RecommendationRequest): RecommendationRequest {
    if (!body.location || body.location.trim() === '') {
        throw new Error("Location is required and cannot be empty")
    }
    return body
}

function determineCategory(interests?: string): string {
    if (!interests) return "all"
    
    const interestsLower = interests.toLowerCase()
    if (interestsLower.includes("alam")) return "wisata_alam"
    if (interestsLower.includes("budaya")) return "wisata_budaya"
    if (interestsLower.includes("kuliner")) return "kuliner"
    if (interestsLower.includes("belanja")) return "belanja"
    if (interestsLower.includes("hiburan")) return "hiburan"
    return "all"
}

function createPrompt(request: RecommendationRequest): string {
    return `
        Anda adalah asisten rekomendasi wisata Indonesia yang berpengalaman.

        Berikan rekomendasi tempat wisata untuk:
        - Lokasi: ${request.location}
        - Budget: ${request.budget || 'Bervariasi'}
        - Durasi: ${request.duration || 'Fleksibel'}
        - Minat: ${request.interests || 'Umum'}
        - Tipe perjalanan: ${request.travelType || 'Wisata umum'}

        Berikan 5-7 rekomendasi tempat wisata yang sesuai. Format response dalam JSON yang valid:

        {
            "recommendations": [
                {
                    "name": "Nama tempat wisata",
                    "description": "Deskripsi singkat tempat (maksimal 100 kata)",
                    "location": "Alamat spesifik",
                    "category": "wisata_alam",
                    "estimatedCost": "Rp 50.000 - 100.000",
                    "rating": 4.5,
                    "highlights": ["Pemandangan indah", "Spot foto", "Kuliner khas"]
                }
            ],
            "summary": "Ringkasan rekomendasi dalam 1-2 kalimat",
            "tips": ["Tips praktis 1", "Tips praktis 2", "Tips praktis 3"]
        }

        Pastikan JSON valid, tanpa karakter tambahan di luar JSON.
    `
}

function createFallbackResponse(request: RecommendationRequest, category: string): AIResponse {
    return {
        recommendations: [
            {
                name: `Destinasi Wisata di ${request.location}`,
                description: `Berbagai pilihan tempat wisata menarik di ${request.location} yang cocok untuk ${request.travelType || 'wisata umum'}.`,
                location: request.location,
                category: category,
                estimatedCost: request.budget === "murah" ? "Rp 25.000 - 75.000" : 
                             request.budget === "sedang" ? "Rp 75.000 - 150.000" :
                             request.budget === "mahal" ? "Rp 150.000 - 300.000" : "Bervariasi",
                rating: 4.2,
                highlights: ["Destinasi populer", "Mudah diakses", "Cocok untuk keluarga"]
            }
        ],
        summary: `Rekomendasi wisata di ${request.location} dengan budget ${request.budget || 'bervariasi'} dan durasi ${request.duration || 'fleksibel'}.`,
        tips: [
            "Cek cuaca sebelum berangkat",
            "Siapkan budget tambahan untuk keperluan tak terduga", 
            "Datang lebih pagi untuk menghindari keramaian"
        ]
    }
}

async function parseRequestBody(req: NextRequest): Promise<RecommendationRequest> {
    const contentType = req.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
        throw new Error("Content-Type must be application/json")
    }

    const body = await req.text()
    if (!body || body.trim() === '') {
        throw new Error("Request body is empty")
    }

    const requestData = JSON.parse(body)
    return validateRequestBody(requestData)
}

async function generateAIRecommendation(request: RecommendationRequest): Promise<AIResponse> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("AI service not configured properly")
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    
    const prompt = createPrompt(request)
    const result = await model.generateContent(prompt)
    const response = await result.response
    let text = response.text()

    // Clean and parse response
    text = text.replace(/```json|```/g, '').trim()
    
    try {
        const parsedResponse = JSON.parse(text)
        
        // Validate structure
        if (!parsedResponse.recommendations || !Array.isArray(parsedResponse.recommendations)) {
            throw new Error("Invalid AI response structure")
        }
        
        return parsedResponse
    } catch (parseError) {
        console.error("Parse Error:", parseError)
        console.log("Failed to parse text:", text.substring(0, 500))
        
        const category = determineCategory(request.interests)
        return createFallbackResponse(request, category)
    }
}

async function saveToDatabase(request: RecommendationRequest, response: AIResponse, category: string) {
    try {
        const recommendationData = {
            userId: request.userId,
            location: request.location.trim(),
            category: category,
            budget: request.budget,
            duration: request.duration,
            prompt: `Location: ${request.location}, Budget: ${request.budget}, Duration: ${request.duration}, Interests: ${request.interests}, Travel Type: ${request.travelType}`,
            response: response,
            isPublic: true
        }

        const savedRecommendation = await AiRecommendation.create(recommendationData)
        console.log("Saved to database successfully")
        return savedRecommendation
    } catch (dbError) {
        console.error("Database Save Error:", dbError)
        return null
    }
}

// API Routes
export async function POST(req: NextRequest) {
    try {
        console.log("Processing AI recommendation request...")

        // Get userId from middleware (if user is authenticated)
        const userId = req.headers.get('x-user-id')
        console.log("User ID from middleware:", userId)

        // Parse and validate request
        const request = await parseRequestBody(req)
        // Add userId to request if available
        if (userId) {
            request.userId = userId
        }
        console.log("Request validated for location:", request.location)

        // Determine category
        const category = determineCategory(request.interests)

        // Generate AI recommendation
        const aiResponse = await generateAIRecommendation(request)
        console.log("AI response generated successfully")

        // Save to database (optional)
        const savedRecommendation = await saveToDatabase(request, aiResponse, category)

        return Response.json({
            success: true,
            data: {
                ...aiResponse,
                // Tambahkan informasi untuk frontend
                recommendations: aiResponse.recommendations.map(rec => ({
                    ...rec,
                    // Tambahkan metadata untuk wishlist
                    wishlistData: {
                        name: rec.name,
                        description: rec.description,
                        location: rec.location,
                        category: rec.category,
                        estimatedCost: rec.estimatedCost,
                        rating: rec.rating,
                        highlights: rec.highlights,
                        aiRecommendationId: savedRecommendation?._id || `temp_${Date.now()}`
                    }
                }))
            },
            location: request.location,
            requestId: savedRecommendation?._id || `temp_${Date.now()}`,
            timestamp: new Date().toISOString(),
            // Tambahkan info wishlist API
            wishlistInfo: {
                addToWishlistEndpoint: "/api/wishlist",
                method: "POST",
                note: "Use wishlistData from each recommendation to add to wishlist"
            }
        }, { status: 200 })

    } catch (error) {
        console.error("AI Recommendation Error:", error)
        
        if (error instanceof SyntaxError) {
            return Response.json({
                success: false,
                message: "Invalid JSON format",
                error: "Request body must be valid JSON"
            }, { status: 400 })
        }

        if (error instanceof Error) {
            const status = error.message.includes("not configured") ? 500 :
                          error.message.includes("required") ? 400 :
                          error.message.includes("unavailable") ? 503 : 500

            return Response.json({
                success: false,
                message: error.message,
                error: error.message
            }, { status })
        }

        const { message, status } = errorHandler(error)
        return Response.json({
            success: false,
            message: message || "Internal server error",
            error: "Unknown error occurred"
        }, { status })
    }
}

export async function GET(req: NextRequest) {
    try {
        // Default: API information
        return Response.json({
            success: true,
            message: "AI Travel Recommendation Service",
            version: "1.0.0",
            status: "active",
            endpoints: {
                "POST /api/ai-recommendation": {
                    description: "Generate travel recommendations using AI",
                    required: ["location"],
                    optional: ["budget", "duration", "interests", "travelType", "userId"],
                    example: {
                        location: "Jakarta",
                        budget: "sedang",
                        duration: "dua_hari", 
                        interests: "wisata alam, kuliner",
                        travelType: "family trip"
                    }
                },
                "GET /api/ai-recommendation": "Get service information"
            },
            supportedOptions: {
                locations: [
                    "Jakarta", "Bandung", "Yogyakarta", "Bali", "Surabaya",
                    "Semarang", "Malang", "Solo", "Medan", "Makassar",
                    "Palembang", "Balikpapan", "Manado", "Lombok", "Bogor"
                ],
                budgetOptions: ["murah", "sedang", "mahal", "luxury"],
                categories: ["wisata_alam", "wisata_budaya", "kuliner", "belanja", "hiburan"],
                durations: ["setengah_hari", "satu_hari", "dua_hari", "tiga_hari_lebih"],
                travelTypes: ["solo travel", "family trip", "romantic getaway", "adventure trip", "business trip"]
            },
            usage: {
                note: "Send POST request with location and optional parameters to get AI recommendations",
                example_curl: `curl -X POST http://localhost:3000/api/ai-recommendation \\
  -H "Content-Type: application/json" \\
  -d '{"location": "Jakarta", "budget": "sedang", "interests": "wisata alam"}'`
            }
        }, { status: 200 })

    } catch (error) {
        console.error("GET Error:", error)
        const { message, status } = errorHandler(error)
        return Response.json({ 
            success: false,
            message: message || "Service unavailable" 
        }, { status })
    }
}