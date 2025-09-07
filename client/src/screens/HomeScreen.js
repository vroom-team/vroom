import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useContext, useState, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import AuthContext from "../contexts/AuthContext";

export function HomeScreen() {
  const navigation = useNavigation();
  const authContext = useContext(AuthContext);
  const [userName, setUserName] = useState("Explorer");

  // Fetch user data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchUserName();
    }, [])
  );

  const fetchUserName = async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) {
        setUserName("Explorer");
        return;
      }

      const response = await fetch("https://vroom-api.vercel.app/api/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user && data.user.name) {
          setUserName(data.user.name);
        } else {
          setUserName("Explorer");
        }
      } else {
        setUserName("Explorer");
      }
    } catch (error) {
      console.log("Error fetching user name:", error);
      setUserName("Explorer");
    }
  };

  const startQuickRecord = () => {
    Alert.alert("Start Riding", "Ready to start recording your trip?", [
      { text: "Cancel", style: "cancel" },
      { text: "Start", onPress: () => navigation.navigate("RecordScreen") },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.usernameText}>{userName}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate("ProfileScreen")}
          >
            <Ionicons name="person-circle" size={32} color="#F4D03F" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={startQuickRecord}
            >
              <Ionicons name="play-circle" size={24} color="#1a1a1a" />
              <Text style={styles.primaryActionText}>Start Riding</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Getting Started */}
        <View style={styles.gettingStartedContainer}>
          <Text style={styles.sectionTitle}>Getting Started</Text>
          <View style={styles.gettingStartedCard}>
            <Ionicons name="map" size={48} color="#F4D03F" />
            <Text style={styles.gettingStartedTitle}>Start Your Journey</Text>
            <Text style={styles.gettingStartedText}>
              Record your car touring adventures, share your experiences, and
              discover new routes.
            </Text>
            <TouchableOpacity
              style={styles.gettingStartedButton}
              onPress={() => navigation.navigate("RecordScreen")}
            >
              <Text style={styles.gettingStartedButtonText}>
                Record First Trip
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcomeText: {
    color: "#999999",
    fontSize: 14,
    fontWeight: "400",
  },
  usernameText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 4,
  },
  profileButton: {
    padding: 8,
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3a3a3a",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 120, // Extra padding for TabNavigator
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  quickActionsContainer: {
    marginTop: 20,
    marginBottom: 32,
  },
  quickActions: {
    gap: 16,
  },
  primaryAction: {
    backgroundColor: "#F4D03F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
    shadowColor: "#F4D03F",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryActionText: {
    color: "#1a1a1a",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  secondaryActionText: {
    color: "#F4D03F",
    fontSize: 12,
    fontWeight: "500",
  },
  gettingStartedContainer: {
    marginBottom: 32,
  },
  gettingStartedCard: {
    backgroundColor: "#2a2a2a",
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
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
  gettingStartedTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 12,
  },
  gettingStartedText: {
    color: "#999999",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  gettingStartedButton: {
    backgroundColor: "#F4D03F",
    paddingVertical: 14,
    paddingHorizontal: 28,
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
  gettingStartedButtonText: {
    color: "#1a1a1a",
    fontSize: 16,
    fontWeight: "600",
  },
});
