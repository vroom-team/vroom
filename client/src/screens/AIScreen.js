import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { useNavigation } from "@react-navigation/native";

export default function AIScreen() {
  const navigation = useNavigation();
  const [location, setLocation] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [tips, setTips] = useState([]);
  const [addingToWishlist, setAddingToWishlist] = useState(null); // Track which item is being added

  const generateRecommendations = async () => {
    if (!location.trim()) {
      Alert.alert("Error", "Please enter a location");
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("access_token");

      const response = await fetch(
        "https://vroom-api.vercel.app/api/ai-recommendation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            location: location.trim(),
            source: "mobile-app",
          }),
        }
      );

      console.log("Response status:", response.status);

      // Check if response has content and handle empty responses
      let data;
      try {
        const responseText = await response.text();
        console.log("Response text:", responseText);

        if (!responseText) {
          console.log("Empty response, using sample data");
          Alert.alert(
            "Info",
            "Using sample data (API returned empty response)"
          );
          generateLocationBasedSampleData(location);
          return;
        }

        data = JSON.parse(responseText);
      } catch (parseError) {
        console.log("JSON parse error:", parseError);
        Alert.alert("Info", "Using sample data (API response format issue)");
        generateLocationBasedSampleData(location);
        return;
      }

      console.log("API Response:", data);

      if (response.ok && data.success) {
        setRecommendations(data.data.recommendations || []);
        setSummary(data.data.summary || "");
        setTips(data.data.tips || []);

        // Debug: log the first recommendation to see its structure
        if (data.data.recommendations && data.data.recommendations.length > 0) {
          console.log(
            "First recommendation structure:",
            JSON.stringify(data.data.recommendations[0], null, 2)
          );
          console.log(
            "Has wishlistData?",
            !!data.data.recommendations[0].wishlistData
          );
        }

        if (data.data.recommendations && data.data.recommendations.length > 0) {
          Alert.alert(
            "Success",
            `Found ${data.data.recommendations.length} recommendations for ${location}`
          );
        } else {
          Alert.alert("Info", "No recommendations found for this location");
        }
      } else {
        console.log("API Error:", data);

        // If AI service not configured, use mock data
        if (
          data.message === "AI service not configured properly" ||
          data.error === "AI service not configured properly"
        ) {
          Alert.alert(
            "🚧 Backend Under Development",
            `AI service sedang dalam tahap pengembangan. Menampilkan sample data untuk lokasi ${
              location || "Indonesia"
            }.`,
            [{ text: "OK", style: "default" }]
          );
          generateLocationBasedSampleData(location);
          return;
        }

        Alert.alert("Error", data.message || "Failed to get recommendations");
      }
    } catch (error) {
      console.error("Network Error:", error);
      Alert.alert(
        "📡 Connection Issue",
        `Tidak dapat terhubung ke server. Menampilkan sample data untuk lokasi ${
          location || "Indonesia"
        }.`,
        [{ text: "OK", style: "default" }]
      );
      generateLocationBasedSampleData(location);
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async (place) => {
    try {
      setAddingToWishlist(place.name); // Set loading state for this specific item

      const token = await SecureStore.getItemAsync("access_token");
      if (!token) {
        Alert.alert("Error", "Please login first to add items to wishlist");
        return;
      }

      // Use the wishlistData from the recommendation if available, otherwise create our own
      let wishlistData;

      if (place.wishlistData) {
        // Use the wishlistData provided by the API, but ensure it's wrapped in source
        if (place.wishlistData.source) {
          wishlistData = { ...place.wishlistData };
        } else {
          wishlistData = {
            source: { ...place.wishlistData },
          };
        }
        console.log("Using provided wishlistData:", place.wishlistData);
      } else {
        // Fallback: create our own structure
        let normalizedCategory = place.category || "wisata_alam";
        if (normalizedCategory === "budaya_rekreasi") {
          normalizedCategory = "wisata_budaya";
        }

        wishlistData = {
          source: {
            name: place.name,
            category: normalizedCategory,
            type: "ai-recommendation",
            aiRecommendationId: `${location}_${place.name}_${Date.now()}`,
          },
        };

        // Only add fields if they have actual values
        if (place.description && place.description.trim()) {
          wishlistData.source.description = place.description.trim();
        }
        if (place.location && place.location.trim()) {
          wishlistData.source.location = place.location.trim();
        }
        if (place.estimatedCost && place.estimatedCost.trim()) {
          wishlistData.source.estimatedCost = place.estimatedCost.trim();
        }
        if (place.rating && Number(place.rating) > 0) {
          wishlistData.source.rating = Number(place.rating);
        }
        if (Array.isArray(place.highlights) && place.highlights.length > 0) {
          wishlistData.source.highlights = place.highlights;
        }

        console.log("Created fallback wishlistData:", wishlistData);
      }

      console.log(
        "Final wishlist data being sent:",
        JSON.stringify(wishlistData, null, 2)
      );
      console.log("Request details:");
      console.log("- URL:", "https://vroom-api.vercel.app/api/wishlist");
      console.log("- Method: POST");
      console.log("- Headers:", {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token ? "[TOKEN_PRESENT]" : "[NO_TOKEN]"}`,
      });
      console.log("- Body:", JSON.stringify(wishlistData, null, 2));

      const response = await fetch(
        "https://vroom-api.vercel.app/api/wishlist",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(wishlistData),
        }
      );

      let data;
      try {
        const responseText = await response.text();
        console.log("Raw response text:", responseText);
        console.log("Response status:", response.status);
        console.log("Response headers:", response.headers);
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.log("Failed to parse response:", parseError);
        console.log("Response status:", response.status);
        throw new Error("Invalid response format from server");
      }
      console.log("Parsed wishlist API Response:", data);

      if (response.ok && data.success) {
        // Navigate to wishlist screen immediately after successful addition
        Alert.alert(
          "Added to Wishlist",
          `${place.name} has been saved to your wishlist.`,
          [
            {
              text: "View Wishlist",
              style: "default",
              onPress: () => {
                // Navigate to wishlist tab
                navigation.navigate("Wishlist");
              },
            },
            {
              text: "Continue Exploring",
              style: "cancel",
            },
          ],
          { cancelable: false }
        );
      } else {
        console.log("Wishlist API Error:", data);
        // Handle specific error cases
        if (response.status === 401) {
          Alert.alert("Authentication Error", "Please login again to continue");
        } else if (response.status === 400) {
          if (data.message === "Source data is required") {
            Alert.alert(
              "Data Error",
              "Required information is missing. Please try searching for recommendations again."
            );
          } else {
            Alert.alert(
              "Invalid Data",
              data.message || "Some required data is missing"
            );
          }
        } else if (data.message && data.message.includes("already exists")) {
          Alert.alert(
            "Already in Wishlist",
            `${place.name} is already in your wishlist!`,
            [
              {
                text: "View Wishlist",
                style: "default",
                onPress: () => {
                  navigation.navigate("Wishlist");
                },
              },
              {
                text: "OK",
                style: "cancel",
              },
            ]
          );
        } else {
          Alert.alert(
            "Error",
            data.message || "Failed to add to wishlist. Please try again."
          );
        }
      }
    } catch (error) {
      console.error("Network Error:", error);
      Alert.alert(
        "Connection Error",
        "Unable to connect to server. Please check your internet connection and try again."
      );
    } finally {
      setAddingToWishlist(null); // Clear loading state
    }
  };

  const getCategoryIcon = (category) => {
    const iconMap = {
      wisata_alam: "leaf-outline",
      wisata_budaya: "library-outline",
      wisata_religi: "business-outline",
      wisata_sejarah: "time-outline",
      wisata_buatan: "construct-outline",
      budaya_rekreasi: "library-outline", // Add this mapping
    };
    return iconMap[category] || "location-outline";
  };

  const getCategoryColor = (category) => {
    const colorMap = {
      wisata_alam: "#4CAF50",
      wisata_budaya: "#FF9800",
      wisata_religi: "#2196F3",
      wisata_sejarah: "#9C27B0",
      wisata_buatan: "#E91E63",
      budaya_rekreasi: "#FF9800", // Add this mapping
    };
    return colorMap[category] || "#757575";
  };

  const formatCategoryName = (category) => {
    return category.replace("_", " ").toUpperCase();
  };

  const generateLocationBasedSampleData = (userLocation) => {
    const locationData = {
      jakarta: {
        recommendations: [
          {
            name: "Monumen Nasional (Monas)",
            description:
              "Menara setinggi 132 meter yang menjadi simbol kemerdekaan Indonesia. Terdapat museum sejarah dan dek observasi di puncaknya.",
            location: "Jl. Silang Monas, Gambir, Jakarta Pusat",
            category: "wisata_sejarah",
            estimatedCost: "Rp 15.000 - 30.000",
            rating: 4.3,
            highlights: [
              "Pemandangan kota dari atas",
              "Museum sejarah",
              "Taman yang luas",
              "Arsitektur ikonik",
            ],
            wishlistData: {
              name: "Monumen Nasional (Monas)",
              description:
                "Menara setinggi 132 meter yang menjadi simbol kemerdekaan Indonesia.",
              location: "Jl. Silang Monas, Gambir, Jakarta Pusat",
              category: "wisata_sejarah",
              estimatedCost: "Rp 15.000 - 30.000",
              rating: 4.3,
              highlights: [
                "Pemandangan kota dari atas",
                "Museum sejarah",
                "Taman yang luas",
                "Arsitektur ikonik",
              ],
              aiRecommendationId: `${userLocation}_1`,
            },
          },
          {
            name: "Kota Tua Jakarta",
            description:
              "Kawasan bersejarah dengan arsitektur kolonial Belanda. Terdapat museum, kafe, dan area pejalan kaki yang menarik.",
            location: "Jl. Taman Fatahillah No.1, Pinangsia, Jakarta Barat",
            category: "wisata_sejarah",
            estimatedCost: "Rp 20.000 - 100.000",
            rating: 4.1,
            highlights: [
              "Arsitektur kolonial",
              "Museum Fatahillah",
              "Seni jalanan",
              "Kuliner tradisional",
            ],
            wishlistData: {
              name: "Kota Tua Jakarta",
              description:
                "Kawasan bersejarah dengan arsitektur kolonial Belanda.",
              location: "Jl. Taman Fatahillah No.1, Pinangsia, Jakarta Barat",
              category: "wisata_sejarah",
              estimatedCost: "Rp 20.000 - 100.000",
              rating: 4.1,
              highlights: [
                "Arsitektur kolonial",
                "Museum Fatahillah",
                "Seni jalanan",
                "Kuliner tradisional",
              ],
              aiRecommendationId: `${userLocation}_2`,
            },
          },
        ],
        summary: `Rekomendasi wisata di ${
          userLocation || "Jakarta"
        } mencakup tempat-tempat bersejarah dan landmark ikonik yang menggambarkan kekayaan budaya Indonesia.`,
        tips: [
          "Kunjungi pada pagi atau sore hari untuk menghindari cuaca yang terlalu panas.",
          "Gunakan transportasi umum seperti TransJakarta atau MRT untuk kemudahan akses.",
          "Bawa kamera untuk mengabadikan arsitektur dan pemandangan yang indah.",
        ],
      },
      bogor: {
        recommendations: [
          {
            name: "Kebun Raya Bogor",
            description:
              "Kebun raya tertua di Indonesia dengan koleksi flora yang beragam. Tempat yang ideal untuk bersantai dan menikmati udara segar.",
            location: "Jl. Ir. H. Juanda No.13, Paledang, Bogor Tengah",
            category: "wisata_alam",
            estimatedCost: "Rp 20.000 - 50.000",
            rating: 4.7,
            highlights: [
              "Koleksi flora langka",
              "Udara sejuk",
              "Istana Bogor",
              "Spot foto menarik",
            ],
            wishlistData: {
              name: "Kebun Raya Bogor",
              description:
                "Kebun raya tertua di Indonesia dengan koleksi flora yang beragam.",
              location: "Jl. Ir. H. Juanda No.13, Paledang, Bogor Tengah",
              category: "wisata_alam",
              estimatedCost: "Rp 20.000 - 50.000",
              rating: 4.7,
              highlights: [
                "Koleksi flora langka",
                "Udara sejuk",
                "Istana Bogor",
                "Spot foto menarik",
              ],
              aiRecommendationId: `${userLocation}_1`,
            },
          },
        ],
        summary: `Rekomendasi wisata di ${
          userLocation || "Bogor"
        } dengan fokus pada wisata alam dan udara sejuk khas kota hujan.`,
        tips: [
          "Bawa payung atau jas hujan karena Bogor sering hujan.",
          "Kunjungi pada pagi hari untuk udara yang lebih segar.",
          "Coba kuliner khas Bogor seperti asinan dan toge goreng.",
        ],
      },
    };

    const searchLocation = (userLocation || "").toLowerCase();
    let selectedData = locationData.jakarta; // default

    if (searchLocation.includes("bogor")) {
      selectedData = locationData.bogor;
    } else if (searchLocation.includes("jakarta")) {
      selectedData = locationData.jakarta;
    }

    setRecommendations(selectedData.recommendations);
    setSummary(selectedData.summary);
    setTips(selectedData.tips);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recommendations</Text>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <Text style={styles.searchLabel}>Where do you want to go?</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Enter location (e.g., Bogor, Jakarta)"
            placeholderTextColor="#999999"
            value={location}
            onChangeText={setLocation}
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={generateRecommendations}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#1a1a1a" size="small" />
            ) : (
              <Ionicons name="search" size={20} color="#1a1a1a" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Results */}
      <ScrollView
        style={styles.resultsContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading State */}
        {loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#F4D03F" />
            <Text style={styles.loadingText}>Getting recommendations...</Text>
          </View>
        )}

        {!loading && (
          <>
            {/* Summary */}
            {summary && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>Summary</Text>
                <Text style={styles.summaryText}>{summary}</Text>
              </View>
            )}

            {/* Tips */}
            {tips.length > 0 && (
              <View style={styles.tipsContainer}>
                <Text style={styles.tipsTitle}>Tips</Text>
                {tips.map((tip, index) => (
                  <Text key={index} style={styles.tipText}>
                    • {tip}
                  </Text>
                ))}
              </View>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <View style={styles.recommendationsContainer}>
                <Text style={styles.recommendationsTitle}>
                  Recommendations ({recommendations.length})
                </Text>

                {recommendations.map((place, index) => (
                  <View key={index} style={styles.placeCard}>
                    {/* Place Header */}
                    <View style={styles.placeHeader}>
                      <View style={styles.placeInfo}>
                        <Text style={styles.placeName}>{place.name}</Text>
                        <View style={styles.categoryContainer}>
                          <Ionicons
                            name={getCategoryIcon(place.category)}
                            size={16}
                            color={getCategoryColor(place.category)}
                          />
                          <Text
                            style={[
                              styles.categoryText,
                              { color: getCategoryColor(place.category) },
                            ]}
                          >
                            {formatCategoryName(place.category)}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.wishlistButton,
                          addingToWishlist === place.name &&
                            styles.wishlistButtonLoading,
                        ]}
                        onPress={() => addToWishlist(place)}
                        disabled={addingToWishlist === place.name}
                      >
                        {addingToWishlist === place.name ? (
                          <ActivityIndicator size="small" color="#1a1a1a" />
                        ) : (
                          <Ionicons
                            name="heart-outline"
                            size={20}
                            color="#1a1a1a"
                          />
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Rating and Cost */}
                    <View style={styles.ratingCostContainer}>
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={16} color="#F4D03F" />
                        <Text style={styles.ratingText}>{place.rating}</Text>
                      </View>
                      <Text style={styles.costText}>{place.estimatedCost}</Text>
                    </View>

                    {/* Description */}
                    <Text style={styles.description}>{place.description}</Text>

                    {/* Location */}
                    <View style={styles.locationContainer}>
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color="#999999"
                      />
                      <Text style={styles.locationText}>{place.location}</Text>
                    </View>

                    {/* Highlights */}
                    {place.highlights && place.highlights.length > 0 && (
                      <View style={styles.highlightsContainer}>
                        <Text style={styles.highlightsTitle}>Highlights:</Text>
                        {place.highlights.map((highlight, idx) => (
                          <Text key={idx} style={styles.highlightText}>
                            • {highlight}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Empty State */}
            {recommendations.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={64} color="#999999" />
                <Text style={styles.emptyTitle}>Discover Amazing Places</Text>
                <Text style={styles.emptyText}>
                  Enter a location to get AI-powered travel recommendations
                  tailored just for you
                </Text>
                <Text style={styles.emptySubtext}>
                  Try locations like: Jakarta, Bali, Yogyakarta, Bandung
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  searchLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#3a3a3a",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  searchButton: {
    backgroundColor: "#F4D03F",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 56,
    shadowColor: "#F4D03F",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 120, // Extra padding for TabNavigator
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
    marginTop: 16,
  },
  summaryContainer: {
    backgroundColor: "#2a2a2a",
    padding: 20,
    borderRadius: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 15,
    color: "#FFFFFF",
    lineHeight: 22,
  },
  tipsContainer: {
    backgroundColor: "#2a2a2a",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: "#FFFFFF",
    marginBottom: 6,
    lineHeight: 20,
  },
  recommendationsContainer: {
    marginBottom: 20,
  },
  recommendationsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  placeCard: {
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  placeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  placeInfo: {
    flex: 1,
    marginRight: 12,
  },
  placeName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    lineHeight: 24,
  },
  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#3a3a3a",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
  },
  wishlistButton: {
    backgroundColor: "#F4D03F",
    padding: 12,
    borderRadius: 12,
    shadowColor: "#F4D03F",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  wishlistButtonLoading: {
    backgroundColor: "#F4D03F",
    opacity: 0.7,
  },
  ratingCostContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#3a3a3a",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  costText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F4D03F",
    backgroundColor: "#3a3a3a",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  description: {
    fontSize: 15,
    color: "#FFFFFF",
    lineHeight: 22,
    marginBottom: 16,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    backgroundColor: "#3a3a3a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  locationText: {
    fontSize: 13,
    color: "#999999",
    flex: 1,
    lineHeight: 18,
  },
  highlightsContainer: {
    marginTop: 4,
  },
  highlightsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  highlightText: {
    fontSize: 13,
    color: "#999999",
    marginBottom: 4,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#999999",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 20,
  },
});
