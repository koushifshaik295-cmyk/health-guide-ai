import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Requests notification permissions and registers high-priority Android channel.
 */
export async function registerForPushNotificationsAsync(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('hero-hydration', {
      name: 'Hero Water Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#00E676',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      sound: 'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * Schedules a recurring offline notification every 70 minutes.
 */
export async function scheduleHeroWaterReminder(): Promise<void> {
  const hasPermission = await registerForPushNotificationsAsync();
  if (!hasPermission) {
    console.warn('Notification permissions not granted');
    return;
  }

  // Clear older recurring reminders to avoid duplicate alerts
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Schedule offline recurring reminder (70 minutes = 4200 seconds)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚨 Hero Reminder: Drink Water! 💧',
      body: '70 minutes have passed! Take a water break now to maintain your peak energy.',
      sound: true,
      data: {
        type: 'water_reminder',
        interval: 70,
      },
    },
    trigger: {
      channelId: 'hero-hydration',
      seconds: 70 * 60,
      repeats: true,
    },
  });
}

// Backward-compatible export matching existing HomeScreen imports
export const schedule70MinWaterReminder = scheduleHeroWaterReminder;