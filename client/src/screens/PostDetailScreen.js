import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  RefreshControl,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as SecureStore from "expo-secure-store";

const { width: screenWidth } = Dimensions.get("window");

function PostDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { postId } = route.params;

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [saved, setSaved] = useState(false);

  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const commentInputRef = useRef(null);

  const fetchPostDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await SecureStore.getItemAsync("access_token");
      const res = await fetch(
        `https://vroom-api.vercel.app/api/post/${postId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log("Post detail response:", data);

      // Check different possible response structures
      if (data && data._id) {
        // Direct post object
        setPost(data);
        setLikeCount(data.likeCount || 0);
      } else if (data.post) {
        // Wrapped in post property
        setPost(data.post);
        setLikeCount(data.post.likeCount || 0);
      } else if (data.data) {
        // Wrapped in data property
        setPost(data.data);
        setLikeCount(data.data.likeCount || 0);
      } else if (data.success && data.post) {
        // Success wrapper
        setPost(data.post);
        setLikeCount(data.post.likeCount || 0);
      } else {
        console.error("Unexpected response structure:", data);
        setError("Post not found");
      }

      // After setting post, we'll check like status in a separate useEffect
      // when userId is available
    } catch (err) {
      console.error("Fetch post detail error:", err);
      setError("Failed to load post details");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPostDetail();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchPostDetail();
    fetchUserId();
  }, [postId]);

  // Check like status when userId is available
  useEffect(() => {
    if (userId && post) {
      checkLikeStatus();
    }
  }, [userId, post]);

  // Fetch comments when component loads and when showComments is true
  useEffect(() => {
    if (postId) {
      fetchComments();
    }
  }, [postId]);

  // Fetch comments when showComments is toggled
  useEffect(() => {
    if (showComments && postId) {
      fetchComments();
    }
  }, [showComments, postId]);

  // Function to get user ID from profile API
  const fetchUserId = async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) return;

      const response = await fetch("https://vroom-api.vercel.app/api/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user && data.user._id) {
          setUserId(data.user._id);
          console.log("User ID fetched for likes:", data.user._id);
        }
      }
    } catch (error) {
      console.error("Error fetching user ID:", error);
    }
  };

  // Check if user has liked this post
  const checkLikeStatus = async () => {
    if (!userId) return;

    try {
      const token = await SecureStore.getItemAsync("access_token");
      const response = await fetch(
        `https://vroom-api.vercel.app/api/likes?postId=${postId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-user-id": userId,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Like status response:", data);
        if (data.success) {
          setLiked(data.isLiked);
          setLikeCount(data.likeCount);
        }
      }
    } catch (error) {
      console.error("Error checking like status:", error);
    }
  };

  // Toggle like/unlike
  const handleLike = async () => {
    if (!userId || likeLoading) return;

    setLikeLoading(true);
    try {
      const token = await SecureStore.getItemAsync("access_token");
      const response = await fetch("https://vroom-api.vercel.app/api/likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-user-id": userId,
        },
        body: JSON.stringify({
          postId: postId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Toggle like response:", data);
        if (data.success) {
          setLiked(data.isLiked);
          setLikeCount(data.likeCount);
        }
      } else {
        const errorData = await response.json();
        console.error("Like toggle failed:", errorData);
        // Could show an alert here if needed
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Could show an alert here if needed
    } finally {
      setLikeLoading(false);
    }
  };

  // Fetch comments for this post
  const fetchComments = async () => {
    if (!postId) return;

    setCommentsLoading(true);
    try {
      const token = await SecureStore.getItemAsync("access_token");
      const response = await fetch(
        `https://vroom-api.vercel.app/api/comments?postId=${postId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Comments response:", data);
        if (data.success && data.data) {
          setComments(data.data);
        } else if (data.comments) {
          setComments(data.comments);
        } else {
          setComments([]);
        }
      } else {
        console.error("Failed to fetch comments:", response.status);
        setComments([]);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Add new comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !userId || addingComment) return;

    setAddingComment(true);
    try {
      const token = await SecureStore.getItemAsync("access_token");
      const response = await fetch(
        "https://vroom-api.vercel.app/api/comments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-user-id": userId,
          },
          body: JSON.stringify({
            postId: postId,
            content: newComment.trim(),
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Add comment response:", data);
        if (data.success) {
          setNewComment("");
          commentInputRef.current?.blur();
          // Refresh comments to get updated list
          await fetchComments();
        }
      } else {
        const errorData = await response.json();
        console.error("Add comment failed:", errorData);
        Alert.alert("Error", "Failed to add comment. Please try again.");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      Alert.alert("Error", "Failed to add comment. Please try again.");
    } finally {
      setAddingComment(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) {
        Alert.alert("Error", "Please login again");
        return;
      }

      const response = await fetch(
        `https://vroom-api.vercel.app/api/comments?commentId=${commentId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-user-id": userId,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Delete successful - refresh comments list
          await fetchComments();

          Alert.alert(
            "Success",
            data.message || "Comment deleted successfully"
          );
        } else {
          Alert.alert("Error", data.message || "Failed to delete comment");
        }
      } else {
        // Handle error response
        let errorMessage = "Failed to delete comment";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }

        console.error("Delete comment failed with status:", response.status);
        Alert.alert("Error", errorMessage);
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      Alert.alert("Error", "Failed to delete comment. Please try again.");
    }
  };

  // Confirm delete comment
  const confirmDeleteComment = (commentId, isOwnComment) => {
    if (!isOwnComment) {
      Alert.alert("Error", "You can only delete your own comments.");
      return;
    }

    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeleteComment(commentId),
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F4D03F" />
          <Text style={styles.loadingText}>Loading post details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ff3b30" />
          <Text style={styles.errorText}>{error || "Post not found"}</Text>
          <TouchableOpacity
            onPress={fetchPostDetail}
            style={styles.retryButton}
          >
            <Ionicons name="refresh" size={20} color="#F4D03F" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const trip = post.trip;
  const createdAt = new Date(post.createdAt).toLocaleString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const distanceKm = trip?.distance ? (trip.distance / 1000).toFixed(2) : "0";
  const durationMs = trip?.duration || 0;
  const durationHours = Math.floor(durationMs / 3600000);
  const durationMin = Math.floor((durationMs % 3600000) / 60000);
  const durationStr =
    durationHours > 0 ? `${durationHours}h ${durationMin}m` : `${durationMin}m`;

  // Calculate average speed
  const avgSpeed =
    trip?.distance && trip?.duration
      ? (trip.distance / 1000 / (trip.duration / 3600000)).toFixed(1)
      : "0";

  const images = post.imageUrls || (post.imageUrl ? [post.imageUrl] : []);

  const handleSave = () => {
    setSaved(!saved);
    // TODO: Implement API call to save/unsave post
  };

  const handleShare = () => {
    // TODO: Implement sharing functionality
    console.log("Share post:", postId);
  };

  const renderRouteMap = () => {
    if (!trip?.path || trip.path.length === 0) return null;

    const lats = trip.path.map((p) => p.lat);
    const lngs = trip.path.map((p) => p.lng);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;

    // Calculate center and deltas for map region
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latitudeDelta = Math.max(latRange * 1.3, 0.01);
    const longitudeDelta = Math.max(lngRange * 1.3, 0.01);

    return (
      <View style={styles.mapContainer}>
        <View style={styles.mapHeader}>
          <View style={styles.mapTitleSection}>
            <Ionicons name="map" size={20} color="#F4D03F" />
            <Text style={styles.mapTitle}>Trip Route</Text>
          </View>
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setIsMapExpanded(!isMapExpanded)}
          >
            <Ionicons
              name={isMapExpanded ? "contract" : "expand"}
              size={18}
              color="#F4D03F"
            />
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.mapWrapper,
            isMapExpanded && styles.mapWrapperExpanded,
          ]}
        >
          {(() => {
            try {
              return (
                <MapView
                  style={styles.mapView}
                  initialRegion={{
                    latitude: centerLat,
                    longitude: centerLng,
                    latitudeDelta,
                    longitudeDelta,
                  }}
                  mapType="standard"
                  showsUserLocation={false}
                  showsMyLocationButton={false}
                  showsCompass={true}
                  showsScale={false}
                  showsTraffic={false}
                  showsIndoors={false}
                  showsBuildings={true}
                  showsPointsOfInterest={false}
                >
                  {/* Route Polyline */}
                  {trip.path.length > 1 && (
                    <Polyline
                      coordinates={trip.path.map((point) => ({
                        latitude: point.lat,
                        longitude: point.lng,
                      }))}
                      strokeColor="#007AFF"
                      strokeWidth={4}
                      lineCap="round"
                      lineJoin="round"
                    />
                  )}

                  {/* Waypoints for complex routes */}
                  {trip.path.length > 2 &&
                    trip.path.slice(1, -1).map((point, index) => (
                      <Marker
                        key={`waypoint-${index}`}
                        coordinate={{
                          latitude: point.lat,
                          longitude: point.lng,
                        }}
                        anchor={{ x: 0.5, y: 0.5 }}
                      >
                        <View style={styles.waypointMarker}>
                          <View style={styles.waypointDot} />
                        </View>
                      </Marker>
                    ))}

                  {/* Start Marker */}
                  <Marker
                    coordinate={{
                      latitude: trip.path[0].lat,
                      longitude: trip.path[0].lng,
                    }}
                    title="Start Point"
                    description={`Lat: ${trip.path[0].lat.toFixed(
                      4
                    )}, Lng: ${trip.path[0].lng.toFixed(4)}`}
                    anchor={{ x: 0.5, y: 0.5 }}
                  >
                    <View style={styles.startMarker}>
                      <Ionicons name="play-circle" size={20} color="#00ff00" />
                    </View>
                  </Marker>

                  {/* End Marker */}
                  {trip.path.length > 1 && (
                    <Marker
                      coordinate={{
                        latitude: trip.path[trip.path.length - 1].lat,
                        longitude: trip.path[trip.path.length - 1].lng,
                      }}
                      title="End Point"
                      description={`Lat: ${trip.path[
                        trip.path.length - 1
                      ].lat.toFixed(4)}, Lng: ${trip.path[
                        trip.path.length - 1
                      ].lng.toFixed(4)}`}
                      anchor={{ x: 0.5, y: 0.5 }}
                    >
                      <View style={styles.endMarker}>
                        <Ionicons
                          name="stop-circle"
                          size={20}
                          color="#ff3b30"
                        />
                      </View>
                    </Marker>
                  )}
                </MapView>
              );
            } catch (error) {
              console.log("Map render error:", error);
              return (
                <View style={styles.mapFallback}>
                  <Ionicons name="map-outline" size={60} color="#999999" />
                  <Text style={styles.mapFallbackText}>Map not available</Text>
                  <Text style={styles.mapFallbackSubtext}>
                    {trip.path.length} points • {distanceKm} km
                  </Text>
                </View>
              );
            }
          })()}

          {/* Map Overlay */}
          <View style={styles.mapOverlay}>
            <View style={styles.mapInfo}>
              <View style={styles.routePoint}>
                <Ionicons name="play-circle" size={12} color="#00ff00" />
                <Text style={styles.pointLabel}>Start</Text>
              </View>
              {trip.path.length > 1 && (
                <View style={styles.routePoint}>
                  <Ionicons name="stop-circle" size={12} color="#ff3b30" />
                  <Text style={styles.pointLabel}>End</Text>
                </View>
              )}
              <View style={styles.routePoint}>
                <Ionicons name="location" size={12} color="#F4D03F" />
                <Text style={styles.pointLabel}>{trip.path.length} points</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Render comments section
  const renderComments = () => {
    if (!showComments) return null;

    return (
      <View style={styles.commentsSection}>
        <View style={styles.commentsSectionHeader}>
          <View style={styles.commentsHeaderLeft}>
            <Ionicons name="chatbubbles" size={20} color="#F4D03F" />
            <Text style={styles.commentsTitle}>
              Comments ({comments.length})
            </Text>
          </View>
          <TouchableOpacity
            style={styles.commentsToggle}
            onPress={() => setShowComments(false)}
          >
            <Ionicons name="chevron-up" size={20} color="#F4D03F" />
          </TouchableOpacity>
        </View>

        {/* Add Comment Input */}
        <View style={styles.addCommentContainer}>
          <View style={styles.addCommentInputWrapper}>
            <TextInput
              ref={commentInputRef}
              style={styles.addCommentInput}
              placeholder="Add a comment..."
              placeholderTextColor="#888"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
              editable={!addingComment}
            />
            <TouchableOpacity
              style={[
                styles.addCommentButton,
                (!newComment.trim() || addingComment) &&
                  styles.addCommentButtonDisabled,
              ]}
              onPress={handleAddComment}
              disabled={!newComment.trim() || addingComment}
            >
              {addingComment ? (
                <ActivityIndicator size="small" color="#F4D03F" />
              ) : (
                <Ionicons name="send" size={18} color="#1a1a1a" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.commentCharCount}>{newComment.length}/500</Text>
        </View>

        {/* Comments List */}
        <View style={styles.commentsList}>
          {commentsLoading ? (
            <View style={styles.commentsLoading}>
              <ActivityIndicator size="small" color="#F4D03F" />
              <Text style={styles.commentsLoadingText}>
                Loading comments...
              </Text>
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.noComments}>
              <Ionicons name="chatbubble-outline" size={40} color="#999999" />
              <Text style={styles.noCommentsText}>No comments yet</Text>
              <Text style={styles.noCommentsSubtext}>
                Be the first to comment!
              </Text>
            </View>
          ) : (
            comments.map((comment, index) => (
              <View key={comment._id || index} style={styles.commentItem}>
                <View style={styles.commentAvatar}>
                  <Ionicons name="person" size={16} color="#F4D03F" />
                </View>
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>
                      {comment.user?.name || "Anonymous"}
                    </Text>
                    <Text style={styles.commentDate}>
                      {new Date(comment.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    {comment.user?._id === userId && (
                      <TouchableOpacity
                        style={styles.commentDeleteButton}
                        onPress={() =>
                          confirmDeleteComment(
                            comment._id,
                            comment.user?._id === userId
                          )
                        }
                      >
                        <Ionicons
                          name="trash-outline"
                          size={14}
                          color="#ff3b30"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.commentText}>{comment.content}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#F4D03F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post Details</Text>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color="#F4D03F" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={true}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F4D03F"
              title="Pull to refresh"
              titleColor="#999999"
            />
          }
        >
          {/* User Info Card */}
          <View style={styles.userCard}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={24} color="#F4D03F" />
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.username}>
                  {post.user?.name || "Anonymous"}
                </Text>
                <Text style={styles.postDate}>{createdAt}</Text>
              </View>
            </View>
          </View>

          {/* Caption */}
          {post.caption && (
            <View style={styles.captionCard}>
              <Text style={styles.caption}>{post.caption}</Text>
            </View>
          )}

          {/* Trip Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="map" size={20} color="#F4D03F" />
              <Text style={styles.statValue}>{distanceKm}</Text>
              <Text style={styles.statLabel}>km</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="timer" size={20} color="#F4D03F" />
              <Text style={styles.statValue}>{durationStr}</Text>
              <Text style={styles.statLabel}>duration</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="speedometer" size={20} color="#F4D03F" />
              <Text style={styles.statValue}>{avgSpeed}</Text>
              <Text style={styles.statLabel}>km/h</Text>
            </View>
          </View>

          {/* Images */}
          {images.length > 0 && (
            <View style={styles.imageSection}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(
                    event.nativeEvent.contentOffset.x / screenWidth
                  );
                  setCurrentImageIndex(index);
                }}
              >
                {images.map((url, index) => (
                  <Image
                    key={index}
                    source={{ uri: url }}
                    style={styles.postImage}
                  />
                ))}
              </ScrollView>
              {images.length > 1 && (
                <View style={styles.imageIndicator}>
                  {images.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        currentImageIndex === index && styles.activeDot,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Route Map */}
          {renderRouteMap()}

          {/* Trip Details */}
          <View style={styles.tripDetails}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={20} color="#F4D03F" />
              <Text style={styles.sectionTitle}>Trip Details</Text>
            </View>

            <View style={styles.detailsList}>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="play-circle" size={16} color="#00ff00" />
                </View>
                <Text style={styles.detailLabel}>Start Point</Text>
                <Text style={styles.detailValue}>
                  {trip.startPoint?.lat.toFixed(4)},{" "}
                  {trip.startPoint?.lng.toFixed(4)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="stop-circle" size={16} color="#ff3b30" />
                </View>
                <Text style={styles.detailLabel}>End Point</Text>
                <Text style={styles.detailValue}>
                  {trip.endPoint?.lat.toFixed(4)},{" "}
                  {trip.endPoint?.lng.toFixed(4)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="location" size={16} color="#F4D03F" />
                </View>
                <Text style={styles.detailLabel}>Waypoints</Text>
                <Text style={styles.detailValue}>
                  {trip.path?.length || 0} points
                </Text>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="time" size={16} color="#F4D03F" />
                </View>
                <Text style={styles.detailLabel}>Start Time</Text>
                <Text style={styles.detailValue}>
                  {new Date(trip.startTime).toLocaleString("en-US")}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="checkmark-circle" size={16} color="#F4D03F" />
                </View>
                <Text style={styles.detailLabel}>End Time</Text>
                <Text style={styles.detailValue}>
                  {new Date(trip.endTime).toLocaleString("en-US")}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, liked && styles.actionButtonActive]}
              onPress={handleLike}
              disabled={likeLoading}
            >
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={20}
                color={liked ? "#ff3b30" : "#F4D03F"}
              />
              <Text
                style={[styles.actionText, liked && styles.actionTextActive]}
              >
                {likeLoading
                  ? "..."
                  : `${likeCount} ${likeCount === 1 ? "Like" : "Likes"}`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton]}
              onPress={() => setShowComments(!showComments)}
            >
              <Ionicons
                name={showComments ? "chatbubbles" : "chatbubbles-outline"}
                size={20}
                color="#F4D03F"
              />
              <Text style={styles.actionText}>
                {comments.length}{" "}
                {comments.length === 1 ? "Comment" : "Comments"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Comments Section */}
          {renderComments()}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
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
  headerSpacer: {
    width: 48,
  },
  shareButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#2a2a2a",
    borderWidth: 1,
    borderColor: "#3a3a3a",
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 120, // Extra padding to avoid TabNavigator overlap
  },

  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#999999",
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorText: {
    color: "#999999",
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4D03F",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#F4D03F",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryText: {
    color: "#1a1a1a",
    fontSize: 16,
    fontWeight: "600",
  },

  // User Card
  userCard: {
    backgroundColor: "#2a2a2a",
    marginHorizontal: 20,
    marginTop: 20,
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
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#3a3a3a",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    borderWidth: 2,
    borderColor: "#F4D03F",
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  postDate: {
    fontSize: 14,
    color: "#999999",
  },

  // Caption Card
  captionCard: {
    backgroundColor: "#2a2a2a",
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  caption: {
    fontSize: 16,
    lineHeight: 24,
    color: "#FFFFFF",
  },

  // Stats Container
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F4D03F",
  },
  statLabel: {
    fontSize: 12,
    color: "#999999",
    fontWeight: "500",
  },

  // Image Section
  imageSection: {
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 20,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  postImage: {
    width: screenWidth - 40,
    height: 300,
    resizeMode: "cover",
  },
  imageIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 16,
    backgroundColor: "#2a2a2a",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#666666",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "#F4D03F",
  },

  // Map Container
  mapContainer: {
    backgroundColor: "#2a2a2a",
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  mapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#3a3a3a",
  },
  mapTitleSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  expandButton: {
    backgroundColor: "#3a3a3a",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#4a4a4a",
  },
  mapWrapper: {
    height: 300,
    position: "relative",
  },
  mapWrapperExpanded: {
    height: 500,
  },
  mapView: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  mapFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#333333",
  },
  mapFallbackText: {
    fontSize: 16,
    color: "#999999",
    marginTop: 8,
  },
  mapFallbackSubtext: {
    fontSize: 12,
    color: "#666666",
    marginTop: 4,
  },
  mapOverlay: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 12,
    padding: 12,
  },
  mapInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pointLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  startMarker: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  endMarker: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  waypointMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  waypointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#007AFF",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },

  // Trip Details
  tripDetails: {
    backgroundColor: "#2a2a2a",
    marginHorizontal: 20,
    marginTop: 12,
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#3a3a3a",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  detailsList: {
    padding: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  detailIcon: {
    width: 24,
    alignItems: "center",
  },
  detailLabel: {
    color: "#999999",
    fontSize: 14,
    flex: 1,
    fontWeight: "500",
  },
  detailValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    flex: 1.5,
    textAlign: "right",
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 32,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2a2a2a",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonActive: {
    backgroundColor: "#3a3a3a",
    borderColor: "#F4D03F",
  },
  actionText: {
    color: "#F4D03F",
    fontSize: 16,
    fontWeight: "600",
  },
  actionTextActive: {
    color: "#F4D03F",
  },

  // Comments Section
  commentsSection: {
    backgroundColor: "#2a2a2a",
    marginHorizontal: 20,
    marginBottom: 32,
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
  commentsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#3a3a3a",
  },
  commentsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  commentsToggle: {
    backgroundColor: "#3a3a3a",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#4a4a4a",
  },

  // Add Comment
  addCommentContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#3a3a3a",
  },
  addCommentInputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  addCommentInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    maxHeight: 100,
    minHeight: 40,
    textAlignVertical: "top",
  },
  addCommentButton: {
    backgroundColor: "#F4D03F",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
  },
  addCommentButtonDisabled: {
    backgroundColor: "#666666",
  },
  commentCharCount: {
    fontSize: 12,
    color: "#999999",
    textAlign: "right",
    marginTop: 4,
  },

  // Comments List
  commentsList: {
    paddingTop: 30,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  commentsLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  commentsLoadingText: {
    color: "#999999",
    fontSize: 14,
  },
  noComments: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  noCommentsText: {
    color: "#999999",
    fontSize: 16,
    fontWeight: "500",
  },
  noCommentsSubtext: {
    color: "#666666",
    fontSize: 14,
  },

  // Comment Item
  commentItem: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3a3a3a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F4D03F",
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  commentAuthor: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  commentDate: {
    color: "#999999",
    fontSize: 12,
  },
  commentDeleteButton: {
    marginLeft: "auto",
    padding: 4,
  },
  commentText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
  },
});

export default PostDetailScreen;
