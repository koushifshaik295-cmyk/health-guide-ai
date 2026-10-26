import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router } from 'expo-router';
import { Pedometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export interface StepMetrics {
  steps: number;
  calories: number;
  distanceKm: number;
  goal: number;
  progressPercent: number;
}

const STORAGE_KEYS = {
  DAILY_STEPS: '@health_guide_daily_steps',
  STEP_GOAL: '@health_guide_step_goal',
  LAST_DATE: '@health_guide_last_date',
};

const DEFAULT_STEP_GOAL = 10000;
const CALORIES_PER_STEP = 0.04;
const KM_PER_STEP = 0.000762;
const XP_TO_NEXT_LEVEL = 100;

function calculateMetrics(steps: number, goal: number = DEFAULT_STEP_GOAL): StepMetrics {
  const safeSteps = Math.max(0, steps);
  const safeGoal = goal > 0 ? goal : DEFAULT_STEP_GOAL;
  const calories = Math.round(safeSteps * CALORIES_PER_STEP);
  const distanceKm = parseFloat((safeSteps * KM_PER_STEP).toFixed(2));
  const progressPercent = Math.min(100, Math.round((safeSteps / safeGoal) * 100));

  return { steps: safeSteps, calories, distanceKm, goal: safeGoal, progressPercent };
}

function calculateXP(steps: number): number {
  return Math.floor(Math.max(0, steps) / 20);
}

async function getCachedStepsOnly(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_STEPS);
    return stored ? parseInt(stored, 10) : 1250;
  } catch {
    return 1250;
  }
}

async function syncOfflineHardwareSteps(): Promise<number> {
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const lastDate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_DATE);
    if (lastDate !== todayStr) {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_DATE, todayStr);
      await AsyncStorage.setItem(STORAGE_KEYS.DAILY_STEPS, '0');
    }
  } catch (e) {
    console.warn('Could not read/write date storage:', e);
  }

  try {
    const isAvailable = await Pedometer.isAvailableAsync();
    if (isAvailable) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const now = new Date();

      const response = await Pedometer.getStepCountAsync(startOfDay, now);
      if (response && typeof response.steps === 'number') {
        await AsyncStorage.setItem(STORAGE_KEYS.DAILY_STEPS, response.steps.toString());
        return response.steps;
      }
    }
  } catch {
    // Sensor reading unsupported on current environment / Expo Go client
  }

  const stored = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_STEPS);
  return stored ? parseInt(stored, 10) : 1250;
}

