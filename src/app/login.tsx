import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const router = useRouter();

  // Mode: Sign In vs Sign Up
  const [isSignUp, setIsSignUp] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Target the root dashboard
  const navigateToDashboard = () => {
    router.replace('/');
  };

  const validateForm = () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return false;
    }

    if (isSignUp) {
      if (!fullName.trim()) {
        setErrorMessage('Please provide your full name.');
        return false;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return false;
      }
    }

    setErrorMessage('');
    return true;
  };

  const handleAuthAction = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrorMessage('');

    try {
      const generatedId = 'user_' + Date.now();
      const userName = isSignUp ? fullName.trim() : email.split('@')[0];
      const userEmail = email.trim();

      // Wipe previous session keys
      await AsyncStorage.multiRemove([
        '@health_user_session',
        '@health_user_token',
        '@user_session_token',
        '@health_user_profile',
        '@health_user_name',
        '@health_is_guest',
        '@health_profile_image',
      ]);

      const profilePayload = {
        fullName: userName,
        name: userName,
        email: userEmail,
        isCompleted: !isSignUp,
      };

      await AsyncStorage.multiSet([
        ['@health_user_profile', JSON.stringify(profilePayload)],
        ['@health_user_session', generatedId],
        ['@health_user_token', generatedId],
        ['@user_session_token', generatedId],
        ['@health_user_name', userName],
        ['@health_profile_completed', isSignUp ? 'false' : 'true'],
      ]);

      if (isSignUp) {
        // Direct new signups to biometric onboarding
        router.replace('/profile-setup');
      } else {
        // Existing logins go straight to dashboard
        navigateToDashboard();
      }
    } catch (err: any) {
      console.warn('Authentication storage error:', err);
      setErrorMessage('Failed to authenticate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const guestId = 'guest_' + Date.now();
      const guestProfile = {
        id: guestId,
        name: 'Guest Athlete',
        email: 'guest@healthguide.ai',
        isCompleted: true,
      };

      await AsyncStorage.multiSet([
        ['@health_user_profile', JSON.stringify(guestProfile)],
        ['@health_user_session', guestId],
        ['@health_user_token', guestId],
        ['@user_session_token', guestId],
        ['@health_user_name', 'Guest Athlete'],
        ['@health_is_guest', 'true'],
        ['@health_profile_completed', 'true'],
      ]);

      navigateToDashboard();
    } catch (err: any) {
      console.warn('Guest access error:', err);
      navigateToDashboard();
    } finally {
      setLoading(false);
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
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.heroImageCard}>
            <MaterialCommunityIcons name="heart-pulse" size={44} color="#00E676" />
            <View style={styles.logoBadgeFloat}>
              <Ionicons name="sparkles" size={14} color="#00E676" />
            </View>
          </View>

          <Text style={styles.brandTitle}>HEALTH GUIDE AI</Text>
          <Text style={styles.brandTagline}>
            {isSignUp
              ? 'Initialize your personal health biometric system'
              : 'Welcome back. Access your daily biometrics & tracker'}
          </Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, !isSignUp && styles.tabButtonActive]}
            onPress={() => {
              setIsSignUp(false);
              setErrorMessage('');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, !isSignUp && styles.tabTextActive]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, isSignUp && styles.tabButtonActive]}
            onPress={() => {
              setIsSignUp(true);
              setErrorMessage('');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, isSignUp && styles.tabTextActive]}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Box */}
        <View style={styles.formContainer}>
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color="#FF5252" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Full Name Field (Sign Up Only) */}
          {isSignUp && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Feather name="user" size={18} color="#78909C" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Kashif"
                  placeholderTextColor="#455A64"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {/* Email Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Feather name="mail" size={18} color="#78909C" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="name@example.com"
                placeholderTextColor="#455A64"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Feather name="lock" size={18} color="#78909C" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter password (min 6 chars)"
                placeholderTextColor="#455A64"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color="#78909C"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password (Sign Up Only) */}
          {isSignUp && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <Feather name="shield" size={18} color="#78909C" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Re-enter password"
                  placeholderTextColor="#455A64"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>
            </View>
          )}

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleAuthAction}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#080C0D" />
            ) : (
              <View style={styles.buttonInner}>
                <Text style={styles.primaryButtonText}>
                  {isSignUp ? 'Create Account & Enter' : 'Authenticate & Enter'}
                </Text>
                <Feather name="arrow-right" size={18} color="#080C0D" />
              </View>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Quick Offline Guest Access */}
          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleGuestAccess}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Ionicons name="flash" size={16} color="#00E5FF" />
            <Text style={styles.guestButtonText}>Continue with Offline Access</Text>
          </TouchableOpacity>
        </View>

        {/* Security Notice */}
        <View style={styles.footerNote}>
          <Ionicons name="lock-closed-outline" size={14} color="#546E7A" />
          <Text style={styles.footerNoteText}>
            Biometrics and offline pedometer data remain encrypted locally.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C0D',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: 40,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroImageCard: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: '#11171A',
    borderWidth: 2,
    borderColor: '#00E676',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 12,
    elevation: 8,
  },
  logoBadgeFloat: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#11171A',
    borderWidth: 1.5,
    borderColor: '#00E676',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ECEFF1',
    letterSpacing: 1.5,
  },
  brandTagline: {
    fontSize: 12,
    color: '#78909C',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
    lineHeight: 17,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#11171A',
    borderRadius: 16,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#1C272B',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: '#00E676',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
  },
  tabTextActive: {
    color: '#080C0D',
    fontWeight: '800',
  },
  formContainer: {
    backgroundColor: '#11171A',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1C272B',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF525215',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF525235',
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#FF5252',
    flex: 1,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#90A4AE',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#172226',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#243238',
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#ECEFF1',
    fontSize: 14,
  },
  eyeButton: {
    padding: 6,
  },
  primaryButton: {
    backgroundColor: '#00E676',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#080C0D',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1C272B',
  },
  dividerText: {
    color: '#546E7A',
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 12,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E5FF10',
    borderRadius: 14,
    height: 46,
    borderWidth: 1,
    borderColor: '#00E5FF30',
    gap: 8,
  },
  guestButtonText: {
    color: '#00E5FF',
    fontSize: 13,
    fontWeight: '700',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    gap: 6,
  },
  footerNoteText: {
    fontSize: 11,
    color: '#546E7A',
    fontWeight: '500',
  },
});