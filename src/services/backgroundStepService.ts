import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import { Pedometer } from 'expo-sensors';
import * as TaskManager from 'expo-task-manager';

export const BACKGROUND_STEP_TASK = 'BACKGROUND_STEP_TRACKER_TASK';
export const WATER_NOTIFICATION_ID = 'WATER_70_MIN_REMINDER';

// 1. Notification Presentation Rules
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 2. Schedule 70-Minute Water Reminder
export async function scheduleWaterReminders() {
  try {
    await Notifications.cancelScheduledNotificationAsync(WATER_NOTIFICATION_ID).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: WATER_NOTIFICATION_ID,
      content: {
        title: '💧 Hydration Time | HealthGuide AI',
        body: '70 minutes have passed! Drink 1 glass of fresh water (250ml) to stay active.',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        channelId: 'water-reminders',
        seconds: 70 * 60,
        repeats: true,
      } as Notifications.TimeIntervalTriggerInput,
    });
  } catch (error) {
    console.warn('Failed to schedule water reminder:', error);
  }
}

// 3. Background Step Task
TaskManager.defineTask(BACKGROUND_STEP_TASK, async () => {
  try {
    const isAvailable = await Pedometer.isAvailableAsync();
    if (!isAvailable) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const now = new Date();

    const result = await Pedometer.getStepCountAsync(startOfDay, now);
    const stepsToday = result?.steps || 0;

    await AsyncStorage.setItem('@health_steps_today', String(stepsToday));

    const profileRaw = await AsyncStorage.getItem('@health_user_profile');
    const stepGoal = profileRaw ? JSON.parse(profileRaw).stepGoal || 8000 : 8000;

    // Trigger instant step counter status alert
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'HealthGuide AI • Step Tracker',
        body: `🚶 You walked ${stepsToday.toLocaleString()} / ${stepGoal.toLocaleString()} steps today!`,
        sound: false,
        priority: Notifications.AndroidNotificationPriority.LOW,
      },
      trigger: {
        channelId: 'steps-tracking',
      } as Notifications.ChannelAwareTriggerInput,
    });

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.warn('Background step fetch failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// 4. Register Background Task
export async function registerBackgroundStepTracker() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_STEP_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_STEP_TASK, {
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch (err) {
    console.error('Failed to register background task:', err);
  }
}