export default function CharacterGuideScreen() {
  const [metrics, setMetrics] = useState<StepMetrics | null>(null);
  const [level, setLevel] = useState<number>(1);
  const [xp, setXp] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const goalRef = useRef<number>(DEFAULT_STEP_GOAL);
  const currentTotalStepsRef = useRef<number>(0);

  const updateStateWithSteps = (totalSteps: number) => {
    currentTotalStepsRef.current = totalSteps;
    const computedMetrics = calculateMetrics(totalSteps, goalRef.current);
    setMetrics(computedMetrics);

    const totalXP = calculateXP(totalSteps);
    setLevel(Math.floor(totalXP / XP_TO_NEXT_LEVEL) + 1);
    setXp(totalXP % XP_TO_NEXT_LEVEL);
  };

  useEffect(() => {
    let watchSubscription: { remove: () => void } | null = null;

    async function initialize() {
      try {
        const isAvailable = await Pedometer.isAvailableAsync();

        if (isAvailable) {
          try {
            await Pedometer.requestPermissionsAsync();
          } catch {
            // Android string resource ID #0xffffffff bypass in Expo Go
          }
        }

        const storedGoal = await AsyncStorage.getItem(STORAGE_KEYS.STEP_GOAL);
        goalRef.current = storedGoal ? parseInt(storedGoal, 10) : DEFAULT_STEP_GOAL;

        const totalTodaySteps = await syncOfflineHardwareSteps();
        updateStateWithSteps(totalTodaySteps);

        if (isAvailable) {
          try {
            watchSubscription = Pedometer.watchStepCount(async (result) => {
              if (result && typeof result.steps === 'number') {
                const updated = currentTotalStepsRef.current + result.steps;
                await AsyncStorage.setItem(STORAGE_KEYS.DAILY_STEPS, updated.toString());
                updateStateWithSteps(updated);
              }
            });
          } catch (e) {
            console.warn('Real-time sensor subscription bypassed:', e);
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.warn('Sensor initialization fallback triggered:', err);
        const fallback = await getCachedStepsOnly();
        updateStateWithSteps(fallback);
        setIsLoading(false);
      }
    }

    initialize();

    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const resyncedSteps = await syncOfflineHardwareSteps();
        updateStateWithSteps(resyncedSteps);
      }
    };

    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (watchSubscription) watchSubscription.remove();
      appStateSub.remove();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingCenter]}>
        <ActivityIndicator size="large" color="#00E676" />
        <Text style={styles.loadingText}>Syncing pedometer sensors...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Screen Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Health Guide AI</Text>
        <Text style={styles.subtitle}>Level {level} Companion</Text>
      </View>

      {/* Center Character Area */}
      <View style={styles.characterContainer}>
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
          }}
          style={styles.characterImage}
          resizeMode="cover"
        />
        <View style={styles.platformShadow} />
      </View>

      {/* Stats Dashboard Card */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Today's Activity Vitals</Text>

        {/* Step Progress Bar */}
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>STEPS</Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${metrics ? metrics.progressPercent : 0}%` },
              ]}
            />
          </View>
          <Text style={styles.statValue}>
            {metrics ? metrics.steps.toLocaleString() : '0'}
          </Text>
        </View>

        {/* Metrics Grid */}
        <View style={styles.dataGrid}>
          <View style={styles.dataBlock}>
            <Text style={styles.dataValue}>{metrics ? metrics.calories : 0}</Text>
            <Text style={styles.dataLabel}>KCAL ESTIMATE</Text>
          </View>

          <View style={styles.dataBlock}>
            <Text style={styles.dataValue}>{metrics ? metrics.distanceKm : 0}</Text>
            <Text style={styles.dataLabel}>DISTANCE (KM)</Text>
          </View>

          <View style={styles.dataBlock}>
            <Text style={styles.dataValue}>
              {xp}/{XP_TO_NEXT_LEVEL}
            </Text>
            <Text style={styles.dataLabel}>LEVEL XP</Text>
          </View>
        </View>

        {/* Action Button: Routes to Vitals Screen */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/vitals')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C0D',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  loadingCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 15,
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#00E676',
    marginTop: 4,
    fontWeight: '600',
  },
  characterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 10,
  },
  characterImage: {
    width: 260,
    height: 320,
    borderRadius: 24,
    zIndex: 2,
  },
  platformShadow: {
    position: 'absolute',
    bottom: 10,
    width: 200,
    height: 18,
    backgroundColor: 'rgba(0, 230, 118, 0.25)',
    borderRadius: 100,
    transform: [{ scaleX: 1.4 }],
    zIndex: 1,
  },
  statsCard: {
    backgroundColor: '#111818',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#172428',
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statLabel: {
    color: '#94A3B8',
    width: 55,
    fontWeight: '700',
    fontSize: 12,
  },
  statValue: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    width: 65,
    textAlign: 'right',
  },
  progressBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: '#1C282A',
    borderRadius: 5,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00E676',
    borderRadius: 5,
  },
  dataGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#172428',
  },
  dataBlock: {
    alignItems: 'center',
    flex: 1,
  },
  dataValue: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 4,
  },
  dataLabel: {
    color: '#64748B',
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#00E676',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#080C0D',
    fontWeight: '800',
    fontSize: 16,
  },
});