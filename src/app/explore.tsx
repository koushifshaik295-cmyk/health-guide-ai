import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
    BackHandler,
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

export default function ExploreScreen() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      (router.canGoBack() ? router.back() : router.replace('/'));
    } else {
      BackHandler.exitApp();;
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080C0D" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.8}>
            <Feather name="arrow-left" size={22} color="#00E676" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Explore</Text>
            <Text style={styles.headerSubtitle}>Trails, Challenges & Insights</Text>
          </View>
        </View>

        {/* Featured Route Banner */}
        <View style={styles.featuredCard}>
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>RECOMMENDED ROUTE</Text>
          </View>
          <Text style={styles.featuredTitle}>Morning Cardio Circuit</Text>
          <Text style={styles.featuredSub}>
            5.2 km scenic route • Estimated 6,800 steps • 320 kcal burn
          </Text>
          <TouchableOpacity style={styles.startBtn} activeOpacity={0.85}>
            <Ionicons name="navigate" size={16} color="#080C0D" />
            <Text style={styles.startBtnText}>Start Walking Route</Text>
          </TouchableOpacity>
        </View>

        {/* Categories Grid */}
        <Text style={styles.sectionTitle}>Daily Community Challenges</Text>
        <View style={styles.cardList}>
          <View style={styles.challengeCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#142C22' }]}>
              <MaterialCommunityIcons name="run-fast" size={24} color="#00E676" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.challengeTitle}>10k Step Streak</Text>
              <Text style={styles.challengeSub}>Complete 10,000 steps today to earn a badge</Text>
            </View>
            <Text style={styles.challengeBadge}>Active</Text>
          </View>

          <View style={styles.challengeCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#102B33' }]}>
              <Ionicons name="water" size={24} color="#00E5FF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.challengeTitle}>Hydration Master</Text>
              <Text style={styles.challengeSub}>Drink 8 cups of water before 8:00 PM</Text>
            </View>
            <Text style={[styles.challengeBadge, { color: '#00E5FF', borderColor: '#00E5FF40' }]}>
              In Progress
            </Text>
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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 12 : 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#11171A',
    borderWidth: 1.5,
    borderColor: '#00E676',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ECEFF1',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#78909C',
    marginTop: 2,
  },
  featuredCard: {
    backgroundColor: '#0E1719',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#18272C',
    padding: 18,
    marginBottom: 24,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#00E67615',
    borderWidth: 1,
    borderColor: '#00E67640',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E676',
    letterSpacing: 0.5,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  featuredSub: {
    fontSize: 12,
    color: '#78909C',
    lineHeight: 16,
    marginBottom: 16,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00E676',
    borderRadius: 14,
    paddingVertical: 12,
  },
  startBtnText: {
    color: '#080C0D',
    fontWeight: '800',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ECEFF1',
    marginBottom: 14,
  },
  cardList: {
    gap: 12,
  },
  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1719',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#18272C',
    padding: 14,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ECEFF1',
    marginBottom: 2,
  },
  challengeSub: {
    fontSize: 11,
    color: '#78909C',
  },
  challengeBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00E676',
    borderWidth: 1,
    borderColor: '#00E67640',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});