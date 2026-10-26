import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface HealthLog {
  id: string;
  metric: string;
  value: string;
  unit: string;
  status: 'Normal' | 'Attention' | 'Optimal';
  time: string;
  icon: string;
  color: string;
}

const DEFAULT_LOGS: HealthLog[] = [
  { id: '1', metric: 'Heart Rate', value: '72', unit: 'bpm', status: 'Optimal', time: '15 mins ago', icon: '❤️', color: '#FF3B30' },
  { id: '2', metric: 'SpO2 (Oxygen)', value: '98', unit: '%', status: 'Normal', time: '1 hour ago', icon: '🫁', color: '#30B0C7' },
  { id: '3', metric: 'Deep Sleep', value: '7.4', unit: 'hrs', status: 'Optimal', time: 'Last night', icon: '🌙', color: '#5856D6' },
  { id: '4', metric: 'Body Temp', value: '36.6', unit: '°C', status: 'Normal', time: 'Today, 8:00 AM', icon: '🌡️', color: '#FF9500' },
];

export default function HealthDetailsScreen() {
  const [logs, setLogs] = useState<HealthLog[]>(DEFAULT_LOGS);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('Heart Rate');
  const [inputValue, setInputValue] = useState('');

  // Load vitals from storage
  useEffect(() => {
    const loadStoredLogs = async () => {
      try {
        const saved = await AsyncStorage.getItem('@health_logs');
        if (saved !== null) {
          setLogs(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load health logs', e);
      }
    };
    loadStoredLogs();
  }, []);

  const handleAddLog = async () => {
    if (!inputValue.trim()) {
      Alert.alert('Missing Value', 'Please enter a numeric reading.');
      return;
    }

    const newLog: HealthLog = {
      id: Date.now().toString(),
      metric: selectedMetric,
      value: inputValue.trim(),
      unit: selectedMetric === 'Heart Rate' ? 'bpm' : selectedMetric === 'SpO2' ? '%' : '°C',
      status: 'Normal',
      time: 'Just now',
      icon: selectedMetric === 'Heart Rate' ? '❤️' : selectedMetric === 'SpO2' ? '🫁' : '🌡️',
      color: selectedMetric === 'Heart Rate' ? '#FF3B30' : selectedMetric === 'SpO2' ? '#30B0C7' : '#FF9500',
    };

    const updated = [newLog, ...logs];
    setLogs(updated);
    setInputValue('');
    setModalVisible(false);

    try {
      await AsyncStorage.setItem('@health_logs', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to persist health log', e);
    }
    Alert.alert('Logged!', `${selectedMetric} saved to local storage.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Vitals & Health</Text>
            <Text style={styles.subtitle}>Real-time biometric insights</Text>
          </View>
          <TouchableOpacity
            style={styles.logButton}
            activeOpacity={0.8}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.logButtonText}>+ Log</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Summary Banner */}
        <View style={styles.summaryBanner}>
          <Text style={styles.summaryTitle}>Health Score: 94 / 100</Text>
          <Text style={styles.summaryDesc}>
            All biometrics are stored offline on this device.
          </Text>
        </View>

        {/* Vitals Feed */}
        <Text style={styles.sectionHeading}>Recent Biometrics</Text>
        {logs.map((item) => (
          <View key={item.id} style={styles.logCard}>
            <View style={styles.logLeft}>
              <View style={[styles.iconBox, { backgroundColor: `${item.color}15` }]}>
                <Text style={styles.metricEmoji}>{item.icon}</Text>
              </View>
              <View>
                <Text style={styles.metricName}>{item.metric}</Text>
                <Text style={styles.metricTime}>{item.time}</Text>
              </View>
            </View>

            <View style={styles.logRight}>
              <Text style={styles.metricValue}>
                {item.value} <Text style={styles.metricUnit}>{item.unit}</Text>
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      item.status === 'Optimal' ? '#E8F8EE' : '#EAF2FF',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: item.status === 'Optimal' ? '#34C759' : '#007AFF',
                    },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add Metric Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record New Vital</Text>
            <Text style={styles.modalSubtitle}>Choose a metric and enter value</Text>

            <View style={styles.chipRow}>
              {['Heart Rate', 'SpO2', 'Body Temp'].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.chip,
                    selectedMetric === m && styles.selectedChip,
                  ]}
                  onPress={() => setSelectedMetric(m)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedMetric === m && styles.selectedChipText,
                    ]}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 75"
              placeholderTextColor="#8E8E93"
              keyboardType="numeric"
              value={inputValue}
              onChangeText={setInputValue}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddLog}>
                <Text style={styles.saveBtnText}>Save Reading</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scrollContent: { padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#1C1C1E' },
  subtitle: { fontSize: 14, color: '#8E8E93', marginTop: 3 },
  logButton: {
    backgroundColor: '#2E6FF2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  summaryBanner: {
    backgroundColor: '#EAF2FF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#0055D6', marginBottom: 4 },
  summaryDesc: { fontSize: 13, color: '#4B5563', lineHeight: 18 },
  sectionHeading: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', marginBottom: 14 },
  logCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 1,
  },
  logLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricEmoji: { fontSize: 20 },
  metricName: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  metricTime: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  logRight: { alignItems: 'flex-end' },
  metricValue: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  metricUnit: { fontSize: 12, fontWeight: '400', color: '#8E8E93' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1C1C1E' },
  modalSubtitle: { fontSize: 13, color: '#8E8E93', marginTop: 4, marginBottom: 16 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
  },
  selectedChip: { backgroundColor: '#2E6FF2' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
  selectedChipText: { color: '#FFFFFF' },
  modalInput: {
    height: 48,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F5F7FA',
  },
  cancelBtnText: { color: '#8E8E93', fontWeight: '600' },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#2E6FF2',
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700' },
});
