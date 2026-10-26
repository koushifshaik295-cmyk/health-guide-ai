import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleDirectSignIn = async () => {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit phone number.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // Simulate credential verification delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      setIsLoading(false);
      // Directly opens the main app, bypassing OTP verification entirely
      router.replace('/exercises');
    } catch {
      setIsLoading(false);
      setErrorMessage('Failed to sign in. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#080C0D" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* App Logo / Icon Header */}
        <View style={styles.badgeWrapper}>
          <View style={styles.badgeOuter}>
            <Ionicons name="fitness-outline" size={34} color="#00E676" />
          </View>
        </View>

        <Text style={styles.heading}>Welcome Back</Text>
        <Text style={styles.subheading}>
          Sign in with your phone number and password to access your health guide.
        </Text>

        {/* Error Message Banner */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#FF5252" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Form Card */}
        <View style={styles.card}>
          {/* Phone Number Input */}
          <Text style={styles.inputLabel}>Phone Number</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.countryPrefix}>+91</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter 10-digit number"
              placeholderTextColor="#5C6B73"
              keyboardType="phone-pad"
              maxLength={10}
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text);
                if (errorMessage) setErrorMessage('');
              }}
              editable={!isLoading}
            />
          </View>

          {/* Password Input */}
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your password"
              placeholderTextColor="#5C6B73"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errorMessage) setErrorMessage('');
              }}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#8A999E"
              />
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.disabledButton]}
            onPress={handleDirectSignIn}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#080C0D" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
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
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 36,
  },
  badgeWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  badgeOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#0E241B',
    borderWidth: 1,
    borderColor: '#184432',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    color: '#8A999E',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1316',
    borderWidth: 1,
    borderColor: '#701E24',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
    alignSelf: 'center',
    maxWidth: '92%',
  },
  errorText: {
    color: '#FF8A80',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#121A1C',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1D2A2E',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#BAC7CC',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2426',
    borderWidth: 1,
    borderColor: '#26373B',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  countryPrefix: {
    color: '#00E676',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 15,
  },
  eyeIcon: {
    padding: 4,
  },
  primaryButton: {
    backgroundColor: '#00E676',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#080C0D',
    fontSize: 16,
    fontWeight: '700',
  },
});