import React from "react";
import { Tabs } from "expo-router";
import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";

export default function TabLayout() {
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
        tabBarActiveTintColor: Colors.dark.primary,
        tabBarStyle: { backgroundColor: "black", borderTopWidth: 0},
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          tabBarLabel: "Nollning",
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="people" color={color} />,
          tabBarLabel: "Phadder",
        }}
      />
    </Tabs>
  );
}