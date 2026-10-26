import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useRouter } from 'expo-router';
import { Accelerometer, Pedometer } from 'expo-sensors';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    AppState,
    AppStateStatus,
    BackHandler,
    DeviceEventEmitter,
    Dimensions,
    Easing,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const STICKY_NOTIFICATION_ID = 'healthguide-pedometer-live-status';
const STORAGE_KEY_WATER = '@health_daily_water';
const STORAGE_KEY_LAST_SIP = '@health_last_drink_timestamp';
const REMINDER_INTERVAL_MS = 70 * 60 * 1000;

const HERO_GIFS: Record<string, any> = {
  peddi: require('../../assets/hero.gif'),
  pushpa: require('../../assets/hero1.gif'),
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

interface DayStepRecord {
  date: string;
  steps: number;
}

export default function HomeScreen() {
  const router = useRouter();

  // Profile
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Active Hero Selection
  const [selectedHeroId, setSelectedHeroId] = useState<string>('peddi');

  // Hydration Prompt & Character Animation State
  const [showDrinkReminder, setShowDrinkReminder] = useState<boolean>(true);
  const [showCharacter, setShowCharacter] = useState<boolean>(false);

  // Animated translation for sliding in from bottom and exiting back down
  const heroSlideY = useRef(new Animated.Value(300)).current;

  // Step Counter States
  const [dailySteps, setDailySteps] = useState<number>(1);
  const [weeklyTotal, setWeeklyTotal] = useState<number>(0);
  const [monthlyTotal, setMonthlyTotal] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month'>('today');

  // Hydration Widget States
  const [waterGlasses, setWaterGlasses] = useState<number>(0);

  // Goals
  const [stepGoal, setStepGoal] = useState<number>(8000);
  const [waterTargetGlasses, setWaterTargetGlasses] = useState<number>(8);
  const [userStrideLengthCm, setUserStrideLengthCm] = useState<number>(78);
  const [userWeightKg, setUserWeightKg] = useState<number>(70);
  const weeklyGoal = 50000;
  const monthlyGoal = 200000;

  useEffect(() => {
    const onHardwareBack = () => {
      BackHandler.exitApp();
      return true;
    };
    const backSub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => backSub.remove();
  }, []);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('onWaterUpdated', (newCount: number) => {
      setWaterGlasses(newCount);
    });
    return () => sub.remove();
  }, []);

  const safePush = (targetRoute: string) => {
    try {
      router.push(targetRoute as any);
    } catch (err) {
      console.warn(`Could not navigate to: ${targetRoute}`, err);
    }
  };

  const getTodayDateKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const checkDrinkReminderTimer = async () => {
    try {
      const lastSipStr = await AsyncStorage.getItem(STORAGE_KEY_LAST_SIP);
      const now = Date.now();

      if (!lastSipStr) {
        await AsyncStorage.setItem(STORAGE_KEY_LAST_SIP, now.toString());
      } else {
        const lastSip = parseInt(lastSipStr, 10);
        if (now - lastSip >= REMINDER_INTERVAL_MS) {
          setShowDrinkReminder(true);
        }
      }
    } catch (e) {
      console.warn('Drink reminder timer check error:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      async function syncProfileData() {
        try {
          const savedImage = await AsyncStorage.getItem('@health_profile_image');
          if (savedImage) setProfileImage(savedImage);

          const savedHero = await AsyncStorage.getItem('@selected_water_hero_id');
          if (savedHero === 'pushpa') {
            setSelectedHeroId('pushpa');
          } else {
            setSelectedHeroId('peddi');
          }

          const savedGoal =
            (await AsyncStorage.getItem('@health_step_goal')) ||
            (await AsyncStorage.getItem('@daily_step_target'));
          if (savedGoal) {
            const parsed = parseInt(savedGoal.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(parsed) && parsed > 0) setStepGoal(parsed);
          }

          const savedStride = await AsyncStorage.getItem('@health_stride_length');
          if (savedStride) {
            const parsedStride = parseFloat(savedStride);
            if (!isNaN(parsedStride) && parsedStride > 30) setUserStrideLengthCm(parsedStride);
          }

          const rawProfile = await AsyncStorage.getItem('@health_user_profile');
          if (rawProfile) {
            const parsedProfile = JSON.parse(rawProfile);
            if (parsedProfile?.weightKg) setUserWeightKg(parsedProfile.weightKg);
          }

          const savedWaterGoal =
            (await AsyncStorage.getItem('@health_water_goal')) ||
            (await AsyncStorage.getItem('@daily_water_target'));
          if (savedWaterGoal) {
            const parsedWater = parseInt(savedWaterGoal.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(parsedWater) && parsedWater > 0) {
              const targetGlasses = parsedWater > 20 ? Math.round(parsedWater / 250) : parsedWater;
              setWaterTargetGlasses(targetGlasses);
            }
          }

          const storedWater =
            (await AsyncStorage.getItem(STORAGE_KEY_WATER)) ||
            (await AsyncStorage.getItem('@daily_water_count')) ||
            (await AsyncStorage.getItem('@health_water_count'));
          if (storedWater !== null) setWaterGlasses(parseInt(storedWater, 10));

          const storedSteps = await AsyncStorage.getItem('@health_steps_today');
          if (storedSteps) setDailySteps(parseInt(storedSteps, 10));

          await checkDrinkReminderTimer();
        } catch (e) {
          console.warn('Sync error on focus:', e);
        }
      }

      syncProfileData();
    }, [])
  );

  const updatePersistentNotification = async (currentSteps: number) => {
    if (Platform.OS !== 'android') return;

    const cal = Math.round(currentSteps * (userWeightKg * 0.00057));
    const dist = ((currentSteps * userStrideLengthCm) / 100000).toFixed(2);
    const progress = Math.min(Math.round((currentSteps / stepGoal) * 100), 100);

    try {
      await Notifications.setNotificationChannelAsync('pedometer_live', {
        name: 'Live Step Tracker',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0],
        enableVibrate: false,
        sound: undefined,
        showBadge: false,
      });

      await Notifications.scheduleNotificationAsync({
        identifier: STICKY_NOTIFICATION_ID,
        content: {
          title: `👟 ${currentSteps.toLocaleString()} / ${stepGoal.toLocaleString()} Steps (${progress}%)`,
          body: `🔥 ${cal} kcal  •  📍 ${dist} km  •  Active Offline`,
          sticky: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          sound: false,
        },
        trigger: null,
      });
    } catch (e) {}
  };

  const saveStepHistoryRecord = async (dateKey: string, steps: number) => {
    try {
      const raw = await AsyncStorage.getItem('@health_step_records');
      let records: DayStepRecord[] = raw ? JSON.parse(raw) : [];

      const existingIndex = records.findIndex((r) => r.date === dateKey);
      if (existingIndex >= 0) {
        records[existingIndex].steps = steps;
      } else {
        records.push({ date: dateKey, steps });
      }

      if (records.length > 30) records = records.slice(records.length - 30);
      await AsyncStorage.setItem('@health_step_records', JSON.stringify(records));
      calculateTotals(records);
    } catch (e) {
      console.error(e);
    }
  };

  const calculateTotals = (records: DayStepRecord[]) => {
    const last7 = records.slice(-7);
    setWeeklyTotal(last7.reduce((acc, curr) => acc + curr.steps, 0));
    setMonthlyTotal(records.reduce((acc, curr) => acc + curr.steps, 0));
  };

  const loadHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem('@health_step_records');
      const records: DayStepRecord[] = raw ? JSON.parse(raw) : [];
      calculateTotals(records);
    } catch (e) {
      console.error(e);
    }
  };

  const syncHardwareStepsOffScreen = async () => {
    if (Platform.OS === 'android') return;
    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) return;

      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      const now = new Date();

      const result = await Pedometer.getStepCountAsync(midnight, now);
      if (result && typeof result.steps === 'number') {
        const todayKey = getTodayDateKey();
        setDailySteps((prev) => {
          const finalVal = Math.max(prev, result.steps);
          AsyncStorage.setItem('@health_steps_today', finalVal.toString());
          saveStepHistoryRecord(todayKey, finalVal);
          updatePersistentNotification(finalVal);
          return finalVal;
        });
      }
    } catch (err) {}
  };

  useEffect(() => {
    let pedometerSubscription: { remove: () => void } | null = null;
    let accelSubscription: { remove: () => void } | null = null;
    let initialSensorSteps = -1;
    let lastMagnitude = 0;
    let stepCooldown = false;

    const initializeData = async () => {
      try {
        await Notifications.requestPermissionsAsync();
      } catch (e) {}

      try {
        if (Platform.OS === 'ios') {
          await Pedometer.requestPermissionsAsync();
        } else {
          await Pedometer.isAvailableAsync();
        }
      } catch (e) {}

      const todayKey = getTodayDateKey();
      const lastSavedDate = await AsyncStorage.getItem('@health_steps_last_date');
      let currentStoredSteps = 0;

      if (lastSavedDate !== todayKey) {
        await AsyncStorage.setItem('@health_steps_last_date', todayKey);
        await AsyncStorage.setItem('@health_steps_today', '0');
        await AsyncStorage.setItem(STORAGE_KEY_WATER, '0');
        await AsyncStorage.setItem('@daily_water_count', '0');
        await AsyncStorage.setItem('@health_water_count', '0');
        setDailySteps(0);
        setWaterGlasses(0);
        await updatePersistentNotification(0);
      } else {
        const storedSteps = await AsyncStorage.getItem('@health_steps_today');
        currentStoredSteps = storedSteps ? parseInt(storedSteps, 10) : 0;
        setDailySteps(currentStoredSteps);

        const storedWater =
          (await AsyncStorage.getItem(STORAGE_KEY_WATER)) ||
          (await AsyncStorage.getItem('@daily_water_count')) ||
          (await AsyncStorage.getItem('@health_water_count'));
        setWaterGlasses(storedWater ? parseInt(storedWater, 10) : 0);
        await updatePersistentNotification(currentStoredSteps);
      }

      await loadHistory();
      await syncHardwareStepsOffScreen();

      try {
        const isAvailable = await Pedometer.isAvailableAsync();
        if (isAvailable) {
          pedometerSubscription = Pedometer.watchStepCount(async (result) => {
            if (initialSensorSteps === -1) initialSensorSteps = result.steps;
            const newlyWalked = result.steps - initialSensorSteps;
            const updated = currentStoredSteps + newlyWalked;

            setDailySteps(updated);
            await AsyncStorage.setItem('@health_steps_today', updated.toString());
            await saveStepHistoryRecord(todayKey, updated);
            await updatePersistentNotification(updated);
          });
        }
      } catch (e) {}

      try {
        Accelerometer.setUpdateInterval(80);
        accelSubscription = Accelerometer.addListener(async (data) => {
          const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
          const delta = Math.abs(magnitude - lastMagnitude);
          lastMagnitude = magnitude;

          if (magnitude > 1.15 && delta > 0.18 && !stepCooldown) {
            stepCooldown = true;
            setDailySteps((prev) => {
              const next = prev + 1;
              AsyncStorage.setItem('@health_steps_today', next.toString());
              saveStepHistoryRecord(todayKey, next);
              updatePersistentNotification(next);
              return next;
            });

            setTimeout(() => {
              stepCooldown = false;
            }, 300);
          }
        });
      } catch (e) {}
    };

    initializeData();

    const appStateListener = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        syncHardwareStepsOffScreen();
        checkDrinkReminderTimer();
      }
    });

    return () => {
      if (pedometerSubscription) pedometerSubscription.remove();
      if (accelSubscription) accelSubscription.remove();
      appStateListener.remove();
    };
  }, [userStrideLengthCm, userWeightKg]);

  // When user taps "I Drank ✓":
  // Character enters from bottom, stays to drink, then slides back down and exits screen
  const handleConfirmDrink = async () => {
    const nextVal = Math.max(0, Math.min(24, waterGlasses + 1));
    setWaterGlasses(nextVal);
    setShowDrinkReminder(false);
    setShowCharacter(true);

    // 1. Slide into screen from bottom
    heroSlideY.setValue(300);
    Animated.timing(heroSlideY, {
      toValue: 0,
      duration: 650,
      easing: Easing.out(Easing.back(1.1)),
      useNativeDriver: true,
    }).start();

    // Save timestamp
    const now = Date.now();
    await AsyncStorage.setItem(STORAGE_KEY_LAST_SIP, now.toString());
    await AsyncStorage.setItem(STORAGE_KEY_WATER, nextVal.toString());
    await AsyncStorage.setItem('@daily_water_count', nextVal.toString());
    await AsyncStorage.setItem('@health_water_count', nextVal.toString());
    DeviceEventEmitter.emit('onWaterUpdated', nextVal);

    // 2. After drinking completes (~4.5s), slide back down off the screen
    setTimeout(() => {
      Animated.timing(heroSlideY, {
        toValue: 350,
        duration: 700,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setShowCharacter(false);
      });
    }, 4500);
  };

  const logQuickWater = async (delta: number) => {
    const nextVal = Math.max(0, Math.min(24, waterGlasses + delta));
    setWaterGlasses(nextVal);
    await AsyncStorage.setItem(STORAGE_KEY_WATER, nextVal.toString());
    await AsyncStorage.setItem('@daily_water_count', nextVal.toString());
    await AsyncStorage.setItem('@health_water_count', nextVal.toString());
    DeviceEventEmitter.emit('onWaterUpdated', nextVal);
  };

  const caloriesBurned = Math.round(dailySteps * (userWeightKg * 0.00057));
  const distanceKm = ((dailySteps * userStrideLengthCm) / 100000).toFixed(2);
  const activeMinutes = Math.round(dailySteps / 105);
  const earnedXp = Math.floor(dailySteps / 10);

  const displayedSteps =
    activeTab === 'today' ? dailySteps : activeTab === 'week' ? weeklyTotal : monthlyTotal;
  const displayedGoal =
    activeTab === 'today' ? stepGoal : activeTab === 'week' ? weeklyGoal : monthlyGoal;
  const progressPercent = Math.min(Math.round((displayedSteps / displayedGoal) * 100), 100);

  const activeHeroGif = HERO_GIFS[selectedHeroId] || HERO_GIFS.peddi;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080C0D" translucent />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>HealthGuide AI</Text>
            <Text style={styles.headerSub}>నడక & ఆరోగ్య సూచిక</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.xpPill}>
              <Text style={styles.xpText}>⚡ {earnedXp} XP</Text>
            </View>
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => safePush('/profile')}
              activeOpacity={0.8}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImg} />
              ) : (
                <Text style={{ fontSize: 18 }}>👤</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Period Selector */}
        <View style={styles.timeTabRow}>
          {(['today', 'week', 'month'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.timeTab, activeTab === tab && styles.timeTabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.timeTabText, activeTab === tab && styles.timeTabTextActive]}>
                {tab === 'today' ? 'Today' : tab === 'week' ? 'Past 7 Days' : 'Past 30 Days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Offline Persistent Tracking Banner */}
        <View style={styles.offlineTrackerBadge}>
          <Text style={{ fontSize: 14 }}>🟢</Text>
          <Text style={styles.offlineTrackerText}>Offline Step Counter Active in Notification Bar</Text>
        </View>

        {/* Central High-Engagement Neon Ring */}
        <View style={styles.ringCard}>
          <View style={styles.ringOuter}>
            <View style={styles.ringGlow}>
              <Text style={styles.footprint}>⚡</Text>
              <Text style={styles.largeStepNumber}>{displayedSteps.toLocaleString()}</Text>
              <Text style={styles.stepTargetText}>/ {displayedGoal.toLocaleString()} steps</Text>

              {/* The Reminder Option Card */}
              {showDrinkReminder ? (
                <View style={styles.sipReminderCard}>
                  <Text style={styles.sipReminderText}>70 mins done! Take a sip!</Text>
                  <Text style={styles.sipLightning}>⚡</Text>
                  <TouchableOpacity
                    style={styles.iDrankBtn}
                    onPress={handleConfirmDrink}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.iDrankBtnText}>I Drank ✓</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{progressPercent}% OF GOAL</Text>
                </View>
              )}
            </View>
          </View>

          {/* Quick Vital Stats Row */}
          <View style={styles.vitalStatsRow}>
            <View style={styles.vitalBox}>
              <Text style={styles.vitalEmoji}>🔥</Text>
              <Text style={styles.vitalVal}>{caloriesBurned}</Text>
              <Text style={styles.vitalLabel}>Kcal Burned</Text>
            </View>
            <View style={[styles.vitalBox, styles.vitalBoxBorder]}>
              <Text style={styles.vitalEmoji}>📍</Text>
              <Text style={styles.vitalVal}>{distanceKm}</Text>
              <Text style={styles.vitalLabel}>Kilometers</Text>
            </View>
            <View style={styles.vitalBox}>
              <Text style={styles.vitalEmoji}>⏱️</Text>
              <Text style={styles.vitalVal}>{activeMinutes}m</Text>
              <Text style={styles.vitalLabel}>Active Time</Text>
            </View>
          </View>

          {/* Animated Hero Character: Slides up from bottom, drinks, then slides back down */}
          {showCharacter && (
            <Animated.View
              style={[
                styles.heroOverlayWrapper,
                {
                  transform: [{ translateY: heroSlideY }],
                },
              ]}
              pointerEvents="none"
            >
              <Image
                source={activeHeroGif}
                style={styles.heroImage}
                resizeMode="contain"
              />
            </Animated.View>
          )}
        </View>

        {/* Interactive Fast Water & Diet Card (Clean - Banners Removed) */}
        <View style={styles.hydrationCard}>
          <View style={styles.hydrationHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 22 }}>💧</Text>
              <View>
                <Text style={styles.cardMainTitle}>Daily Hydration</Text>
                <Text style={styles.cardSubTitle}>
                  Target: {(waterTargetGlasses * 250).toLocaleString()} ml ({waterTargetGlasses} glasses)
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.dietPlanLink}
              onPress={() => safePush('/water-nutrition')}
            >
              <Text style={styles.dietPlanLinkText}>Full Plan →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.waterMeterRow}>
            <View style={styles.waterBarBg}>
              <View
                style={[
                  styles.waterBarFill,
                  { width: `${Math.min((waterGlasses / waterTargetGlasses) * 100, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.waterGlassNum}>
              {waterGlasses}/{waterTargetGlasses}
            </Text>
          </View>

          <View style={styles.waterActionBtns}>
            <TouchableOpacity
              style={styles.waterAdjustBtn}
              onPress={() => logQuickWater(-1)}
            >
              <Text style={styles.adjustBtnText}>- 1 Glass</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.waterAdjustBtn, styles.waterAddBtn]}
              onPress={() => logQuickWater(1)}
            >
              <Text style={[styles.adjustBtnText, styles.waterAddText]}>+ Drink Glass (250ml)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Health Coach Banner */}
        <TouchableOpacity
          style={styles.aiBanner}
          activeOpacity={0.85}
          onPress={() => router.replace('/(tabs)/coach')}
        >
          <View style={styles.aiIconRing}>
            <Text style={{ fontSize: 20 }}>🤖</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiBannerTitle}>AI Fitness & Nutrition Coach</Text>
            <Text style={styles.aiBannerSub}>Ask for workouts, personalized diet advice & analysis</Text>
          </View>
          <Text style={styles.aiArrow}>→</Text>
        </TouchableOpacity>

        {/* Milestone Badges */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Milestone Badges</Text>
          <Text style={styles.sectionBadgeCount}>3 / 5 Unlocked</Text>
        </View>

        <View style={styles.badgeContainer}>
          <View style={styles.badgeItem}>
            <View style={[styles.badgeOrb, dailySteps >= 1000 && styles.badgeOrbActive]}>
              <Text style={{ fontSize: 18 }}>🛡️</Text>
            </View>
            <Text style={styles.badgeLabel}>1K</Text>
            <Text style={styles.badgeSub}>Starter</Text>
          </View>

          <View style={styles.badgeItem}>
            <View style={[styles.badgeOrb, dailySteps >= 3000 && styles.badgeOrbActive]}>
              <Text style={{ fontSize: 18 }}>🧭</Text>
            </View>
            <Text style={styles.badgeLabel}>3K</Text>
            <Text style={styles.badgeSub}>Explorer</Text>
          </View>

          <View style={styles.badgeItem}>
            <View style={[styles.badgeOrb, dailySteps >= 5000 && styles.badgeOrbActive]}>
              <Text style={{ fontSize: 18 }}>🏃</Text>
            </View>
            <Text style={styles.badgeLabel}>5K</Text>
            <Text style={styles.badgeSub}>Pacer</Text>
          </View>

          <View style={styles.badgeItem}>
            <View style={[styles.badgeOrb, dailySteps >= 7500 && styles.badgeOrbActive]}>
              <Text style={{ fontSize: 18 }}>⚡</Text>
            </View>
            <Text style={styles.badgeLabel}>7.5K</Text>
            <Text style={styles.badgeSub}>Titan</Text>
          </View>

          <View style={styles.badgeItem}>
            <View style={[styles.badgeOrb, dailySteps >= 10000 && styles.badgeOrbActive]}>
              <Text style={{ fontSize: 18 }}>👑</Text>
            </View>
            <Text style={styles.badgeLabel}>10K</Text>
            <Text style={styles.badgeSub}>Master</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.navTab} activeOpacity={0.8}>
          <Text style={[styles.navEmoji, styles.navEmojiActive]}>🏠</Text>
          <Text style={[styles.navText, styles.navTextActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => safePush('/water-nutrition')} activeOpacity={0.8}>
          <Text style={styles.navEmoji}>💧</Text>
          <Text style={styles.navText}>Health</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => router.replace('/(tabs)/coach')} activeOpacity={0.8}>
          <Text style={styles.navEmoji}>💬</Text>
          <Text style={styles.navText}>Coach</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => router.replace('/(tabs)/explore')} activeOpacity={0.8}>
          <Text style={styles.navEmoji}>🧭</Text>
          <Text style={styles.navText}>Explore</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => router.replace('/(tabs)/exercises')} activeOpacity={0.8}>
          <Text style={styles.navEmoji}>🏋️</Text>
          <Text style={styles.navText}>Exercises</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab} onPress={() => safePush('/profile')} activeOpacity={0.8}>
          <Text style={styles.navEmoji}>👤</Text>
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C0D',
  },
  scrollContent: {
    padding: 18,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 14 : 18,
    paddingBottom: 95,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 12,
    color: '#00E676',
    fontWeight: '600',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  xpPill: {
    backgroundColor: '#12261E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00E676',
  },
  xpText: {
    color: '#00E676',
    fontWeight: '700',
    fontSize: 12,
  },
  profileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#151D20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#00E676',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  timeTabRow: {
    flexDirection: 'row',
    backgroundColor: '#121A1D',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  timeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeTabActive: {
    backgroundColor: '#00E676',
  },
  timeTabText: {
    color: '#7D8C91',
    fontWeight: '600',
    fontSize: 12,
  },
  timeTabTextActive: {
    color: '#080C0D',
    fontWeight: '800',
  },
  offlineTrackerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E211A',
    borderWidth: 1,
    borderColor: '#00E676',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 14,
    gap: 8,
  },
  offlineTrackerText: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '700',
  },
  ringCard: {
    backgroundColor: '#11181B',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1D2A2E',
    marginBottom: 16,
    position: 'relative',
    overflow: 'visible',
  },
  ringOuter: {
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 8,
    borderColor: '#00E676',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    backgroundColor: '#0A1012',
    shadowColor: '#00E676',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  ringGlow: {
    alignItems: 'center',
  },
  footprint: {
    fontSize: 24,
    color: '#00E676',
    marginBottom: 2,
  },
  largeStepNumber: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  stepTargetText: {
    fontSize: 13,
    color: '#7D8C91',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#142C22',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#00E676',
  },
  statusPillText: {
    color: '#00E676',
    fontWeight: '800',
    fontSize: 11,
  },
  sipReminderCard: {
    backgroundColor: '#0C1B17',
    borderWidth: 1.5,
    borderColor: '#00E676',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginTop: 8,
    zIndex: 99,
    elevation: 10,
  },
  sipReminderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sipLightning: {
    color: '#FFA726',
    fontSize: 12,
    marginVertical: 2,
  },
  iDrankBtn: {
    backgroundColor: '#00E676',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 4,
  },
  iDrankBtnText: {
    color: '#080C0D',
    fontWeight: '900',
    fontSize: 12,
  },
  vitalStatsRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1A2427',
  },
  vitalBox: {
    flex: 1,
    alignItems: 'center',
  },
  vitalBoxBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#1F2A2E',
  },
  vitalEmoji: {
    fontSize: 16,
    marginBottom: 4,
  },
  vitalVal: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  vitalLabel: {
    color: '#7D8C91',
    fontSize: 11,
    marginTop: 2,
  },
  heroOverlayWrapper: {
    position: 'absolute',
    bottom: -65,
    alignSelf: 'center',
    width: 220,
    height: 320,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 999,
    elevation: 20,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  hydrationCard: {
    backgroundColor: '#11181B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1D2A2E',
    marginBottom: 14,
  },
  hydrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMainTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubTitle: {
    color: '#7D8C91',
    fontSize: 12,
    marginTop: 2,
  },
  dietPlanLink: {
    backgroundColor: '#152422',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00E676',
  },
  dietPlanLinkText: {
    color: '#00E676',
    fontWeight: '700',
    fontSize: 11,
  },
  waterMeterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  waterBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: '#1D2A2E',
    borderRadius: 5,
    overflow: 'hidden',
  },
  waterBarFill: {
    height: '100%',
    backgroundColor: '#29B6F6',
  },
  waterGlassNum: {
    color: '#29B6F6',
    fontWeight: '800',
    fontSize: 13,
  },
  waterActionBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  waterAdjustBtn: {
    flex: 1,
    backgroundColor: '#192326',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  waterAddBtn: {
    backgroundColor: '#0288D1',
  },
  adjustBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  waterAddText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1F1A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#00E676',
    marginBottom: 18,
    gap: 12,
  },
  aiIconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#14382B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBannerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  aiBannerSub: {
    color: '#8CAE9E',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  aiArrow: {
    color: '#00E676',
    fontSize: 22,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionBadgeCount: {
    color: '#7D8C91',
    fontSize: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#11181B',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1D2A2E',
  },
  badgeItem: {
    alignItems: 'center',
    width: '18%',
  },
  badgeOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#172225',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#243439',
    marginBottom: 6,
  },
  badgeOrbActive: {
    borderColor: '#00E676',
    backgroundColor: '#0D291E',
  },
  badgeLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeSub: {
    color: '#7D8C91',
    fontSize: 10,
    marginTop: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#080C0D',
    borderTopWidth: 1,
    borderTopColor: '#172225',
    paddingVertical: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navTab: {
    alignItems: 'center',
  },
  navEmoji: {
    fontSize: 18,
    color: '#657378',
  },
  navEmojiActive: {
    color: '#00E676',
  },
  navText: {
    fontSize: 10,
    color: '#657378',
    marginTop: 2,
  },
  navTextActive: {
    color: '#00E676',
    fontWeight: '700',
  },
});