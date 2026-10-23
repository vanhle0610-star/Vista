import React from 'react';
import { Tabs } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { tokens } from '../../theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.colors.primary,
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          height: 56,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Khám phá',
          tabBarIcon: ({ color }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
              <Path
                d="M 16.24 7.76 L 14.12 14.12 L 7.76 16.24 L 9.88 9.88 Z"
                stroke={color}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ),
        }}
      />

      <Tabs.Screen
        name="trips"
        options={{
          title: 'Chuyến đi',
          tabBarIcon: ({ color }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path
                d="M 3 7 C 3 5.895 3.895 5 5 5 L 19 5 C 20.105 5 21 5.895 21 7 L 21 19 C 21 20.105 20.105 21 19 21 L 5 21 C 3.895 21 3 20.105 3 19 Z"
                stroke={color}
                strokeWidth="2"
              />
              <Path
                d="M 8 5 V 3 C 8 2.448 8.448 2 9 2 L 15 2 C 15.552 2 16 2.448 16 3 V 5"
                stroke={color}
                strokeWidth="2"
              />
            </Svg>
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: 'Bản đồ',
          tabBarIcon: ({ color }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 22s8-8 8-14a8 8 0 1 0-16 0c0 6 8 14 8 14Z"
                stroke={color}
                strokeWidth="2"
              />
              <Circle cx="12" cy="8" r="3" stroke={color} strokeWidth="2" />
            </Svg>
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Cộng đồng',
          tabBarIcon: ({ color }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path
                d="M 21 11.5 C 21.003 12.819 20.612 14.108 19.873 15.207 C 19.133 16.305 18.077 17.166 16.834 17.684 C 15.59 18.203 14.214 18.356 12.876 18.125 C 11.538 17.893 10.297 17.288 9.303 16.383 L 3 18 L 4.617 11.697 C 3.712 10.703 3.107 9.462 2.875 8.124 C 2.644 6.786 2.797 5.41 3.316 4.166 C 3.834 2.923 4.695 1.867 5.793 1.127 C 6.892 0.388 8.181 -0.003 9.5 0 L 14.5 0 C 18.09 0 21 2.91 21 6.5 Z"
                stroke={color}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ),
        }}
      />

      <Tabs.Screen
        name="ai-planner"
        options={{
          title: 'AI Planner',
          tabBarIcon: ({ color }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path
                d="M 12 2 L 14.5 9.5 L 22 12 L 14.5 14.5 L 12 22 L 9.5 14.5 L 2 12 L 9.5 9.5 Z"
                stroke={color}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color }) => (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path
                d="M 20 21 V 19 C 20 16.791 18.209 15 16 15 H 8 C 5.791 15 4 16.791 4 19 V 21"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2" />
            </Svg>
          ),
        }}
      />

      {/* Internal sub-screens accessible via routing */}
      <Tabs.Screen
        name="treasury"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
