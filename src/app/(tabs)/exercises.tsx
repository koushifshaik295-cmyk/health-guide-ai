import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Modal,
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

type ProgramLevel = 'beginner' | 'intermediate' | 'hard';

// Direct static mapping to your exact filenames in assets/exercises
const EXERCISE_GIFS: Record<string, any> = {
  arm_circles: require('../../../assets/exercises/arm_circles.gif'),
  bodyweight_squats: require('../../../assets/exercises/bodyweight_squats.gif'),
  burpees_tuck: require('../../../assets/exercises/burpees_tuck.gif'),
  chair_squats: require('../../../assets/exercises/chair_squats.gif'),
  gentle_jacks: require('../../../assets/exercises/gentle_jacks.gif'),
  high_knees: require('../../../assets/exercises/high_knees.gif'),
  incline_pushups: require('../../../assets/exercises/incline_pushups.gif'),
  jump_squats: require('../../../assets/exercises/jump_squats.gif'),
  knee_pushups: require('../../../assets/exercises/knee_pushups.gif'),
  leg_pushup: require('../../../assets/exercises/leg pushup.gif'),
  pistol_box_squats: require('../../../assets/exercises/pistol_box_squats.gif'),
  plyo_pushups: require('../../../assets/exercises/plyo_pushups.gif'),
  power_tuck_jumps: require('../../../assets/exercises/power_tuck_jumps.gif'),
  pulse_squats: require('../../../assets/exercises/pulse_squats.gif'),
  shoulder_tap_plank: require('../../../assets/exercises/shoulder_tap_plank.gif'),
  spiderman_pushups: require('../../../assets/exercises/spiderman_pushups.gif'),
  standard_pushups: require('../../../assets/exercises/standard_pushups.gif'),
  standing_side_bends: require('../../../assets/exercises/standing_side_bends.gif'),
  star_jacks: require('../../../assets/exercises/star_jacks.gif'),
  wide_sumo_squats: require('../../../assets/exercises/wide_sumo_squats.gif'),
};

interface ExerciseItem {
  id: string;
  name: string;
  durationSec: number;
  estCalories: number;
  key: string;
  emoji: string;
  focusMuscles: string;
  instructions: string;
}

