import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

// Master Storage Keys (Shared across HomeScreen, WaterCompanion, and ProfileScreen)
const MASTER_KEYS = {
  STEP_GOAL: '@health_step_goal',
  WATER_GOAL: '@health_water_goal',
  PROFILE_IMAGE: '@health_profile_image',
  USER_NAME: '@health_user_name',
  USER_PROFILE: '@health_user_profile',
  USER_SESSION: '@health_user_session',
  USER_TOKEN: '@health_user_token',
  USER_SESSION_TOKEN: '@user_session_token',
  IS_GUEST: '@health_is_guest',
  PROFILE_COMPLETED: '@health_profile_completed',
  STEPS_TODAY: '@health_steps_today',
  WATER_COUNT: '@daily_water_count',
  DAILY_STEP_TARGET: '@daily_step_target',
  DAILY_WATER_TARGET: '@daily_water_target',
  WATER_HERO_ID: '@selected_water_hero_id',
  WATER_HERO_NAME: '@selected_water_hero_name',
};

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type GenderType = 'Male' | 'Female' | 'Other';
export type ActivityLevelType = 'Sedentary' | 'Light' | 'Moderate' | 'Active' | 'Extreme';

export interface AnimeCharacterDeckItem {
  id: string;
  name: string;
  seriesTier: string;
  auraColor: string;
  secondaryColor: string;
  quote: string;
  powerLevel: string;
  stats: {
    strength: number;
    stamina: number;
    agility: number;
  };
  avatarUri: string;
}

export interface DeveloperHydrationHeroPose {
  id: string;
  name: string;
  tagline: string;
  color: string;
  imageSource: any;
}

export interface UserHealthProfile {
  fullName: string;
  email: string;
  age: number;
  gender: GenderType;
  weightKg: number;
  heightCm: number;
  stepGoal: number;
  waterGoalGlasses: number;
  avatarUri: string | null;
  equippedHeroId: string;
  characterTitle: string;
  auraColor: string;
  activityLevel: ActivityLevelType;
  notificationsEnabled: boolean;
  ttsVoiceEnabled: boolean;
  hapticFeedback: boolean;
  syncHealthConnect: boolean;
  selectedLanguage: string;
}

export interface BMIData {
  value: number;
  category: string;
  color: string;
  description: string;
}

// ============================================================================
// DEVELOPER HYDRATION HERO POSES
// ============================================================================

const DEVELOPER_HERO_POSES: DeveloperHydrationHeroPose[] = [
  {
    id: 'peddi',
    name: 'Peddi',
    tagline: 'Iconic Peddi bat stance holding water bottle',
    color: '#00E676',
    imageSource: require('../../assets/peddi.png'),
  },
  {
    id: 'pushpa',
    name: 'Pushpa Raj',
    tagline: 'Thaggede Le! Powerful hydration & stamina stance',
    color: '#FF9100',
    imageSource: require('../../assets/pushpa.png'),
  },
];

// ============================================================================
// ANIME HERO DECK DEFINITIONS
// ============================================================================

const ANIME_HEROES_COLLECTION: AnimeCharacterDeckItem[] = [
  {
    id: 'shinobi',
    name: 'Shinobi Striker',
    seriesTier: 'Hidden Leaf Pacer',
    auraColor: '#FFB300',
    secondaryColor: '#FF6F00',
    quote: 'Never give up on your pace! A ninja never breaks stride.',
    powerLevel: 'Rank S - Jonin',
    stats: { strength: 82, stamina: 96, agility: 98 },
    avatarUri: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'saiyan',
    name: 'Saiyan Warrior',
    seriesTier: 'Gravity Chamber Beast',
    auraColor: '#00E676',
    secondaryColor: '#1B5E20',
    quote: 'Push past your physical limits with every single repetition.',
    powerLevel: 'Power Level > 9,000',
    stats: { strength: 99, stamina: 95, agility: 90 },
    avatarUri: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'hunter',
    name: 'Solo Hunter',
    seriesTier: 'S-Rank Awakened Monarch',
    auraColor: '#29B6F6',
    secondaryColor: '#01579B',
    quote: 'I alone level up every day through rigorous training.',
    powerLevel: 'National Level Hunter',
    stats: { strength: 97, stamina: 92, agility: 96 },
    avatarUri: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'samurai',
    name: 'Cyber Samurai',
    seriesTier: 'Neo-Tokyo Ronin',
    auraColor: '#E040FB',
    secondaryColor: '#4A148C',
    quote: 'Precision, discipline, and flow in every breath and step.',
    powerLevel: 'Kensei Master',
    stats: { strength: 88, stamina: 90, agility: 99 },
    avatarUri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'titan',
    name: 'Titan Pacer',
    seriesTier: 'Scout Regiment Vanguard',
    auraColor: '#FF5252',
    secondaryColor: '#B71C1C',
    quote: 'Dedicate your heart and sprint toward your ultimate endurance.',
    powerLevel: 'Commander Elite',
    stats: { strength: 91, stamina: 99, agility: 89 },
    avatarUri: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'shadow',
    name: 'Shadow Monarch',
    seriesTier: 'Arise Legion Overlord',
    auraColor: '#7C4DFF',
    secondaryColor: '#311B92',
    quote: 'Wake up, step out, and command your own body transformation.',
    powerLevel: 'Immortal Ruler',
    stats: { strength: 98, stamina: 98, agility: 94 },
    avatarUri: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=80',
  },
];

