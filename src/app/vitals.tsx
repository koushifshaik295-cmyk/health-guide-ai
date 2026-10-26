import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface BiometricItem {
  id: string;
  title: string;
  value: string;
  unit: string;
  time: string;
  status: 'Optimal' | 'Normal';
  icon: string;
  iconBg: string;
}

export default function VitalsScreen() {
  const router = useRouter();
  const [healthScore] = useState<number>(94);

  const handleBack = () => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/'); // Make sure this routes to '/'
  }
};

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, [router]);

  const biometrics: BiometricItem[] = [
    {
      id: '1',
      title: 'Heart Rate',
      value: '72',
      unit: 'bpm',
      time: '15 mins ago',
      status: 'Optimal',
      icon: '❤️',
      iconBg: '#FDECEF',
    },
    {
      id: '2',
      title: 'SpO2 (Oxygen)',
      value: '98',
      unit: '%',
      time: '1 hour ago',
      status: 'Normal',
      icon: '🫁',
      iconBg: '#E8F7FB',
    },
    {
      id: '3',
      title: 'Deep Sleep',
      value: '7.4',
      unit: 'hrs',
      time: 'Last night',
      status: 'Optimal',
      icon: '🌙',
      iconBg: '#EFF2FD',
    },
    {
      id: '4',
      title: 'Body Temp',
      value: '36.6',
      unit: '°C',
      time: 'Today, 8:00 AM',
      status: 'Normal',
      icon: '🌡️',
      iconBg: '#FEF6E9',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F8FB" translucent={false} />

      {/* Fixed top header bar placed outside the ScrollView */}
      <View style={styles.topHeaderBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Feather name="arrow-left" size={22} color="#1A1C1E" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.screenTitle}>Vitals & Health</Text>
          <Text style={styles.screenSubtitle}>Real-time biometric insights</Text>
        </View>

        <TouchableOpacity
          style={styles.logButton}
          onPress={() => Alert.alert('Manual Log', 'Open vitals recording form?')}
          activeOpacity={0.85}
        >
          <Text style={styles.logButtonText}>+ Log</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Health Score Card */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreTitle}>Health Score: {healthScore} / 100</Text>
          <Text style={styles.scoreSubtitle}>
            All biometrics are stored offline on this device.
          </Text>
        </View>

        {/* Section Heading */}
        <Text style={styles.sectionTitle}>Recent Biometrics</Text>

        {/* Biometrics List */}
        <View style={styles.listContainer}>
          {biometrics.map((item) => (
            <View key={item.id} style={styles.metricCard}>
              <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
                <Text style={{ fontSize: 24 }}>{item.icon}</Text>
              </View>

              <View style={styles.metricInfo}>
                <Text style={styles.metricTitle}>{item.title}</Text>
                <Text style={styles.metricTime}>{item.time}</Text>
              </View>

              <View style={styles.metricRight}>
                <View style={styles.valueRow}>
                  <Text style={styles.metricValue}>{item.value}</Text>
                  <Text style={styles.metricUnit}>{item.unit}</Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    item.status === 'Optimal' ? styles.statusOptimal : styles.statusNormal,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      item.status === 'Optimal'
                        ? styles.statusTextOptimal
                        : styles.statusTextNormal,
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FB',
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 12,
    paddingBottom: 12,
    backgroundColor: '#F6F8FB',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D0D7DE',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  headerTitleContainer: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1C1E',
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#8E98A8',
    marginTop: 1,
  },
  logButton: {
    backgroundColor: '#2563EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  scoreCard: {
    backgroundColor: '#EBF2FF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },
  scoreTitle: {
    color: '#1D4ED8',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  scoreSubtitle: {
    color: '#4B5563',
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1A1C1E',
    marginBottom: 14,
  },
  listContainer: {
    gap: 12,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  metricInfo: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  metricTime: {
    fontSize: 12,
    color: '#8E98A8',
    marginTop: 3,
  },
  metricRight: {
    alignItems: 'flex-end',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1C1E',
  },
  metricUnit: {
    fontSize: 11,
    color: '#8E98A8',
    fontWeight: '600',
  },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  statusOptimal: {
    backgroundColor: '#E8F8F0',
  },
  statusNormal: {
    backgroundColor: '#EAF3FF',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextOptimal: {
    color: '#16A34A',
  },
  statusTextNormal: {
    color: '#2563EB',
  },
});