const EXERCISE_CATALOG: Record<string, ExerciseItem> = {
  arm_circles: {
    id: 'e_ac',
    name: 'ARM CIRCLES',
    durationSec: 30,
    estCalories: 20,
    key: 'arm_circles',
    emoji: '🙆‍♂️',
    focusMuscles: 'Deltoids & Shoulders',
    instructions: 'Extend arms straight out to sides and rotate in continuous controlled circles.',
  },
  knee_pushups: {
    id: 'e_kp',
    name: 'KNEE PUSH-UPS',
    durationSec: 30,
    estCalories: 28,
    key: 'knee_pushups',
    emoji: '💪',
    focusMuscles: 'Chest, Shoulders & Triceps',
    instructions: 'Knees grounded, keep back straight, and lower chest smoothly toward the floor.',
  },
  bodyweight_squats: {
    id: 'e_bs',
    name: 'BODYWEIGHT SQUATS',
    durationSec: 30,
    estCalories: 35,
    key: 'bodyweight_squats',
    emoji: '🦵',
    focusMuscles: 'Quads, Glutes & Hamstrings',
    instructions: 'Feet shoulder-width apart, lower hips back and down, then drive up through heels.',
  },
  gentle_jacks: {
    id: 'e_gj',
    name: 'GENTLE JUMPING JACKS',
    durationSec: 30,
    estCalories: 35,
    key: 'gentle_jacks',
    emoji: '⚡',
    focusMuscles: 'Cardio & Full Body',
    instructions: 'Step and hop softly while raising hands overhead in a rhythmic tempo.',
  },
  incline_pushups: {
    id: 'e_ip',
    name: 'INCLINE PUSH-UPS',
    durationSec: 30,
    estCalories: 30,
    key: 'incline_pushups',
    emoji: '💪',
    focusMuscles: 'Lower Chest & Shoulders',
    instructions: 'Place hands on an elevated surface. Keep core rigid and lower chest down.',
  },
  chair_squats: {
    id: 'e_cs',
    name: 'CHAIR ASSISTED SQUATS',
    durationSec: 30,
    estCalories: 30,
    key: 'chair_squats',
    emoji: '🪑',
    focusMuscles: 'Legs & Balance',
    instructions: 'Lower hips gently onto chair edge and immediately power back upright.',
  },
  standing_side_bends: {
    id: 'e_ssb',
    name: 'STANDING SIDE BENDS',
    durationSec: 30,
    estCalories: 25,
    key: 'standing_side_bends',
    emoji: '🧘‍♂️',
    focusMuscles: 'Obliques & Core',
    instructions: 'Reach overhead and stretch your torso side to side to engage obliques.',
  },
  standard_pushups: {
    id: 'e_sp',
    name: 'STANDARD PUSH-UPS',
    durationSec: 30,
    estCalories: 45,
    key: 'standard_pushups',
    emoji: '💥',
    focusMuscles: 'Chest & Triceps',
    instructions: 'Full plank line. Lower chest to floor depth and push upward powerfully.',
  },
  pulse_squats: {
    id: 'e_ps',
    name: 'PULSE SQUATS',
    durationSec: 30,
    estCalories: 55,
    key: 'pulse_squats',
    emoji: '🔥',
    focusMuscles: 'Quadriceps Fatigue',
    instructions: 'Sink into parallel squat depth and pulse up and down continuously.',
  },
  star_jacks: {
    id: 'e_sj',
    name: 'STAR JACKS',
    durationSec: 30,
    estCalories: 60,
    key: 'star_jacks',
    emoji: '⭐',
    focusMuscles: 'Explosive Cardio',
    instructions: 'Jump explosively into mid-air star position and land softly on toes.',
  },
  wide_sumo_squats: {
    id: 'e_wss',
    name: 'SUMO SQUATS',
    durationSec: 30,
    estCalories: 50,
    key: 'wide_sumo_squats',
    emoji: '🦵',
    focusMuscles: 'Adductors & Glutes',
    instructions: 'Take a wide stance with toes flared at 45 degrees. Lower deeply into hips.',
  },
  high_knees: {
    id: 'e_hk',
    name: 'HIGH KNEES SPRINT',
    durationSec: 30,
    estCalories: 65,
    key: 'high_knees',
    emoji: '🏃',
    focusMuscles: 'Hip Flexors & Core',
    instructions: 'Drive knees rhythmically up to chest height as quickly as possible.',
  },
  shoulder_tap_plank: {
    id: 'e_stp',
    name: 'PLANK SHOULDER TAPS',
    durationSec: 30,
    estCalories: 45,
    key: 'shoulder_tap_plank',
    emoji: '🛡️',
    focusMuscles: 'Core Anti-Rotation',
    instructions: 'In high plank, tap opposite shoulders without letting hips rotate.',
  },
  plyo_pushups: {
    id: 'e_pp',
    name: 'PLYOMETRIC PUSH-UPS',
    durationSec: 30,
    estCalories: 75,
    key: 'plyo_pushups',
    emoji: '💥',
    focusMuscles: 'Explosive Chest Power',
    instructions: 'Explode upwards off the floor so palms completely leave the ground.',
  },
  jump_squats: {
    id: 'e_js',
    name: 'EXPLOSIVE JUMP SQUATS',
    durationSec: 30,
    estCalories: 85,
    key: 'jump_squats',
    emoji: '🚀',
    focusMuscles: 'Power & Vertical Jump',
    instructions: 'Drop deep into squat and launch vertically into full extension.',
  },
  burpees_tuck: {
    id: 'e_bt',
    name: 'BURPEES WITH TUCK JUMP',
    durationSec: 30,
    estCalories: 95,
    key: 'burpees_tuck',
    emoji: '⚡',
    focusMuscles: 'Full Body Explosive',
    instructions: 'Drop chest to floor, snap feet under hips, and jump pulling knees to chest.',
  },
  spiderman_pushups: {
    id: 'e_smp',
    name: 'SPIDERMAN PUSH-UPS',
    durationSec: 30,
    estCalories: 80,
    key: 'spiderman_pushups',
    emoji: '🕷️',
    focusMuscles: 'Chest & Obliques',
    instructions: 'As you lower your chest, bring your knee forward to touch your elbow.',
  },
  pistol_box_squats: {
    id: 'e_pbs',
    name: 'SINGLE-LEG PISTOL SQUATS',
    durationSec: 30,
    estCalories: 85,
    key: 'pistol_box_squats',
    emoji: '🦿',
    focusMuscles: 'Unilateral Leg Strength',
    instructions: 'Extend one leg forward and balance completely on single leg descending.',
  },
  power_tuck_jumps: {
    id: 'e_ptj',
    name: 'POWER TUCK JUMPS',
    durationSec: 30,
    estCalories: 90,
    key: 'power_tuck_jumps',
    emoji: '🌪️',
    focusMuscles: 'Abdominals & Plyometrics',
    instructions: 'Jump straight upward and whip knees firmly to chest in mid-air.',
  },
};

