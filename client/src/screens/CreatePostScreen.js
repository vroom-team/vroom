import {
  useNavigation,
  useRoute,
  CommonActions,
} from "@react-navigation/native";
import { useState, useEffect, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
  Image,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AuthContext from "../contexts/AuthContext";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";

const { width, height } = Dimensions.get("window");

export default function CreatePostScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const authContext = useContext(AuthContext);

  // Get trip data from navigation params (passed from RecordScreen)
  const tripData = route.params?.tripData || null;

  // Form states
  const [caption, setCaption] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  const [isPosting, setIsPosting] = useState(false);

  // Trip stats from params or fetch
  const [trip, setTrip] = useState(tripData);
  const [loading, setLoading] = useState(!tripData);

  useEffect(() => {
    // If no trip data passed, try to get latest trip
    if (!tripData) {
      fetchLatestTrip();
    }
  }, []);

  const fetchLatestTrip = async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      const response = await fetch(
        "https://vroom-api.vercel.app/api/trips/latest",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok && data.trip) {
        setTrip(data.trip);
      }
    } catch (error) {
      console.error("Error fetching latest trip:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    } else {
      return `${meters.toFixed(0)} m`;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Image picker functionality
  const handleAddPhoto = async () => {
    try {
      // Show options for camera or gallery
      Alert.alert("Add Photo", "Choose how you want to add a photo", [
        {
          text: "Camera",
          onPress: () => openCamera(),
        },
        {
          text: "Gallery",
          onPress: () => openGallery(),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]);
    } catch (error) {
      console.error("Error showing photo options:", error);
      Alert.alert("Error", "Failed to open photo options");
    }
  };

  const openCamera = async () => {
    try {
      // Request camera permissions
      const cameraPermission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (cameraPermission.status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Camera permission is required to take photos"
        );
        return;
      }

      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8, // Reduce quality for faster upload
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImage = {
          uri: result.assets[0].uri,
          type: result.assets[0].type || "image/jpeg",
          name: result.assets[0].fileName || `photo_${Date.now()}.jpg`,
          width: result.assets[0].width,
          height: result.assets[0].height,
        };
        setSelectedImages([...selectedImages, newImage]);
      }
    } catch (error) {
      console.error("Error opening camera:", error);
      Alert.alert("Error", "Failed to open camera");
    }
  };

  const openGallery = async () => {
    try {
      // No permissions request is necessary for launching the image library
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8, // Reduce quality for faster upload
        allowsMultipleSelection: true, // Allow multiple images
      });

      console.log("Image picker result:", result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = result.assets.map((asset, index) => ({
          uri: asset.uri,
          type: asset.type || "image/jpeg",
          name: asset.fileName || `image_${Date.now()}_${index}.jpg`,
          width: asset.width,
          height: asset.height,
        }));

        // Add new images to existing selected images (max 5 images)
        const updatedImages = [...selectedImages, ...newImages];
        if (updatedImages.length > 5) {
          Alert.alert(
            "Limit Reached",
            "You can only add up to 5 images per post"
          );
          setSelectedImages(updatedImages.slice(0, 5));
        } else {
          setSelectedImages(updatedImages);
        }
      }
    } catch (error) {
      console.error("Error opening gallery:", error);
      Alert.alert("Error", "Failed to open gallery");
    }
  };

  // Remove selected image (for future implementation)
  const removeImage = (index) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const createPost = async () => {
    if (!trip) {
      Alert.alert("Error", "No trip data available to create post");
      return;
    }

    if (!caption.trim() && selectedImages.length === 0) {
      Alert.alert("Error", "Please add a caption or photo to create a post");
      return;
    }

    setIsPosting(true);

    try {
      const token = await SecureStore.getItemAsync("access_token");

      // Create FormData for multipart/form-data
      const formData = new FormData();
      formData.append("tripId", trip._id);

      if (caption.trim()) {
        formData.append("caption", caption.trim());
      }

      // Add images to formData (for future implementation)
      selectedImages.forEach((image, index) => {
        formData.append("image", {
          uri: image.uri,
          type: image.type || "image/jpeg",
          name: image.name || `image_${index}.jpg`,
        });
      });

      const response = await fetch("https://vroom-api.vercel.app/api/post", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        // Navigate back to TabNavigator and switch to PostNavigator tab
        navigation.navigate("TabNavigator", {
          screen: "PostNavigator",
          params: { screen: "PostScreen" },
        });
      } else {
        Alert.alert("Error", data.message || "Failed to create post");
      }
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert("Error", "Failed to create post. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  const previewPost = () => {
    Alert.alert(
      "Post Preview",
      `Caption: ${caption || "No caption"}\nTrip: ${
        trip ? formatDistance(trip.distance) : "N/A"
      } - ${trip ? formatDuration(trip.duration) : "N/A"}\nPhotos: ${
        selectedImages.length
      } selected`,
      [
        { text: "Edit", style: "cancel" },
        { text: "Post Now", onPress: createPost },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F4D03F" />
          <Text style={styles.loadingText}>Loading trip data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#F4D03F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Post</Text>
          <TouchableOpacity
            style={[
              styles.previewButton,
              !caption.trim() &&
                selectedImages.length === 0 &&
                styles.previewButtonDisabled,
            ]}
            onPress={previewPost}
            disabled={!caption.trim() && selectedImages.length === 0}
          >
            <Ionicons
              name="eye"
              size={24}
              color={
                !caption.trim() && selectedImages.length === 0
                  ? "#999999"
                  : "#F4D03F"
              }
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {/* Trip Summary Card */}
          {trip && (
            <View style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <View style={styles.tripIconContainer}>
                  <Ionicons name="location" size={20} color="#F4D03F" />
                </View>
                <View style={styles.tripTitleContainer}>
                  <Text style={styles.tripTitle}>Trip Summary</Text>
                  <Text style={styles.tripDate}>
                    {formatDate(trip.createdAt)}
                  </Text>
                </View>
              </View>

              <View style={styles.tripStats}>
                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="walk-outline" size={18} color="#F4D03F" />
                  </View>
                  <Text style={styles.statLabel}>Distance</Text>
                  <Text style={styles.statValue}>
                    {formatDistance(trip.distance || 0)}
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="time-outline" size={18} color="#F4D03F" />
                  </View>
                  <Text style={styles.statLabel}>Duration</Text>
                  <Text style={styles.statValue}>
                    {formatDuration(trip.duration || 0)}
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="time" size={18} color="#F4D03F" />
                  </View>
                  <Text style={styles.statLabel}>Started</Text>
                  <Text style={styles.statValue}>
                    {formatTime(trip.createdAt)}
                  </Text>
                </View>
              </View>

              {trip.startPoint && (
                <View style={styles.routeInfo}>
                  <View style={styles.routeHeader}>
                    <Ionicons
                      name="navigate-outline"
                      size={16}
                      color="#F4D03F"
                    />
                    <Text style={styles.routeLabel}>Route Details</Text>
                  </View>
                  <Text style={styles.routeText}>
                    {trip.startPoint.lat?.toFixed(4)},{" "}
                    {trip.startPoint.lng?.toFixed(4)}
                    {trip.endPoint &&
                      ` → ${trip.endPoint.lat?.toFixed(
                        4
                      )}, ${trip.endPoint.lng?.toFixed(4)}`}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Caption Input */}
          <View style={styles.captionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="create-outline" size={20} color="#F4D03F" />
              <Text style={styles.sectionTitle}>Share Your Experience</Text>
            </View>
            <TextInput
              style={styles.captionInput}
              placeholder="Write about your trip... How was the route? Any interesting stops?"
              placeholderTextColor="#999999"
              multiline
              numberOfLines={4}
              maxLength={500}
              value={caption}
              onChangeText={setCaption}
            />
            <View style={styles.captionFooter}>
              <Text style={styles.characterCount}>
                {caption.length}/500 characters
              </Text>
            </View>
          </View>

          {/* Photo Section */}
          <View style={styles.photoCard}>
            <View style={styles.photoHeader}>
              <View style={styles.sectionHeader}>
                <Ionicons name="camera-outline" size={20} color="#F4D03F" />
                <Text style={styles.sectionTitle}>Add Photos</Text>
              </View>
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={handleAddPhoto}
              >
                <Ionicons name="add" size={16} color="#F4D03F" />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            </View>

            {selectedImages.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.photoGrid}>
                  {selectedImages.map((image, index) => (
                    <View key={index} style={styles.photoItem}>
                      <Image
                        source={{ uri: image.uri }}
                        style={styles.photoImage}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        style={styles.removePhoto}
                        onPress={() => removeImage(index)}
                      >
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color="#FF6B6B"
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <View style={styles.emptyPhotoState}>
                <View style={styles.emptyPhotoIcon}>
                  <Ionicons name="camera-outline" size={40} color="#999999" />
                </View>
                <Text style={styles.emptyPhotoText}>No photos added yet</Text>
                <Text style={styles.emptyPhotoSubtext}>
                  Tap "Add Photo" to include images of your trip
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Create Post Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.createButton,
              !caption.trim() &&
                selectedImages.length === 0 &&
                styles.createButtonDisabled,
            ]}
            onPress={createPost}
            disabled={
              isPosting || (!caption.trim() && selectedImages.length === 0)
            }
          >
            {isPosting ? (
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#1A1A1A" />
                <Text style={styles.createButtonText}>Share Post</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1A1A1A",
  },
  container: {
    flex: 1,
    backgroundColor: "#1A1A1A",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginTop: 16,
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A2A",
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: "#2A2A2A",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  previewButton: {
    width: 40,
    height: 40,
    backgroundColor: "#2A2A2A",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  previewButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  tripCard: {
    backgroundColor: "#2A2A2A",
    borderRadius: 16,
    padding: 24,
    marginTop: 24,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tripHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  tripIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: "#3A3A3A",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  tripTitleContainer: {
    flex: 1,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  tripDate: {
    fontSize: 14,
    color: "#999999",
    fontWeight: "500",
  },
  tripStats: {
    flexDirection: "row",
    backgroundColor: "#3A3A3A",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statIconContainer: {
    width: 32,
    height: 32,
    backgroundColor: "#2A2A2A",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#999999",
    marginHorizontal: 16,
    opacity: 0.3,
  },
  statLabel: {
    color: "#999999",
    fontSize: 12,
    marginBottom: 4,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  routeInfo: {
    backgroundColor: "#3A3A3A",
    padding: 16,
    borderRadius: 12,
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  routeLabel: {
    color: "#999999",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  routeText: {
    color: "#4CAF50",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    lineHeight: 16,
  },
  captionCard: {
    backgroundColor: "#2A2A2A",
    borderRadius: 16,
    padding: 24,
    marginTop: 24,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 12,
  },
  captionInput: {
    backgroundColor: "#3A3A3A",
    borderRadius: 12,
    padding: 16,
    color: "#FFFFFF",
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: "top",
    lineHeight: 22,
  },
  captionFooter: {
    marginTop: 12,
  },
  characterCount: {
    color: "#999999",
    fontSize: 12,
    textAlign: "right",
    fontWeight: "500",
  },
  photoCard: {
    backgroundColor: "#2A2A2A",
    borderRadius: 16,
    padding: 24,
    marginTop: 24,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  photoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addPhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3A3A3A",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F4D03F",
  },
  addPhotoText: {
    color: "#F4D03F",
    fontSize: 14,
    marginLeft: 8,
    fontWeight: "600",
  },
  photoGrid: {
    flexDirection: "row",
    gap: 12,
  },
  photoItem: {
    position: "relative",
  },
  photoImage: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: "#3A3A3A",
  },
  removePhoto: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 2,
  },
  emptyPhotoState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyPhotoIcon: {
    width: 80,
    height: 80,
    backgroundColor: "#3A3A3A",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyPhotoText: {
    color: "#999999",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyPhotoSubtext: {
    color: "#999999",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.8,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40, // Reduced padding for TabNavigator
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#2A2A2A",
    backgroundColor: "#1A1A1A",
  },
  createButton: {
    backgroundColor: "#F4D03F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  createButtonDisabled: {
    backgroundColor: "#3A3A3A",
    opacity: 0.6,
  },
  createButtonText: {
    color: "#1A1A1A",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
});
