import {
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  BackHandler,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

// Dynamic lookup for Supabase
let supabaseInstance: any = null;
try {
  const supaMod = require('./supabase') || require('../supabase');
  supabaseInstance = supaMod.supabase || supaMod.default;
} catch (e) {
  supabaseInstance = null;
}

interface ActivityTier {
  id: string;
  title: string;
  description: string;
  multiplier: number;
  icon: string;
}

const ACTIVITY_TIERS: ActivityTier[] = [
  {
    id: 'sedentary',
    title: 'Sedentary',
    description: 'Desk job, minimal daily movement, under 3k steps.',
    multiplier: 1.2,
    icon: 'chair-rolling',
  },
  {
    id: 'light',
    title: 'Lightly Active',
    description: 'Light exercise or active walking 1-3 days per week.',
    multiplier: 1.375,
    icon: 'walk',
  },
  {
    id: 'moderate',
    title: 'Moderately Active',
    description: 'Moderate cardio or sports 3-5 days per week.',
    multiplier: 1.55,
    icon: 'run',
  },
  {
    id: 'very_active',
    title: 'Very Active',
    description: 'Hard daily training or high-cadence athletic conditioning.',
    multiplier: 1.725,
    icon: 'weight-lifter',
  },
  {
    id: 'extreme',
    title: 'Extremely Active',
    description: 'Heavy endurance athletics or 2x daily training sessions.',
    multiplier: 1.9,
    icon: 'fire',
  },
];

interface HealthGoal {
  id: string;
  title: string;
  subtitle: string;
  caloricDelta: number;
  icon: string;
  accentColor: string;
}

const HEALTH_GOALS: HealthGoal[] = [
  {
    id: 'fat_loss',
    title: 'Cut & Fat Loss',
    subtitle: 'Safe moderate caloric deficit (-500 kcal/day)',
    caloricDelta: -500,
    icon: 'fire-circle',
    accentColor: '#FF5252',
  },
  {
    id: 'maintenance',
    title: 'Maintain Weight',
    subtitle: 'Sustain current weight while improving stamina',
    caloricDelta: 0,
    icon: 'scale-balance',
    accentColor: '#00E5FF',
  },
  {
    id: 'muscle_gain',
    title: 'Hypertrophy & Bulking',
    subtitle: 'Lean caloric surplus with high protein intake (+300 kcal/day)',
    caloricDelta: 300,
    icon: 'arm-flex',
    accentColor: '#00E676',
  },
  {
    id: 'endurance',
    title: 'Endurance & Athletics',
    subtitle: 'High carbohydrate and glycogen replenishment (+450 kcal/day)',
    caloricDelta: 450,
    icon: 'lightning-bolt',
    accentColor: '#FFB300',
  },
];

const DIET_PREFERENCES = [
  { id: 'standard', label: 'Standard / Omnivore' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Plant-Based / Vegan' },
  { id: 'keto', label: 'Ketogenic / Low-Carb' },
  { id: 'high_protein', label: 'High-Protein Fitness' },
  { id: 'intermittent', label: 'Intermittent Fasting (16:8)' },
  { id: 'diabetic', label: 'Diabetic Friendly' },
  { id: 'low_sodium', label: 'Low-Sodium / Heart Care' },
];

export default function ProfileSetupScreen() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;

  const [useMetric, setUseMetric] = useState<boolean>(true);

  // Stage 1
  const [userFullName, setUserFullName] = useState<string>('');
  const [age, setAge] = useState<string>('22');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');

  const [heightCm, setHeightCm] = useState<string>('175');
  const [heightFeet, setHeightFeet] = useState<string>('5');
  const [heightInches, setHeightInches] = useState<string>('9');

  const [weightKg, setWeightKg] = useState<string>('70');
  const [targetWeightKg, setTargetWeightKg] = useState<string>('68');
  const [weightLbs, setWeightLbs] = useState<string>('154');
  const [targetWeightLbs, setTargetWeightLbs] = useState<string>('150');

  // Stage 2
  const [selectedActivity, setSelectedActivity] = useState<string>('moderate');
  const [selectedGoal, setSelectedGoal] = useState<string>('muscle_gain');
  const [fitnessExperience, setFitnessExperience] = useState<string>('intermediate');

  // Stage 3
  const [dailyStepGoal, setDailyStepGoal] = useState<number>(8000);
  const [dailyWaterCups, setDailyWaterCups] = useState<number>(10);
  const [selectedDiet, setSelectedDiet] = useState<string>('high_protein');

  // Stage 4
  const [waterReminderInterval, setWaterReminderInterval] = useState<number>(70);
  const [allowNotifications, setAllowNotifications] = useState<boolean>(true);
  const [allowBackgroundPedometer, setAllowBackgroundPedometer] = useState<boolean>(true);
  const [allowScreenOverlay, setAllowScreenOverlay] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const safePush = (targetRoute: string) => {
    try {
      router.push(targetRoute as any);
    } catch (err) {
      console.warn(`Could not navigate to: ${targetRoute}`, err);
    }
  };

  const navigateBackToDashboard = () => {
  BackHandler.exitApp();
};

useEffect(() => {
  const handleHardwareBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      return true;
    }
    BackHandler.exitApp();
    return true;
  };

  const backSubscription = BackHandler.addEventListener(
    'hardwareBackPress',
    handleHardwareBack
  );
  return () => backSubscription.remove();
}, [currentStep]);
  const triggerOverlayPermissionSettings = async () => {
    if (Platform.OS === 'android') {
      Alert.alert(
        'Enable Screen Walk Animation',
        'Please allow "Display over other apps" so Peddi or Pushpa can walk across your phone screen every 70 minutes.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: async () => {
              try {
                await IntentLauncher.startActivityAsync(
                  'android.settings.action.MANAGE_OVERLAY_PERMISSION',
                  { data: 'package:com.chintu6y.healthguideai' }
                );
              } catch (err) {
                console.warn('Could not launch overlay permission intent', err);
              }
            },
          },
        ]
      );
    }
  };

  const verifyNotificationPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        return finalStatus === 'granted';
      } catch (err) {
        console.warn('Notification permission query fallback:', err);
      }
    }
    return true;
  };

  const handleUnitToggle = (metricMode: boolean) => {
    setUseMetric(metricMode);
    if (metricMode) {
      const totalInches = (parseFloat(heightFeet) || 0) * 12 + (parseFloat(heightInches) || 0);
      const convertedCm = Math.round(totalInches * 2.54);
      setHeightCm(String(convertedCm || 175));

      const convertedKg = Math.round((parseFloat(weightLbs) || 154) * 0.453592);
      setWeightKg(String(convertedKg || 70));

      const convertedTargetKg = Math.round((parseFloat(targetWeightLbs) || 150) * 0.453592);
      setTargetWeightKg(String(convertedTargetKg || 68));
    } else {
      const cmVal = parseFloat(heightCm) || 175;
      const totalInches = cmVal / 2.54;
      setHeightFeet(String(Math.floor(totalInches / 12)));
      setHeightInches(String(Math.round(totalInches % 12)));

      const kgVal = parseFloat(weightKg) || 70;
      setWeightLbs(String(Math.round(kgVal * 2.20462)));

      const targetKgVal = parseFloat(targetWeightKg) || 68;
      setTargetWeightLbs(String(Math.round(targetKgVal * 2.20462)));
    }
  };

  const activeWeightInKg = useMemo(() => {
    if (useMetric) return parseFloat(weightKg) || 70;
    return Math.round((parseFloat(weightLbs) || 154) * 0.453592);
  }, [useMetric, weightKg, weightLbs]);

  const activeHeightInCm = useMemo(() => {
    if (useMetric) return parseFloat(heightCm) || 175;
    const totalInches = (parseFloat(heightFeet) || 5) * 12 + (parseFloat(heightInches) || 9);
    return Math.round(totalInches * 2.54);
  }, [useMetric, heightCm, heightFeet, heightInches]);

  const numericAge = useMemo(() => parseInt(age, 10) || 22, [age]);

  const biometricAnalytics = useMemo(() => {
    const heightInMeters = activeHeightInCm / 100;
    const bmiVal = activeWeightInKg / (heightInMeters * heightInMeters);
    const bmi = isNaN(bmiVal) ? 22.5 : parseFloat(bmiVal.toFixed(1));

    let bmiClassification = 'Normal Weight';
    let bmiColor = '#00E676';
    if (bmi < 18.5) {
      bmiClassification = 'Underweight';
      bmiColor = '#00E5FF';
    } else if (bmi >= 25 && bmi < 29.9) {
      bmiClassification = 'Overweight';
      bmiColor = '#FFB300';
    } else if (bmi >= 30) {
      bmiClassification = 'Obese';
      bmiColor = '#FF5252';
    }

    let baseBMR = 10 * activeWeightInKg + 6.25 * activeHeightInCm - 5 * numericAge;
    if (gender === 'male') baseBMR += 5;
    else if (gender === 'female') baseBMR -= 161;
    else baseBMR -= 78;
    const bmr = Math.round(baseBMR);

    const activeTierObj = ACTIVITY_TIERS.find((t) => t.id === selectedActivity) || ACTIVITY_TIERS[2];
    const tdee = Math.round(bmr * activeTierObj.multiplier);

    const goalObj = HEALTH_GOALS.find((g) => g.id === selectedGoal) || HEALTH_GOALS[1];
    const targetCalories = Math.max(1200, tdee + goalObj.caloricDelta);

    const strideLengthCm =
      gender === 'female' ? Math.round(activeHeightInCm * 0.413) : Math.round(activeHeightInCm * 0.415);

    const recommendedWaterLiters = (activeWeightInKg * 0.035 * activeTierObj.multiplier) / 1.2;
    const recommendedCups = Math.max(6, Math.round((recommendedWaterLiters * 1000) / 250));

    return {
      bmi,
      bmiClassification,
      bmiColor,
      bmr,
      tdee,
      targetCalories,
      strideLengthCm,
      recommendedCups,
    };
  }, [activeWeightInKg, activeHeightInCm, numericAge, gender, selectedActivity, selectedGoal]);

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (numericAge < 10 || numericAge > 120) {
        Alert.alert('Invalid Age', 'Please enter a realistic age between 10 and 120.');
        return;
      }
      if (activeHeightInCm < 90 || activeHeightInCm > 260) {
        Alert.alert('Invalid Height', 'Please enter a valid height measurement.');
        return;
      }
      if (activeWeightInKg < 25 || activeWeightInKg > 350) {
        Alert.alert('Invalid Weight', 'Please enter a valid weight measurement.');
        return;
      }
    }

    if (currentStep === 3 && allowNotifications) {
      await verifyNotificationPermissions();
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinalSubmission();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigateBackToDashboard();
    }
  };

  const handleFinalSubmission = async () => {
    setIsSubmitting(true);
    try {
      const existingRaw = await AsyncStorage.getItem('@health_user_profile');
      const existingProfile = existingRaw ? JSON.parse(existingRaw) : {};

      const finalName = userFullName.trim() || existingProfile?.name || 'Athlete';

      const compiledProfile = {
        ...existingProfile,
        name: finalName,
        fullName: finalName,
        age: numericAge,
        gender,
        useMetric,
        heightCm: activeHeightInCm,
        weightKg: activeWeightInKg,
        targetWeightKg: useMetric
          ? parseFloat(targetWeightKg) || activeWeightInKg
          : Math.round((parseFloat(targetWeightLbs) || 150) * 0.453592),
        activityTier: selectedActivity,
        healthGoal: selectedGoal,
        fitnessExperience,
        dietaryPreference: selectedDiet,
        stepGoal: dailyStepGoal,
        waterGoalCups: dailyWaterCups,
        waterReminderInterval,
        allowNotifications,
        allowBackgroundPedometer,
        allowScreenOverlay,
        analytics: {
          bmi: biometricAnalytics.bmi,
          bmiCategory: biometricAnalytics.bmiClassification,
          bmr: biometricAnalytics.bmr,
          tdee: biometricAnalytics.tdee,
          targetDailyCalories: biometricAnalytics.targetCalories,
          strideLengthCm: biometricAnalytics.strideLengthCm,
        },
        completedAt: new Date().toISOString(),
        isCompleted: true,
      };

      const existingToken = await AsyncStorage.getItem('@user_session_token');
      if (!existingToken) {
        const fallbackId = 'user_active_' + Date.now();
        await AsyncStorage.setItem('@user_session_token', fallbackId);
        await AsyncStorage.setItem('@health_user_token', fallbackId);
        await AsyncStorage.setItem('@health_user_session', fallbackId);
      }

      await AsyncStorage.multiSet([
        ['@health_user_profile', JSON.stringify(compiledProfile)],
        ['@health_user_name', finalName],
        ['@health_step_goal', String(dailyStepGoal)],
        ['@health_water_goal', String(dailyWaterCups)],
        ['@health_stride_length', String(biometricAnalytics.strideLengthCm)],
        ['@health_target_calories', String(biometricAnalytics.targetCalories)],
        ['@health_allow_overlay', String(allowScreenOverlay)],
        ['@health_allow_background', String(allowBackgroundPedometer)],
        ['@health_profile_completed', 'true'],
      ]);

      if (supabaseInstance && supabaseInstance.auth) {
        try {
          const userSession = await supabaseInstance.auth.getUser();
          if (userSession?.data?.user?.id) {
            await supabaseInstance
              .from('user_profiles')
              .upsert({
                id: userSession.data.user.id,
                profile_data: compiledProfile,
                updated_at: new Date().toISOString(),
              });
          }
        } catch (cloudErr) {
          console.warn('Silent cloud sync bypass:', cloudErr);
        }
      }

      BackHandler.exitApp();;
    } catch (saveError) {
      console.error('Critical failure saving user profile:', saveError);
      Alert.alert('Storage Error', 'Could not record profile parameters locally.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Bar */}
        <View style={styles.wizardHeader}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={handlePrevStep}
            activeOpacity={0.8}
          >
            <Feather name="arrow-left" size={20} color="#ECEFF1" />
          </TouchableOpacity>

          <View style={styles.brandBadge}>
            <Ionicons name="shield-checkmark" size={22} color="#00E676" />
          </View>
          <View style={styles.headerTextGroup}>
            <Text style={styles.screenTitle}>PROFILE CALIBRATION</Text>
            <Text style={styles.stepCounterText}>
              Stage {currentStep} of {totalSteps} • Biometric Setup
            </Text>
          </View>
        </View>

        {/* Wizard Progress Track */}
        <View style={styles.stepTrack}>
          {[1, 2, 3, 4].map((stepIndex) => (
            <View
              key={stepIndex}
              style={[
                styles.stepSegment,
                stepIndex <= currentStep && styles.stepSegmentActive,
                stepIndex === currentStep && styles.stepSegmentCurrent,
              ]}
            />
          ))}
        </View>

        {/* STAGE 1 */}
        {currentStep === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.bannerBox}>
              <Ionicons name="finger-print" size={22} color="#00E676" />
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Biometric Parameters</Text>
                <Text style={styles.bannerBody}>
                  Calibrate your physical metrics to accurately calculate burned calories,
                  basal metabolic rate, and step distance on device.
                </Text>
              </View>
            </View>

            <View style={styles.unitSelectorRow}>
              <Text style={styles.unitSelectorLabel}>Measurement Units</Text>
              <View style={styles.unitToggleGroup}>
                <TouchableOpacity
                  style={[styles.unitButton, useMetric && styles.unitButtonActive]}
                  onPress={() => handleUnitToggle(true)}
                >
                  <Text style={[styles.unitButtonText, useMetric && styles.unitButtonTextActive]}>
                    Metric (cm / kg)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitButton, !useMetric && styles.unitButtonActive]}
                  onPress={() => handleUnitToggle(false)}
                >
                  <Text style={[styles.unitButtonText, !useMetric && styles.unitButtonTextActive]}>
                    Imperial (ft / lbs)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.inputLabel}>Full Name or Call-Sign</Text>
              <View style={styles.inputWrapper}>
                <Feather name="user" size={18} color="#78909C" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Kashif"
                  placeholderTextColor="#455A64"
                  value={userFullName}
                  onChangeText={setUserFullName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.spacer14} />

              <Text style={styles.inputLabel}>Biological Sex</Text>
              <View style={styles.genderRow}>
                {(['male', 'female', 'other'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderButton, gender === g && styles.genderButtonActive]}
                    onPress={() => setGender(g)}
                  >
                    <Ionicons
                      name={g === 'male' ? 'male' : g === 'female' ? 'female' : 'person'}
                      size={18}
                      color={gender === g ? '#080C0D' : '#90A4AE'}
                    />
                    <Text
                      style={[
                        styles.genderButtonText,
                        gender === g && styles.genderButtonTextActive,
                      ]}
                    >
                      {g.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.spacer14} />

              <Text style={styles.inputLabel}>Age (Years)</Text>
              <View style={styles.inputWrapper}>
                <Feather name="calendar" size={18} color="#78909C" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 21"
                  placeholderTextColor="#455A64"
                  keyboardType="numeric"
                  value={age}
                  onChangeText={setAge}
                  maxLength={3}
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Physical Stature & Scale</Text>

              {useMetric ? (
                <View style={styles.metricInputGroup}>
                  <Text style={styles.inputLabel}>Height (Centimeters)</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons
                      name="human-male-height"
                      size={20}
                      color="#78909C"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 175"
                      placeholderTextColor="#455A64"
                      keyboardType="numeric"
                      value={heightCm}
                      onChangeText={setHeightCm}
                    />
                    <Text style={styles.unitSuffix}>cm</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.metricInputGroup}>
                  <Text style={styles.inputLabel}>Height (Feet & Inches)</Text>
                  <View style={styles.dualInputRow}>
                    <View style={[styles.inputWrapper, { flex: 1 }]}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="5"
                        placeholderTextColor="#455A64"
                        keyboardType="numeric"
                        value={heightFeet}
                        onChangeText={setHeightFeet}
                      />
                      <Text style={styles.unitSuffix}>ft</Text>
                    </View>
                    <View style={[styles.inputWrapper, { flex: 1 }]}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="9"
                        placeholderTextColor="#455A64"
                        keyboardType="numeric"
                        value={heightInches}
                        onChangeText={setHeightInches}
                      />
                      <Text style={styles.unitSuffix}>in</Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.spacer14} />

              {useMetric ? (
                <View style={styles.dualInputRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Current Weight</Text>
                    <View style={styles.inputWrapper}>
                      <MaterialCommunityIcons
                        name="scale-bathroom"
                        size={20}
                        color="#78909C"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder="70"
                        placeholderTextColor="#455A64"
                        keyboardType="numeric"
                        value={weightKg}
                        onChangeText={setWeightKg}
                      />
                      <Text style={styles.unitSuffix}>kg</Text>
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Target Weight</Text>
                    <View style={styles.inputWrapper}>
                      <MaterialCommunityIcons
                        name="flag-checkered"
                        size={18}
                        color="#78909C"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder="68"
                        placeholderTextColor="#455A64"
                        keyboardType="numeric"
                        value={targetWeightKg}
                        onChangeText={setTargetWeightKg}
                      />
                      <Text style={styles.unitSuffix}>kg</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.dualInputRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Current Weight</Text>
                    <View style={styles.inputWrapper}>
                      <MaterialCommunityIcons
                        name="scale-bathroom"
                        size={20}
                        color="#78909C"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder="154"
                        placeholderTextColor="#455A64"
                        keyboardType="numeric"
                        value={weightLbs}
                        onChangeText={setWeightLbs}
                      />
                      <Text style={styles.unitSuffix}>lbs</Text>
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Target Weight</Text>
                    <View style={styles.inputWrapper}>
                      <MaterialCommunityIcons
                        name="flag-checkered"
                        size={18}
                        color="#78909C"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder="150"
                        placeholderTextColor="#455A64"
                        keyboardType="numeric"
                        value={targetWeightLbs}
                        onChangeText={setTargetWeightLbs}
                      />
                      <Text style={styles.unitSuffix}>lbs</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.analyticsPreviewCard}>
              <View style={styles.analyticsHeader}>
                <Ionicons name="speedometer-outline" size={18} color="#00E5FF" />
                <Text style={styles.analyticsTitle}>Clinical Diagnostics Preview</Text>
              </View>

              <View style={styles.analyticsMetricsRow}>
                <View style={styles.analyticsMetricBox}>
                  <Text style={styles.analyticsLabel}>BMI SCORE</Text>
                  <Text style={[styles.analyticsVal, { color: biometricAnalytics.bmiColor }]}>
                    {biometricAnalytics.bmi}
                  </Text>
                  <Text style={styles.analyticsSub}>{biometricAnalytics.bmiClassification}</Text>
                </View>

                <View style={styles.analyticsDivider} />

                <View style={styles.analyticsMetricBox}>
                  <Text style={styles.analyticsLabel}>BASAL BMR</Text>
                  <Text style={styles.analyticsVal}>{biometricAnalytics.bmr}</Text>
                  <Text style={styles.analyticsSub}>kcal/day</Text>
                </View>

                <View style={styles.analyticsDivider} />

                <View style={styles.analyticsMetricBox}>
                  <Text style={styles.analyticsLabel}>EST. STRIDE</Text>
                  <Text style={styles.analyticsVal}>{biometricAnalytics.strideLengthCm}</Text>
                  <Text style={styles.analyticsSub}>cm / step</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* STAGE 2 */}
        {currentStep === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.bannerBox}>
              <FontAwesome5 name="fire-alt" size={20} color="#FF9100" />
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Activity & Caloric Target</Text>
                <Text style={styles.bannerBody}>
                  Select your current weekly activity pattern to calculate your TDEE.
                </Text>
              </View>
            </View>

            <Text style={styles.sectionHeader}>Activity Multiplier</Text>
            <View style={styles.verticalOptionsList}>
              {ACTIVITY_TIERS.map((tier) => {
                const isSelected = selectedActivity === tier.id;
                return (
                  <TouchableOpacity
                    key={tier.id}
                    style={[styles.tierCard, isSelected && styles.tierCardActive]}
                    onPress={() => setSelectedActivity(tier.id)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.tierIconCircle,
                        isSelected && { backgroundColor: '#00E67620' },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={tier.icon as any}
                        size={24}
                        color={isSelected ? '#00E676' : '#90A4AE'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.tierTitleRow}>
                        <Text style={[styles.tierTitle, isSelected && { color: '#00E676' }]}>
                          {tier.title}
                        </Text>
                        <Text style={styles.tierMultiplier}>×{tier.multiplier}</Text>
                      </View>
                      <Text style={styles.tierDesc}>{tier.description}</Text>
                    </View>
                    <View style={styles.radioOuter}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionHeader, { marginTop: 20 }]}>Primary Health Goal</Text>
            <View style={styles.goalsGrid}>
              {HEALTH_GOALS.map((goal) => {
                const isSelected = selectedGoal === goal.id;
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={[
                      styles.goalCard,
                      isSelected && { borderColor: goal.accentColor, backgroundColor: '#131D21' },
                    ]}
                    onPress={() => setSelectedGoal(goal.id)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name={goal.icon as any}
                      size={28}
                      color={goal.accentColor}
                    />
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Text style={styles.goalSubtitle}>{goal.subtitle}</Text>
                    {isSelected && (
                      <View
                        style={[styles.goalSelectedBadge, { backgroundColor: goal.accentColor }]}
                      >
                        <Ionicons name="checkmark" size={12} color="#080C0D" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.tdeeResultBanner}>
              <View style={styles.tdeeColumn}>
                <Text style={styles.tdeeLabel}>CALCULATED TDEE</Text>
                <Text style={styles.tdeeValue}>{biometricAnalytics.tdee} kcal</Text>
                <Text style={styles.tdeeSub}>Maintenance energy</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#78909C" />
              <View style={styles.tdeeColumn}>
                <Text style={styles.tdeeLabel}>CALORIC BUDGET</Text>
                <Text style={[styles.tdeeValue, { color: '#00E676' }]}>
                  {biometricAnalytics.targetCalories} kcal
                </Text>
                <Text style={styles.tdeeSub}>Target daily intake</Text>
              </View>
            </View>
          </View>
        )}

        {/* STAGE 3 */}
        {currentStep === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.bannerBox}>
              <Ionicons name="water" size={22} color="#00E5FF" />
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Hydration & Daily Movement</Text>
                <Text style={styles.bannerBody}>
                  Configure hardware pedometer targets and water reminder triggers.
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeaderFlex}>
                <View>
                  <Text style={styles.sectionTitle}>Daily Step Count Target</Text>
                  <Text style={styles.cardSub}>
                    Recommended: 8,000 - 10,000 steps
                  </Text>
                </View>
                <Text style={styles.accentNumeric}>{dailyStepGoal.toLocaleString()}</Text>
              </View>

              <View style={styles.presetsRow}>
                {[6000, 8000, 10000, 12000, 15000].map((preset) => {
                  const active = dailyStepGoal === preset;
                  return (
                    <TouchableOpacity
                      key={preset}
                      style={[styles.presetPill, active && styles.presetPillActive]}
                      onPress={() => setDailyStepGoal(preset)}
                    >
                      <Text style={[styles.presetPillText, active && styles.presetPillTextActive]}>
                        {preset >= 1000 ? `${preset / 1000}k` : preset}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.stepperControlRow}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setDailyStepGoal(Math.max(2000, dailyStepGoal - 500))}
                >
                  <Feather name="minus" size={18} color="#ECEFF1" />
                  <Text style={styles.stepperButtonLabel}>-500</Text>
                </TouchableOpacity>

                <View style={styles.stepperValueBox}>
                  <Text style={styles.stepperValueText}>{dailyStepGoal.toLocaleString()}</Text>
                  <Text style={styles.stepperValueSub}>Steps / Day</Text>
                </View>

                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setDailyStepGoal(Math.min(30000, dailyStepGoal + 500))}
                >
                  <Feather name="plus" size={18} color="#ECEFF1" />
                  <Text style={styles.stepperButtonLabel}>+500</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeaderFlex}>
                <View>
                  <Text style={styles.sectionTitle}>Hydration Target (250ml Cups)</Text>
                  <Text style={styles.cardSub}>
                    Calculated baseline: {biometricAnalytics.recommendedCups} glasses/day
                  </Text>
                </View>
                <Text style={[styles.accentNumeric, { color: '#00E5FF' }]}>
                  {dailyWaterCups} Cups
                </Text>
              </View>

              <View style={styles.presetsRow}>
                {[8, 10, 12, 14, 16].map((cupCount) => {
                  const active = dailyWaterCups === cupCount;
                  return (
                    <TouchableOpacity
                      key={cupCount}
                      style={[
                        styles.presetPill,
                        active && { backgroundColor: '#00E5FF', borderColor: '#00E5FF' },
                      ]}
                      onPress={() => setDailyWaterCups(cupCount)}
                    >
                      <Text
                        style={[
                          styles.presetPillText,
                          active && { color: '#080C0D', fontWeight: '800' },
                        ]}
                      >
                        {cupCount} Cups
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.stepperControlRow}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setDailyWaterCups(Math.max(4, dailyWaterCups - 1))}
                >
                  <Feather name="minus" size={18} color="#ECEFF1" />
                </TouchableOpacity>

                <View style={styles.stepperValueBox}>
                  <Text style={[styles.stepperValueText, { color: '#00E5FF' }]}>
                    {(dailyWaterCups * 0.25).toFixed(1)} L
                  </Text>
                  <Text style={styles.stepperValueSub}>{dailyWaterCups} glasses</Text>
                </View>

                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setDailyWaterCups(Math.min(24, dailyWaterCups + 1))}
                >
                  <Feather name="plus" size={18} color="#ECEFF1" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Dietary Style & Macro Preference</Text>
              <Text style={styles.cardSub}>Tailors automated AI coach nutrition recommendations</Text>
              <View style={styles.dietTagsWrapper}>
                {DIET_PREFERENCES.map((diet) => {
                  const isSelected = selectedDiet === diet.id;
                  return (
                    <TouchableOpacity
                      key={diet.id}
                      style={[styles.dietTag, isSelected && styles.dietTagActive]}
                      onPress={() => setSelectedDiet(diet.id)}
                    >
                      <Text
                        style={[styles.dietTagText, isSelected && styles.dietTagTextActive]}
                      >
                        {diet.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* STAGE 4 */}
        {currentStep === 4 && (
          <View style={styles.stepContainer}>
            <View style={styles.bannerBox}>
              <Ionicons name="hardware-chip-outline" size={22} color="#00E676" />
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Sensors & Autonomous Service</Text>
                <Text style={styles.bannerBody}>
                  HealthGuide AI executes entirely offline on your hardware pedometer.
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Autonomous Services</Text>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Offline Background Step Service</Text>
                  <Text style={styles.toggleSubtitle}>
                    Continuous hardware pedometer polling with zero network requirement.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleSwitch,
                    allowBackgroundPedometer && styles.toggleSwitchActive,
                  ]}
                  onPress={() => setAllowBackgroundPedometer(!allowBackgroundPedometer)}
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      allowBackgroundPedometer && styles.toggleKnobActive,
                    ]}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.dividerLine} />

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>70-Minute Water Reminders</Text>
                  <Text style={styles.toggleSubtitle}>
                    Local device notifications scheduled every 70 mins.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleSwitch,
                    allowNotifications && styles.toggleSwitchActive,
                  ]}
                  onPress={() => setAllowNotifications(!allowNotifications)}
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      allowNotifications && styles.toggleKnobActive,
                    ]}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.dividerLine} />

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Screen Walk Character (Over Other Apps)</Text>
                  <Text style={styles.toggleSubtitle}>
                    Allows Peddi / Pushpa to pop up and walk across your screen.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleSwitch,
                    allowScreenOverlay && styles.toggleSwitchActive,
                  ]}
                  onPress={() => {
                    const nextVal = !allowScreenOverlay;
                    setAllowScreenOverlay(nextVal);
                    if (nextVal) {
                      triggerOverlayPermissionSettings();
                    }
                  }}
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      allowScreenOverlay && styles.toggleKnobActive,
                    ]}
                  />
                </TouchableOpacity>
              </View>

              {allowScreenOverlay && Platform.OS === 'android' && (
                <TouchableOpacity
                  style={styles.systemSettingsBtn}
                  onPress={triggerOverlayPermissionSettings}
                  activeOpacity={0.8}
                >
                  <Ionicons name="settings-outline" size={16} color="#00E676" />
                  <Text style={styles.systemSettingsBtnText}>
                    Verify Display Over Other Apps Permission
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="checkmark-done-circle" size={24} color="#00E676" />
                <Text style={styles.summaryTitle}>Dossier Summary Ready</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Name</Text>
                <Text style={styles.summaryVal}>{userFullName || 'Health Guide User'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Age & Biological Sex</Text>
                <Text style={styles.summaryVal}>
                  {numericAge} yrs • {gender.toUpperCase()}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Height & Weight</Text>
                <Text style={styles.summaryVal}>
                  {activeHeightInCm} cm • {activeWeightInKg} kg
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Daily Calorie Target</Text>
                <Text style={[styles.summaryVal, { color: '#00E676' }]}>
                  {biometricAnalytics.targetCalories} kcal / day
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Daily Step Target</Text>
                <Text style={styles.summaryVal}>{dailyStepGoal.toLocaleString()} steps</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Daily Water Target</Text>
                <Text style={styles.summaryVal}>{dailyWaterCups} glasses (250ml)</Text>
              </View>
            </View>
          </View>
        )}

        {/* WIZARD CONTROLS */}
        <View style={styles.navigationControls}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handlePrevStep}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            <Feather name="arrow-left" size={18} color="#ECEFF1" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nextButton, isSubmitting && { opacity: 0.7 }]}
            onPress={handleNextStep}
            activeOpacity={0.85}
            disabled={isSubmitting}
          >
            <Text style={styles.nextButtonText}>
              {isSubmitting
                ? 'Finalizing Profile...'
                : currentStep === totalSteps
                ? 'Complete & Launch App'
                : 'Proceed to Next Stage'}
            </Text>
            <Feather
              name={currentStep === totalSteps ? 'check-circle' : 'arrow-right'}
              size={18}
              color="#080C0D"
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ALL 6 TABS: Home, Health, Coach, Explore, Exercises, Profile */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.navTab} 
          onPress={() => safePush('/health-progress')} 
          activeOpacity={0.8}
        >
          <Text style={styles.navEmoji}>🏠</Text>
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => safePush('/water-nutrition')}
          activeOpacity={0.8}
        >
          <Text style={styles.navEmoji}>💧</Text>
          <Text style={styles.navText}>Health</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => safePush('/(tabs)/coach')}
          activeOpacity={0.8}
        >
          <Text style={styles.navEmoji}>💬</Text>
          <Text style={styles.navText}>Coach</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => safePush('/(tabs)/explore')}
          activeOpacity={0.8}
        >
          <Text style={styles.navEmoji}>🧭</Text>
          <Text style={styles.navText}>Explore</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          onPress={() => safePush('/(tabs)/exercises')}
          activeOpacity={0.8}
        >
          <Text style={styles.navEmoji}>🏋️</Text>
          <Text style={styles.navText}>Exercises</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navTab} 
          activeOpacity={0.8}
        >
          <Text style={[styles.navEmoji, styles.navEmojiActive]}>👤</Text>
          <Text style={[styles.navText, styles.navTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C0D',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: 85,
  },
  wizardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#172226',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#243238',
  },
  brandBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00E67615',
    borderWidth: 1.5,
    borderColor: '#00E67640',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextGroup: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ECEFF1',
    letterSpacing: 1,
  },
  stepCounterText: {
    fontSize: 12,
    color: '#78909C',
    fontWeight: '600',
    marginTop: 2,
  },
  stepTrack: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  stepSegment: {
    flex: 1,
    height: 5,
    backgroundColor: '#192428',
    borderRadius: 3,
  },
  stepSegmentActive: {
    backgroundColor: '#00E67680',
  },
  stepSegmentCurrent: {
    backgroundColor: '#00E676',
  },
  stepContainer: {
    marginBottom: 10,
  },
  bannerBox: {
    flexDirection: 'row',
    backgroundColor: '#0F1A1E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#182C33',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ECEFF1',
  },
  bannerBody: {
    fontSize: 11.5,
    color: '#90A4AE',
    lineHeight: 16,
    marginTop: 3,
  },
  unitSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#11171A',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1D2A2E',
    marginBottom: 18,
  },
  unitSelectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#90A4AE',
    marginLeft: 6,
  },
  unitToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#172226',
    borderRadius: 12,
    padding: 3,
  },
  unitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
  },
  unitButtonActive: {
    backgroundColor: '#00E676',
  },
  unitButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#90A4AE',
  },
  unitButtonTextActive: {
    color: '#080C0D',
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#11171A',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1D2A2E',
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ECEFF1',
    letterSpacing: 0.3,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ECEFF1',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  cardSub: {
    fontSize: 11.5,
    color: '#78909C',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#90A4AE',
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#172226',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#243238',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#ECEFF1',
    fontSize: 14,
    fontWeight: '600',
  },
  unitSuffix: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
    marginLeft: 6,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#172226',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#243238',
  },
  genderButtonActive: {
    backgroundColor: '#00E676',
    borderColor: '#00E676',
  },
  genderButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#90A4AE',
  },
  genderButtonTextActive: {
    color: '#080C0D',
    fontWeight: '800',
  },
  dualInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricInputGroup: {
    marginTop: 10,
  },
  spacer14: {
    height: 14,
  },
  analyticsPreviewCard: {
    backgroundColor: '#0D1518',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#192C33',
    marginBottom: 10,
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  analyticsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00E5FF',
    letterSpacing: 0.5,
  },
  analyticsMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  analyticsMetricBox: {
    flex: 1,
    alignItems: 'center',
  },
  analyticsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78909C',
    letterSpacing: 0.5,
  },
  analyticsVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ECEFF1',
    marginTop: 4,
  },
  analyticsSub: {
    fontSize: 10,
    color: '#90A4AE',
    marginTop: 2,
  },
  analyticsDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#1C2E35',
  },
  verticalOptionsList: {
    gap: 10,
  },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11171A',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1D2A2E',
    gap: 12,
  },
  tierCardActive: {
    borderColor: '#00E676',
    backgroundColor: '#0E191D',
  },
  tierIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#172226',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  tierTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ECEFF1',
  },
  tierMultiplier: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78909C',
  },
  tierDesc: {
    fontSize: 11,
    color: '#90A4AE',
    lineHeight: 15,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#455A64',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00E676',
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  goalCard: {
    width: (width - 50) / 2,
    backgroundColor: '#11171A',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1D2A2E',
    position: 'relative',
  },
  goalTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ECEFF1',
    marginTop: 10,
    marginBottom: 4,
  },
  goalSubtitle: {
    fontSize: 10.5,
    color: '#78909C',
    lineHeight: 14,
  },
  goalSelectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tdeeResultBanner: {
    flexDirection: 'row',
    backgroundColor: '#0F1A1E',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#183038',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  tdeeColumn: {
    alignItems: 'center',
  },
  tdeeLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#78909C',
    letterSpacing: 0.5,
  },
  tdeeValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ECEFF1',
    marginTop: 3,
  },
  tdeeSub: {
    fontSize: 10,
    color: '#90A4AE',
    marginTop: 1,
  },
  cardHeaderFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  accentNumeric: {
    fontSize: 18,
    fontWeight: '900',
    color: '#00E676',
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 14,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#172226',
    borderWidth: 1,
    borderColor: '#243238',
    alignItems: 'center',
  },
  presetPillActive: {
    backgroundColor: '#00E676',
    borderColor: '#00E676',
  },
  presetPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#90A4AE',
  },
  presetPillTextActive: {
    color: '#080C0D',
    fontWeight: '800',
  },
  stepperControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#172226',
    borderRadius: 16,
    padding: 6,
  },
  stepperButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#202D33',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  stepperButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ECEFF1',
  },
  stepperValueBox: {
    alignItems: 'center',
  },
  stepperValueText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ECEFF1',
  },
  stepperValueSub: {
    fontSize: 10,
    color: '#78909C',
  },
  dietTagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  dietTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#172226',
    borderWidth: 1,
    borderColor: '#243238',
  },
  dietTagActive: {
    backgroundColor: '#00E6761A',
    borderColor: '#00E676',
  },
  dietTagText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#90A4AE',
  },
  dietTagTextActive: {
    color: '#00E676',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ECEFF1',
  },
  toggleSubtitle: {
    fontSize: 11,
    color: '#78909C',
    lineHeight: 15,
    marginTop: 2,
    paddingRight: 10,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1F2C33',
    padding: 3,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#00E676',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
    backgroundColor: '#080C0D',
  },
  systemSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0E191D',
    borderWidth: 1,
    borderColor: '#00E67650',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  systemSettingsBtnText: {
    color: '#00E676',
    fontSize: 11.5,
    fontWeight: '700',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#1C272B',
    marginVertical: 12,
  },
  summaryCard: {
    backgroundColor: '#11171A',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1D2A2E',
    marginBottom: 10,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ECEFF1',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#172226',
  },
  summaryKey: {
    fontSize: 12,
    color: '#78909C',
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ECEFF1',
  },
  navigationControls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#172226',
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 52,
    borderWidth: 1,
    borderColor: '#243238',
  },
  backButtonText: {
    color: '#ECEFF1',
    fontSize: 14,
    fontWeight: '700',
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00E676',
    borderRadius: 16,
    height: 52,
  },
  nextButtonText: {
    color: '#080C0D',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
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
    paddingHorizontal: 4,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navTab: {
    alignItems: 'center',
    flex: 1,
  },
  navEmoji: {
    fontSize: 18,
    color: '#657378',
  },
  navEmojiActive: {
    color: '#00E676',
  },
  navText: {
    fontSize: 9.5,
    color: '#657378',
    marginTop: 2,
    fontWeight: '500',
  },
  navTextActive: {
    color: '#00E676',
    fontWeight: '700',
  },
});