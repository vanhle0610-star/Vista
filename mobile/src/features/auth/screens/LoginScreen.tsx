import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { VietnamMobileScenery } from '../components/VietnamMobileScenery';
import { MobileAnimatedAirplane } from '../components/MobileAnimatedAirplane';
import { VistaCompassLogo } from '../components/VistaCompassLogo';

export interface LoginScreenProps {
  initialRegister?: boolean;
}

export function LoginScreen({ initialRegister = false }: LoginScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [loading, setLoading] = useState(false);

  const topInset = Math.max(insets.top, Platform.OS === 'web' ? 12 : 24);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ email và mật khẩu!');
      return;
    }

    setLoading(true);
    try {
      const apiBase = (
        process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'
      ).replace(/\/+$/, '');

      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      if (response.ok) {
        Alert.alert(
          'Thành công',
          'Đăng nhập thành công! Chào mừng bạn trở lại VISTA.',
          [{ text: 'Khám phá ngay', onPress: () => router.replace('/(tabs)/discover') }]
        );
      } else {
        const errorData = await response.json().catch(() => null);
        Alert.alert(
          'Lỗi đăng nhập',
          errorData?.detail || 'Email hoặc mật khẩu chưa chính xác.'
        );
      }
    } catch {
      Alert.alert(
        'Lỗi kết nối',
        'Không thể kết nối đến máy chủ VISTA. Vui lòng kiểm tra mạng và thử lại sau.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      Alert.alert(
        'Đăng nhập Google',
        'Tính năng Đăng nhập bằng Google trên thiết bị di động yêu cầu cấu hình OAuth Client ID trong biến môi trường EXPO_PUBLIC_GOOGLE_CLIENT_ID.'
      );
      return;
    }

    setLoading(true);
    try {
      const apiBase = (
        process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'
      ).replace(/\/+$/, '');

      Alert.alert(
        'Thông báo',
        'Vui lòng cấu hình Expo WebBrowser/AuthSession để hoàn tất phiên đăng nhập Google trên thiết bị di động.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Quên mật khẩu',
      'Vui lòng nhập email đăng ký tài khoản của bạn để nhận liên kết đặt lại mật khẩu.',
      [{ text: 'Đã hiểu' }]
    );
  };

  return (
    <View style={styles.outerScreen}>
      <View style={styles.phoneViewport}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* ================= 1. UPPER HERO SCENERY (EDGE TO EDGE) ================= */}
            <View style={[styles.heroSceneryContainer, { height: 310 + topInset }]}>
              {/* Ha Long Bay Scenery Image + Stamps + Bottom White Fade */}
              <VietnamMobileScenery height={310 + topInset} />

              {/* Airplane Contrail & Flight Animation in upper sky */}
              <View style={[styles.airplaneContainer, { top: topInset - 8 }]} pointerEvents="box-none">
                <MobileAnimatedAirplane />
              </View>

              {/* Central VISTA Compass & Brand Logo */}
              <View
                style={[styles.brandOverlay, { top: topInset + 42 }]}
                pointerEvents="box-none"
              >
                <VistaCompassLogo color="#0284c7" taglineColor="#334155" />
              </View>
            </View>

            {/* ================= 2. DELICATE WHITE CARD (SHEET) ================= */}
            <View
              style={[
                styles.whiteCardSheet,
                { paddingBottom: Math.max(insets.bottom, 20) + 16 },
              ]}
            >
              {/* Card Title & Subtitle */}
              <View style={styles.titleSection}>
                <Text style={styles.mainHeading}>Chào mừng trở lại!</Text>
                <Text style={styles.subHeading}>
                  Đăng nhập để tiếp tục hành trình khám phá Việt Nam cùng VISTA.
                </Text>
              </View>

              {/* Form Input 1: Email */}
              <View
                style={[
                  styles.inputContainer,
                  focusedField === 'email' && styles.inputFocused,
                ]}
              >
                <View style={styles.inputIconBox}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M 4 4 H 20 C 21.1 4 22 4.9 22 6 V 18 C 22 19.1 21.1 20 20 20 H 4 C 2.9 20 2 19.1 2 18 V 6 C 2 4.9 2.9 4 4 4 Z"
                      stroke={focusedField === 'email' ? '#0284c7' : '#94a3b8'}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Path
                      d="M 22 6 L 12 13 L 2 6"
                      stroke={focusedField === 'email' ? '#0284c7' : '#94a3b8'}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Email"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {/* Form Input 2: Password */}
              <View
                style={[
                  styles.inputContainer,
                  focusedField === 'password' && styles.inputFocused,
                ]}
              >
                <View style={styles.inputIconBox}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Rect
                      x="3"
                      y="11"
                      width="18"
                      height="11"
                      rx="2"
                      stroke={focusedField === 'password' ? '#0284c7' : '#94a3b8'}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Path
                      d="M 7 11 V 7 C 7 4.2 9.2 2 12 2 C 14.8 2 17 4.2 17 7 V 11"
                      stroke={focusedField === 'password' ? '#0284c7' : '#94a3b8'}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Mật khẩu"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M 1 12 C 1 12 5 4 12 4 C 19 4 23 12 23 12 C 23 12 19 20 12 20 C 5 20 1 12 1 12 Z"
                      stroke="#94a3b8"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="#94a3b8"
                      strokeWidth="1.8"
                    />
                    {showPassword && (
                      <Path
                        d="M 3 3 L 21 21"
                        stroke="#94a3b8"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    )}
                  </Svg>
                </TouchableOpacity>
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity
                style={styles.forgotPassContainer}
                onPress={handleForgotPassword}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPassText}>Quên mật khẩu?</Text>
              </TouchableOpacity>

              {/* Primary Action Button: "Đăng nhập  ✈ →" with Radiant Gradient */}
              <TouchableOpacity
                style={styles.primaryLoginBtnContainer}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={['#38bdf8', '#0284c7']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.primaryLoginBtnGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <View style={styles.btnContentRow}>
                      <Text style={styles.primaryBtnText}>Đăng nhập</Text>
                      {/* Paper Airplane Icon */}
                      <Svg
                        width={18}
                        height={18}
                        viewBox="0 0 24 24"
                        fill="none"
                        style={{ transform: [{ rotate: '4deg' }] }}
                      >
                        <Path
                          d="M 2.5 11.5 L 21.5 2.5 L 12.5 21.5 L 10 14 L 2.5 11.5 Z"
                          fill="#ffffff"
                        />
                        <Path
                          d="M 21.5 2.5 L 10 14"
                          stroke="#0284c7"
                          strokeWidth="1.2"
                        />
                      </Svg>
                      <Text style={styles.primaryBtnArrow}>→</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider: "HOẶC ĐĂNG NHẬP VỚI" */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>HOẶC ĐĂNG NHẬP VỚI</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Login: 3 Floating Circular Buttons */}
              <View style={styles.socialRow}>
                {/* 1. Google Circle */}
                <TouchableOpacity
                  style={styles.socialCircleBtn}
                  onPress={handleGoogleLogin}
                  activeOpacity={0.8}
                >
                  <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Path
                      d="M 22.56 12.25 C 22.56 11.47 22.49 10.72 22.36 10 H 12 V 14.26 H 17.92 C 17.67 15.63 16.89 16.79 15.73 17.57 V 20.34 H 19.28 C 21.36 18.42 22.56 15.6 22.56 12.25 Z"
                      fill="#4285F4"
                    />
                    <Path
                      d="M 12 23 C 14.97 23 17.46 22.02 19.28 20.34 L 15.73 17.57 C 14.75 18.23 13.48 18.63 12 18.63 C 9.14 18.63 6.71 16.7 5.84 14.1 H 2.18 V 16.94 C 4 20.53 7.7 23 12 23 Z"
                      fill="#34A853"
                    />
                    <Path
                      d="M 5.84 14.1 C 5.62 13.3 5.49 12.46 5.49 11.6 C 5.49 10.74 5.62 9.9 5.84 9.1 V 6.26 H 2.18 C 1.44 7.73 1 9.47 1 11.6 C 1 13.73 1.44 15.47 2.18 16.94 L 5.84 14.1 Z"
                      fill="#FBBC05"
                    />
                    <Path
                      d="M 12 4.58 C 13.62 4.58 15.07 5.14 16.21 6.23 L 19.36 3.08 C 17.45 1.3 14.96 0.2 12 0.2 C 7.7 0.2 4 2.67 2.18 6.26 L 5.84 9.1 C 6.71 6.5 9.14 4.58 12 4.58 Z"
                      fill="#EA4335"
                    />
                  </Svg>
                </TouchableOpacity>

                {/* 2. Apple Circle */}
                <TouchableOpacity
                  style={styles.socialCircleBtn}
                  onPress={() => Alert.alert('Apple ID', 'Đăng nhập Apple đang được tích hợp.')}
                  activeOpacity={0.8}
                >
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="#000000">
                    <Path d="M 18.71 19.5 C 17.88 20.74 17 21.95 15.66 21.97 C 14.32 22 13.89 21.18 12.37 21.18 C 10.84 21.18 10.37 21.95 9.1 22 C 7.79 22.05 6.8 20.68 5.96 19.47 C 4.25 17 2.94 12.45 4.7 9.39 C 5.57 7.87 7.13 6.91 8.82 6.88 C 10.1 6.86 11.32 7.75 12.11 7.75 C 12.89 7.75 14.37 6.68 15.92 6.84 C 16.57 6.87 18.39 7.1 19.56 8.82 C 19.47 8.88 17.39 10.1 17.41 12.63 C 17.44 15.65 20.06 16.66 20.13 16.69 C 20.1 16.79 19.7 18.18 18.71 19.5 Z M 15.97 4.52 C 16.64 3.71 17.09 2.58 16.97 1.45 C 15.99 1.49 14.81 2.11 14.11 2.93 C 13.49 3.65 12.95 4.8 13.1 5.91 C 14.19 6 15.3 5.33 15.97 4.52 Z" />
                  </Svg>
                </TouchableOpacity>

                {/* 3. Facebook Circle */}
                <TouchableOpacity
                  style={styles.socialCircleBtn}
                  onPress={() => Alert.alert('Facebook', 'Đăng nhập Facebook đang được tích hợp.')}
                  activeOpacity={0.8}
                >
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="#1877F2">
                    <Path d="M 24 12.073 C 24 5.405 18.627 0 12 0 S 0 5.405 0 12.073 C 0 18.1 4.388 23.094 10.125 24 V 15.563 H 7.078 V 12.073 H 10.125 V 9.413 C 10.125 6.387 11.916 4.717 14.658 4.717 C 15.97 4.717 17.344 4.952 17.344 4.952 V 7.933 H 15.83 C 14.34 7.933 13.875 8.864 13.875 9.822 V 12.073 H 17.203 L 16.67 15.563 H 13.875 V 24 C 19.612 23.094 24 18.1 24 12.073 Z" />
                  </Svg>
                </TouchableOpacity>
              </View>

              {/* Bottom Inline Link: "Chưa có tài khoản? Đăng ký ngay →" */}
              <View style={styles.bottomLinkRow}>
                <Text style={styles.bottomLinkText}>Chưa có tài khoản? </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/register')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bottomLinkHighlight}>Đăng ký ngay →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerScreen: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#0f172a' : '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneViewport: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          height: '100%' as any,
          maxHeight: 900,
          borderRadius: 36,
          borderWidth: 6,
          borderColor: '#1e293b',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.4,
          shadowRadius: 32,
        }
      : {}),
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroSceneryContainer: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#e0f2fe',
  },
  airplaneContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 15,
  },
  brandOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  whiteCardSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -26,
    paddingHorizontal: 24,
    paddingTop: 28,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  titleSection: {
    marginBottom: 20,
  },
  mainHeading: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subHeading: {
    fontSize: 13.5,
    lineHeight: 19,
    color: '#64748b',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  inputFocused: {
    borderColor: '#0284c7',
    backgroundColor: '#ffffff',
  },
  inputIconBox: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#0f172a',
    fontWeight: '500',
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotPassContainer: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: 2,
    paddingVertical: 2,
  },
  forgotPassText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
  },
  primaryLoginBtnContainer: {
    borderRadius: 28,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.42,
    shadowRadius: 16,
    elevation: 7,
    marginBottom: 24,
    marginTop: 4,
  },
  primaryLoginBtnGradient: {
    height: 54,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16.5,
    fontWeight: '800',
  },
  primaryBtnArrow: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingHorizontal: 12,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 26,
  },
  socialCircleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  bottomLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  bottomLinkText: {
    fontSize: 13.5,
    color: '#64748b',
    fontWeight: '500',
  },
  bottomLinkHighlight: {
    fontSize: 13.5,
    color: '#0284c7',
    fontWeight: '700',
  },
});
