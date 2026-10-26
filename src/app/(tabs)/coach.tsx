import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

declare const process: {
  env: {
    EXPO_PUBLIC_GEMINI_API_KEY?: string;
    [key: string]: string | undefined;
  };
};

type SupportedLanguage = 'en' | 'te' | 'hi';

interface ChatMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  timestamp: string;
  imageUri?: string;
  audioUri?: string;
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  language: SupportedLanguage;
  messages: ChatMessage[];
}

const WELCOME_MESSAGES: Record<SupportedLanguage, string> = {
  en: 'Hello! I am your AI Health Coach. Send me your questions, speak via voice notes, or upload medical reports & certificates for analysis.',
  te: 'నమస్కారం! నేను మీ AI హెల్త్ కోచ్‌ని. మీ ఆరోగ్యంపై ప్రశ్నలు అడగండి, వాయిస్ నోట్స్ పంపండి లేదా మెడికల్ రిపోర్టులు/సర్టిఫికేట్లు పంపి విశ్లేషణ పొందండి.',
  hi: 'नमस्ते! मैं आपका AI हेल्थ कोच हूँ। स्वास्थ्य संबंधी सवाल पूछें, बोलकर वॉयस नोट भेजें, या मेडिकल रिपोर्ट्स व सर्टिफिकेट्स अपलोड करके जांच करवाएं।',
};