const INITIAL_PROFILE_STATE: UserHealthProfile = {
  fullName: 'User',
  email: 'user@healthguide.ai',
  age: 22,
  gender: 'Male',
  weightKg: 70,
  heightCm: 175,
  stepGoal: 8000,
  waterGoalGlasses: 8,
  avatarUri: ANIME_HEROES_COLLECTION[0].avatarUri,
  equippedHeroId: ANIME_HEROES_COLLECTION[0].id,
  characterTitle: ANIME_HEROES_COLLECTION[0].seriesTier,
  auraColor: ANIME_HEROES_COLLECTION[0].auraColor,
  activityLevel: 'Moderate',
  notificationsEnabled: true,
  ttsVoiceEnabled: true,
  hapticFeedback: true,
  syncHealthConnect: false,
  selectedLanguage: 'English',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProfileScreen() {
  const router = useRouter();

  // Primary State
  const [profile, setProfile] = useState<UserHealthProfile>(INITIAL_PROFILE_STATE);
  const [isEditingMetrics, setIsEditingMetrics] = useState<boolean>(false);
  const [isLoadingStorage, setIsLoadingStorage] = useState<boolean>(true);

  // Active Hydration Hero Pose State
  const [selectedHydrationPoseId, setSelectedHydrationPoseId] = useState<string>(DEVELOPER_HERO_POSES[0].id);
  const [isHydrationHeroModalVisible, setIsHydrationHeroModalVisible] = useState<boolean>(false);

  // Form Temp Values
  const [tempName, setTempName] = useState<string>('');
  const [tempEmail, setTempEmail] = useState<string>('');
  const [tempAge, setTempAge] = useState<string>('22');
  const [tempWeight, setTempWeight] = useState<string>('70');
  const [tempHeight, setTempHeight] = useState<string>('175');
  const [tempGender, setTempGender] = useState<GenderType>('Male');
  const [tempActivity, setTempActivity] = useState<ActivityLevelType>('Moderate');

  // Modal Controllers
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState<boolean>(false);
  const [isGoalModalVisible, setIsGoalModalVisible] = useState<boolean>(false);
  const [isWaterGoalModalVisible, setIsWaterGoalModalVisible] = useState<boolean>(false);
  const [isHeroDetailModalVisible, setIsHeroDetailModalVisible] = useState<boolean>(false);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState<boolean>(false);
  const [selectedHeroForDetail, setSelectedHeroForDetail] = useState<AnimeCharacterDeckItem | null>(null);

  // Quick picker states
  const [draftStepGoal, setDraftStepGoal] = useState<number>(8000);
  const [draftWaterGlasses, setDraftWaterGlasses] = useState<number>(8);

  // --------------------------------------------------------------------------
  // STORAGE LIFECYCLE
  // --------------------------------------------------------------------------

  useEffect(() => {
    loadPersistedProfile();
  }, []);

  const loadPersistedProfile = async () => {
    try {
      setIsLoadingStorage(true);
      const raw = await AsyncStorage.getItem(MASTER_KEYS.USER_PROFILE);
      const directStepGoal =
        (await AsyncStorage.getItem(MASTER_KEYS.STEP_GOAL)) ||
        (await AsyncStorage.getItem(MASTER_KEYS.DAILY_STEP_TARGET));
      const directWaterGoal =
        (await AsyncStorage.getItem(MASTER_KEYS.WATER_GOAL)) ||
        (await AsyncStorage.getItem(MASTER_KEYS.DAILY_WATER_TARGET));
      const directAvatar = await AsyncStorage.getItem(MASTER_KEYS.PROFILE_IMAGE);
      const directName = await AsyncStorage.getItem(MASTER_KEYS.USER_NAME);

      const savedHeroId = await AsyncStorage.getItem(MASTER_KEYS.WATER_HERO_ID);
      if (savedHeroId) {
        if (savedHeroId === 'peddi_shot') {
          setSelectedHydrationPoseId('peddi');
        } else {
          setSelectedHydrationPoseId(savedHeroId);
        }
      }

      let merged: UserHealthProfile = { ...INITIAL_PROFILE_STATE };

      if (raw) {
        const parsed = JSON.parse(raw);
        const resolvedName = parsed.fullName || parsed.name || directName || 'User';
        const resolvedEmail = parsed.email || 'user@healthguide.ai';

        merged = {
          ...INITIAL_PROFILE_STATE,
          ...parsed,
          fullName: resolvedName,
          email: resolvedEmail,
          equippedHeroId: parsed.equippedHeroId || 'shinobi',
          characterTitle: parsed.characterTitle || INITIAL_PROFILE_STATE.characterTitle,
          auraColor: parsed.auraColor || INITIAL_PROFILE_STATE.auraColor,
        };
      } else if (directName) {
        merged.fullName = directName;
      }

      if (directStepGoal) {
        const parsedStep = parseInt(directStepGoal.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(parsedStep) && parsedStep > 0) merged.stepGoal = parsedStep;
      }
      if (directWaterGoal) {
        const parsedWater = parseInt(directWaterGoal.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(parsedWater) && parsedWater > 0) merged.waterGoalGlasses = parsedWater;
      }
      if (directAvatar) merged.avatarUri = directAvatar;

      setProfile(merged);
      setTempName(merged.fullName);
      setTempEmail(merged.email);
      setTempAge(String(merged.age));
      setTempWeight(String(merged.weightKg));
      setTempHeight(String(merged.heightCm));
      setTempGender(merged.gender);
      setTempActivity(merged.activityLevel);
      setDraftStepGoal(merged.stepGoal || 8000);
      setDraftWaterGlasses(merged.waterGoalGlasses || 8);
    } catch (e) {
      console.warn('Failed to read persisted profile data:', e);
    } finally {
      setIsLoadingStorage(false);
    }
  };

  const persistProfile = async (updated: UserHealthProfile) => {
    try {
      setProfile(updated);
      await AsyncStorage.setItem(MASTER_KEYS.USER_PROFILE, JSON.stringify(updated));

      await AsyncStorage.multiSet([
        [MASTER_KEYS.STEP_GOAL, String(updated.stepGoal)],
        [MASTER_KEYS.DAILY_STEP_TARGET, String(updated.stepGoal)],
        [MASTER_KEYS.WATER_GOAL, String(updated.waterGoalGlasses)],
        [MASTER_KEYS.DAILY_WATER_TARGET, String(updated.waterGoalGlasses)],
        [MASTER_KEYS.USER_NAME, updated.fullName],
      ]);

      if (updated.avatarUri) {
        await AsyncStorage.setItem(MASTER_KEYS.PROFILE_IMAGE, updated.avatarUri);
      }
    } catch (e) {
      console.error('Storage write failure:', e);
    }
  };

  const handleCommitProfileEdits = async () => {
    const validWeight = Math.max(30, Math.min(250, parseFloat(tempWeight) || profile.weightKg));
    const validHeight = Math.max(100, Math.min(250, parseFloat(tempHeight) || profile.heightCm));
    const validAge = Math.max(10, Math.min(110, parseInt(tempAge, 10) || profile.age));

    const updatedProfile: UserHealthProfile = {
      ...profile,
      fullName: tempName.trim() || profile.fullName,
      email: tempEmail.trim() || profile.email,
      weightKg: validWeight,
      heightCm: validHeight,
      age: validAge,
      gender: tempGender,
      activityLevel: tempActivity,
    };

    await persistProfile(updatedProfile);
    setIsEditingMetrics(false);
    Alert.alert('Metrics Updated', 'Your physical biometrics and profile details have been saved.');
  };

  // --------------------------------------------------------------------------
  // RELIABLE SIGN-OUT ACTION
  // --------------------------------------------------------------------------

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to log out of your session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Clear all session and authentication tokens
              await AsyncStorage.multiRemove([
                '@health_user_token',
                '@health_user_session',
                '@user_session_token',
                '@health_profile_completed',
                '@health_user_profile',
                '@health_is_guest',
              ]);

              // 2. Close any open dialogs/modals
              setIsAvatarModalVisible(false);
              setIsGoalModalVisible(false);
              setIsWaterGoalModalVisible(false);
              setIsHeroDetailModalVisible(false);
              setIsLanguageModalVisible(false);
              setIsHydrationHeroModalVisible(false);

              // 3. Reset the navigation stack safely to prevent black screen
              try {
                if (router.canDismiss()) {
                  router.dismissAll();
                }
              } catch (_) {}

              // 4. Navigate directly to login
              router.replace('/login');
            } catch (error) {
              router.replace('/login');
            }
          },
        },
      ]
    );
  };

  // --------------------------------------------------------------------------
  // HYDRATION HERO POSE SELECTION
  // --------------------------------------------------------------------------

  const handleSelectDeveloperPose = async (pose: DeveloperHydrationHeroPose) => {
    try {
      setSelectedHydrationPoseId(pose.id);
      await AsyncStorage.setItem(MASTER_KEYS.WATER_HERO_ID, pose.id);
      await AsyncStorage.setItem(MASTER_KEYS.WATER_HERO_NAME, pose.name);
      setIsHydrationHeroModalVisible(false);
      Alert.alert(
        'Companion Equipped 💧',
        `${pose.name} is now your active hydration hero companion!`
      );
    } catch (e) {
      console.error('Failed to save hydration hero pose:', e);
    }
  };

  // --------------------------------------------------------------------------
  // BIOMETRIC AND METABOLIC ENGINES
  // --------------------------------------------------------------------------

  const bmiDetails = useMemo<BMIData>(() => {
    const heightInMeters = profile.heightCm / 100;
    if (heightInMeters <= 0) {
      return { value: 0, category: 'Unknown', color: '#7B8D93', description: 'Invalid height entered' };
    }

    const calculated = parseFloat((profile.weightKg / (heightInMeters * heightInMeters)).toFixed(1));

    if (calculated < 18.5) {
      return {
        value: calculated,
        category: 'Underweight',
        color: '#29B6F6',
        description: 'Target nutrient-rich high-protein calorie surpluses.',
      };
    } else if (calculated >= 18.5 && calculated < 24.9) {
      return {
        value: calculated,
        category: 'Optimal Normal',
        color: '#00E676',
        description: 'Healthy metabolic range. Maintain current endurance balance.',
      };
    } else if (calculated >= 25.0 && calculated < 29.9) {
      return {
        value: calculated,
        category: 'Overweight',
        color: '#FFA726',
        description: 'Incorporate daily walking intervals and deficit meal plans.',
      };
    } else {
      return {
        value: calculated,
        category: 'Obese Range',
        color: '#EF5350',
        description: 'Prioritize low-impact aerobic activity and metabolic consistency.',
      };
    }
  }, [profile.weightKg, profile.heightCm]);

  const bmrScore = useMemo<number>(() => {
    let base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
    if (profile.gender === 'Male') {
      base += 5;
    } else {
      base -= 161;
    }
    return Math.round(base);
  }, [profile.weightKg, profile.heightCm, profile.age, profile.gender]);

  const tdeeScore = useMemo<number>(() => {
    const multipliers: Record<ActivityLevelType, number> = {
      Sedentary: 1.2,
      Light: 1.375,
      Moderate: 1.55,
      Active: 1.725,
      Extreme: 1.9,
    };
    return Math.round(bmrScore * (multipliers[profile.activityLevel] || 1.55));
  }, [bmrScore, profile.activityLevel]);

  const calculatedHydrationMl = useMemo<number>(() => {
    return Math.round(profile.weightKg * 35);
  }, [profile.weightKg]);

  const calculatedStrideLengthCm = useMemo<number>(() => {
    return Math.round(profile.heightCm * 0.414);
  }, [profile.heightCm]);

  // --------------------------------------------------------------------------
  // USER PROFILE PHOTO
  // --------------------------------------------------------------------------

  const handleLaunchPhotoLibrary = async () => {
    setIsAvatarModalVisible(false);
    await new Promise((resolve) => setTimeout(resolve, 350));

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Media Permission Needed',
          'Please allow media access in device settings to select a profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        const updated: UserHealthProfile = {
          ...profile,
          avatarUri: pickedUri,
          characterTitle: 'Custom Athlete',
          auraColor: '#00E676',
          equippedHeroId: 'custom',
        };
        await persistProfile(updated);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err?.message || 'Unable to open photo gallery.');
    }
  };

  const handleLaunchCameraCapture = async () => {
    setIsAvatarModalVisible(false);
    await new Promise((resolve) => setTimeout(resolve, 350));

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera Permission Needed', 'Please allow camera permission in device settings.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const takenUri = result.assets[0].uri;
        const updated: UserHealthProfile = {
          ...profile,
          avatarUri: takenUri,
          characterTitle: 'Snapshot Warrior',
          auraColor: '#00E676',
          equippedHeroId: 'custom_camera',
        };
        await persistProfile(updated);
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err?.message || 'Unable to open camera.');
    }
  };

  const handleRemoveCustomAvatar = async () => {
    const fallbackHero = ANIME_HEROES_COLLECTION[0];
    const updated: UserHealthProfile = {
      ...profile,
      avatarUri: fallbackHero.avatarUri,
      equippedHeroId: fallbackHero.id,
      characterTitle: fallbackHero.seriesTier,
      auraColor: fallbackHero.auraColor,
    };
    await persistProfile(updated);
    setIsAvatarModalVisible(false);
    Alert.alert('Avatar Reset', 'Profile avatar reverted to Shinobi Striker.');
  };

  // --------------------------------------------------------------------------
  // ANIME DECK SELECTION & CARD DETAIL
  // --------------------------------------------------------------------------

  const handleEquipAnimeHero = async (hero: AnimeCharacterDeckItem) => {
    const updated: UserHealthProfile = {
      ...profile,
      avatarUri: hero.avatarUri,
      equippedHeroId: hero.id,
      characterTitle: hero.seriesTier,
      auraColor: hero.auraColor,
    };
    await persistProfile(updated);
    setIsAvatarModalVisible(false);
    setIsHeroDetailModalVisible(false);
    Alert.alert('Hero Equipped ⚡', `${hero.name} (${hero.seriesTier}) is now equipped on your profile!`);
  };

  const handleOpenHeroCard = (hero: AnimeCharacterDeckItem) => {
    setSelectedHeroForDetail(hero);
    setIsHeroDetailModalVisible(true);
  };

  // --------------------------------------------------------------------------
  // TARGET GOAL SETTINGS
  // --------------------------------------------------------------------------

  const handleSaveStepTarget = async (goal: number) => {
    const updated: UserHealthProfile = { ...profile, stepGoal: goal };
    await persistProfile(updated);
    setIsGoalModalVisible(false);
    Alert.alert('Goal Confirmed', `Daily step goal is now calibrated to ${goal.toLocaleString()} steps.`);
  };

  const handleSaveWaterTarget = async (glasses: number) => {
    const updated: UserHealthProfile = { ...profile, waterGoalGlasses: glasses };
    await persistProfile(updated);
    setIsWaterGoalModalVisible(false);
    Alert.alert('Goal Confirmed', `Daily hydration target updated to ${glasses} glasses (${glasses * 250} ml).`);
  };

  // --------------------------------------------------------------------------
  // LOWER ACTIONS
  // --------------------------------------------------------------------------

  const handleShareAppAction = async () => {
    try {
      await Share.share({
        title: 'HealthGuide AI',
        message: 'Level up your fitness with HealthGuide AI! Real-time background step tracking and hydration companion. Join me!',
      });
    } catch (err) {
      console.warn('Share intent error:', err);
    }
  };

  const handleRateUsAction = () => {
    Alert.alert(
      'Rate HealthGuide AI ⭐⭐⭐⭐⭐',
      'Enjoying your daily step targets and wellness coaching? Supporting us helps us roll out new updates!',
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Rate 5 Stars', onPress: () => {} },
      ]
    );
  };

  const handleOpenFeedbackMailer = () => {
    const mailUrl = 'mailto:support@healthguideai.com?subject=HealthGuide%20User%20Feedback';
    Linking.openURL(mailUrl).catch(() => {
      Alert.alert('Email Client Error', 'Could not open email client.');
    });
  };

  const handleRemoveAdsUpgrade = () => {
    Alert.alert(
      'HealthGuide AI Pro',
      '• 100% Ad-Free Experience\n• Full 30-Day Step Trends\n• Advanced Companion Unlockables\n\nUpgrade today for lifetime access.',
      [
        { text: 'Dismiss', style: 'cancel' },
        { text: 'Upgrade to Pro', onPress: () => Alert.alert('Coming Soon', 'In-app billing active in upcoming build.') },
      ]
    );
  };

  const handleResetStepLogs = () => {
    Alert.alert(
      'Clear Tracking Cache?',
      'This will clear today\'s step accumulation and reset water intake back to zero.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.setItem(MASTER_KEYS.STEPS_TODAY, '0');
              await AsyncStorage.setItem(MASTER_KEYS.WATER_COUNT, '0');
              Alert.alert('Cache Reset', 'Today\'s tracking cache has been zeroed out.');
            } catch (err) {
              console.error('Reset error:', err);
            }
          },
        },
      ]
    );
  };

  const handleExportProfileJson = async () => {
    try {
      const dataString = JSON.stringify(profile, null, 2);
      await Share.share({
        title: 'HealthGuide Profile Export',
        message: dataString,
      });
    } catch (e) {
      Alert.alert('Export Error', 'Unable to export profile configuration.');
    }
  };

  const activeAuraColor = profile.auraColor || '#00E676';
  const activeHydrationHero =
    DEVELOPER_HERO_POSES.find((h) => h.id === selectedHydrationPoseId) ||
    DEVELOPER_HERO_POSES[0];

  if (isLoadingStorage) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00E676" />
        <Text style={styles.loadingText}>Loading Hero Deck & Biometrics...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080C0D" translucent={false} />

      {/* HEADER SECTION */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#00E676" />
          <Text style={styles.headerBackText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleCenter}>
          <Text style={styles.headerTitle}>Profile & Hero</Text>
          <Text style={styles.headerSubtitle}>V1.7.91 • Health Engine</Text>
        </View>

        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => (isEditingMetrics ? handleCommitProfileEdits() : setIsEditingMetrics(true))}
          activeOpacity={0.75}
        >
          <Text style={styles.headerActionText}>{isEditingMetrics ? 'Save' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HERO CARD & AVATAR BANNER */}
        <View style={[styles.heroCard, { borderColor: '#19252A' }]}>
          <TouchableOpacity
            style={[styles.avatarAuraGlow, { borderColor: activeAuraColor, shadowColor: activeAuraColor }]}
            onPress={() => setIsAvatarModalVisible(true)}
            activeOpacity={0.85}
          >
            {profile.avatarUri ? (
              <Image source={{ uri: profile.avatarUri }} style={styles.avatarPhoto} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#00E676" />
              </View>
            )}
            <View style={[styles.avatarBadgeIndicator, { backgroundColor: activeAuraColor }]}>
              <Ionicons name="sparkles" size={12} color="#080C0D" />
            </View>
          </TouchableOpacity>

          {!isEditingMetrics ? (
            <View style={styles.heroDetailsBlock}>
              <View style={styles.heroNameRow}>
                <Text style={styles.heroNameText} numberOfLines={1}>{profile.fullName}</Text>
                <View style={[styles.powerLevelBadge, { borderColor: activeAuraColor }]}>
                  <Text style={[styles.powerLevelText, { color: activeAuraColor }]}>AWAKENED</Text>
                </View>
              </View>

              <Text style={[styles.heroSeriesTitle, { color: activeAuraColor }]}>
                ⚡ {profile.characterTitle || 'S-Rank Awakened Warrior'}
              </Text>
              <Text style={styles.heroEmailText}>{profile.email}</Text>

              <View style={styles.heroPillTagsRow}>
                <View style={styles.statPill}>
                  <Text style={styles.statPillLabel}>{profile.gender}</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statPillLabel}>{profile.age} Yrs</Text>
                </View>
                <View style={[styles.statPill, { borderColor: '#29B6F6' }]}>
                  <Text style={[styles.statPillLabel, { color: '#29B6F6' }]}>{profile.activityLevel}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.editHeroForm}>
              <Text style={styles.editFormLabel}>ATHLETE FULL NAME</Text>
              <TextInput
                style={styles.editTextInput}
                value={tempName}
                onChangeText={setTempName}
                placeholder="Name"
                placeholderTextColor="#5C6E73"
              />

              <Text style={[styles.editFormLabel, { marginTop: 8 }]}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.editTextInput}
                value={tempEmail}
                onChangeText={setTempEmail}
                keyboardType="email-address"
                placeholder="Email"
                placeholderTextColor="#5C6E73"
              />
            </View>
          )}
        </View>

        {/* HYDRATION HEROES BANNER */}
        <TouchableOpacity
          style={[styles.hydrationHeroBanner, { borderColor: activeHydrationHero.color }]}
          onPress={() => setIsHydrationHeroModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.hydrationHeroBannerLeft}>
            <View style={[styles.hydrationHeroMiniAvatar, { borderColor: activeHydrationHero.color }]}>
              <Image
                source={activeHydrationHero.imageSource}
                style={styles.peddiThumbnailImg}
                resizeMode="contain"
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.hydrationHeroTitleRow}>
                <Text style={styles.hydrationHeroBannerHeading}>Hydration Heroes</Text>
                <View style={[styles.hydrationHeroBadgePill, { backgroundColor: activeHydrationHero.color }]}>
                  <Text style={styles.hydrationHeroBadgePillText}>ACTIVE COMPANION</Text>
                </View>
              </View>
              <Text style={[styles.hydrationHeroActiveName, { color: activeHydrationHero.color }]}>
                {activeHydrationHero.name}
              </Text>
              <Text style={styles.hydrationHeroBannerSub} numberOfLines={1}>
                {activeHydrationHero.tagline}
              </Text>
            </View>
          </View>
          <View style={styles.deckBannerRight}>
            <Text style={[styles.deckActionText, { color: activeHydrationHero.color }]}>Change →</Text>
          </View>
        </TouchableOpacity>

        {/* ANIME CHARACTER DECK BANNER */}
        <TouchableOpacity
          style={[styles.characterDeckBanner, { borderColor: activeAuraColor }]}
          onPress={() => setIsAvatarModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.deckBannerLeft}>
            <View style={[styles.deckIconRing, { backgroundColor: '#10221A', borderColor: activeAuraColor }]}>
              <MaterialCommunityIcons name="sword-cross" size={22} color={activeAuraColor} />
            </View>
            <View>
              <Text style={styles.deckBannerHeading}>Anime Character Deck</Text>
              <Text style={styles.deckBannerSub}>Choose your active avatar persona</Text>
            </View>
          </View>
          <View style={styles.deckBannerRight}>
            <Text style={[styles.deckActionText, { color: activeAuraColor }]}>Equip →</Text>
          </View>
        </TouchableOpacity>

        {/* BIOMETRICS & METABOLIC BREAKDOWN CARD */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionBlockTitle}>BIOMETRICS & ENGINE</Text>
              <Text style={styles.sectionBlockSub}>Hardware sensor & metabolic calibration</Text>
            </View>
            {isEditingMetrics && (
              <View style={styles.editingTag}>
                <Text style={styles.editingTagText}>Editing</Text>
              </View>
            )}
          </View>

          {!isEditingMetrics ? (
            <View style={styles.biometricsOverview}>
              <View style={styles.bioMetricThreeCol}>
                <View style={styles.bioMetricCell}>
                  <Text style={styles.bioMetricLabel}>Weight</Text>
                  <Text style={styles.bioMetricVal}>{profile.weightKg} kg</Text>
                  <Text style={styles.bioMetricNote}>{(profile.weightKg * 2.20462).toFixed(1)} lbs</Text>
                </View>

                <View style={[styles.bioMetricCell, styles.bioMetricCellBorder]}>
                  <Text style={styles.bioMetricLabel}>Height</Text>
                  <Text style={styles.bioMetricVal}>{profile.heightCm} cm</Text>
                  <Text style={styles.bioMetricNote}>Stride: {calculatedStrideLengthCm} cm</Text>
                </View>

                <View style={styles.bioMetricCell}>
                  <Text style={styles.bioMetricLabel}>Body Mass Index</Text>
                  <Text style={[styles.bioMetricVal, { color: bmiDetails.color }]}>{bmiDetails.value}</Text>
                  <Text style={[styles.bioMetricNote, { color: bmiDetails.color }]}>{bmiDetails.category}</Text>
                </View>
              </View>

              <View style={[styles.bmiInfoBanner, { borderColor: bmiDetails.color }]}>
                <Ionicons name="information-circle" size={18} color={bmiDetails.color} />
                <Text style={styles.bmiInfoBannerText}>{bmiDetails.description}</Text>
              </View>

              <View style={styles.metabolicBox}>
                <View style={styles.metabolicItemRow}>
                  <View style={[styles.metabolicIconCircle, { backgroundColor: '#2E150F' }]}>
                    <Ionicons name="flame" size={18} color="#FF7043" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.metabolicTitle}>Basal Metabolic Rate (BMR)</Text>
                    <Text style={styles.metabolicSub}>~{bmrScore} kcal/day burned completely at rest</Text>
                  </View>
                </View>

                <View style={styles.metabolicDivider} />

                <View style={styles.metabolicItemRow}>
                  <View style={[styles.metabolicIconCircle, { backgroundColor: '#2E220F' }]}>
                    <MaterialCommunityIcons name="lightning-bolt" size={18} color="#FFD54F" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.metabolicTitle}>Total Daily Energy Expenditure (TDEE)</Text>
                    <Text style={styles.metabolicSub}>~{tdeeScore} kcal/day required to maintain body weight</Text>
                  </View>
                </View>

                <View style={styles.metabolicDivider} />

                <View style={styles.metabolicItemRow}>
                  <View style={[styles.metabolicIconCircle, { backgroundColor: '#0A2633' }]}>
                    <Ionicons name="water" size={18} color="#29B6F6" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.metabolicTitle}>Hydration Requirement</Text>
                    <Text style={styles.metabolicSub}>
                      {calculatedHydrationMl} ml recommended based on {profile.weightKg}kg mass
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.editMetricsFormGroup}>
              <View style={styles.formRowTwoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editFormLabel}>WEIGHT (KG)</Text>
                  <TextInput
                    style={styles.editTextInput}
                    value={tempWeight}
                    onChangeText={setTempWeight}
                    keyboardType="numeric"
                    placeholder="70"
                    placeholderTextColor="#5C6E73"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.editFormLabel}>HEIGHT (CM)</Text>
                  <TextInput
                    style={styles.editTextInput}
                    value={tempHeight}
                    onChangeText={setTempHeight}
                    keyboardType="numeric"
                    placeholder="175"
                    placeholderTextColor="#5C6E73"
                  />
                </View>
              </View>

              <View style={[styles.formRowTwoCol, { marginTop: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editFormLabel}>AGE</Text>
                  <TextInput
                    style={styles.editTextInput}
                    value={tempAge}
                    onChangeText={setTempAge}
                    keyboardType="numeric"
                    placeholder="22"
                    placeholderTextColor="#5C6E73"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.editFormLabel}>GENDER</Text>
                  <View style={styles.genderSelectGroup}>
                    {(['Male', 'Female'] as const).map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.genderSelectBtn, tempGender === g && styles.genderSelectBtnActive]}
                        onPress={() => setTempGender(g)}
                      >
                        <Text style={[styles.genderSelectBtnText, tempGender === g && styles.genderSelectBtnTextActive]}>
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={styles.editFormLabel}>ACTIVITY LEVEL</Text>
                <View style={styles.activityLevelsRow}>
                  {(['Sedentary', 'Light', 'Moderate', 'Active'] as const).map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[styles.activityPillBtn, tempActivity === lvl && styles.activityPillBtnActive]}
                      onPress={() => setTempActivity(lvl)}
                    >
                      <Text style={[styles.activityPillText, tempActivity === lvl && styles.activityPillTextActive]}>
                        {lvl}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* TARGET OBJECTIVES & TRACKING GOALS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionBlockTitle}>HEALTH GOALS & TARGETS</Text>
          <Text style={styles.sectionBlockSub}>Custom targets calibrated for your daily logs</Text>

          <TouchableOpacity
            style={styles.goalConfigRow}
            onPress={() => setIsGoalModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.goalRowLeft}>
              <View style={[styles.goalIconCircle, { backgroundColor: '#14382B' }]}>
                <Ionicons name="walk" size={20} color="#00E676" />
              </View>
              <View>
                <Text style={styles.goalRowHeading}>Daily Step Target</Text>
                <Text style={styles.goalRowDesc}>Hardware pedometer target indicator</Text>
              </View>
            </View>

            <View style={styles.goalRowRight}>
              <Text style={styles.goalValueHighlight}>{profile.stepGoal.toLocaleString()}</Text>
              <Ionicons name="chevron-forward" size={18} color="#5C6E73" />
            </View>
          </TouchableOpacity>

          <View style={styles.goalRowDivider} />

          <TouchableOpacity
            style={styles.goalConfigRow}
            onPress={() => setIsWaterGoalModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.goalRowLeft}>
              <View style={[styles.goalIconCircle, { backgroundColor: '#0F2C3F' }]}>
                <Ionicons name="water" size={20} color="#29B6F6" />
              </View>
              <View>
                <Text style={styles.goalRowHeading}>Daily Hydration Goal</Text>
                <Text style={styles.goalRowDesc}>250 ml glasses per daily cycle</Text>
              </View>
            </View>

            <View style={styles.goalRowRight}>
              <Text style={[styles.goalValueHighlight, { color: '#29B6F6' }]}>{profile.waterGoalGlasses} Glasses</Text>
              <Ionicons name="chevron-forward" size={18} color="#5C6E73" />
            </View>
          </TouchableOpacity>
        </View>

        {/* SYSTEM SETTINGS & SWITCHES */}
        <Text style={styles.groupHeading}>SETTINGS</Text>
        <View style={styles.settingsGroupCard}>
          <TouchableOpacity
            style={styles.settingItemRow}
            activeOpacity={0.7}
            onPress={() => Alert.alert('General Settings', 'Battery whitelist active. Background sensors operating optimally.')}
          >
            <View style={[styles.settingIconBox, { backgroundColor: '#1E88E5' }]}>
              <Ionicons name="settings" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemTitle}>General Settings</Text>
              <Text style={styles.settingItemSubtitle}>Sensor configuration & battery optimization</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#5C6E73" />
          </TouchableOpacity>

          <View style={styles.settingItemDivider} />

          <View style={styles.settingItemRow}>
            <View style={[styles.settingIconBox, { backgroundColor: '#FB8C00' }]}>
              <Ionicons name="mic" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemTitle}>Voice Options (TTS)</Text>
              <Text style={styles.settingItemSubtitle}>Pace & step milestone audio cues</Text>
            </View>
            <Switch
              value={profile.ttsVoiceEnabled}
              onValueChange={async (val) => {
                const updated = { ...profile, ttsVoiceEnabled: val };
                await persistProfile(updated);
              }}
              thumbColor={profile.ttsVoiceEnabled ? '#00E676' : '#7B8D93'}
              trackColor={{ false: '#1D2A2E', true: '#14382B' }}
            />
          </View>

          <View style={styles.settingItemDivider} />

          <TouchableOpacity
            style={styles.settingItemRow}
            activeOpacity={0.7}
            onPress={handleOpenFeedbackMailer}
          >
            <View style={[styles.settingIconBox, { backgroundColor: '#00ACC1' }]}>
              <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemTitle}>Suggest Other Features</Text>
              <Text style={styles.settingItemSubtitle}>Share feature requests directly with developer</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#5C6E73" />
          </TouchableOpacity>

          <View style={styles.settingItemDivider} />

          <TouchableOpacity
            style={styles.settingItemRow}
            activeOpacity={0.7}
            onPress={() => setIsLanguageModalVisible(true)}
          >
            <View style={[styles.settingIconBox, { backgroundColor: '#7B1FA2' }]}>
              <Ionicons name="globe" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemTitle}>Language Options</Text>
              <Text style={styles.settingItemSubtitle}>{profile.selectedLanguage} (Default)</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#5C6E73" />
          </TouchableOpacity>

          <View style={styles.settingItemDivider} />

          <View style={styles.settingItemRow}>
            <View style={[styles.settingIconBox, { backgroundColor: '#2E7D32' }]}>
              <MaterialCommunityIcons name="heart-pulse" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingItemTitle}>Sync to Health Connect</Text>
              <Text style={styles.settingItemSubtitle}>Synchronize daily pedometer logs with Google</Text>
            </View>
            <Switch
              value={profile.syncHealthConnect}
              onValueChange={async (val) => {
                const updated = { ...profile, syncHealthConnect: val };
                await persistProfile(updated);
                if (val) {
                  Alert.alert('Health Connect', 'Google Health Connect synchronization enabled.');
                }
              }}
              thumbColor={profile.syncHealthConnect ? '#00E676' : '#7B8D93'}
              trackColor={{ false: '#1D2A2E', true: '#14382B' }}
            />
          </View>
        </View>

        {/* LOWER 4 ACTION CARDS */}
        <View style={styles.lowerActionsCard}>
          <TouchableOpacity style={styles.actionItemBtn} onPress={handleShareAppAction} activeOpacity={0.7}>
            <View style={[styles.actionIconPill, { backgroundColor: '#37474F' }]}>
              <Ionicons name="share-social" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.actionItemText}>Share with friends</Text>
            <Ionicons name="chevron-forward" size={18} color="#5C6E73" />
          </TouchableOpacity>

          <View style={styles.actionDividerLine} />

          <TouchableOpacity style={styles.actionItemBtn} onPress={handleRateUsAction} activeOpacity={0.7}>
            <View style={[styles.actionIconPill, { backgroundColor: '#37474F' }]}>
              <Ionicons name="star" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.actionItemText}>Rate us</Text>
            <Ionicons name="chevron-forward" size={18} color="#5C6E73" />
          </TouchableOpacity>

          <View style={styles.actionDividerLine} />

          <TouchableOpacity style={styles.actionItemBtn} onPress={handleOpenFeedbackMailer} activeOpacity={0.7}>
            <View style={[styles.actionIconPill, { backgroundColor: '#37474F' }]}>
              <MaterialCommunityIcons name="pencil" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.actionItemText}>Feedback</Text>
            <Ionicons name="chevron-forward" size={18} color="#5C6E73" />
          </TouchableOpacity>

          <View style={styles.actionDividerLine} />

          <TouchableOpacity style={styles.actionItemBtn} onPress={handleRemoveAdsUpgrade} activeOpacity={0.7}>
            <View style={[styles.actionIconPill, { backgroundColor: '#37474F' }]}>
              <MaterialCommunityIcons name="advertisements-off" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.actionItemText}>Remove Ads</Text>
            <Ionicons name="chevron-forward" size={18} color="#5C6E73" />
          </TouchableOpacity>
        </View>

        {/* DATA UTILITIES & RESET ACTIONS */}
        <View style={styles.utilityActionsCard}>
          <TouchableOpacity style={styles.utilityActionRow} onPress={handleExportProfileJson} activeOpacity={0.7}>
            <Ionicons name="download-outline" size={18} color="#29B6F6" />
            <Text style={[styles.utilityActionText, { color: '#29B6F6' }]}>Export Health Profile (JSON)</Text>
          </TouchableOpacity>

          <View style={styles.utilityDividerLine} />

          <TouchableOpacity style={styles.utilityActionRow} onPress={handleResetStepLogs} activeOpacity={0.7}>
            <Ionicons name="refresh-circle-outline" size={19} color="#EF5350" />
            <Text style={[styles.utilityActionText, { color: '#EF5350' }]}>Reset Today's Pedometer & Hydration</Text>
          </TouchableOpacity>

          {/* SIGN OUT ACTION ITEM */}
          <View style={styles.utilityDividerLine} />

          <TouchableOpacity style={styles.utilityActionRow} onPress={handleSignOut} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={19} color="#FF5252" />
            <Text style={[styles.utilityActionText, { color: '#FF5252' }]}>Sign Out of Session</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.appVersionFootnote}>Version 1.7.91 • Production Build</Text>
      </ScrollView>

      {/* MODAL 1: USER AVATAR PICKER */}
      <Modal
        visible={isAvatarModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAvatarModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalMainTitle}>Profile Avatar</Text>
                <Text style={styles.modalSubTitle}>Choose an avatar or set your photo</Text>
              </View>
              <TouchableOpacity onPress={() => setIsAvatarModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#7B8D93" />
              </TouchableOpacity>
            </View>

            <View style={styles.deviceMediaButtonsRow}>
              <TouchableOpacity
                style={styles.primaryGalleryBtn}
                onPress={handleLaunchPhotoLibrary}
                activeOpacity={0.8}
              >
                <Ionicons name="images" size={20} color="#080C0D" />
                <Text style={styles.primaryGalleryBtnText}>Choose from Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryCameraBtn}
                onPress={handleLaunchCameraCapture}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={18} color="#29B6F6" />
                <Text style={styles.secondaryCameraBtnText}>Take Photo</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.deckSectionHeading}>SELECT FITNESS PERSONA</Text>

            <ScrollView style={styles.animeGridScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.animeHeroGrid}>
                {ANIME_HEROES_COLLECTION.map((hero) => {
                  const isCurrent = profile.equippedHeroId === hero.id;
                  return (
                    <TouchableOpacity
                      key={hero.id}
                      style={[
                        styles.animeGridCard,
                        { borderColor: hero.auraColor },
                        isCurrent && styles.animeGridCardEquipped,
                      ]}
                      onPress={() => handleEquipAnimeHero(hero)}
                      onLongPress={() => handleOpenHeroCard(hero)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: hero.avatarUri }} style={styles.animeGridPhoto} />

                      <Text style={styles.animeGridHeroName} numberOfLines={1}>{hero.name}</Text>
                      <Text style={[styles.animeGridSeriesTier, { color: hero.auraColor }]} numberOfLines={1}>
                        {hero.seriesTier}
                      </Text>

                      {isCurrent ? (
                        <View style={[styles.equippedHeroBadge, { backgroundColor: hero.auraColor }]}>
                          <Text style={styles.equippedHeroBadgeText}>EQUIPPED</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.heroInfoTrigger}
                          onPress={() => handleOpenHeroCard(hero)}
                        >
                          <Ionicons name="information-circle-outline" size={14} color="#7B8D93" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {profile.avatarUri && profile.equippedHeroId?.startsWith('custom') && (
              <TouchableOpacity
                style={styles.removePhotoOptionBtn}
                onPress={handleRemoveCustomAvatar}
              >
                <Ionicons name="trash-outline" size={16} color="#EF5350" />
                <Text style={styles.removePhotoOptionText}>Remove Custom Picture</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.modalDismissBtn}
              onPress={() => setIsAvatarModalVisible(false)}
            >
              <Text style={styles.modalDismissBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: HERO STAT CARD DETAIL MODAL */}
      <Modal
        visible={isHeroDetailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsHeroDetailModalVisible(false)}
      >
        <View style={styles.modalCenterBackdrop}>
          {selectedHeroForDetail && (
            <View style={[styles.heroDetailCard, { borderColor: selectedHeroForDetail.auraColor }]}>
              <Image source={{ uri: selectedHeroForDetail.avatarUri }} style={styles.heroDetailImage} />

              <Text style={styles.heroDetailName}>{selectedHeroForDetail.name}</Text>
              <Text style={[styles.heroDetailTier, { color: selectedHeroForDetail.auraColor }]}>
                {selectedHeroForDetail.seriesTier} • {selectedHeroForDetail.powerLevel}
              </Text>

              <Text style={styles.heroDetailQuote}>&quot;{selectedHeroForDetail.quote}&quot;</Text>

              <View style={styles.heroStatsContainer}>
                <View style={styles.statGaugeRow}>
                  <Text style={styles.statGaugeName}>Strength</Text>
                  <View style={styles.statGaugeTrack}>
                    <View
                      style={[
                        styles.statGaugeFill,
                        { width: `${selectedHeroForDetail.stats.strength}%`, backgroundColor: selectedHeroForDetail.auraColor },
                      ]}
                    />
                  </View>
                  <Text style={styles.statGaugeValue}>{selectedHeroForDetail.stats.strength}</Text>
                </View>

                <View style={styles.statGaugeRow}>
                  <Text style={styles.statGaugeName}>Stamina</Text>
                  <View style={styles.statGaugeTrack}>
                    <View
                      style={[
                        styles.statGaugeFill,
                        { width: `${selectedHeroForDetail.stats.stamina}%`, backgroundColor: selectedHeroForDetail.auraColor },
                      ]}
                    />
                  </View>
                  <Text style={styles.statGaugeValue}>{selectedHeroForDetail.stats.stamina}</Text>
                </View>

                <View style={styles.statGaugeRow}>
                  <Text style={styles.statGaugeName}>Agility</Text>
                  <View style={styles.statGaugeTrack}>
                    <View
                      style={[
                        styles.statGaugeFill,
                        { width: `${selectedHeroForDetail.stats.agility}%`, backgroundColor: selectedHeroForDetail.auraColor },
                      ]}
                    />
                  </View>
                  <Text style={styles.statGaugeValue}>{selectedHeroForDetail.stats.agility}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.heroEquipDirectBtn, { backgroundColor: selectedHeroForDetail.auraColor }]}
                onPress={() => handleEquipAnimeHero(selectedHeroForDetail)}
              >
                <Text style={styles.heroEquipDirectBtnText}>Equip This Warrior</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroDetailCloseBtn}
                onPress={() => setIsHeroDetailModalVisible(false)}
              >
                <Text style={styles.heroDetailCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* MODAL 3: STEP GOAL CONFIGURATOR */}
      <Modal
        visible={isGoalModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsGoalModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalDragHandle} />
            <Text style={styles.modalMainTitle}>Daily Step Target</Text>
            <Text style={styles.modalSubTitle}>Select a goal based on your target caloric burn</Text>

            <View style={styles.presetPillWrap}>
              {[4000, 6000, 8000, 10000, 12000, 15000].map((goal) => {
                const isActive = draftStepGoal === goal;
                return (
                  <TouchableOpacity
                    key={goal}
                    style={[styles.presetGoalPill, isActive && styles.presetGoalPillActive]}
                    onPress={() => setDraftStepGoal(goal)}
                  >
                    <Text style={[styles.presetGoalPillText, isActive && styles.presetGoalPillTextActive]}>
                      {goal.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.primaryConfirmGoalBtn}
              onPress={() => handleSaveStepTarget(draftStepGoal)}
            >
              <Text style={styles.primaryConfirmGoalBtnText}>Apply Step Target</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalDismissBtn}
              onPress={() => setIsGoalModalVisible(false)}
            >
              <Text style={styles.modalDismissBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: HYDRATION TARGET CONFIGURATOR */}
      <Modal
        visible={isWaterGoalModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsWaterGoalModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalDragHandle} />
            <Text style={styles.modalMainTitle}>Daily Hydration Target</Text>
            <Text style={styles.modalSubTitle}>Each glass is estimated at 250 ml of pure water</Text>

            <View style={styles.presetPillWrap}>
              {[6, 8, 10, 12, 14, 16].map((glasses) => {
                const isActive = draftWaterGlasses === glasses;
                return (
                  <TouchableOpacity
                    key={glasses}
                    style={[
                      styles.presetGoalPill,
                      isActive && { borderColor: '#29B6F6', backgroundColor: '#09212E' },
                    ]}
                    onPress={() => setDraftWaterGlasses(glasses)}
                  >
                    <Text
                      style={[
                        styles.presetGoalPillText,
                        isActive && { color: '#29B6F6', fontWeight: '800' },
                      ]}
                    >
                      {glasses} Glasses ({glasses * 250}ml)
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.primaryConfirmGoalBtn, { backgroundColor: '#29B6F6' }]}
              onPress={() => handleSaveWaterTarget(draftWaterGlasses)}
            >
              <Text style={[styles.primaryConfirmGoalBtnText, { color: '#080C0D' }]}>
                Apply Hydration Target
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalDismissBtn}
              onPress={() => setIsWaterGoalModalVisible(false)}
            >
              <Text style={styles.modalDismissBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: LANGUAGE SELECTOR */}
      <Modal
        visible={isLanguageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsLanguageModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalDragHandle} />
            <Text style={styles.modalMainTitle}>Language Options</Text>
            <Text style={styles.modalSubTitle}>Select primary app coaching interface language</Text>

            {['English', 'Telugu (తెలుగు)', 'Hindi (हिंदी)', 'Spanish'].map((lang) => {
              const isCurrent = profile.selectedLanguage === lang;
              return (
                <TouchableOpacity
                  key={lang}
                  style={[styles.languageOptionRow, isCurrent && styles.languageOptionRowActive]}
                  onPress={async () => {
                    const updated = { ...profile, selectedLanguage: lang };
                    await persistProfile(updated);
                    setIsLanguageModalVisible(false);
                  }}
                >
                  <Text style={[styles.languageOptionText, isCurrent && styles.languageOptionTextActive]}>
                    {lang}
                  </Text>
                  {isCurrent && <Ionicons name="checkmark-circle" size={20} color="#00E676" />}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.modalDismissBtn}
              onPress={() => setIsLanguageModalVisible(false)}
            >
              <Text style={styles.modalDismissBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 6: DEVELOPER-CONTROLLED HYDRATION HEROES */}
      <Modal
        visible={isHydrationHeroModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsHydrationHeroModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalMainTitle}>Hydration Heroes</Text>
                <Text style={styles.modalSubTitle}>Official walking companion pose</Text>
              </View>
              <TouchableOpacity onPress={() => setIsHydrationHeroModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#7B8D93" />
              </TouchableOpacity>
            </View>

            <Text style={styles.avatarGridHeaderLabel}>OFFICIAL HERO POSES</Text>

            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              <View style={styles.developerPosesContainer}>
                {DEVELOPER_HERO_POSES.map((pose) => {
                  const isSelected = selectedHydrationPoseId === pose.id;
                  return (
                    <TouchableOpacity
                      key={pose.id}
                      style={[
                        styles.developerPoseCard,
                        { borderColor: pose.color },
                        isSelected && styles.developerPoseCardActive,
                      ]}
                      onPress={() => handleSelectDeveloperPose(pose)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.developerPoseIconRing, { borderColor: pose.color }]}>
                        <Image
                          source={pose.imageSource}
                          style={styles.peddiThumbnailImg}
                          resizeMode="contain"
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.developerPoseName}>{pose.name}</Text>
                        <Text style={styles.developerPoseTagline}>{pose.tagline}</Text>
                      </View>

                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={isSelected ? pose.color : '#5C6E73'}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalDismissBtn}
              onPress={() => setIsHydrationHeroModalVisible(false)}
            >
              <Text style={styles.modalDismissBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PERSISTENT BOTTOM NAVIGATION BAR */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabBarItem} onPress={() => router.replace('/')}>
          <Ionicons name="home" size={20} color="#657378" />
          <Text style={styles.tabBarLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBarItem} onPress={() => router.push('/water-nutrition')} activeOpacity={0.7}>
          <Ionicons name="water" size={20} color="#29B6F6" />
          <Text style={styles.tabBarLabel}>Health</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBarItem} onPress={() => setIsHydrationHeroModalVisible(true)} activeOpacity={0.7}>
          <Ionicons name="sparkles" size={20} color="#FF9100" />
          <Text style={[styles.tabBarLabel, { color: '#FF9100' }]}>Hero</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBarItem} onPress={() => router.push('/vitals')} activeOpacity={0.7}>
          <MaterialCommunityIcons name="heart-pulse" size={20} color="#657378" />
          <Text style={styles.tabBarLabel}>Vitals</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBarItem} onPress={() => router.push('/exercises')} activeOpacity={0.7}>
          <FontAwesome5 name="dumbbell" size={17} color="#657378" />
          <Text style={styles.tabBarLabel}>Exercises</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBarItem} activeOpacity={0.7}>
          <Ionicons name="person" size={20} color="#00E676" />
          <Text style={[styles.tabBarLabel, { color: '#00E676' }]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLESHEET
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C0D',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#080C0D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#7B8D93',
    marginTop: 14,
    fontSize: 13,
    fontWeight: '600',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 10 : 16,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#12191C',
  },
  headerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  headerBackText: {
    color: '#00E676',
    fontSize: 15,
    fontWeight: '700',
  },
  headerTitleCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#5C6E73',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  headerActionBtn: {
    backgroundColor: '#0E211A',
    borderWidth: 1,
    borderColor: '#00E676',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  headerActionText: {
    color: '#00E676',
    fontWeight: '700',
    fontSize: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 95,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10171A',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  avatarAuraGlow: {
    position: 'relative',
    marginRight: 16,
    borderWidth: 3,
    borderRadius: 40,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarPhoto: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#162327',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBadgeIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#080C0D',
  },
  heroDetailsBlock: {
    flex: 1,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroNameText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    flex: 1,
  },
  powerLevelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#091512',
  },
  powerLevelText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroSeriesTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  heroEmailText: {
    color: '#7B8D93',
    fontSize: 11,
    marginTop: 2,
  },
  heroPillTagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  statPill: {
    backgroundColor: '#162226',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#243439',
  },
  statPillLabel: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '700',
  },
  editHeroForm: {
    flex: 1,
  },
  editFormLabel: {
    color: '#7B8D93',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  editTextInput: {
    backgroundColor: '#080C0D',
    borderWidth: 1,
    borderColor: '#243338',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: '#FFFFFF',
    fontSize: 13,
  },
  hydrationHeroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A1817',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  hydrationHeroBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  hydrationHeroMiniAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#060B0D',
    overflow: 'hidden',
  },
  hydrationHeroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hydrationHeroBannerHeading: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  hydrationHeroBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hydrationHeroBadgePillText: {
    color: '#080C0D',
    fontSize: 8,
    fontWeight: '900',
  },
  hydrationHeroActiveName: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  hydrationHeroBannerSub: {
    color: '#7B8D93',
    fontSize: 10,
    marginTop: 1,
  },
  avatarGridHeaderLabel: {
    color: '#7B8D93',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  developerPosesContainer: {
    gap: 10,
    paddingVertical: 4,
  },
  developerPoseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#091012',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  developerPoseCardActive: {
    backgroundColor: '#0D221A',
    borderColor: '#00E676',
    borderWidth: 2,
  },
  developerPoseIconRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#060B0D',
    overflow: 'hidden',
  },
  peddiThumbnailImg: {
    width: 42,
    height: 42,
  },
  developerPoseName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  developerPoseTagline: {
    color: '#7B8D93',
    fontSize: 11,
    marginTop: 2,
  },
  characterDeckBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0E1C16',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  deckBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  deckIconRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  deckBannerHeading: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  deckBannerSub: {
    color: '#8A999E',
    fontSize: 10,
    marginTop: 2,
  },
  deckBannerRight: {
    paddingLeft: 8,
  },
  deckActionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  animeGridScrollView: {
    maxHeight: 250,
  },
  animeHeroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    paddingBottom: 10,
  },
  animeGridCard: {
    width: '31%',
    backgroundColor: '#091012',
    borderRadius: 14,
    borderWidth: 2,
    padding: 8,
    alignItems: 'center',
    position: 'relative',
  },
  animeGridCardEquipped: {
    backgroundColor: '#142920',
  },
  animeGridPhoto: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: '#1D2A2E',
  },
  animeGridHeroName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  animeGridSeriesTier: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
    textAlign: 'center',
  },
  equippedHeroBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  equippedHeroBadgeText: {
    color: '#080C0D',
    fontSize: 7,
    fontWeight: '900',
  },
  heroInfoTrigger: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  sectionCard: {
    backgroundColor: '#10171A',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#19252A',
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sectionBlockTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionBlockSub: {
    color: '#7B8D93',
    fontSize: 10,
    marginTop: 2,
  },
  editingTag: {
    backgroundColor: '#0E211A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00E676',
  },
  editingTagText: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '700',
  },
  biometricsOverview: {
    marginTop: 4,
  },
  bioMetricThreeCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  bioMetricCell: {
    flex: 1,
    alignItems: 'center',
  },
  bioMetricCellBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#182428',
  },
  bioMetricLabel: {
    color: '#7B8D93',
    fontSize: 11,
    fontWeight: '600',
  },
  bioMetricVal: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginVertical: 4,
  },
  bioMetricNote: {
    color: '#5C6E73',
    fontSize: 10,
    fontWeight: '600',
  },
  bmiInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0A1316',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  bmiInfoBannerText: {
    color: '#A4B5BA',
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  metabolicBox: {
    backgroundColor: '#0A1113',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#172428',
  },
  metabolicItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metabolicIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metabolicTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  metabolicSub: {
    color: '#7B8D93',
    fontSize: 10,
    marginTop: 2,
  },
  metabolicDivider: {
    height: 1,
    backgroundColor: '#162327',
    marginVertical: 10,
  },
  editMetricsFormGroup: {
    marginTop: 4,
  },
  formRowTwoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  genderSelectGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  genderSelectBtn: {
    flex: 1,
    backgroundColor: '#080C0D',
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#243338',
  },
  genderSelectBtnActive: {
    borderColor: '#00E676',
    backgroundColor: '#0E211A',
  },
  genderSelectBtnText: {
    color: '#7B8D93',
    fontSize: 12,
    fontWeight: '700',
  },
  genderSelectBtnTextActive: {
    color: '#00E676',
  },
  activityLevelsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  activityPillBtn: {
    flex: 1,
    backgroundColor: '#080C0D',
    borderWidth: 1,
    borderColor: '#243338',
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  activityPillBtnActive: {
    borderColor: '#00E676',
    backgroundColor: '#0E211A',
  },
  activityPillText: {
    color: '#7B8D93',
    fontSize: 11,
    fontWeight: '700',
  },
  activityPillTextActive: {
    color: '#00E676',
  },
  goalConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  goalRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  goalIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalRowHeading: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  goalRowDesc: {
    color: '#7B8D93',
    fontSize: 10,
    marginTop: 2,
  },
  goalRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalValueHighlight: {
    color: '#00E676',
    fontWeight: '800',
    fontSize: 14,
  },
  goalRowDivider: {
    height: 1,
    backgroundColor: '#162226',
    marginVertical: 4,
  },
  groupHeading: {
    color: '#7B8D93',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingsGroupCard: {
    backgroundColor: '#10171A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#19252A',
    overflow: 'hidden',
    marginBottom: 16,
  },
  settingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
  },
  settingIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingItemTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  settingItemSubtitle: {
    color: '#7B8D93',
    fontSize: 10,
    marginTop: 2,
  },
  settingItemDivider: {
    height: 1,
    backgroundColor: '#162226',
    marginLeft: 62,
  },
  lowerActionsCard: {
    backgroundColor: '#10171A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#19252A',
    overflow: 'hidden',
    marginBottom: 16,
  },
  actionItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  actionIconPill: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionItemText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionDividerLine: {
    height: 1,
    backgroundColor: '#162226',
    marginLeft: 62,
  },
  utilityActionsCard: {
    backgroundColor: '#101416',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1C262B',
    marginBottom: 14,
  },
  utilityActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  utilityActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  utilityDividerLine: {
    height: 1,
    backgroundColor: '#162226',
  },
  appVersionFootnote: {
    textAlign: 'center',
    color: '#5C6E73',
    fontSize: 11,
    fontWeight: '600',
    marginVertical: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'flex-end',
  },
  modalContentCard: {
    width: '100%',
    backgroundColor: '#10171A',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: '#19252A',
    maxHeight: '88%',
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#243338',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalMainTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  modalSubTitle: {
    color: '#7B8D93',
    fontSize: 11,
    marginTop: 2,
  },
  deviceMediaButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  primaryGalleryBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E676',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
  },
  primaryGalleryBtnText: {
    color: '#080C0D',
    fontWeight: '800',
    fontSize: 13,
  },
  secondaryCameraBtn: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F232D',
    borderWidth: 1,
    borderColor: '#29B6F6',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 6,
  },
  secondaryCameraBtnText: {
    color: '#29B6F6',
    fontWeight: '700',
    fontSize: 13,
  },
  deckSectionHeading: {
    color: '#7B8D93',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  removePhotoOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  removePhotoOptionText: {
    color: '#EF5350',
    fontSize: 12,
    fontWeight: '700',
  },
  modalDismissBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#141E22',
    borderRadius: 12,
  },
  modalDismissBtnText: {
    color: '#7B8D93',
    fontSize: 13,
    fontWeight: '700',
  },
  modalCenterBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  heroDetailCard: {
    width: '100%',
    backgroundColor: '#10171A',
    borderRadius: 24,
    padding: 22,
    borderWidth: 2,
    alignItems: 'center',
  },
  heroDetailImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
  },
  heroDetailName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  heroDetailTier: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  heroDetailQuote: {
    color: '#8A999E',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 14,
    lineHeight: 18,
  },
  heroStatsContainer: {
    width: '100%',
    gap: 8,
    marginBottom: 18,
  },
  statGaugeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statGaugeName: {
    color: '#7B8D93',
    fontSize: 11,
    fontWeight: '700',
    width: 60,
  },
  statGaugeTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#1B262B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  statGaugeFill: {
    height: '100%',
    borderRadius: 3,
  },
  statGaugeValue: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    width: 25,
    textAlign: 'right',
  },
  heroEquipDirectBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  heroEquipDirectBtnText: {
    color: '#080C0D',
    fontWeight: '800',
    fontSize: 13,
  },
  heroDetailCloseBtn: {
    paddingVertical: 10,
    marginTop: 6,
  },
  heroDetailCloseBtnText: {
    color: '#7B8D93',
    fontSize: 12,
    fontWeight: '700',
  },
  presetPillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 16,
  },
  presetGoalPill: {
    width: '30%',
    backgroundColor: '#080C0D',
    borderWidth: 1,
    borderColor: '#243338',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  presetGoalPillActive: {
    borderColor: '#00E676',
    backgroundColor: '#0E211A',
  },
  presetGoalPillText: {
    color: '#7B8D93',
    fontWeight: '700',
    fontSize: 12,
  },
  presetGoalPillTextActive: {
    color: '#00E676',
    fontWeight: '800',
  },
  primaryConfirmGoalBtn: {
    backgroundColor: '#00E676',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryConfirmGoalBtnText: {
    color: '#080C0D',
    fontWeight: '800',
    fontSize: 13,
  },
  languageOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#162226',
  },
  languageOptionRowActive: {
    backgroundColor: '#0E1C16',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  languageOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  languageOptionTextActive: {
    color: '#00E676',
    fontWeight: '800',
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#080C0D',
    borderTopWidth: 1,
    borderTopColor: '#162226',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 12 : 2,
  },
  tabBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarLabel: {
    fontSize: 9,
    color: '#657378',
    fontWeight: '600',
    marginTop: 3,
  },
});