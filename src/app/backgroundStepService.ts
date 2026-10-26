import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import { Pedometer } from 'expo-sensors';
import * as TaskManager from 'expo-task-manager';

export const BACKGROUND_STEP_TASK = 'BACKGROUND_STEP_TRACKER_TASK';

// Define the background task to run completely offline
TaskManager.defineTask(BACKGROUND_STEP_TASK, async () => {
  try {
    const isAvailable = await Pedometer.isAvailableAsync();
    if (!isAvailable) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const now = new Date();

    // Query physical motion sensor directly from phone hardware
    const result = await Pedometer.getStepCountAsync(startOfDay, now);
    const stepsToday = result?.steps || 0;

    // Save offline immediately
    await AsyncStorage.setItem('@health_steps_today', String(stepsToday));

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.warn('Offline step tracking error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register background task so it executes when closed or offline
export async function registerBackgroundStepTracker() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_STEP_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_STEP_TASK, {
        minimumInterval: 15 * 60, // runs periodically in background
        stopOnTerminate: false,   // continue tracking when app is closed
        startOnBoot: true,        // start when phone restarts
      });
    }
  } catch (err) {
    console.error('Failed to register offline background step task:', err);
  }
}

// 70-Minute Water Reminder (runs locally, zero internet required)
export async function scheduleWaterReminders() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💧 Time to Hydrate!',
        body: 'Stay energized and healthy. Drink a glass of water now!',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        seconds: 70 * 60,
        repeats: true,
        channelId: 'water-reminders',
      } as Notifications.ChannelAwareTriggerInput,
    });
  } catch (error) {
    console.warn('Error scheduling water reminders:', error);
  }
}