export default function AICoachScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');
  const [inputText, setInputText] = useState<string>('');
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Gallery & Voice States
  const [selectedImage, setSelectedImage] = useState<{ uri: string; base64?: string } | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const recordingTimerRef = useRef<any>(null);

  useEffect(() => {
    loadChatSessions();
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
    if (activeSession?.language) {
      setSelectedLanguage(activeSession.language);
    }
  }, [activeSession?.messages, isTyping]);

  const loadChatSessions = async () => {
    try {
      const stored = await AsyncStorage.getItem('@ai_coach_sessions');
      if (stored) {
        const parsed: ChatSession[] = JSON.parse(stored);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
          setSelectedLanguage(parsed[0].language || 'en');
        } else {
          createNewChat('en');
        }
      } else {
        createNewChat('en');
      }
    } catch (e) {
      console.error(e);
      createNewChat('en');
    }
  };

  const saveSessionsToStorage = async (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    await AsyncStorage.setItem('@ai_coach_sessions', JSON.stringify(updatedSessions));
  };

  const createNewChat = (lang: SupportedLanguage = selectedLanguage) => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: lang === 'te' ? 'కొత్త ప్రశ్న' : lang === 'hi' ? 'नया सवाल' : 'New Health Query',
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: lang,
      messages: [
        {
          id: 'welcome',
          sender: 'coach',
          text: WELCOME_MESSAGES[lang],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };

    const updated = [newSession, ...sessions];
    saveSessionsToStorage(updated);
    setActiveSessionId(newId);
    setHistoryDrawerVisible(false);
  };

  const switchLanguage = (lang: SupportedLanguage) => {
    setSelectedLanguage(lang);
    if (activeSession) {
      const updated = sessions.map((s) =>
        s.id === activeSession.id ? { ...s, language: lang } : s
      );
      saveSessionsToStorage(updated);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  // Gallery Picker (Medical certificates, lab reports, photos)
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Gallery access is needed to upload certificates or medical files.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        setSelectedImage({
          uri: result.assets[0].uri,
          base64: result.assets[0].base64 || undefined,
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to pick photo/certificate. Please try again.');
    }
  };

  // Voice Recorder
  const handleStartRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone permission is required to record your voice.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      Alert.alert('Recording Error', 'Could not access the audio recorder.');
    }
  };

  const handleStopRecording = async () => {
    if (!recording) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        processVoiceAndSendMessage(uri);
      }
    } catch (err) {
      console.error('Stop recording error', err);
    }
  };

  const handlePlayVoice = async (uri: string) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      await sound.playAsync();
    } catch (e) {
      Alert.alert('Error', 'Unable to play voice memo.');
    }
  };

  // Process Voice Query through Gemini Multimodal
  const processVoiceAndSendMessage = async (audioUri: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: '🎙️ Voice Health Query',
      audioUri,
      timestamp: timeStr,
    };

    let targetSession = activeSession;
    let allSessions = [...sessions];

    if (!targetSession) {
      const newId = Date.now().toString();
      targetSession = {
        id: newId,
        title: 'Voice Health Consultation',
        updatedAt: timeStr,
        language: selectedLanguage,
        messages: [userMsg],
      };
      allSessions = [targetSession, ...allSessions];
      setActiveSessionId(newId);
    } else {
      targetSession = {
        ...targetSession,
        updatedAt: timeStr,
        messages: [...targetSession.messages, userMsg],
      };
      allSessions = allSessions.map((s) => (s.id === targetSession!.id ? targetSession! : s));
    }

    await saveSessionsToStorage(allSessions);
    setIsTyping(true);

    const apiKey =
      process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
      'AQ.Ab8RN6IQRtobeeGpW8NbjxM1JevVTkAgmm-ej7CWzdVphkWnFw';

    const languageInstruction =
      selectedLanguage === 'te'
        ? 'Respond fluently in clear, empathetic Telugu (తెలుగు).'
        : selectedLanguage === 'hi'
        ? 'Respond fluently in clear, empathetic Hindi (हिंदी).'
        : 'Respond in clear, supportive English.';

    try {
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inline_data: {
                      mime_type: 'audio/mp4',
                      data: base64Audio,
                    },
                  },
                  {
                    text: `You are an expert medical, diet, and fitness AI coach. Listen carefully to the user's spoken voice query about their health symptoms, fitness problem, or questions. Understand the user's language and context. ${languageInstruction} Give a direct, accurate, and supportive answer. Include helpful lifestyle, diet, or symptom management tips and recommend consulting a doctor if symptoms are severe.`,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      let replyText = '';

      if (data.error) {
        replyText = `Google API Error: ${data.error.message || 'Invalid Request'}`;
      } else {
        replyText =
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          'I listened to your voice message, but was unable to process the details. Please try speaking clearly or typing your query.';
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'coach',
        text: replyText.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const finalSessions = allSessions.map((s) =>
        s.id === targetSession!.id ? { ...s, messages: [...s.messages, botMsg] } : s
      );

      await saveSessionsToStorage(finalSessions);
    } catch (err: any) {
      console.error('Gemini Voice API Error:', err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'coach',
        text: `Unable to process voice audio: ${err?.message || 'Check your internet connection.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const finalSessions = allSessions.map((s) =>
        s.id === targetSession!.id ? { ...s, messages: [...s.messages, errorMsg] } : s
      );
      await saveSessionsToStorage(finalSessions);
    } finally {
      setIsTyping(false);
    }
  };

  // Process Text & Medical Certificate / Document Images
  const handleSendMessage = async () => {
    if (!inputText.trim() && !selectedImage) return;

    const userQuestion = inputText.trim();
    const sentImage = selectedImage;

    setInputText('');
    setSelectedImage(null);

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userQuestion || (sentImage ? '📄 Uploaded Medical Certificate / Report' : ''),
      imageUri: sentImage?.uri,
      timestamp: timeStr,
    };

    let targetSession = activeSession;
    let allSessions = [...sessions];

    const displayTitle = sentImage
      ? 'Certificate / Report Analysis'
      : userQuestion.length > 25
      ? `${userQuestion.substring(0, 25)}...`
      : userQuestion;

    if (!targetSession) {
      const newId = Date.now().toString();
      targetSession = {
        id: newId,
        title: displayTitle,
        updatedAt: timeStr,
        language: selectedLanguage,
        messages: [userMsg],
      };
      allSessions = [targetSession, ...allSessions];
      setActiveSessionId(newId);
    } else {
      const userMessageCount = targetSession.messages.filter((m) => m.sender === 'user').length;
      const newTitle = userMessageCount === 0 ? displayTitle : targetSession.title;

      targetSession = {
        ...targetSession,
        title: newTitle,
        updatedAt: timeStr,
        messages: [...targetSession.messages, userMsg],
      };

      allSessions = allSessions.map((s) => (s.id === targetSession!.id ? targetSession! : s));
    }

    await saveSessionsToStorage(allSessions);
    setIsTyping(true);

    const apiKey =
      process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
      'AQ.Ab8RN6IQRtobeeGpW8NbjxM1JevVTkAgmm-ej7CWzdVphkWnFw';

    const languageInstruction =
      selectedLanguage === 'te'
        ? 'Respond fluently in clear, easy-to-understand Telugu (తెలుగు).'
        : selectedLanguage === 'hi'
        ? 'Respond fluently in clear, easy-to-understand Hindi (हिंदी).'
        : 'Respond in clean, supportive English.';

    try {
      let replyText = '';
      const contentParts: any[] = [];

      if (sentImage?.base64) {
        contentParts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: sentImage.base64,
          },
        });
      }

      contentParts.push({
        text: `You are an expert AI Health & Medical Assistant for HealthGuide AI. ${languageInstruction}
${
  sentImage
    ? `The user has uploaded a photo of a medical certificate, prescription, lab report, or diagnostic test. 
1. Carefully extract and analyze all visible details, diagnosis, test values, doctor notes, or prescribed medications.
2. Explain the medical findings in simple everyday language.
3. Highlight any abnormal parameters or points of caution.
4. Give supportive diet, hydration, and lifestyle guidance based on the findings.
5. Add a clear disclaimer: "This analysis is for educational and guidance purposes; always verify with your certified healthcare provider."`
    : ''
}
User query: "${userQuestion || 'Please examine and analyze this medical document / certificate.'}"`,
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: contentParts }],
          }),
        }
      );

      const data = await response.json();
      if (data.error) {
        replyText = `Google API Error: ${data.error.message || 'Invalid Request'}`;
      } else {
        replyText =
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          (selectedLanguage === 'te'
            ? 'క్షమించండి, సమాధానం సిద్ధం చేయలేకపోయాను. దయచేసి మళ్లీ ప్రయత్నించండి.'
            : selectedLanguage === 'hi'
            ? 'क्षमा करें, मैं अभी उत्तर नहीं दे सका। कृपया पुनः प्रयास करें।'
            : 'Sorry, I could not generate a response right now. Please try again.');
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'coach',
        text: replyText.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const finalSessions = allSessions.map((s) =>
        s.id === targetSession!.id ? { ...s, messages: [...s.messages, botMsg] } : s
      );

      await saveSessionsToStorage(finalSessions);
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'coach',
        text: `Network Error: ${err?.message || 'Check your internet connection.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const finalSessions = allSessions.map((s) =>
        s.id === targetSession!.id ? { ...s, messages: [...s.messages, errorMsg] } : s
      );
      await saveSessionsToStorage(finalSessions);
    } finally {
      setIsTyping(false);
    }
  };

  const deleteSession = async (id: string) => {
    Alert.alert('Delete Chat', 'Are you sure you want to delete this conversation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = sessions.filter((s) => s.id !== id);
          await saveSessionsToStorage(updated);
          if (activeSessionId === id) {
            if (updated.length > 0) {
              setActiveSessionId(updated[0].id);
              setSelectedLanguage(updated[0].language || 'en');
            } else {
              createNewChat('en');
            }
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080C0D" translucent />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeftGroup}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.drawerBtn}
            onPress={() => setHistoryDrawerVisible(true)}
          >
            <Text style={styles.drawerIcon}>☰</Text>
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', flex: 1, marginHorizontal: 8 }}>
          <Text style={styles.headerTitle}>AI Health Coach</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {activeSession?.title || 'Saved History'}
          </Text>
        </View>

        <TouchableOpacity style={styles.newChatBtn} onPress={() => createNewChat(selectedLanguage)}>
          <Text style={styles.newChatBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Language Toggle Bar */}
      <View style={styles.langBar}>
        <Text style={styles.langPrompt}>Language / భాష / भाषा:</Text>
        <View style={styles.langPills}>
          <TouchableOpacity
            style={[styles.langPill, selectedLanguage === 'en' && styles.langPillActive]}
            onPress={() => switchLanguage('en')}
          >
            <Text style={[styles.langText, selectedLanguage === 'en' && styles.langTextActive]}>
              English
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.langPill, selectedLanguage === 'te' && styles.langPillActive]}
            onPress={() => switchLanguage('te')}
          >
            <Text style={[styles.langText, selectedLanguage === 'te' && styles.langTextActive]}>
              తెలుగు
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.langPill, selectedLanguage === 'hi' && styles.langPillActive]}
            onPress={() => switchLanguage('hi')}
          >
            <Text style={[styles.langText, selectedLanguage === 'hi' && styles.langTextActive]}>
              हिंदी
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Messages */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.chatScroll}
        showsVerticalScrollIndicator={false}
      >
        {activeSession?.messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.bubbleRow,
              msg.sender === 'user' ? styles.userRow : styles.coachRow,
            ]}
          >
            {msg.sender === 'coach' && (
              <View style={styles.avatar}>
                <Text style={{ fontSize: 16 }}>🤖</Text>
              </View>
            )}
            <View
              style={[
                styles.bubble,
                msg.sender === 'user' ? styles.userBubble : styles.coachBubble,
              ]}
            >
              {msg.imageUri && (
                <Image source={{ uri: msg.imageUri }} style={styles.bubbleImage} />
              )}
              {msg.audioUri && (
                <TouchableOpacity
                  style={styles.voicePlayBtn}
                  onPress={() => handlePlayVoice(msg.audioUri!)}
                >
                  <Text style={styles.voicePlayIcon}>▶ Play Recorded Audio</Text>
                </TouchableOpacity>
              )}
              {msg.text ? (
                <Text
                  style={[
                    styles.bubbleText,
                    msg.sender === 'user' ? styles.userText : styles.coachText,
                  ]}
                >
                  {msg.text}
                </Text>
              ) : null}
              <Text style={styles.timeTag}>{msg.timestamp}</Text>
            </View>
          </View>
        ))}

        {isTyping && (
          <View style={[styles.bubbleRow, styles.coachRow]}>
            <View style={styles.avatar}>
              <Text style={{ fontSize: 16 }}>🤖</Text>
            </View>
            <View style={[styles.bubble, styles.coachBubble]}>
              <Text style={styles.coachText}>
                {selectedLanguage === 'te'
                  ? 'విశ్లేషిస్తోంది, సమాధానం రాయిస్తోంది...'
                  : selectedLanguage === 'hi'
                  ? 'विश्लेषण कर रहा है, उत्तर लिख रहा है...'
                  : 'Analyzing and preparing health insights...'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Selected Certificate/Image Preview Banner */}
      {selectedImage && (
        <View style={styles.selectedImageBanner}>
          <Image source={{ uri: selectedImage.uri }} style={styles.thumbImage} />
          <View style={{ flex: 1 }}>
            <Text style={styles.thumbText}>Report / Certificate Attached</Text>
            <Text style={styles.thumbSubText}>Ready for AI medical & nutrition analysis</Text>
          </View>
          <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.removeImageBtn}>
            <Text style={styles.removeImageText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Message Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View style={styles.inputBar}>
          <View style={styles.inputInnerRow}>
            {/* Plus (+) Button for Uploads */}
            <TouchableOpacity
              style={[styles.actionIconBtn, styles.plusBtn]}
              onPress={handlePickImage}
              disabled={isRecording}
            >
              <Text style={styles.plusIconText}>+</Text>
            </TouchableOpacity>

            {/* Mic / Audio Recorder Button */}
            <TouchableOpacity
              style={[styles.actionIconBtn, isRecording && styles.actionIconBtnActive]}
              onPress={isRecording ? handleStopRecording : handleStartRecording}
            >
              <Text style={styles.actionIcon}>{isRecording ? '⏹️' : '🎙️'}</Text>
            </TouchableOpacity>

            {/* Text Input */}
            <TextInput
              style={styles.textInput}
              placeholder={
                isRecording
                  ? `Listening (${recordingDuration}s)... Tap ⏹ to send`
                  : selectedImage
                  ? 'Add questions about this certificate...'
                  : selectedLanguage === 'te'
                  ? 'ఆరోగ్య సమస్య లేదా ప్రశ్న అడగండి...'
                  : selectedLanguage === 'hi'
                  ? 'स्वास्थ्य समस्या या प्रश्न पूछें...'
                  : 'Type symptoms or ask health question...'
              }
              placeholderTextColor={isRecording ? '#FF5252' : '#5A6D73'}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
              editable={!isRecording}
            />

            {/* Send Button */}
            <TouchableOpacity
              style={[
                styles.sendBtn,
                !inputText.trim() && !selectedImage && styles.sendBtnDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() && !selectedImage}
            >
              <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* History Drawer Modal */}
      <Modal
        visible={historyDrawerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHistoryDrawerVisible(false)}
      >
        <View style={styles.drawerBackdrop}>
          <View style={styles.drawerContainer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Chat History</Text>
              <TouchableOpacity onPress={() => setHistoryDrawerVisible(false)}>
                <Text style={styles.drawerClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.drawerNewChat}
              onPress={() => createNewChat(selectedLanguage)}
            >
              <Text style={styles.drawerNewChatText}>+ Start New Question</Text>
            </TouchableOpacity>

            <ScrollView style={{ flex: 1, marginTop: 10 }}>
              {sessions.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.historyItem,
                    item.id === activeSessionId && styles.activeHistoryItem,
                  ]}
                >
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => {
                      setActiveSessionId(item.id);
                      setSelectedLanguage(item.language || 'en');
                      setHistoryDrawerVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.historyItemTitle,
                        item.id === activeSessionId && styles.activeHistoryTitle,
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.historyItemTime}>
                      {item.updatedAt} • {item.language?.toUpperCase() || 'EN'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteChatBtn}
                    onPress={() => deleteSession(item.id)}
                  >
                    <Text style={styles.deleteChatIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 12 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#172225',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#11181B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1D2A2E',
  },
  backBtnText: {
    color: '#00E676',
    fontSize: 20,
    fontWeight: 'bold',
  },
  drawerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#11181B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1D2A2E',
  },
  drawerIcon: {
    color: '#00E676',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    color: '#7D8C91',
    fontSize: 11,
    maxWidth: 160,
  },
  newChatBtn: {
    backgroundColor: '#163826',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00E676',
  },
  newChatBtnText: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '700',
  },
  langBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#11181B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#192528',
  },
  langPrompt: {
    color: '#7D8C91',
    fontSize: 11,
    fontWeight: '600',
  },
  langPills: {
    flexDirection: 'row',
    gap: 6,
  },
  langPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#172225',
    borderWidth: 1,
    borderColor: '#243439',
  },
  langPillActive: {
    backgroundColor: '#00E676',
    borderColor: '#00E676',
  },
  langText: {
    color: '#8E9A9D',
    fontSize: 11,
    fontWeight: '700',
  },
  langTextActive: {
    color: '#080C0D',
  },
  chatScroll: {
    padding: 16,
    paddingBottom: 24,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 14,
    maxWidth: '85%',
  },
  userRow: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  coachRow: {
    alignSelf: 'flex-start',
    alignItems: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#14382B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#00E676',
    borderBottomRightRadius: 2,
  },
  coachBubble: {
    backgroundColor: '#141E22',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#202E33',
  },
  bubbleImage: {
    width: 220,
    height: 180,
    borderRadius: 10,
    marginBottom: 8,
    resizeMode: 'cover',
  },
  voicePlayBtn: {
    backgroundColor: '#00331A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#00A854',
  },
  voicePlayIcon: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '700',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 21,
  },
  userText: {
    color: '#080C0D',
    fontWeight: '600',
  },
  coachText: {
    color: '#FFFFFF',
  },
  timeTag: {
    fontSize: 9,
    color: '#5E7075',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  selectedImageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11181B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#1A2427',
  },
  thumbImage: {
    width: 42,
    height: 42,
    borderRadius: 6,
    marginRight: 10,
  },
  thumbText: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '700',
  },
  thumbSubText: {
    color: '#7D8C91',
    fontSize: 10,
  },
  removeImageBtn: {
    padding: 6,
  },
  removeImageText: {
    color: '#FF5252',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputBar: {
    padding: 10,
    backgroundColor: '#0E1417',
    borderTopWidth: 1,
    borderTopColor: '#1A2427',
  },
  inputInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#162226',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#243439',
  },
  plusBtn: {
    backgroundColor: '#162226',
    borderColor: '#00E676',
  },
  plusIconText: {
    color: '#00E676',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
    textAlign: 'center',
  },
  actionIconBtnActive: {
    borderColor: '#FF5252',
    backgroundColor: '#2D1414',
  },
  actionIcon: {
    fontSize: 17,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#162226',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 9,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#243439',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#00E676',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#1C292E',
  },
  sendIcon: {
    color: '#080C0D',
    fontSize: 15,
    fontWeight: 'bold',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
  },
  drawerContainer: {
    width: '78%',
    backgroundColor: '#0E1417',
    height: '100%',
    padding: 18,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 18 : 45,
    borderRightWidth: 1,
    borderRightColor: '#1A2427',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  drawerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  drawerClose: {
    color: '#7D8C91',
    fontSize: 20,
    fontWeight: '700',
  },
  drawerNewChat: {
    backgroundColor: '#163826',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00E676',
    marginBottom: 12,
  },
  drawerNewChatText: {
    color: '#00E676',
    fontWeight: '700',
    fontSize: 13,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121A1D',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1D2A2E',
  },
  activeHistoryItem: {
    borderColor: '#00E676',
    backgroundColor: '#0D241C',
  },
  historyItemTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  activeHistoryTitle: {
    color: '#00E676',
  },
  historyItemTime: {
    color: '#5E7075',
    fontSize: 10,
    marginTop: 2,
  },
  deleteChatBtn: {
    padding: 6,
    marginLeft: 6,
  },
  deleteChatIcon: {
    fontSize: 14,
  },
});