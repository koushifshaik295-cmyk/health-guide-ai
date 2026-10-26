import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Accelerometer, Pedometer } from 'expo-sensors';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  BackHandler,
  NativeModules,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { StepBridgeModule } = NativeModules;

export default function StepServiceScreen() {
  const router = useRouter();

  const [stepCount, setStepCount] = useState<number>(0);
  const [stepGoal] = useState<number>(8000);
  const [sensorStatus, setSensorStatus] = useState<string>('Active');

  const caloriesBurned = Math.round(stepCount * 0.042);
  const distanceKm = (stepCount * 0.00078).toFixed(2);
  const activeMinutes = Math.round(stepCount / 115);

  const handleSafeBack = () => {
    BackHandler.exitApp();
  };

  // Sync steps collected natively while the app was closed/offline
  const syncNativeOfflineSteps = async (): Promise<number> => {
    try {
      if (Platform.OS === 'android' && StepBridgeModule?.getOfflineSteps) {
        const offlineHardwareSteps: number = await StepBridgeModule.getOfflineSteps();
        if (offlineHardwareSteps > 0) {
          const cached = await AsyncStorage.getItem('@health_steps');
          const currentCached = cached ? parseInt(cached, 10) || 0 : 0;
          const finalCount = Math.max(currentCached, offlineHardwareSteps);
          await AsyncStorage.setItem('@health_steps', finalCount.toString());
          setStepCount(finalCount);
          setSensorStatus('Hardware Sensor Active (Synced Offline)');
          return finalCount;
        }
      }
    } catch (e) {
      console.warn('Native step sync error:', e);
    }
    return 0;
  };

  useEffect(() => {
    let isMounted = true;
    let subscription: any = null;
    let lastMagnitude = 0;
    let isCooldown = false;

    // Hardware back press exits the app
    const onHardwareBack = () => {
      BackHandler.exitApp();
      return true;
    };
    const backSub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);

    const initTracker = async () => {
      // 1. Sync from native background hardware sensor first
      const nativeSynced = await syncNativeOfflineSteps();

      // 2. Load cached count if native module wasn't higher
      if (nativeSynced === 0) {
        const cached = await AsyncStorage.getItem('@health_steps');
        if (cached && isMounted) {
          setStepCount(parseInt(cached, 10) || 0);
        }
      }

      // 3. Request permission & setup sensor for active foreground tracking
      try {
        const perm = await Pedometer.requestPermissionsAsync();
        const available = await Pedometer.isAvailableAsync();

        if (perm.granted && available) {
          setSensorStatus('Hardware Sensor Active');
          subscription = Pedometer.watchStepCount((result: any) => {
            if (!isMounted) return;
            setStepCount((prev) => {
              const updated = prev + (result.steps || 1);
              AsyncStorage.setItem('@health_steps', updated.toString());
              return updated;
            });
          });
        } else {
          // Fallback motion tracker via Accelerometer
          setSensorStatus('Motion Detection Active');
          Accelerometer.setUpdateInterval(120);
          subscription = Accelerometer.addListener(({ x, y, z }: any) => {
            if (!isMounted) return;
            const magnitude = Math.sqrt(x * x + y * y + z * z);
            const delta = Math.abs(magnitude - lastMagnitude);
            lastMagnitude = magnitude;

            if (delta > 0.38 && !isCooldown) {
              isCooldown = true;
              setStepCount((prev) => {
                const updated = prev + 1;
                AsyncStorage.setItem('@health_steps', updated.toString());
                return updated;
              });
              setTimeout(() => {
                isCooldown = false;
              }, 300);
            }
          });
        }
      } catch (err: any) {
        setSensorStatus('Sensor Offline');
      }
    };

    initTracker();

    // Re-sync offline steps whenever user opens/resumes app
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncNativeOfflineSteps();
      }
    });

    return () => {
      isMounted = false;
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
      appStateSub.remove();
      backSub.remove();
    };
  }, []);

  const handleReset = () => {
    Alert.alert('Reset Steps', 'Reset step count back to 0 for today?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          setStepCount(0);
          await AsyncStorage.setItem('@health_steps', '0');
          if (Platform.OS === 'android' && StepBridgeModule?.resetStepOffset) {
            try {
              await StepBridgeModule.resetStepOffset();
            } catch (err) {
              console.warn('Could not reset native step offset:', err);
            }
          }
        },
      },
    ]);
  };

  const progressPercent = Math.min(Math.round((stepCount / stepGoal) * 100), 100);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080C0D" translucent={false} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleSafeBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Daily Step Tracker</Text>
          <Text style={styles.statusText}>{sensorStatus}</Text>
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.7}>
          <Ionicons name="refresh" size={18} color="#FF5252" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.mainCard}>
          <Text style={styles.cardHeaderTitle}>Stride Summary</Text>

          <View style={styles.circleDisplay}>
            <MaterialCommunityIcons name="shoe-print" size={40} color="#00E676" />
            <Text style={styles.stepCountText}>{stepCount.toLocaleString()}</Text>
            <Text style={styles.stepGoalText}>Target: {stepGoal.toLocaleString()} steps</Text>
            <Text style={styles.percentageText}>{progressPercent}% achieved</Text>
          </View>

          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          <View style={styles.metricsTriplet}>
            <View style={styles.metricItem}>
              <Ionicons name="flame" size={20} color="#FF6E40" />
              <Text style={styles.metricValue}>{caloriesBurned}</Text>
              <Text style={styles.metricLabel}>kcal</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.metricItem}>
              <Ionicons name="navigate-outline" size={20} color="#00E676" />
              <Text style={styles.metricValue}>{distanceKm}</Text>
              <Text style={styles.metricLabel}>km</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.metricItem}>
              <Ionicons name="time-outline" size={20} color="#40C4FF" />
              <Text style={styles.metricValue}>{activeMinutes}</Text>
              <Text style={styles.metricLabel}>min</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C0D',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 44 : 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#0C1315',
    borderBottomWidth: 1,
    borderBottomColor: '#172225',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#162024',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#162024',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusText: {
    fontSize: 11,
    color: '#00E676',
    marginTop: 2,
  },
  scrollContent: {
    padding: 18,
  },
  mainCard: {
    backgroundColor: '#121A1C',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1D2A2E',
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  circleDisplay: {
    alignItems: 'center',
    marginVertical: 14,
  },
  stepCountText: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 6,
  },
  stepGoalText: {
    fontSize: 13,
    color: '#8A999E',
    marginTop: 4,
  },
  percentageText: {
    fontSize: 13,
    color: '#00E676',
    fontWeight: '700',
    marginTop: 4,
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#1A2426',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00E676',
    borderRadius: 5,
  },
  metricsTriplet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1A2427',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricLabel: {
    fontSize: 11,
    color: '#8A999E',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#1E2A2E',
  },
});