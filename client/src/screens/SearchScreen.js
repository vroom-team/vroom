import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";

export default function SearchScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    offset: 0,
    hasMore: false,
  });

  useEffect(() => {
    getCurrentUserId();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const delayedSearch = setTimeout(() => {
        searchUsers(true);
      }, 500); // Debounce search
      return () => clearTimeout(delayedSearch);
    } else {
      setSearchResults([]);
      setPagination({ total: 0, limit: 10, offset: 0, hasMore: false });
    }
  }, [searchQuery]);

  const getCurrentUserId = async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (token) {
        // Decode JWT to get user ID
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map(function (c) {
              return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join("")
        );
        const userData = JSON.parse(jsonPayload);
        console.log("Current user data from token:", userData);
        setCurrentUserId(userData.id);
      } else {
        console.log("No access token found");
      }
    } catch (error) {
      console.log("Error getting current user ID:", error);
    }
  };

  const searchUsers = async (reset = false) => {
    if (searchQuery.length < 2) return;

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("access_token");
      const offset = reset ? 0 : pagination.offset;

      const response = await fetch(
        `https://vroom-api.vercel.app/api/search/users?q=${encodeURIComponent(
          searchQuery
        )}&limit=${pagination.limit}&offset=${offset}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-user-id": currentUserId || "",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        if (reset) {
          setSearchResults(data.data);
        } else {
          setSearchResults((prev) => [...prev, ...data.data]);
        }
        setPagination(data.pagination);
      } else {
        throw new Error(data.message || "Search failed");
      }
    } catch (error) {
      console.log("Search error:", error);
      Alert.alert("Error", "Failed to search users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreResults = () => {
    if (!loading && pagination.hasMore) {
      setPagination((prev) => ({ ...prev, offset: prev.offset + prev.limit }));
      searchUsers(false);
    }
  };

  const toggleFollow = async (userToFollow) => {
    if (!currentUserId || followLoading[userToFollow._id]) return;

    setFollowLoading((prev) => ({ ...prev, [userToFollow._id]: true }));

    try {
      const token = await SecureStore.getItemAsync("access_token");

      if (!token) {
        throw new Error("No authentication token found");
      }

      console.log("Attempting to follow user:", {
        followingId: userToFollow._id,
        currentUserId: currentUserId,
        hasToken: !!token,
      });

      const response = await fetch("https://vroom-api.vercel.app/api/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-user-id": currentUserId,
        },
        body: JSON.stringify({
          followingId: userToFollow._id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log("Follow action successful:", {
          targetUser: userToFollow.username,
          isNowFollowing: data.isFollowing,
          newFollowersCount: data.followersCount,
        });

        // Update the user in search results
        setSearchResults((prev) =>
          prev.map((user) =>
            user._id === userToFollow._id
              ? {
                  ...user,
                  isFollowing: data.isFollowing,
                  followersCount: data.followersCount,
                }
              : user
          )
        );
      } else {
        console.log("Follow API error response:", {
          status: response.status,
          statusText: response.statusText,
          data: data,
        });
        throw new Error(
          data.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }
    } catch (error) {
      console.log("Follow error:", error);
      const errorMessage =
        error.message.includes("401") || error.message.includes("Unauthorized")
          ? "Authentication required. Please login again."
          : "Failed to update follow status. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setFollowLoading((prev) => ({ ...prev, [userToFollow._id]: false }));
    }
  };

  const renderUserItem = ({ item }) => {
    const isCurrentUser = item._id === currentUserId;
    const isFollowingUser = item.isFollowing;
    const isLoadingFollow = followLoading[item._id];

    return (
      <View style={styles.userItem}>
        <Image
          source={{
            uri:
              item.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                item.name
              )}&background=333&color=fff&size=50`,
          }}
          style={styles.avatar}
        />

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>

          <View style={styles.userStats}>
            <Text style={styles.statText}>
              {item.followersCount || 0} followers
            </Text>
            <Text style={styles.statDivider}>•</Text>
            <Text style={styles.statText}>
              {item.followingCount || 0} following
            </Text>
            {item.mutualFollows > 0 && (
              <>
                <Text style={styles.statDivider}>•</Text>
                <Text style={styles.mutualText}>
                  {item.mutualFollows} mutual
                </Text>
              </>
            )}
          </View>
        </View>

        {!isCurrentUser && (
          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowingUser && styles.followingButton,
            ]}
            onPress={() => toggleFollow(item)}
            disabled={isLoadingFollow}
          >
            {isLoadingFollow ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                style={[
                  styles.followButtonText,
                  isFollowingUser && styles.followingButtonText,
                ]}
              >
                {isFollowingUser ? "Following" : "Follow"}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmptyState = () => {
    if (searchQuery.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={64} color="#999999" />
          <Text style={styles.emptyTitle}>Search Users</Text>
          <Text style={styles.emptyText}>
            Enter at least 2 characters to search for users
          </Text>
        </View>
      );
    }

    if (searchQuery.length < 2) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="text" size={64} color="#999999" />
          <Text style={styles.emptyTitle}>Keep typing...</Text>
          <Text style={styles.emptyText}>
            Enter at least 2 characters to search
          </Text>
        </View>
      );
    }

    if (!loading && searchResults.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={64} color="#999999" />
          <Text style={styles.emptyTitle}>No users found</Text>
          <Text style={styles.emptyText}>
            Try searching with different keywords
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderFooter = () => {
    if (!pagination.hasMore) return null;

    return (
      <View style={styles.loadMoreContainer}>
        <TouchableOpacity
          style={styles.loadMoreButton}
          onPress={loadMoreResults}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.loadMoreText}>Load More</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#F4D03F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Users</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#999999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#999999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Results */}
      {searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          renderItem={renderUserItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderFooter}
        />
      ) : (
        renderEmptyState()
      )}

      {/* Loading Overlay */}
      {loading && searchResults.length === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#F4D03F" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  backButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#2a2a2a",
    borderWidth: 1,
    borderColor: "#3a3a3a",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerRight: {
    width: 48, // Same width as back button for balance
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#FFFFFF",
    marginLeft: 12,
  },
  clearButton: {
    padding: 4,
  },
  resultsList: {
    paddingHorizontal: 20,
    paddingBottom: 120, // Extra padding for TabNavigator
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 6,
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
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
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
    borderWidth: 2,
    borderColor: "#F4D03F",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#999999",
    marginBottom: 8,
  },
  userStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    fontSize: 12,
    color: "#999999",
    fontWeight: "500",
  },
  statDivider: {
    marginHorizontal: 8,
    fontSize: 12,
    color: "#666666",
  },
  mutualText: {
    fontSize: 12,
    color: "#F4D03F",
    fontWeight: "500",
  },
  followButton: {
    backgroundColor: "#F4D03F",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 80,
    alignItems: "center",
    shadowColor: "#F4D03F",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  followingButton: {
    backgroundColor: "#3a3a3a",
    borderWidth: 1,
    borderColor: "#4a4a4a",
    shadowColor: "#000000",
    shadowOpacity: 0.2,
  },
  followButtonText: {
    color: "#1a1a1a",
    fontSize: 14,
    fontWeight: "600",
  },
  followingButtonText: {
    color: "#999999",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
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
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  loadMoreButton: {
    backgroundColor: "#2a2a2a",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
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
  loadMoreText: {
    color: "#F4D03F",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(26, 26, 26, 0.9)",
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginTop: 12,
  },
});