function getExercisesForDay(level: ProgramLevel, day: number): ExerciseItem[] {
  if (day % 4 === 0 || day % 7 === 0) return [];
  const catalog = EXERCISE_CATALOG;
  const cycle = day % 5;

  if (level === 'beginner') {
    switch (cycle) {
      case 1: return [catalog.arm_circles, catalog.knee_pushups, catalog.bodyweight_squats, catalog.gentle_jacks];
      case 2: return [catalog.incline_pushups, catalog.chair_squats, catalog.standing_side_bends, catalog.gentle_jacks];
      case 3: return [catalog.knee_pushups, catalog.bodyweight_squats, catalog.standing_side_bends, catalog.gentle_jacks];
      case 4: return [catalog.incline_pushups, catalog.chair_squats, catalog.arm_circles, catalog.gentle_jacks];
      default: return [catalog.bodyweight_squats, catalog.knee_pushups, catalog.gentle_jacks, catalog.arm_circles];
    }
  }

  if (level === 'intermediate') {
    switch (cycle) {
      case 1: return [catalog.standard_pushups, catalog.pulse_squats, catalog.high_knees, catalog.shoulder_tap_plank];
      case 2: return [catalog.shoulder_tap_plank, catalog.wide_sumo_squats, catalog.star_jacks, catalog.standard_pushups];
      case 3: return [catalog.shoulder_tap_plank, catalog.pulse_squats, catalog.high_knees, catalog.wide_sumo_squats];
      case 4: return [catalog.standard_pushups, catalog.wide_sumo_squats, catalog.star_jacks, catalog.shoulder_tap_plank];
      default: return [catalog.wide_sumo_squats, catalog.pulse_squats, catalog.high_knees, catalog.star_jacks];
    }
  }

  switch (cycle) {
    case 1: return [catalog.plyo_pushups, catalog.jump_squats, catalog.burpees_tuck, catalog.spiderman_pushups];
    case 2: return [catalog.spiderman_pushups, catalog.pistol_box_squats, catalog.power_tuck_jumps, catalog.plyo_pushups];
    case 3: return [catalog.burpees_tuck, catalog.jump_squats, catalog.spiderman_pushups, catalog.power_tuck_jumps];
    case 4: return [catalog.plyo_pushups, catalog.pistol_box_squats, catalog.burpees_tuck, catalog.jump_squats];
    default: return [catalog.spiderman_pushups, catalog.jump_squats, catalog.power_tuck_jumps, catalog.plyo_pushups];
  }
}

