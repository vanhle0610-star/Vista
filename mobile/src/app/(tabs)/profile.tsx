import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppText } from '../../components/ui/AppText';
import { AppCard } from '../../components/ui/AppCard';
import { tokens } from '../../theme/tokens';

export default function ProfileRoute() {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <AppText style={styles.title}>Hồ sơ cá nhân</AppText>
        <AppText style={styles.subtitle}>
          Quản lý thông tin tài khoản và tùy chọn bảo mật.
        </AppText>
      </View>

      <AppCard>
        <View style={styles.guestCard}>
          <View style={styles.avatarCircle}>
            <AppText style={styles.avatarEmoji}>👤</AppText>
          </View>
          <View style={styles.guestInfo}>
            <AppText style={styles.guestTitle}>Chế độ Khách vãng lai</AppText>
            <AppText style={styles.guestDesc}>
              Đăng nhập tài khoản VISTA để đồng bộ lịch trình, tham gia chuyến đi nhóm và lưu địa điểm yêu thích.
            </AppText>
          </View>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.85}
          >
            <AppText style={styles.loginBtnText}>Đăng nhập / Đăng ký</AppText>
          </TouchableOpacity>
        </View>
      </AppCard>

      <View style={styles.versionSection}>
        <AppText style={styles.versionText}>VISTA Mobile • Nền tảng Tuần 2</AppText>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    marginBottom: tokens.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: tokens.colors.ink,
  },
  subtitle: {
    fontSize: 13.5,
    color: tokens.colors.muted,
  },
  guestCard: {
    padding: tokens.spacing.sm,
    gap: 16,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  guestInfo: {
    alignItems: 'center',
    gap: 6,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.ink,
  },
  guestDesc: {
    fontSize: 13,
    color: tokens.colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  loginBtn: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  loginBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  versionSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
