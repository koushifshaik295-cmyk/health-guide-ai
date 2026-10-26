import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CHARACTER_WIDTH = 180;
const CHARACTER_HEIGHT = 240;

const STORAGE_KEYS = {
  WATER_HERO_ID: '@selected_water_hero_id',
  LAST_TRIGGER_TIMESTAMP: '@hero_last_trigger_timestamp',
  WATER_STREAK: '@hero_water_streak',
};

// High-priority alert configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

// Peddi -> hero.gif, Pushpa Raj -> hero1.gif
const COMPANION_HEROES: Record<
  string,
  {
    id: string;
    name: string;
    source: any;
    lines: string[];
    accentColor: string;
  }
> = {
  peddi: {
    id: 'peddi',
    name: 'Peddi',
    source: require('./assets/hero.gif'),
    accentColor: '#00E676',
    lines: [
      'Drink water bro! Stay hydrated 💧',
      '70 mins done! Take a sip! ⚡',
      'Real heroes don’t skip hydration! 🥤',
      'Recharge with 250ml water now! 💪',
    ],
  },
  pushpa: {
    id: 'pushpa',
    name: 'Pushpa Raj',
    source: require('./assets/hero1.gif'),
    accentColor: '#FF9100',
    lines: [
      'Hydration thaggede le! Drink water now! 🔥',
      '70 mins done! Take a water break bro! 💧',
      'Keep your stamina high! 250ml sip! ⚡',
      'Drink water and stay unstoppable! 💪',
    ],
  },
};

interface WaterCompanionProps {
  intervalMinutes?: number;
  onDrinkLogged?: () => void;
}

