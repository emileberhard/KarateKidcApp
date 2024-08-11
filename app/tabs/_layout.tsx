import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { Colors } from '@/constants/Colors';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false, // This will hide the header for all tab screens
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false, // This will hide the header for the Home tab
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          tabBarLabel: 'Hem',
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          tabBarIcon: ({ color }) => <TabBarIcon name="people" color={color} />,
          tabBarLabel: 'Admin',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color }) => <TabBarIcon name="settings" color={color} />,
          tabBarLabel: 'Inställningar',
        }}
      />
    </Tabs>
  );
}