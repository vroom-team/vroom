import { errorHandler } from "@/server/helpers/ErrorHandler"
import { NextRequest } from "next/server"
import Wishlist, { IWishlist } from "@/server/models/Wishlist"

// Types
interface AddToWishlistRequest {
  source: {
    name: string;
    description: string;
    location: string;
    category: string;
    estimatedCost: string;
    rating: number;
    highlights: string[];
    aiRecommendationId?: string;
  };
}

interface ToggleVisitedRequest {
  wishlistId: string;
}

// Helper function to clean ORM data
function cleanWishlistData(item: IWishlist | Record<string, unknown>) {
  // Convert to plain object to remove all ORM metadata
  const plainObject = JSON.parse(JSON.stringify(item))
  
  return {
    _id: plainObject._id || plainObject.$id,
    userId: plainObject.userId,
    isVisited: plainObject.isVisited,
    source: plainObject.source,
    createdAt: plainObject.createdAt,
    updatedAt: plainObject.updatedAt
  }
}

// GET - Get user's wishlist
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id")
    
    if (!userId) {
      return Response.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') // 'all', 'unvisited', or null for visited only

    // Get all wishlist items and filter by userId manually
    const allWishlistItems = await Wishlist.all()
    const userWishlistItems = allWishlistItems.filter((item: IWishlist | Record<string, unknown>) => 
      (item as IWishlist).userId === userId
    )

    let filteredItems = userWishlistItems

    // By default, only show visited items
    if (filter === 'all') {
      filteredItems = userWishlistItems // Show all items
    } else if (filter === 'unvisited') {
      filteredItems = userWishlistItems.filter((item: IWishlist | Record<string, unknown>) => 
        (item as IWishlist).isVisited === false
      )
    } else {
      // Default: only show visited items
      filteredItems = userWishlistItems.filter((item: IWishlist | Record<string, unknown>) => 
        (item as IWishlist).isVisited === true
      )
    }

    // Clean the data to remove ORM metadata
    const cleanData = filteredItems.map((item: IWishlist | Record<string, unknown>) => cleanWishlistData(item))

    return Response.json({
      success: true,
      data: cleanData,
      total: cleanData.length,
      filter: filter || 'visited',
      note: "Default shows only visited items. Use ?filter=all to show all items, ?filter=unvisited for unvisited only"
    }, { status: 200 })

  } catch (error) {
    console.error("GET Wishlist Error:", error)
    const { message, status } = errorHandler(error)
    return Response.json({
      success: false,
      message: message || "Failed to fetch wishlist"
    }, { status })
  }
}

// POST - Add item to wishlist from AI recommendation
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id")
    
    if (!userId) {
      return Response.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      )
    }

    const body: AddToWishlistRequest = await req.json()
    
    if (!body.source || !body.source.name || !body.source.location) {
      return Response.json(
        { success: false, message: "Source data is required" },
        { status: 400 }
      )
    }

    // Check if item already exists in user's wishlist
    const allWishlistItems = await Wishlist.all()
    const existingItem = allWishlistItems.find((item: IWishlist | Record<string, unknown>) => 
      (item as IWishlist).userId === userId && 
      (item as IWishlist).source.name === body.source.name &&
      (item as IWishlist).source.location === body.source.location
    )

    if (existingItem) {
      return Response.json(
        { success: false, message: "Item already exists in wishlist" },
        { status: 409 }
      )
    }

    // Create new wishlist item
    const wishlistItem = {
      userId,
      isVisited: false,
      source: body.source,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const savedItem = await Wishlist.create(wishlistItem)

    // Clean response data using helper function
    const cleanData = cleanWishlistData(savedItem)

    return Response.json({
      success: true,
      message: "Item added to wishlist successfully",
      data: cleanData
    }, { status: 201 })

  } catch (error) {
    console.error("POST Wishlist Error:", error)
    const { message, status } = errorHandler(error)
    return Response.json({
      success: false,
      message: message || "Failed to add item to wishlist"
    }, { status })
  }
}

// PUT - Toggle visited status
export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id")
    
    if (!userId) {
      return Response.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      )
    }

    const body: ToggleVisitedRequest = await req.json()
    
    if (!body.wishlistId) {
      return Response.json(
        { success: false, message: "Wishlist ID is required" },
        { status: 400 }
      )
    }

    try {
      // Find the item by ID
      const item = await Wishlist.find(body.wishlistId) as unknown as IWishlist | null
      
      if (!item) {
        return Response.json(
          { success: false, message: "Wishlist item not found" },
          { status: 404 }
        )
      }

      // Check if item belongs to user
      if (item.userId !== userId) {
        return Response.json(
          { success: false, message: "Unauthorized access to wishlist item" },
          { status: 403 }
        )
      }

      // Prepare updated data - keep everything same, only change isVisited
      const updatedData = {
        userId: item.userId,
        isVisited: !item.isVisited,  // Toggle isVisited
        source: item.source,         // Keep source data same
        createdAt: (item as unknown as Record<string, unknown>).createdAt as Date,   // Keep original creation time
        updatedAt: new Date()                 // Update timestamp
      }
      
      // Replace with updated data
      await Wishlist.destroy(body.wishlistId)
      const updatedItem = await Wishlist.create(updatedData)

      // Clean response data using helper function
      const cleanData = cleanWishlistData(updatedItem)

      return Response.json({
        success: true,
        message: "Item updated successfully",
        data: cleanData
      }, { status: 200 })

    } catch (error) {
      return Response.json(
        { success: false, message: "Wishlist item not found" },
        { status: 404 }
      )
    }

  } catch (error) {
    console.error("PUT Wishlist Error:", error)
    const { message, status } = errorHandler(error)
    return Response.json({
      success: false,
      message: message || "Failed to update wishlist item"
    }, { status })
  }
}

// DELETE - Remove item from wishlist
export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id")
    
    if (!userId) {
      return Response.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const wishlistId = searchParams.get('id')
    
    if (!wishlistId) {
      return Response.json(
        { success: false, message: "Wishlist ID is required" },
        { status: 400 }
      )
    }

    try {
      // Find the item by ID
      const item = await Wishlist.find(wishlistId) as unknown as IWishlist | null
      
      if (!item) {
        return Response.json(
          { success: false, message: "Wishlist item not found" },
          { status: 404 }
        )
      }

      // Check if item belongs to user
      if (item.userId !== userId) {
        return Response.json(
          { success: false, message: "Unauthorized access to wishlist item" },
          { status: 403 }
        )
      }

      // Delete the item
      await Wishlist.destroy(wishlistId)

      return Response.json({
        success: true,
        message: "Item removed from wishlist successfully"
      }, { status: 200 })

    } catch (error) {
      return Response.json(
        { success: false, message: "Wishlist item not found" },
        { status: 404 }
      )
    }

  } catch (error) {
    console.error("DELETE Wishlist Error:", error)
    const { message, status } = errorHandler(error)
    return Response.json({
      success: false,
      message: message || "Failed to remove item from wishlist"
    }, { status })
  }
}