export default function ExercisesScreen() {
  const router = useRouter();

  const [activeLevel, setActiveLevel] = useState<ProgramLevel>('beginner');
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [completedDays, setCompletedDays] = useState<Record<ProgramLevel, number[]>>({
    beginner: [],
    intermediate: [],
    hard: [],
  });

  const [activeModalExercise, setActiveModalExercise] = useState<ExerciseItem | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState<number>(0);
  const [timerSeconds, setTimerSeconds] = useState<number>(30);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  useEffect(() => {
    loadCompletedDays();
  }, []);

  const currentDayExercises = getExercisesForDay(activeLevel, selectedDay);
  const isRest = currentDayExercises.length === 0;

  useEffect(() => {
    let interval: any = null;
    if (activeModalExercise && isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && activeModalExercise) {
      setIsTimerRunning(false);
      Alert.alert('Exercise Finished! 🎉', `30 seconds completed for ${activeModalExercise.name}!`, [
        {
          text: 'Next',
          onPress: () => {
            if (exerciseIndex < currentDayExercises.length - 1) {
              handleNextExercise();
            } else {
              markDayComplete(selectedDay);
              setActiveModalExercise(null);
            }
          },
        },
      ]);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds, activeModalExercise]);

  const loadCompletedDays = async () => {
    try {
      const stored = await AsyncStorage.getItem('@program_completed_days');
      if (stored) setCompletedDays(JSON.parse(stored));
      const storedLevel = await AsyncStorage.getItem('@selected_program_level');
      if (storedLevel) setActiveLevel(storedLevel as ProgramLevel);
    } catch (e) {
      console.error(e);
    }
  };

  const switchLevel = async (level: ProgramLevel) => {
    setActiveLevel(level);
    setSelectedDay(1);
    await AsyncStorage.setItem('@selected_program_level', level);
  };

  const markDayComplete = async (day: number) => {
    const currentList = completedDays[activeLevel] || [];
    if (!currentList.includes(day)) {
      const updated = {
        ...completedDays,
        [activeLevel]: [...currentList, day],
      };
      setCompletedDays(updated);
      await AsyncStorage.setItem('@program_completed_days', JSON.stringify(updated));
      Alert.alert('Day Completed! 🏆', `Awesome! You have successfully completed Day ${day}!`);
    }
  };

  const launchExercisePlayer = (exercise: ExerciseItem, index: number) => {
    setActiveModalExercise(exercise);
    setExerciseIndex(index);
    setTimerSeconds(30);
    setIsTimerRunning(true);
  };

  const handleNextExercise = () => {
    if (exerciseIndex < currentDayExercises.length - 1) {
      const nextIdx = exerciseIndex + 1;
      setExerciseIndex(nextIdx);
      setActiveModalExercise(currentDayExercises[nextIdx]);
      setTimerSeconds(30);
      setIsTimerRunning(true);
    }
  };

  const handlePrevExercise = () => {
    if (exerciseIndex > 0) {
      const prevIdx = exerciseIndex - 1;
      setExerciseIndex(prevIdx);
      setActiveModalExercise(currentDayExercises[prevIdx]);
      setTimerSeconds(30);
      setIsTimerRunning(true);
    }
  };

  const levelCompletedCount = completedDays[activeLevel]?.length || 0;
  const progressPercentage = Math.round((levelCompletedCount / 30) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080C0D" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>30-Day Fitness Challenge</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageHeroTitle}>30 DAYS CHALLENGE</Text>
        <Text style={styles.pageHeroSub}>Choose your 30-day transformation plan</Text>

        {/* Level Cards */}
        <View style={styles.levelCardsContainer}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={[styles.levelCard, activeLevel === 'beginner' && styles.levelCardActiveBlue]}
            onPress={() => switchLevel('beginner')}
          >
            <View style={[styles.badgeRibbon, styles.beginnerRibbon]}>
              <Text style={styles.ribbonTitle}>BEGINNER</Text>
              <Text style={styles.ribbonSubTitle}>30 DAYS PLAN</Text>
            </View>
            <View style={styles.levelCardRight}>
              <Text style={styles.levelEmoji}>🙋‍♂️</Text>
              <Text style={styles.levelInfo}>{completedDays.beginner.length}/30 Days Done</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            style={[styles.levelCard, activeLevel === 'intermediate' && styles.levelCardActiveOrange]}
            onPress={() => switchLevel('intermediate')}
          >
            <View style={[styles.badgeRibbon, styles.intermediateRibbon]}>
              <Text style={styles.ribbonTitle}>INTERMEDIATE</Text>
              <Text style={styles.ribbonSubTitle}>30 DAYS PLAN</Text>
            </View>
            <View style={styles.levelCardRight}>
              <Text style={styles.levelEmoji}>💪</Text>
              <Text style={styles.levelInfo}>{completedDays.intermediate.length}/30 Days Done</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            style={[styles.levelCard, activeLevel === 'hard' && styles.levelCardActiveRed]}
            onPress={() => switchLevel('hard')}
          >
            <View style={[styles.badgeRibbon, styles.hardRibbon]}>
              <Text style={styles.ribbonTitle}>HARD</Text>
              <Text style={styles.ribbonSubTitle}>30 DAYS PLAN</Text>
            </View>
            <View style={styles.levelCardRight}>
              <Text style={styles.levelEmoji}>🔥</Text>
              <Text style={styles.levelInfo}>{completedDays.hard.length}/30 Days Done</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.planProgressCard}>
          <View style={styles.planProgressTop}>
            <Text style={styles.planProgressTitle}>{activeLevel.toUpperCase()} CHALLENGE PROGRESS</Text>
            <Text style={styles.planProgressPercent}>{progressPercentage}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
          </View>
        </View>

        {/* 30-Day Horizontal Scroll Calendar */}
        <Text style={styles.sectionHeading}>SELECT DAY (1 - 30)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
          {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
            const isDone = completedDays[activeLevel]?.includes(day);
            const isCurrent = selectedDay === day;
            const rest = day % 4 === 0 || day % 7 === 0;

            return (
              <TouchableOpacity
                key={day}
                style={[styles.dayPill, isCurrent && styles.dayPillCurrent, isDone && styles.dayPillDone]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[styles.dayPillText, (isCurrent || isDone) && styles.dayPillTextActive]}>
                  {rest ? 'REST' : `DAY`}
                </Text>
                <Text style={[styles.dayNumberText, (isCurrent || isDone) && styles.dayPillTextActive]}>
                  {day}
                </Text>
                {isDone && <Text style={styles.checkMini}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Day Details Banner */}
        <View style={styles.dayDetailsBanner}>
          <View>
            <Text style={styles.dayDetailsTitle}>DAY {selectedDay} WORKOUT</Text>
            <Text style={styles.dayDetailsSub}>
              {isRest
                ? 'Active Recovery & Mobility Day.'
                : `${currentDayExercises.length} Exercises • 30 Secs Each`}
            </Text>
          </View>

          {!isRest && (
            <TouchableOpacity
              style={[
                styles.markCompleteBtn,
                completedDays[activeLevel]?.includes(selectedDay) && styles.markCompleteBtnDone,
              ]}
              onPress={() => markDayComplete(selectedDay)}
            >
              <Text style={styles.markCompleteBtnText}>
                {completedDays[activeLevel]?.includes(selectedDay) ? 'Completed ✓' : 'Mark Done'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Exercises List */}
        {isRest ? (
          <View style={styles.restDayCard}>
            <Text style={{ fontSize: 44 }}>🧘‍♂️</Text>
            <Text style={styles.restDayTitle}>Rest & Muscle Recovery</Text>
            <Text style={styles.restDayDesc}>
              Muscles repair and grow during rest periods. Hydrate well, stretch gently, and recharge for Day {selectedDay + 1}!
            </Text>
          </View>
        ) : (
          currentDayExercises.map((item, index) => (
            <View key={item.id} style={styles.exerciseCard}>
              <View style={styles.cardTopRow}>
                {EXERCISE_GIFS[item.key] ? (
                  <View style={styles.gifThumbWrapper}>
                    <Image
                      source={EXERCISE_GIFS[item.key]}
                      style={styles.cardThumbnailGif}
                      resizeMode="contain"
                    />
                  </View>
                ) : (
                  <View style={styles.avatarPillFallback}>
                    <Text style={{ fontSize: 30 }}>{item.emoji}</Text>
                  </View>
                )}

                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={styles.exerciseName}>{item.name}</Text>
                  <Text style={styles.exerciseMuscles}>Target: {item.focusMuscles}</Text>
                  <Text style={styles.exerciseSub}>⏱️ 30s • 🔥 {item.estCalories} kcal</Text>
                </View>
              </View>

              <Text style={styles.instructionsText}>{item.instructions}</Text>

              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={styles.coachModeLaunchBtn}
                  onPress={() => launchExercisePlayer(item, index)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.coachModeLaunchText}>
                    ▶ Start Exercise (30s)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* FULL-SCREEN COACH PLAYER */}
      <Modal
        visible={activeModalExercise !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setIsTimerRunning(false);
          setActiveModalExercise(null);
        }}
      >
        <SafeAreaView style={styles.playerFullContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />

          {/* Top Bar */}
          <View style={styles.playerTopBar}>
            <TouchableOpacity
              onPress={() => {
                setIsTimerRunning(false);
                setActiveModalExercise(null);
              }}
              style={styles.circleActionBtn}
            >
              <Text style={styles.circleActionIcon}>←</Text>
            </TouchableOpacity>

            <Text style={styles.coachModeHeading}>WORKOUT IN PROGRESS</Text>

            <TouchableOpacity
              style={styles.circleActionBtn}
              onPress={() =>
                Alert.alert(
                  activeModalExercise?.name || '',
                  activeModalExercise?.instructions || ''
                )
              }
            >
              <Text style={{ fontSize: 16 }}>ℹ️</Text>
            </TouchableOpacity>
          </View>

          {/* Player Center Media Area with Large Looping GIF */}
          <View style={styles.animationCanvasArea}>
            {activeModalExercise && EXERCISE_GIFS[activeModalExercise.key] ? (
              <Image
                source={EXERCISE_GIFS[activeModalExercise.key]}
                style={styles.fullScreenPlayerGif}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.bigFallbackCircle}>
                <Text style={{ fontSize: 90 }}>{activeModalExercise?.emoji}</Text>
              </View>
            )}

            <View style={styles.muscleIndicatorBadge}>
              <Text style={styles.muscleBadgeText}>
                Active: {activeModalExercise?.focusMuscles}
              </Text>
            </View>
          </View>

          {/* Lower Control Deck */}
          <View style={styles.playerLowerControlsArea}>
            <View style={styles.exerciseTitleRow}>
              <Text style={styles.playerExerciseTitle}>
                {activeModalExercise?.name}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsTimerRunning(!isTimerRunning)}
            >
              <Text style={styles.bigClockDigits}>
                00:{timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}
              </Text>
            </TouchableOpacity>

            <View style={styles.audioControlsDeck}>
              <TouchableOpacity
                style={[
                  styles.audioStepPill,
                  exerciseIndex === 0 && styles.audioStepPillDisabled,
                ]}
                onPress={handlePrevExercise}
                disabled={exerciseIndex === 0}
              >
                <Text style={styles.audioStepIcon}>⏮</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.audioMainPausePill}
                onPress={() => setIsTimerRunning(!isTimerRunning)}
              >
                <View style={styles.blueAccentBar} />
                <Text style={styles.audioMainPauseIcon}>
                  {isTimerRunning ? '⏸' : '▶'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.audioStepPill,
                  exerciseIndex === currentDayExercises.length - 1 &&
                    styles.audioStepPillDisabled,
                ]}
                onPress={handleNextExercise}
                disabled={exerciseIndex === currentDayExercises.length - 1}
              >
                <Text style={styles.audioStepIcon}>⏭</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C0D',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 12 : 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#172225',
  },
  backBtn: {
    padding: 6,
  },
  backText: {
    color: '#00E676',
    fontSize: 15,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  pageHeroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: 4,
  },
  pageHeroSub: {
    color: '#7D8C91',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 2,
  },
  levelCardsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#11181B',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#1D2A2E',
  },
  levelCardActiveBlue: {
    borderColor: '#007AFF',
    backgroundColor: '#0A1524',
  },
  levelCardActiveOrange: {
    borderColor: '#FF6D00',
    backgroundColor: '#201309',
  },
  levelCardActiveRed: {
    borderColor: '#FF1744',
    backgroundColor: '#220B10',
  },
  badgeRibbon: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 150,
  },
  beginnerRibbon: {
    backgroundColor: '#007AFF',
  },
  intermediateRibbon: {
    backgroundColor: '#FF6D00',
  },
  hardRibbon: {
    backgroundColor: '#FF1744',
  },
  ribbonTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  ribbonSubTitle: {
    color: '#E0E0E0',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 1,
  },
  levelCardRight: {
    alignItems: 'flex-end',
    paddingRight: 10,
  },
  levelEmoji: {
    fontSize: 22,
  },
  levelInfo: {
    color: '#8CAE9E',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  planProgressCard: {
    backgroundColor: '#11181B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1D2A2E',
    marginBottom: 16,
  },
  planProgressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planProgressTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planProgressPercent: {
    color: '#00E676',
    fontSize: 13,
    fontWeight: '900',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#1B262A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00E676',
  },
  sectionHeading: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  daysScroll: {
    gap: 8,
    marginBottom: 16,
    paddingRight: 10,
  },
  dayPill: {
    width: 58,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#11181B',
    borderWidth: 1.5,
    borderColor: '#1D2A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayPillCurrent: {
    borderColor: '#00E676',
    backgroundColor: '#0E241A',
  },
  dayPillDone: {
    borderColor: '#007AFF',
    backgroundColor: '#0B1D30',
  },
  dayPillText: {
    color: '#7D8C91',
    fontSize: 10,
    fontWeight: '700',
  },
  dayNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  dayPillTextActive: {
    color: '#FFFFFF',
  },
  checkMini: {
    color: '#00E676',
    fontSize: 10,
  },
  dayDetailsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#11181B',
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1D2A2E',
  },
  dayDetailsTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  dayDetailsSub: {
    color: '#7D8C91',
    fontSize: 11,
    marginTop: 2,
  },
  markCompleteBtn: {
    backgroundColor: '#173024',
    borderWidth: 1,
    borderColor: '#00E676',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  markCompleteBtnDone: {
    backgroundColor: '#00E676',
  },
  markCompleteBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  restDayCard: {
    backgroundColor: '#11181B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1D2A2E',
    marginTop: 10,
  },
  restDayTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  restDayDesc: {
    color: '#8CAE9E',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },
  exerciseCard: {
    backgroundColor: '#11181B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1D2A2E',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gifThumbWrapper: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    padding: 4,
  },
  cardThumbnailGif: {
    width: '100%',
    height: '100%',
  },
  avatarPillFallback: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: '#19262B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#25383F',
  },
  exerciseName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  exerciseMuscles: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  exerciseSub: {
    color: '#7D8C91',
    fontSize: 11,
    marginTop: 2,
  },
  instructionsText: {
    color: '#8CAE9E',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  cardActionsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  coachModeLaunchBtn: {
    flex: 1,
    backgroundColor: '#00E676',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  coachModeLaunchText: {
    color: '#080C0D',
    fontSize: 13,
    fontWeight: '900',
  },
  playerFullContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  playerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 10 : 10,
    paddingBottom: 6,
  },
  coachModeHeading: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 1,
  },
  circleActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF1F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleActionIcon: {
    fontSize: 18,
    color: '#657786',
    fontWeight: 'bold',
  },
  animationCanvasArea: {
    flex: 1.1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fullScreenPlayerGif: {
    width: width - 40,
    height: 250,
  },
  bigFallbackCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#C7D2FE',
  },
  muscleIndicatorBadge: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  muscleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  playerLowerControlsArea: {
    flex: 0.9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 24,
    paddingBottom: 36,
    paddingHorizontal: 20,
  },
  exerciseTitleRow: {
    alignItems: 'center',
  },
  playerExerciseTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  bigClockDigits: {
    fontSize: 68,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1,
    marginVertical: 6,
  },
  audioControlsDeck: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 16,
  },
  audioStepPill: {
    width: 72,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioStepPillDisabled: {
    opacity: 0.35,
  },
  audioStepIcon: {
    fontSize: 22,
    color: '#64748B',
  },
  audioMainPausePill: {
    flex: 1,
    maxWidth: 170,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  blueAccentBar: {
    position: 'absolute',
    left: 8,
    width: 4,
    height: 32,
    borderRadius: 2,
    backgroundColor: '#2563EB',
  },
  audioMainPauseIcon: {
    fontSize: 26,
    color: '#0F172A',
    fontWeight: '900',
  },
});