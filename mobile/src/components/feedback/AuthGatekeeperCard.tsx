import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { tokens } from '../../theme/tokens';
import {
  LuggageIcon,
  WalletIcon,
  LockIcon,
  MapIcon,
  SparkleIcon,
} from '../icons/StitchIcons';

export interface AuthGatekeeperCardProps {
  title?: string;
  description?: string;
  iconType?: 'trips' | 'treasury' | 'general' | 'ai';
  onLoginSuccessRedirect?: string;
  onExplorePress?: () => void;
}

export function AuthGatekeeperCard({
  title = 'Lên kế hoạch cho hành trình của bạn',
  description = 'Đăng nhập hoặc đăng ký tài khoản VISTA để bắt đầu tạo chuyến đi, mời bạn bè cùng tham gia và theo dõi chi tiêu nhóm.',
  iconType = 'trips',
  onLoginSuccessRedirect,
  onExplorePress,
}: AuthGatekeeperCardProps) {
  const renderIcon = () => {
    switch (iconType) {
      case 'treasury':
        return <WalletIcon size={40} color={tokens.colors.primary} />;
      case 'ai':
        return <SparkleIcon size={40} color={tokens.colors.aiCoPilot} />;
      case 'general':
        return <LockIcon size={40} color={tokens.colors.primary} />;
      case 'trips':
      default:
        return <LuggageIcon size={40} color={tokens.colors.primary} />;
    }
  };

  const handleLoginPress = () => {
    router.push('/(auth)/login');
  };

  const handleExplorePress = () => {
    if (onExplorePress) {
      onExplorePress();
    } else {
      router.replace('/(tabs)/discover');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>{renderIcon()}</View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLoginPress}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Đăng nhập / Đăng ký</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleExplorePress}
            activeOpacity={0.8}
          >
            <MapIcon size={16} color={tokens.colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.secondaryButtonText}>Khám phá điểm đến</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.badgeBanner}>
          <Text style={styles.badgeBannerText}>
            🔒 Chế độ Khách: Dữ liệu cá nhân & nhóm được bảo vệ an toàn
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    alignItems: 'center',
    ...tokens.shadows.card,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: tokens.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: tokens.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  actionGroup: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    width: '100%',
    minHeight: 46,
    backgroundColor: tokens.colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryButton: {
    width: '100%',
    minHeight: 44,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: tokens.colors.textSecondary,
  },
  badgeBanner: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  badgeBannerText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
});