export default function WaterCompanion({
  intervalMinutes = 70,
  onDrinkLogged,
}: WaterCompanionProps) {
  const [active, setActive] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [selectedHeroId, setSelectedHeroId] = useState<string>('peddi');

  const walkX = useRef(new Animated.Value(-250)).current;
  const bobY = useRef(new Animated.Value(0)).current;
  const bubbleScale = useRef(new Animated.Value(0)).current;
  const bobAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const appState = useRef(AppState.currentState);

  const currentHero = COMPANION_HEROES[selectedHeroId] || COMPANION_HEROES.peddi;

  useEffect(() => {
    const initializeCompanion = async () => {
      await setupNotificationChannel();
      await loadSelectedHero();
      await scheduleOfflineAlarm(intervalMinutes);
    };

    initializeCompanion();

    // In-app recurring timer (fires while app is active)
    const timer = setInterval(() => {
      checkAndTriggerWalk();
    }, intervalMinutes * 60 * 1000);

    // Wakes companion when returning from background or offline state
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        loadSelectedHero();
        checkBackgroundElapsedTime();
      }
      appState.current = nextAppState;
    });

    // Triggers companion walk upon clicking alarm notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(() => {
      startLeftToRightWalk();
    });

    checkBackgroundElapsedTime();

    return () => {
      clearInterval(timer);
      subscription.remove();
      responseListener.remove();
    };
  }, [intervalMinutes]);

  // Create Android priority channel safely
  const setupNotificationChannel = async () => {
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('hydration_alarm_channel', {
          name: 'Hydration Hero Alarms',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#00E676',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
          sound: 'default',
        });
      } catch (err) {
        console.warn('Notification channel registration bypass:', err);
      }
    }
  };

  // Safe offline repeating alarm scheduler (checks permission before attempting trigger)
  const scheduleOfflineAlarm = async (minutes: number) => {
    try {
      if (Platform.OS === 'android') {
        const settings = await Notifications.getPermissionsAsync();
        if (!settings.granted && settings.status !== 'granted') {
          // If permission is not yet granted in profile-setup, do not trigger prompt prematurely
          return;
        }
      }

      await Notifications.cancelAllScheduledNotificationsAsync();
      const hero = COMPANION_HEROES[selectedHeroId] || COMPANION_HEROES.peddi;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `💧 ${hero.name}: Time to Drink Water!`,
          body: `70 minutes completed! Take a 250ml water sip right now.`,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { autoWalk: true, heroId: hero.id },
        },
        trigger: {
          channelId: 'hydration_alarm_channel',
          seconds: minutes * 60,
          repeats: true,
        },
      });
    } catch (e) {
      console.warn('Failed to schedule offline alarm:', e);
    }
  };

  const loadSelectedHero = async () => {
    try {
      const savedHeroId = await AsyncStorage.getItem(STORAGE_KEYS.WATER_HERO_ID);
      if (savedHeroId && COMPANION_HEROES[savedHeroId]) {
        setSelectedHeroId(savedHeroId);
      } else {
        setSelectedHeroId('peddi');
      }
    } catch (e) {
      console.warn('Failed to load hero:', e);
    }
  };

  const toggleCompanionHero = async () => {
    const nextHeroId = selectedHeroId === 'peddi' ? 'pushpa' : 'peddi';
    setSelectedHeroId(nextHeroId);
    await AsyncStorage.setItem(STORAGE_KEYS.WATER_HERO_ID, nextHeroId);
    scheduleOfflineAlarm(intervalMinutes);
  };

  // Triggers walk if 70 minutes passed while app was closed or offline
  const checkBackgroundElapsedTime = async () => {
    try {
      const now = Date.now();
      const lastTrigger = await AsyncStorage.getItem(STORAGE_KEYS.LAST_TRIGGER_TIMESTAMP);

      if (!lastTrigger) {
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_TRIGGER_TIMESTAMP, now.toString());
        return;
      }

      const elapsedMs = now - parseInt(lastTrigger, 10);
      const targetMs = intervalMinutes * 60 * 1000;

      if (elapsedMs >= targetMs && !active) {
        startLeftToRightWalk();
      }
    } catch (e) {
      console.warn('Background check error:', e);
    }
  };

  const checkAndTriggerWalk = async () => {
    if (!active) {
      startLeftToRightWalk();
    }
  };

  const startLeftToRightWalk = async () => {
    let activeId = selectedHeroId;
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.WATER_HERO_ID);
      if (saved && COMPANION_HEROES[saved]) {
        activeId = saved;
        setSelectedHeroId(saved);
      } else {
        activeId = 'peddi';
        setSelectedHeroId('peddi');
      }
    } catch (e) {
      console.warn(e);
    }

    const heroToRender = COMPANION_HEROES[activeId] || COMPANION_HEROES.peddi;

    setActive(true);
    setLineIndex(Math.floor(Math.random() * heroToRender.lines.length));

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_TRIGGER_TIMESTAMP, Date.now().toString());
    } catch (e) {}

    // Reschedule offline alarm cycle
    scheduleOfflineAlarm(intervalMinutes);

    walkX.setValue(-250);
    bubbleScale.setValue(0);

    bobAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(bobY, {
          toValue: -8,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(bobY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ])
    );
    bobAnimation.current.start();

    // Walk in to screen center
    const middlePosition = (SCREEN_WIDTH - CHARACTER_WIDTH) / 2;
    Animated.timing(walkX, {
      toValue: middlePosition,
      duration: 2500,
      useNativeDriver: true,
    }).start(() => {
      if (bobAnimation.current) {
        bobAnimation.current.stop();
        bobY.setValue(0);
      }

      Animated.spring(bubbleScale, {
        toValue: 1,
        friction: 5,
        tension: 50,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleDrinkLogged = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.WATER_STREAK);
      const count = saved ? parseInt(saved, 10) + 1 : 1;
      await AsyncStorage.setItem(STORAGE_KEYS.WATER_STREAK, count.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_TRIGGER_TIMESTAMP, Date.now().toString());
    } catch (e) {
      console.warn(e);
    }

    if (onDrinkLogged) onDrinkLogged();

    // Close speech bubble and continue walk off screen
    Animated.timing(bubbleScale, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      if (bobAnimation.current) {
        bobAnimation.current.start();
      }

      Animated.timing(walkX, {
        toValue: SCREEN_WIDTH + 250,
        duration: 2000,
        useNativeDriver: true,
      }).start(() => {
        if (bobAnimation.current) {
          bobAnimation.current.stop();
        }
        bobY.setValue(0);
        walkX.setValue(-250);
        setActive(false);
      });
    });
  };

  return (
    <>
      {!active && (
        <View style={styles.badgeCluster}>
          <TouchableOpacity
            style={[styles.switchBadge, { borderColor: currentHero.accentColor }]}
            onPress={toggleCompanionHero}
            activeOpacity={0.7}
          >
            <Text style={[styles.switchBadgeText, { color: currentHero.accentColor }]}>
              ⇄ {currentHero.name}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testBadge}
            onPress={startLeftToRightWalk}
            activeOpacity={0.7}
          >
            <Text style={styles.testBadgeText}>🎬 Walk Companion</Text>
          </TouchableOpacity>
        </View>
      )}

      {active && (
        <View style={styles.screenLayer} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.characterContainer,
              {
                transform: [
                  { translateX: walkX },
                  { translateY: bobY },
                ],
              },
            ]}
          >
            {/* Speech Bubble */}
            <Animated.View
              style={[
                styles.bubble,
                {
                  borderColor: currentHero.accentColor,
                  shadowColor: currentHero.accentColor,
                  transform: [{ scale: bubbleScale }],
                },
              ]}
            >
              <Text style={styles.bubbleText}>{currentHero.lines[lineIndex]}</Text>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: currentHero.accentColor }]}
                onPress={handleDrinkLogged}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnText}>I Drank ✓</Text>
              </TouchableOpacity>
              <View
                style={[styles.bubbleTail, { borderTopColor: currentHero.accentColor }]}
              />
            </Animated.View>

            {/* Hardware Accelerated Video/GIF Frame */}
            <View style={styles.imagePlayerContainer}>
              <Image
                source={currentHero.source}
                style={styles.heroCutout}
                contentFit="contain"
                autoplay={true}
              />
            </View>
          </Animated.View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screenLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
  },
  characterContainer: {
    position: 'absolute',
    left: 0,
    bottom: 50,
    width: CHARACTER_WIDTH,
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 99999,
  },
  imagePlayerContainer: {
    width: CHARACTER_WIDTH,
    height: CHARACTER_HEIGHT,
    backgroundColor: 'transparent',
  },
  heroCutout: {
    width: '100%',
    height: '100%',
  },
  bubble: {
    backgroundColor: '#0F1A1C',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 8,
    width: 180,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
    position: 'relative',
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  bubbleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 16,
  },
  actionBtn: {
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  actionBtnText: {
    color: '#080C0D',
    fontSize: 11.5,
    fontWeight: '900',
  },
  badgeCluster: {
    position: 'absolute',
    bottom: 85,
    right: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 9998,
  },
  switchBadge: {
    backgroundColor: '#0F1A1C',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  switchBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  testBadge: {
    backgroundColor: '#102F23',
    borderColor: '#00E676',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  testBadgeText: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '700',
  },
});