import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Image,
} from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { useFocusEffect } from "@react-navigation/native";

export default function WishlistScreen() {
  const flatListRef = useRef(null);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingItems, setRemovingItems] = useState(new Set());
  const [updatingItems, setUpdatingItems] = useState(new Set());

  useEffect(() => {
    fetchWishlist();
  }, []);

  // Refresh data when screen comes into focus (when navigating from AI screen)
  useFocusEffect(
    useCallback(() => {
      fetchWishlist();
    }, [])
  );

  const fetchWishlist = async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) {
        console.log("No token found");
        setLoading(false);
        return;
      }

      console.log("Fetching wishlist from API...");
      const response = await fetch(
        "https://vroom-api.vercel.app/api/wishlist?filter=all",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Wishlist API response status:", response.status);
      console.log("Using filter=all to get all wishlist items");

      if (response.ok) {
        const data = await response.json();
        console.log("Wishlist API response:", data);

        if (data.success && data.data) {
          // Check if data array is not empty before accessing first item
          if (data.data.length > 0) {
            console.log(
              "First wishlist item structure:",
              JSON.stringify(data.data[0], null, 2)
            );
            console.log("Item ID field available:", data.data[0]._id);
            console.log("Full item structure for debugging:", {
              _id: data.data[0]._id,
              isVisited: data.data[0].isVisited,
              userId: data.data[0].userId,
              hasSource: !!data.data[0].source,
            });
          } else {
            console.log("Wishlist is empty - no items to display");
          }

          // Sort items by visited status (unvisited first, then visited) and creation date
          const sortedItems =
            data.data.length > 0
              ? data.data.sort((a, b) => {
                  // First sort by visited status (false first, true last)
                  if (a.isVisited !== b.isVisited) {
                    return a.isVisited ? 1 : -1;
                  }
                  // Then sort by creation date (newest first within each group)
                  const dateA = new Date(a.createdAt || 0);
                  const dateB = new Date(b.createdAt || 0);
                  return dateB - dateA;
                })
              : [];

          setWishlistItems(sortedItems);
        } else {
          console.log("API returned success: false", data);
          setWishlistItems([]);
        }
      } else {
        const errorData = await response.json();
        console.log("Wishlist API error:", errorData);
        Alert.alert("Error", errorData.message || "Failed to fetch wishlist");
        setWishlistItems([]);
      }
    } catch (error) {
      console.log("Error fetching wishlist:", error);
      // More specific error handling
      if (
        error instanceof TypeError &&
        error.message.includes("Cannot read property")
      ) {
        console.log("Data structure error - likely empty array access");
        Alert.alert(
          "Info",
          "Your wishlist is empty. Start adding places to see them here!"
        );
      } else {
        Alert.alert("Error", "Network error. Please check your connection.");
      }
      setWishlistItems([]);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (itemId) => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) {
        Alert.alert("Error", "Please login first");
        return;
      }

      // Add to removing set for loading state
      setRemovingItems((prev) => new Set(prev).add(itemId));

      console.log("Removing item from wishlist:", itemId);
      console.log(
        "DELETE URL:",
        `https://vroom-api.vercel.app/api/wishlist?id=${itemId}`
      );

      const response = await fetch(
        `https://vroom-api.vercel.app/api/wishlist?id=${itemId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      console.log("Remove wishlist response status:", response.status);
      console.log("Remove wishlist response:", data);

      if (response.ok && data.success) {
        Alert.alert("Success", "Item removed from wishlist!");
        // Remove item from local state immediately for better UX
        setWishlistItems((prevItems) =>
          prevItems.filter((item) => item._id !== itemId)
        );
        // Also refresh data from server to ensure sync
        setTimeout(() => {
          fetchWishlist();
        }, 500);
      } else {
        Alert.alert("Error", data.message || "Failed to remove item");
      }
    } catch (error) {
      console.log("Error removing from wishlist:", error);
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      // Remove from removing set
      setRemovingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const updateVisitStatus = async (itemId, currentStatus) => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) {
        Alert.alert("Error", "Please login first");
        return;
      }

      // Add to updating set for loading state
      setUpdatingItems((prev) => new Set(prev).add(itemId));

      const newStatus = !currentStatus; // Toggle status
      console.log("Updating visit status for item:", itemId, "to:", newStatus);
      console.log("PUT URL:", "https://vroom-api.vercel.app/api/wishlist");

      // Try different payload formats that the API might expect
      const payload = {
        wishlistId: itemId,
        isVisited: newStatus,
      };

      console.log("PUT Request payload:", JSON.stringify(payload, null, 2));

      const response = await fetch(
        "https://vroom-api.vercel.app/api/wishlist",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      console.log("PUT Request body sent:", JSON.stringify(payload, null, 2));

      const data = await response.json();
      console.log("Update visit status response status:", response.status);
      console.log("Update visit status response:", data);

      if (response.ok && data.success) {
        const statusText = newStatus
          ? "marked as visited"
          : "marked as not visited";
        Alert.alert("Success", `Item ${statusText}!`);

        // Update local state immediately for better UX
        setWishlistItems((prevItems) => {
          const updatedItems = prevItems.map((item) =>
            item._id === itemId ? { ...item, isVisited: newStatus } : item
          );

          // Re-sort items: unvisited first, then visited
          return updatedItems.sort((a, b) => {
            // First sort by visited status (false first, true last)
            if (a.isVisited !== b.isVisited) {
              return a.isVisited ? 1 : -1;
            }
            // Then sort by creation date (newest first within each group)
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
          });
        });

        // Also refresh data from server to ensure sync
        setTimeout(() => {
          fetchWishlist();
        }, 500);
      } else {
        console.log(
          "PUT request failed, trying alternative payload formats..."
        );

        // Try alternative format 1: _id instead of wishlistId
        const altPayload1 = {
          _id: itemId,
          isVisited: newStatus,
        };

        console.log(
          "Trying alternative payload 1:",
          JSON.stringify(altPayload1, null, 2)
        );

        const altResponse1 = await fetch(
          "https://vroom-api.vercel.app/api/wishlist",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(altPayload1),
          }
        );

        const altData1 = await altResponse1.json();
        console.log("Alternative request 1 response:", altData1);

        if (altResponse1.ok && altData1.success) {
          const statusText = newStatus
            ? "marked as visited"
            : "marked as not visited";
          Alert.alert("Success", `Item ${statusText}!`);

          // Update local state
          setWishlistItems((prevItems) => {
            const updatedItems = prevItems.map((item) =>
              item._id === itemId ? { ...item, isVisited: newStatus } : item
            );

            // Re-sort items: unvisited first, then visited
            return updatedItems.sort((a, b) => {
              // First sort by visited status (false first, true last)
              if (a.isVisited !== b.isVisited) {
                return a.isVisited ? 1 : -1;
              }
              // Then sort by creation date (newest first within each group)
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateB - dateA;
            });
          });

          setTimeout(() => {
            fetchWishlist();
          }, 500);
        } else {
          // Try alternative format 2: id instead of wishlistId
          const altPayload2 = {
            id: itemId,
            isVisited: newStatus,
          };

          console.log(
            "Trying alternative payload 2:",
            JSON.stringify(altPayload2, null, 2)
          );

          const altResponse2 = await fetch(
            "https://vroom-api.vercel.app/api/wishlist",
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(altPayload2),
            }
          );

          const altData2 = await altResponse2.json();
          console.log("Alternative request 2 response:", altData2);

          if (altResponse2.ok && altData2.success) {
            const statusText = newStatus
              ? "marked as visited"
              : "marked as not visited";
            Alert.alert("Success", `Item ${statusText}!`);

            // Update local state
            setWishlistItems((prevItems) => {
              const updatedItems = prevItems.map((item) =>
                item._id === itemId ? { ...item, isVisited: newStatus } : item
              );

              // Re-sort items: unvisited first, then visited
              return updatedItems.sort((a, b) => {
                // First sort by visited status (false first, true last)
                if (a.isVisited !== b.isVisited) {
                  return a.isVisited ? 1 : -1;
                }
                // Then sort by creation date (newest first within each group)
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB - dateA;
              });
            });

            setTimeout(() => {
              fetchWishlist();
            }, 500);
          } else {
            console.log("All payload formats failed");
            Alert.alert(
              "Error",
              altData2.message ||
                data.message ||
                "Failed to update visit status"
            );
          }
        }
      }
    } catch (error) {
      console.log("Error updating visit status:", error);
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      // Remove from updating set
      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWishlist();
    setRefreshing(false);
  };

  const getCategoryIcon = (category) => {
    const iconMap = {
      wisata_alam: "leaf-outline",
      wisata_budaya: "library-outline",
      wisata_religi: "business-outline",
      wisata_sejarah: "time-outline",
      wisata_buatan: "construct-outline",
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
    };
    return colorMap[category] || "#757575";
  };

  const formatCategoryName = (category) => {
    if (!category) return "UNCATEGORIZED";
    return category.replace("_", " ").toUpperCase();
  };

  const renderWishlistItem = ({ item }) => {
    // Extract data from source object or use item directly for backward compatibility
    const data = item.source || item;

    // Check if item was added in the last 24 hours
    const isNewItem =
      item.createdAt &&
      new Date() - new Date(item.createdAt) < 24 * 60 * 60 * 1000;

    // Check if item is visited
    const isVisited = item.isVisited;

    // Check if item is being removed
    const isRemoving = removingItems.has(item._id);

    // Check if item is being updated
    const isUpdating = updatingItems.has(item._id);

    return (
      <View style={[styles.itemCard, isVisited && styles.visitedItemCard]}>
        {/* Visited Status Indicator */}
        {isVisited && <View style={styles.visitedIndicator} />}

        {/* Item Header */}
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text
              style={[styles.itemName, isVisited && styles.visitedItemName]}
              numberOfLines={2}
            >
              {data.name || "Unnamed Place"}
            </Text>

            {data.location && (
              <Text style={styles.locationText} numberOfLines={1}>
                {data.location}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                if (isUpdating) return;
                updateVisitStatus(item._id, isVisited);
              }}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#F4D03F" />
              ) : (
                <Ionicons
                  name={isVisited ? "checkmark-circle" : "radio-button-off"}
                  size={24}
                  color={isVisited ? "#F4D03F" : "#999999"}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => {
                if (isRemoving) return;
                Alert.alert(
                  "Remove from Wishlist",
                  `Remove "${data.name}" from your wishlist?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Remove",
                      style: "destructive",
                      onPress: () => removeFromWishlist(item._id),
                    },
                  ]
                );
              }}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <ActivityIndicator size="small" color="#999999" />
              ) : (
                <Ionicons name="trash-outline" size={20} color="#999999" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Description */}
        {data.description && (
          <Text style={styles.description} numberOfLines={2}>
            {data.description}
          </Text>
        )}

        {/* Bottom Info */}
        <View style={styles.bottomInfo}>
          {data.category && (
            <View style={styles.categoryContainer}>
              <Text style={styles.categoryText}>
                {formatCategoryName(data.category)}
              </Text>
            </View>
          )}

          {data.rating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color="#F4D03F" />
              <Text style={styles.ratingText}>{data.rating}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F4D03F" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wishlist</Text>
        {wishlistItems.length > 0 && (
          <Text style={styles.headerSubtitle}>
            {wishlistItems.length} place{wishlistItems.length !== 1 ? "s" : ""}
          </Text>
        )}
      </View>

      {/* Wishlist Content */}
      {wishlistItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color="#999999" />
          <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
          <Text style={styles.emptyText}>
            Start exploring and add places you'd love to visit to your wishlist!
          </Text>
          <Text style={styles.emptySubtext}>
            Use the AI recommendations or browse posts to find amazing
            destinations
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={wishlistItems}
          renderItem={renderWishlistItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F4D03F"
              title="Pull to refresh"
              titleColor="#F4D03F"
            />
          }
        />
      )}
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
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#999999",
    fontWeight: "400",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 120,
  },
  itemCard: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    position: "relative",
  },
  visitedItemCard: {
    opacity: 0.6,
  },
  visitedIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#F4D03F",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 16,
  },
  itemName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    lineHeight: 24,
    marginBottom: 4,
  },
  visitedItemName: {
    textDecorationLine: "line-through",
    color: "#999999",
  },
  locationText: {
    fontSize: 14,
    color: "#999999",
    lineHeight: 18,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  actionButton: {
    padding: 4,
  },
  removeButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: "#CCCCCC",
    lineHeight: 20,
    marginBottom: 16,
  },
  bottomInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryContainer: {
    backgroundColor: "#3a3a3a",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#CCCCCC",
    textTransform: "uppercase",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 20,
    marginBottom: 12,
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
    lineHeight: 20,
  },
});
