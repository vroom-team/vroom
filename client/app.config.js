module.exports = {
  name: "client",
  slug: "client",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: false,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    config: {
      googleMapsApiKey: process.env.googleMapsApiKey,
    },
    supportsTablet: true,
    bundleIdentifier: "com.neubri.client",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "This app uses location to track your car touring routes and record your journey.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    config: {
      googleMaps: {
        apiKey: process.env.googleMapsApiKey,
      },
    },
    package: "com.neubri.client",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
    ],
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-secure-store",
    "expo-location",
    "expo-background-task",
    [
      "expo-image-picker",
      {
        photosPermission:
          "The app accesses your photos to let you share them with your friends.",
      },
    ],
  ],
  extra: {
    eas: {
      projectId: "0bf1dd2c-5b4d-4462-8d53-2a9cb0bca75c",
    },
  },
  owner: "neubri",
};
