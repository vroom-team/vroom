import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HomeScreen } from "../screens/HomeScreen";
import { Ionicons } from "@expo/vector-icons";
import PostNavigator from "./PostNavigator";
import WishlistScreen from "../screens/WishlistScreen";
import AIScreen from "../screens/AIScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { View } from "react-native";

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: {
          backgroundColor: "#2a2a2a",
          borderTopWidth: 0,
          paddingTop: 0,
          paddingBottom: 0,
          paddingHorizontal: 32,
          height: 70,
          marginHorizontal: 40,
          marginBottom: 30,
          borderRadius: 35,
          position: "absolute",
          elevation: 15,
          shadowColor: "#000000",
          shadowOffset: {
            width: 0,
            height: 8,
          },
          shadowOpacity: 0.4,
          shadowRadius: 16,
        },
        tabBarActiveTintColor: "#F4D03F",
        tabBarInactiveTintColor: "#888888",
        tabBarShowLabel: false,
        headerShown: false,
        tabBarLabelPosition: "beside-icon",
        tabBarItemStyle: {
          height: 70,
          justifyContent: "center",
          alignItems: "center",
          paddingTop: 10,
          paddingBottom: 10,
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
        },
      })}
    >
      <Tab.Screen
        name="PostNavigator"
        component={PostNavigator}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={{
                backgroundColor: focused ? "#F4D03F" : "transparent",
                borderRadius: 25,
                width: 50,
                height: 50,
                justifyContent: "center",
                alignItems: "center",
                transform: [{ translateY: 0 }],
              }}
            >
              <Ionicons
                name="grid"
                size={22}
                color={focused ? "#2a2a2a" : "#FFFFFF"}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={{
                backgroundColor: focused ? "#F4D03F" : "transparent",
                borderRadius: 25,
                width: 50,
                height: 50,
                justifyContent: "center",
                alignItems: "center",
                transform: [{ translateY: 0 }],
              }}
            >
              <Ionicons
                name="heart"
                size={22}
                color={focused ? "#2a2a2a" : "#FFFFFF"}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={{
                backgroundColor: focused ? "#F4D03F" : "transparent",
                borderRadius: 25,
                width: 50,
                height: 50,
                justifyContent: "center",
                alignItems: "center",
                transform: [{ translateY: 0 }],
              }}
            >
              <Ionicons
                name="radio-button-on"
                size={22}
                color={focused ? "#2a2a2a" : "#FFFFFF"}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="AIScreen"
        component={AIScreen}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={{
                backgroundColor: focused ? "#F4D03F" : "transparent",
                borderRadius: 25,
                width: 50,
                height: 50,
                justifyContent: "center",
                alignItems: "center",
                transform: [{ translateY: 0 }],
              }}
            >
              <Ionicons
                name="sparkles"
                size={22}
                color={focused ? "#2a2a2a" : "#FFFFFF"}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={{
                backgroundColor: focused ? "#F4D03F" : "transparent",
                borderRadius: 25,
                width: 50,
                height: 50,
                justifyContent: "center",
                alignItems: "center",
                transform: [{ translateY: 0 }],
              }}
            >
              <Ionicons
                name="person"
                size={22}
                color={focused ? "#2a2a2a" : "#FFFFFF"}
              />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
