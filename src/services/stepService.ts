import { Pedometer } from 'expo-sensors';

export interface StepMetrics {
  steps: number;
  calories: number;
  distanceKm: number;
  goal: number;
}

export async function requestAllPermissions(): Promise<boolean> {
  try {
    const { granted } = await Pedometer.requestPermissionsAsync();
    return granted;
  } catch (error) {
    console.warn('Error requesting pedometer permissions:', error);
    return false;
  }
}

export async function setupStepNotificationChannel(): Promise<void> {
  return;
}

export async function updateStepNotification(steps: number, goal: number = 10000): Promise<void> {
  return;
}

export function subscribeToLiveSteps(callback: (steps: number) => void) {
  return Pedometer.watchStepCount((result) => {
    callback(result.steps);
  });
}
