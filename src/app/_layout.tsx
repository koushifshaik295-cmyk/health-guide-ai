import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';

SplashScreen.preventAutoHideAsync().catch(() => {});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const router = useRouter();

  const [isReady, setIsReady] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isProfileFinished, setIsProfileFinished] = useState<boolean>(false);

  useEffect(() => {
    async function configureChannels() {
      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('pedometer_live', {
            name: 'Live Step Tracker',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0],
            enableVibrate: false,
            sound: undefined,
            showBadge: false,
          });

          await Notifications.setNotificationChannelAsync('hydration_alerts', {
            name: 'Hydration Reminders',
            importance: Notifications.AndroidImportance.DEFAULT,
            sound: undefined,
            showBadge: true,
          });
        } catch (e) {}
      }
    }
    configureChannels();
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const [token, session, completed] = await Promise.all([
        AsyncStorage.getItem('@health_user_token'),
        AsyncStorage.getItem('@health_user_session'),
        AsyncStorage.getItem('@health_profile_completed'),
      ]);

      const isAuthed = Boolean(token || session);
      setIsAuthenticated(isAuthed);
      setIsProfileFinished(completed === 'true');
      return isAuthed;
    } catch (e) {
      setIsAuthenticated(false);
      setIsProfileFinished(false);
      return false;
    } finally {
      setIsReady(true);
      try {
        await SplashScreen.hideAsync();
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Intercept back actions safely so Android back never exits the app
  // Intercept back actions safely so Android back always keeps the tab bar
  // Intercept back actions safely
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        try {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/');
          }
        } catch (error) {
          router.replace('/');
        }
        return true;
      }
    );

    return () => subscription.remove();
  }, [router]);
  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#080C0D" translucent={false} />
        <ActivityIndicator size="large" color="#00E676" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080C0D" translucent={false} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#080C0D' },
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C0D',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#080C0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
});