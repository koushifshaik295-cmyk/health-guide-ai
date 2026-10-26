import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// FIX ERROR 1: Updated the path to point to the EXISTING file `src/services/stepService.ts`
import * as StepService from '../services/stepService';

export default function CharacterGuideScreen() {
  const [metrics, setMetrics] = useState<StepService.StepMetrics | null>(null);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const xpToNextLevel = 100;

  useEffect(() => {
    async function initializeCompanion() {
      try {
        const hasPermission = await StepService.requestPedometerPermissions();
        if (!hasPermission) {
          console.warn('Motion permissions denied.');
          setIsLoading(false);
          return;
        }

        const todaySteps = await StepService.getTodaySteps();
        const goal = await StepService.getStepGoal();
        const calculatedMetrics = StepService.calculateStepMetrics(todaySteps, goal);
        setMetrics(calculatedMetrics);
        
        const calculatedXP = StepService.calculateStepXP(todaySteps);
        const newLevel = Math.floor(calculatedXP / xpToNextLevel) + 1;
        setXp(calculatedXP % xpToNextLevel);
        setLevel(newLevel);

        const subscription = StepService.subscribeToLiveSteps((additionalSteps: number) => {
          setMetrics((prev: StepService.StepMetrics | null) => prev ? StepService.calculateStepMetrics(prev.steps + additionalSteps, goal) : null);
          setXp(prev => (prev + StepService.calculateStepXP(additionalSteps)) % xpToNextLevel);
        });

        setIsLoading(false);

        return () => {
          subscription && subscription.remove();
        };

      } catch (error) {
        console.error('Error initializing companion screen:', error);
        setIsLoading(false);
      }
    }

    initializeCompanion();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingCenter]}>
        <ActivityIndicator size="large" color="#00E676" />
        <Text style={styles.loadingText}>Connecting to Guide...</Text>
      </View>
    );
  }

  if (!metrics) {
    return (
      <View style={[styles.container, styles.loadingCenter]}>
        <Text style={styles.errorText}>Unable to load health metrics.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'AI Guide', headerShown: true }} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Health Guide AI</Text>
        <Text style={styles.subtitle}>Level {level} Companion</Text>
      </View>

      <View style={styles.characterContainer}>
        <Image 
          source={{ uri: 'https://via.placeholder.com/300x400.png?text=Character+Visual' }} 
          style={styles.characterImage}
          resizeMode="contain"
        />
        <View style={styles.platformShadow} />
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Today's Stats</Text>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Steps</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${metrics.progressPercent}%` }]} />
          </View>
          <Text style={styles.statValue}>{metrics.steps.toLocaleString()}</Text>
        </View>

        <View style={styles.minorStatsRow}>
          <Text style={styles.minorStat}>{metrics.calories} kcal</Text>
          <Text style={styles.minorStat}>{metrics.distanceKm} km</Text>
        </View>
        
        <TouchableOpacity style={styles.button} onPress={() => console.log('View details tapped')}>
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
    padding: 20,
  },
  loadingCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 15,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#00E676',
    marginTop: 5,
  },
  characterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  characterImage: {
    width: 300,
    height: 400,
    zIndex: 2,
  },
  platformShadow: {
    position: 'absolute',
    bottom: 50,
    width: 200,
    height: 20,
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
    borderRadius: 100,
    transform: [{ scaleX: 1.5 }],
    zIndex: 1,
  },
  statsCard: {
    backgroundColor: '#111818',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#172428',
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  minorStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#172428',
    paddingTop: 10,
  },
  statLabel: {
    color: '#94A3B8',
    width: 50,
  },
  statValue: {
    color: '#FFFFFF',
    fontWeight: '600',
    width: 70,
    textAlign: 'right',
  },
  minorStat: {
    color: '#00E676',
    fontWeight: 'bold',
    fontSize: 16,
  },
  progressBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: '#1C282A',
    borderRadius: 5,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00E676',
    borderRadius: 5,
  },
  button: {
    backgroundColor: '#00E676',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#080C0D',
    fontWeight: 'bold',
    fontSize: 16,
  },
});