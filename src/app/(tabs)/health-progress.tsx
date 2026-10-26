import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
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

export default function HealthProgressDashboard() {
  const router = useRouter();
  const [steps, setSteps] = useState<number>(0);
  const [stepGoal, setStepGoal] = useState<number>(8000);
  const [waterGlasses, setWaterGlasses] = useState<number>(0);

  useEffect(() => {
    async function loadData() {
      const s = await AsyncStorage.getItem('@health_steps_today');
      if (s) setSteps(parseInt(s, 10));
      const w = await AsyncStorage.getItem('@daily_water_count');
      if (w) setWaterGlasses(parseInt(w, 10));
    }
    loadData();
  }, []);

  const progressPercent = Math.min(Math.round((steps / stepGoal) * 100), 100);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080C0D" translucent={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>HealthGuide AI</Text>
            <Text style={styles.headerSub}>నడక & ఆరోగ్య సూచిక</Text>
          </View>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={{ fontSize: 18 }}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Central Neon Ring */}
        <View style={styles.ringCard}>
          <View style={styles.ringOuter}>
            <Text style={styles.footprint}>⚡</Text>
            <Text style={styles.largeStepNumber}>{steps.toLocaleString()}</Text>
            <Text style={styles.stepTargetText}>/ {stepGoal.toLocaleString()} steps</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{progressPercent}% OF GOAL</Text>
            </View>
          </View>
        </View>

        {/* Hydration Widget */}
        <View style={styles.hydrationCard}>
          <Text style={styles.cardTitle}>Daily Hydration</Text>
          <Text style={styles.cardSub}>Glasses drunk: {waterGlasses} / 8</Text>
          <View style={styles.waterRow}>
            <TouchableOpacity
              style={styles.waterBtn}
              onPress={() => setWaterGlasses(Math.max(0, waterGlasses - 1))}
            >
              <Text style={styles.waterBtnText}>-1 Glass</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.waterBtn, styles.waterBtnAdd]}
              onPress={() => setWaterGlasses(waterGlasses + 1)}
            >
              <Text style={[styles.waterBtnText, { color: '#080C0D' }]}>+1 Glass (250ml)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 10 : 16,
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: 12,
    color: '#00E676',
    fontWeight: '600',
    marginTop: 2,
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
  },
  ringCard: {
    backgroundColor: '#11181B',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1D2A2E',
    marginBottom: 16,
  },
  ringOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 8,
    borderColor: '#00E676',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A1012',
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
  hydrationCard: {
    backgroundColor: '#11181B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1D2A2E',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cardSub: {
    color: '#7D8C91',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  waterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  waterBtn: {
    flex: 1,
    backgroundColor: '#192326',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  waterBtnAdd: {
    backgroundColor: '#00E676',
  },
  waterBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});