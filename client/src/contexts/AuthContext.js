import { createContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (token) {
        setIsSignedIn(true);
      }
    } catch (error) {
      console.log("Error checking auth status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token) => {
    try {
      await SecureStore.setItemAsync("access_token", token);
      setIsSignedIn(true);
    } catch (error) {
      console.log("Error saving token:", error);
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync("access_token");
      setIsSignedIn(false);
    } catch (error) {
      console.log("Error removing token:", error);
    }
  };

  const value = {
    isSignedIn,
    isLoading,
    login,
    logout,
    setIsSignedIn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
