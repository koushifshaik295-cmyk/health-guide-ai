import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';

export default function WelcomeScreen() {
  const router = useRouter();

  // Mode: 'signin' or 'signup'
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      Alert.alert('Missing Info', 'Please provide both email and password.');
      return;
    }

    if (cleanPassword.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (authMode === 'signin') {
        // --- Sign In Flow ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (error) {
          Alert.alert('Sign In Failed', error.message);
          return;
        }

        if (data.user) {
          router.replace('/');
        }
      } else {
        // --- Sign Up Flow ---
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (error) {
          Alert.alert('Sign Up Failed', error.message);
          return;
        }

        if (data.session) {
          Alert.alert('Account Created', 'Welcome to Health Guide AI!', [
            { text: 'Get Started', onPress: () => router.replace('/profile-setup') },
          ]);
        } else {
          Alert.alert('Account Created', 'Your account has been registered. You can now sign in.', [
            { text: 'OK', onPress: () => setAuthMode('signin') },
          ]);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Ionicons name="fitness" size={32} color="#00e676" />
            </View>
            <Text style={styles.title}>Health Guide AI</Text>
            <Text style={styles.subtitle}>
              Track your daily footsteps, hydration, and fitness metrics
            </Text>
          </View>

          {/* Card Container */}
          <View style={styles.card}>
            {/* Mode Switcher Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, authMode === 'signin' && styles.tabButtonActive]}
                onPress={() => setAuthMode('signin')}
              >
                <Text
                  style={[styles.tabText, authMode === 'signin' && styles.tabTextActive]}
                >
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, authMode === 'signup' && styles.tabButtonActive]}
                onPress={() => setAuthMode('signup')}
              >
                <Text
                  style={[styles.tabText, authMode === 'signup' && styles.tabTextActive]}
                >
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* Inputs */}
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="youremail@example.com"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Quick Switch Helper */}
            <TouchableOpacity
              style={styles.toggleFooter}
              onPress={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
            >
              <Text style={styles.toggleFooterText}>
                {authMode === 'signin'
                  ? "Don't have an account? Create one"
                  : 'Already registered? Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#111111',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#222222',
    gap: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#050505',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#222222',
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#1f2937',
  },
  tabText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#050505',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#222222',
    paddingHorizontal: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: '#00e676',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  toggleFooter: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  toggleFooterText: {
    color: '#00e676',
    fontSize: 13,
    fontWeight: '500',
  },
});
