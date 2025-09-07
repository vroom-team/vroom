import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function RegisterScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  const [input, setInput] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleChange = (text, key) => {
    setInput({
      ...input,
      [key]: text,
    });
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "https://vroom-api.vercel.app/api/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        }
      );

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          "Registration Successful",
          "Your account has been created successfully. Please log in.",
          [{ text: "OK", onPress: () => navigation.navigate("LoginScreen") }]
        );
      } else {
        Alert.alert(
          "Registration Failed",
          data.message || "Registration failed. Please try again."
        );
      }
    } catch (error) {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="navigate-circle" size={85} color="#F4D03F" />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join us and start your journey</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#CCCCCC"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={input.name}
                  onChangeText={(text) => handleChange(text, "name")}
                  placeholder="Enter your full name"
                  placeholderTextColor="#666666"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#CCCCCC"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={input.email}
                  onChangeText={(text) => handleChange(text, "email")}
                  placeholder="Enter your email"
                  placeholderTextColor="#666666"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#CCCCCC"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={input.password}
                  onChangeText={(text) => handleChange(text, "password")}
                  placeholder="Create a strong password"
                  placeholderTextColor="#666666"
                  secureTextEntry={true}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#2C3E50" size="small" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Create Account</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color="#2C3E50"
                    style={styles.buttonIcon}
                  />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.switchAuthContainer,
                loading && styles.linkDisabled,
              ]}
              onPress={() => navigation.navigate("LoginScreen")}
              disabled={loading}
            >
              <Text style={styles.switchAuthText}>
                Already have an account?{" "}
              </Text>
              <Text style={styles.switchAuthLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#999999",
    textAlign: "center",
    lineHeight: 24,
  },
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    paddingHorizontal: 16,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  button: {
    backgroundColor: "#F4D03F",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 32,
    shadowColor: "#F4D03F",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.2,
  },
  buttonText: {
    color: "#1a1a1a",
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  switchAuthContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
  },
  linkDisabled: {
    opacity: 0.5,
  },
  switchAuthText: {
    color: "#888888",
    fontSize: 16,
  },
  switchAuthLink: {
    color: "#F4D03F",
    fontSize: 16,
    fontWeight: "600",
  },
});
