import React from "react";
import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";
import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();

  if (!user?.admin) {
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
        }}
      >
        <Tabs.Screen name="index" />
      </Tabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].primary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          tabBarLabel: "Hem",
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          tabBarIcon: ({ color }) => <TabBarIcon name="people" color={color} />,
          tabBarLabel: "Admin",
        }}
      />
    </Tabs>
  );
}
