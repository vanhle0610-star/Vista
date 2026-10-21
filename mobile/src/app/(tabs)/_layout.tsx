import React from 'react';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0284C7',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
        },
      }}
    >
      <Tabs.Screen name="discover" options={{ title: 'Khám phá' }} />
      <Tabs.Screen name="trips" options={{ title: 'Chuyến đi' }} />
      <Tabs.Screen name="treasury" options={{ title: 'Treasury' }} />
      <Tabs.Screen name="ai-planner" options={{ title: 'AI Concierge' }} />
      <Tabs.Screen name="profile" options={{ title: 'Hồ sơ' }} />
    </Tabs>
  );
}
