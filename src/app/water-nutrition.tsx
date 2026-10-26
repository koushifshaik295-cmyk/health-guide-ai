import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const STORAGE_KEY_WATER = '@health_daily_water';
const STORAGE_KEY_REMINDER = '@health_hydration_alert';
const STORAGE_KEY_MEALS = '@health_daily_meal_plan';

interface MealSection {
  id: string;
  category: string;
  icon: string;
  calories: number;
  description: string;
}

const DEFAULT_MEALS: MealSection[] = [
  {
    id: '1',
    category: 'Breakfast',
    icon: '🍳',
    calories: 410,
    description: '2 Moong dal dosas (pesarattu) with ginger & coconut chutney',
  },
  {
    id: '2',
    category: 'Lunch',
    icon: '🥗',
    calories: 650,
    description: '2 whole wheat chapatis, fish curry (or soya chunks curry), garden salad',
  },
  {
    id: '3',
    category: 'Evening Snack',
    icon: '🍎',
    calories: 180,
    description: 'Warm cinnamon green tea with roasted almonds and pumpkin seeds',
  },
  {
    id: '4',
    category: 'Dinner',
    icon: '🍲',
    calories: 480,
    description: 'Warm vegetable soup with steamed paneer and brown rice',
  },
];

export default function WaterNutritionScreen() {
  const router = useRouter();

  const [glasses, setGlasses] = useState<number>(2);
  const targetGlasses = 12; // 3,000 ml
  const [hydrationAlert, setHydrationAlert] = useState<boolean>(true);
  const [meals, setMeals] = useState<MealSection[]>(DEFAULT_MEALS);

  // Modal State for + Add Item
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [newCategory, setNewCategory] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newCalories, setNewCalories] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      const [savedWater, savedAlert, savedMeals] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_WATER),
        AsyncStorage.getItem(STORAGE_KEY_REMINDER),
        AsyncStorage.getItem(STORAGE_KEY_MEALS),
      ]);

      if (savedWater !== null) {
        setGlasses(parseInt(savedWater, 10));
      }
      if (savedAlert !== null) {
        setHydrationAlert(savedAlert === 'true');
      }
      if (savedMeals !== null) {
        setMeals(JSON.parse(savedMeals));
      }
    } catch (e) {
      console.warn('Error loading diet data', e);
    }
  }, []);

  // Sync state automatically every time this tab is opened
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleUpdateWater = async (val: number) => {
    const updated = Math.max(0, val);
    setGlasses(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_WATER, updated.toString());
    } catch (e) {}
  };

  const handleToggleAlert = async (value: boolean) => {
    setHydrationAlert(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_REMINDER, value ? 'true' : 'false');
    } catch (e) {}
  };

  const handleAddItem = async () => {
    if (!newCategory.trim() || !newDescription.trim()) {
      Alert.alert('Missing Info', 'Please enter meal title and details.');
      return;
    }

    const newItem: MealSection = {
      id: Date.now().toString(),
      category: newCategory.trim(),
      icon: '🍽️',
      calories: parseInt(newCalories, 10) || 0,
      description: newDescription.trim(),
    };

    const updated = [...meals, newItem];
    setMeals(updated);
    setModalVisible(false);
    setNewCategory('');
    setNewDescription('');
    setNewCalories('');

    try {
      await AsyncStorage.setItem(STORAGE_KEY_MEALS, JSON.stringify(updated));
    } catch (e) {}
  };

  const totalCalories = meals.reduce((sum, item) => sum + item.calories, 0);
  const progressPercent = Math.min(100, Math.round((glasses / targetGlasses) * 100));

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = days[new Date().getDay()];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#080C0D" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Water & Diet Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Water Intake Card */}
        <View style={styles.hydrationCard}>
          <View style={styles.glassesCounterRow}>
            <Text style={styles.currentGlassesText}>{glasses}</Text>
            <Text style={styles.targetGlassesText}> / {targetGlasses} glasses</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          {/* Water Buttons */}
          <View style={styles.waterButtonsRow}>
            <TouchableOpacity
              style={styles.minusBtn}
              onPress={() => handleUpdateWater(glasses - 1)}
              activeOpacity={0.8}
            >
              <Text style={styles.minusBtnText}>- 1 Glass</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.plusBtn}
              onPress={() => handleUpdateWater(glasses + 1)}
              activeOpacity={0.8}
            >
              <Text style={styles.plusBtnText}>+ 1 Glass (250ml)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Hydration Alert Switch Card */}
        <View style={styles.alertCard}>
          <Text style={styles.alertIcon}>⏰</Text>
          <View style={styles.alertInfo}>
            <Text style={styles.alertTitle}>70-Minute Hydration Alert</Text>
            <Text style={styles.alertSubtitle}>
              {hydrationAlert ? 'Active • Alert repeats every 70 mins' : 'Disabled'}
            </Text>
          </View>
          <Switch
            value={hydrationAlert}
            onValueChange={handleToggleAlert}
            trackColor={{ false: '#1A2629', true: '#00E676' }}
            thumbColor={hydrationAlert ? '#FFFFFF' : '#839296'}
          />
        </View>

        {/* 3. Schedule Badge */}
        <View style={styles.scheduleBadge}>
          <Text style={styles.scheduleBadgeText}>
            TODAY'S SCHEDULE • {todayName.toUpperCase()}
          </Text>
        </View>

        {/* 4. Meal Plan Header */}
        <View style={styles.mealHeaderRow}>
          <View>
            <Text style={styles.mealPlanTitle}>{todayName}'s Meal Plan</Text>
            <Text style={styles.totalKcalText}>Total: {totalCalories.toLocaleString()} kcal</Text>
          </View>

          <TouchableOpacity
            style={styles.addItemBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.addItemBtnText}>+ Add Item</Text>
          </TouchableOpacity>
        </View>

        {/* 5. Meal Cards (Breakfast, Lunch, Evening Snack, Dinner) */}
        {meals.map((meal) => (
          <View key={meal.id} style={styles.mealCard}>
            <View style={styles.mealCardTop}>
              <View style={styles.mealCategoryLeft}>
                <Text style={styles.mealEmoji}>{meal.icon}</Text>
                <Text style={styles.mealCategoryTitle}>{meal.category}</Text>
              </View>
              <View style={styles.kcalBadge}>
                <Text style={styles.kcalBadgeText}>{meal.calories} kcal</Text>
              </View>
            </View>
            <Text style={styles.mealDescriptionText}>{meal.description}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Add Item Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Meal Item</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Category (e.g. Snack, Dessert)"
              placeholderTextColor="#657378"
              value={newCategory}
              onChangeText={setNewCategory}
            />

            <TextInput
              style={[styles.modalInput, { height: 75, textAlignVertical: 'top' }]}
              placeholder="What did you eat?"
              placeholderTextColor="#657378"
              multiline
              value={newDescription}
              onChangeText={setNewDescription}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Calories (kcal)"
              placeholderTextColor="#657378"
              keyboardType="numeric"
              value={newCalories}
              onChangeText={setNewCalories}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddItem}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#080C0D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 38 : 12,
    paddingBottom: 16,
    backgroundColor: '#080C0D',
  },
  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  backText: {
    color: '#00E676',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  hydrationCard: {
    backgroundColor: '#101719',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#192629',
    marginBottom: 16,
  },
  glassesCounterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  currentGlassesText: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: 'bold',
  },
  targetGlassesText: {
    color: '#8A999E',
    fontSize: 16,
    fontWeight: '600',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#1A2528',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00E676',
    borderRadius: 4,
  },
  waterButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  minusBtn: {
    flex: 1,
    backgroundColor: '#182427',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#243438',
  },
  minusBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  plusBtn: {
    flex: 1.5,
    backgroundColor: '#00E676',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  plusBtnText: {
    color: '#080C0D',
    fontSize: 14,
    fontWeight: 'bold',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101719',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#00E676',
    marginBottom: 20,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  alertInfo: {
    flex: 1,
  },
  alertTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  alertSubtitle: {
    color: '#7B8D91',
    fontSize: 12,
    marginTop: 2,
  },
  scheduleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderColor: '#00E676',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  scheduleBadgeText: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  mealHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  mealPlanTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  totalKcalText: {
    color: '#8A999E',
    fontSize: 13,
    marginTop: 2,
  },
  addItemBtn: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderWidth: 1,
    borderColor: '#00E676',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  addItemBtnText: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '700',
  },
  mealCard: {
    backgroundColor: '#101719',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#192629',
    marginBottom: 14,
  },
  mealCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mealCategoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  mealCategoryTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  kcalBadge: {
    borderWidth: 1,
    borderColor: '#00E676',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0, 230, 118, 0.05)',
  },
  kcalBadgeText: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mealDescriptionText: {
    color: '#94A3A8',
    fontSize: 13,
    lineHeight: 19,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#121A1C',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#223236',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: '#182427',
    borderRadius: 10,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#243438',
    marginBottom: 12,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 6,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: '#8A999E',
    fontWeight: '600',
  },
  modalSaveBtn: {
    backgroundColor: '#00E676',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  modalSaveText: {
    color: '#080C0D',
    fontWeight: 'bold',
  },
});