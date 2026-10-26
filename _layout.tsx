import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Safe inline background and notification helpers (No broken file import paths)
const registerBackgroundStepTracker = async () => {
  try {
    const { Pedometer } = require('expo-sensors');
    const isAvail = await Pedometer.isAvailableAsync().catch(() => false);
    if (isAvail) {
      await Pedometer.getPermissionsAsync().catch(() => {});
    }
  } catch (e) {
    // Suppress hardware pedometer errors in Expo Go
  }
};

const scheduleWaterReminders = async () => {
  try {
    const { status } = await Notifications.getPermissionsAsync().catch(() => ({ status: 'denied' }));
    if (status === 'granted') {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
      const alreadyScheduled = scheduled.some(
        (n) => n.content?.data?.type === 'water_reminder'
      );

      if (!alreadyScheduled) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '💧 Hydration Check (HealthGuide AI)',
            body: 'Drink a glass of water (250ml) to stay on track with your daily goal.',
            sound: true,
            data: { type: 'water_reminder' },
          },
          trigger: {
            seconds: 70 * 60,
            repeats: true,
          },
        }).catch(() => {});
      }
    }
  } catch (e) {
    // Suppress notification scheduler errors
  }
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  // Safely initialize notification channels & hardware background services
  useEffect(() => {
    async function init() {
      try {
        await Notifications.setNotificationChannelAsync('steps-tracking', {
          name: 'Step Tracking & Goals',
          importance: Notifications.AndroidImportance.LOW,
          showBadge: false,
        }).catch(() => {});

        await Notifications.setNotificationChannelAsync('water-reminders', {
          name: 'Hydration Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
        }).catch(() => {});

        await registerBackgroundStepTracker();
        await scheduleWaterReminders();
      } catch (err) {
        // Suppress init warnings
      } finally {
        setIsReady(true);
      }
    }

    init();
  }, []);

  // Auth gatekeeper (Only fires after layout mounts)
  useEffect(() => {
    if (!isReady) return;

    async function checkAuth() {
      try {
        const token = await AsyncStorage.getItem('@health_user_token');
        const setupDone = await AsyncStorage.getItem('@health_profile_completed');
        const currentRoute = segments[0] || '';

        if (!token) {
          if (currentRoute !== 'login' && currentRoute !== 'otp-login') {
            router.replace('/login');
          }
        } else if (setupDone !== 'true') {
          if (currentRoute !== 'profile-setup') {
            router.replace('/profile-setup');
          }
        }
      } catch (err) {
        // Fallback: stay on current view
      }
    }

    checkAuth();
  }, [isReady, segments]);

  return (
    <>
      <StatusBar style="light" backgroundColor="#070C0E" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#090E11',
            borderTopColor: '#141E24',
            height: 64,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarActiveTintColor: '#00E676',
          tabBarInactiveTintColor: '#546E7A',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        {/* 1. HOME */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" color={color} size={size} />
            ),
          }}
        />

        {/* 2. HEALTH */}
        <Tabs.Screen
          name="water-nutrition"
          options={{
            title: 'Health',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="water" color={color} size={size} />
            ),
          }}
        />

        {/* 3. COACH */}
        <Tabs.Screen
          name="coach"
          options={{
            title: 'Coach',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubbles" color={color} size={size} />
            ),
          }}
        />

        {/* 4. EXPLORE */}
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="compass" color={color} size={size} />
            ),
          }}
        />

        {/* 5. EXERCISES */}
        <Tabs.Screen
          name="exercises"
          options={{
            title: 'Exercises',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="weight-lifter" color={color} size={size} />
            ),
          }}
        />

        {/* 6. PROFILE */}
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" color={color} size={size} />
            ),
          }}
        />

        {/* ---- HIDDEN ROUTES (NO BOTTOM TAB BAR ICONS) ---- */}
        <Tabs.Screen
          name="login"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />

        <Tabs.Screen
          name="otp-login"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />

        <Tabs.Screen
          name="welcome"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />

        <Tabs.Screen
          name="profile-setup"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />

        <Tabs.Screen
          name="health-progress"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="character-guide"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="vitals"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="stepService"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </>
  );
}