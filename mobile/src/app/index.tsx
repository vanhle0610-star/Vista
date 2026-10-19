import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Path,
  Rect,
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  G,
} from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WelcomeRoute() {
  return (
    <View style={styles.outerWrapper}>
      <SafeAreaView style={styles.phoneContainer} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* 1. TOP BRAND HEADER */}
          <View style={styles.topHeader}>
            <View style={styles.brandRow}>
              {/* VISTA Modern Gradient Logo in Sky Blue */}
              <Svg width={36} height={26} viewBox="0 0 44 32" fill="none">
                <Path
                  d="M 6,24 C 12,6 20,6 26,18 C 30,26 36,26 40,16"
                  stroke="#0284c7"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <Path
                  d="M 2,16 C 8,28 16,28 22,14"
                  stroke="#38bdf8"
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity="0.9"
                />
                <Circle cx={26} cy={8} r={3} fill="#f59e0b" />
              </Svg>
              <View>
                <Text style={styles.brandTitle}>VISTA</Text>
                <Text style={styles.brandTagline}>VIETNAM SMART TRAVEL</Text>
              </View>
            </View>

            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>🇻🇳 VN 2026</Text>
            </View>
          </View>

          {/* 2. HERO ILLUSTRATION CARD (Ha Long Bay & Sky Blue Sunrise) */}
          <View style={styles.heroArtCard}>
            <Svg width="100%" height={220} viewBox="0 0 380 220" preserveAspectRatio="xMidYMid slice">
              <Defs>
                <LinearGradient id="heroSky" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#0284c7" />
                  <Stop offset="0.45" stopColor="#38bdf8" />
                  <Stop offset="0.8" stopColor="#bae6fd" />
                  <Stop offset="1" stopColor="#e0f2fe" />
                </LinearGradient>
                <RadialGradient id="sunGlow" cx="0.5" cy="0.4" r="0.5">
                  <Stop offset="0" stopColor="#fef08a" stopOpacity="0.9" />
                  <Stop offset="0.6" stopColor="#f59e0b" stopOpacity="0.5" />
                  <Stop offset="1" stopColor="#ea580c" stopOpacity="0" />
                </RadialGradient>
              </Defs>

              {/* Sky background */}
              <Rect x="0" y="0" width="380" height="220" rx="24" fill="url(#heroSky)" />

              {/* Glowing Sun */}
              <Circle cx="190" cy="95" r="46" fill="url(#sunGlow)" />
              <Circle cx="190" cy="95" r="22" fill="#fffbeb" />

              {/* Floating stylized clouds */}
              <Path
                d="M 30,50 Q 55,40 80,50 Q 95,45 105,55 Q 115,65 95,70 L 40,70 Z"
                fill="#ffffff"
                opacity="0.4"
              />
              <Path
                d="M 270,60 Q 295,48 320,60 Q 335,55 345,65 Q 355,75 335,80 L 280,80 Z"
                fill="#ffffff"
                opacity="0.35"
              />

              {/* Distant mountain silhouettes (Deep Azure) */}
              <Path
                d="M 10,165 Q 70,80 130,165 L 140,220 L 0,220 Z"
                fill="#075985"
                opacity="0.65"
              />
              <Path
                d="M 240,165 Q 300,90 370,175 L 380,220 L 220,220 Z"
                fill="#0369a1"
                opacity="0.7"
              />

              {/* Foreground islands & traditional boat */}
              <Path
                d="M 80,180 Q 150,115 220,180 L 230,220 L 70,220 Z"
                fill="#0c4a6e"
              />

              {/* Sailboat */}
              <G transform="translate(195, 142)">
                <Path d="M 0,25 L 34,25 L 28,33 L 6,33 Z" fill="#78350f" />
                <Path d="M 14,25 L 14,4 L 2,21 Z" fill="#f59e0b" opacity="0.95" />
                <Path d="M 17,25 L 17,0 L 32,23 Z" fill="#d97706" opacity="0.95" />
              </G>

              {/* Turquoise water waves */}
              <Path
                d="M 0,185 C 60,178 120,192 180,185 C 240,178 300,192 380,185 L 380,220 L 0,220 Z"
                fill="#0284c7"
                opacity="0.8"
              />
            </Svg>

            {/* Floating pill chips */}
            <View style={styles.floatingBadgeLeft}>
              <Text style={styles.floatingBadgeText}>✨ Gợi ý lịch trình AI</Text>
            </View>

            <View style={styles.floatingBadgeRight}>
              <Text style={styles.floatingBadgeTextRight}>🛡️ An toàn nhóm 100%</Text>
            </View>
          </View>

          {/* 3. HERO TYPOGRAPHY */}
          <View style={styles.heroTextSection}>
            <View style={styles.eyebrowContainer}>
              <Text style={styles.eyebrowBadge}>ĐỒNG HÀNH KHÁM PHÁ VIỆT NAM</Text>
            </View>
            <Text style={styles.mainTitle}>
              Đi xa,{' '}
              <Text style={styles.highlightText}>vẫn gần nhau.</Text>
            </Text>
            <Text style={styles.subtitle}>
              Cùng bạn bè khám phá 63 tỉnh thành, lên kế hoạch thông minh, chia sẻ chi phí minh bạch và giữ an toàn trên từng chặng đường.
            </Text>
          </View>

          {/* 4. FEATURE HIGHLIGHT TILES */}
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIconBox, { backgroundColor: '#e0f2fe' }]}>
                <Text style={styles.featureEmoji}>🏞️</Text>
              </View>
              <View style={styles.featureTextBox}>
                <Text style={styles.featureTitle}>Điểm đến bản địa chuẩn xác</Text>
                <Text style={styles.featureDesc}>Bộ lọc thông minh theo vùng miền, ẩm thực & chi phí thực tế.</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIconBox, { backgroundColor: '#f0f9ff' }]}>
                <Text style={styles.featureEmoji}>🤝</Text>
              </View>
              <View style={styles.featureTextBox}>
                <Text style={styles.featureTitle}>Lập lịch trình nhóm & Biểu quyết</Text>
                <Text style={styles.featureDesc}>Mời bạn bè, biểu quyết điểm dừng và tự động chia đều hóa đơn.</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIconBox, { backgroundColor: '#fef3c7' }]}>
                <Text style={styles.featureEmoji}>📍</Text>
              </View>
              <View style={styles.featureTextBox}>
                <Text style={styles.featureTitle}>Gắn kết an toàn theo cơ chế Opt-in</Text>
                <Text style={styles.featureDesc}>Chia sẻ vị trí chỉ khi đồng thuận, hỗ trợ điểm hẹn & nút khẩn cấp SOS.</Text>
              </View>
            </View>
          </View>

          {/* 5. CALL TO ACTION BUTTONS (Sky Blue Theme) */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/(auth)/register')}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryBtnText}>Bắt đầu hành trình mới</Text>
              <Text style={styles.primaryBtnArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>Tôi đã có tài khoản (Đăng nhập)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.guestLinkBtn}
              onPress={() => router.push('/(tabs)/discover')}
              activeOpacity={0.7}
            >
              <Text style={styles.guestLinkText}>Khám phá ngay với tư cách Khách vãng lai ✈️</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    backgroundColor: '#0369a1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#ffffff',
    ...(Platform.OS === 'web'
      ? {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.35,
          shadowRadius: 36,
        }
      : {}),
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 32,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 1.2,
  },
  brandTagline: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0284c7',
    letterSpacing: 1.5,
  },
  badgePill: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
  },
  heroArtCard: {
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#0284c7',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  floatingBadgeLeft: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  floatingBadgeRight: {
    position: 'absolute',
    bottom: 16,
    right: 14,
    backgroundColor: 'rgba(2, 132, 199, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#7dd3fc',
  },
  floatingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
  },
  floatingBadgeTextRight: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroTextSection: {
    marginBottom: 20,
  },
  eyebrowContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  eyebrowBadge: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  mainTitle: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 10,
  },
  highlightText: {
    color: '#0284c7',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748b',
  },
  featuresList: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureEmoji: {
    fontSize: 22,
  },
  featureTextBox: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: '#64748b',
  },
  actionsSection: {
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginRight: 8,
  },
  primaryBtnArrow: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  secondaryBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 25,
  },
  secondaryBtnText: {
    color: '#0284c7',
    fontSize: 15,
    fontWeight: '800',
  },
  guestLinkBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  guestLinkText: {
    color: '#0284c7',
    fontSize: 13,
    fontWeight: '700',
  },
});
