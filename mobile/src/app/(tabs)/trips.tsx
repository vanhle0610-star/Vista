import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppText } from '../../components/ui/AppText';
import { AppCard } from '../../components/ui/AppCard';
import { tokens } from '../../theme/tokens';

export default function TripsRoute() {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <AppText style={styles.title}>Chuyến đi của bạn</AppText>
        <AppText style={styles.subtitle}>
          Quản lý lịch trình, điểm dừng và cộng tác cùng các thành viên.
        </AppText>
      </View>

      <AppCard>
        <View style={styles.cardContent}>
          <AppText style={styles.cardIcon}>🎒</AppText>
          <AppText style={styles.cardTitle}>Chưa có chuyến đi nào</AppText>
          <AppText style={styles.cardDesc}>
            Hãy bắt đầu bằng việc khám phá các điểm đến thú vị hoặc tạo một chuyến đi mới cùng bạn bè.
          </AppText>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(tabs)/discover')}
            activeOpacity={0.85}
          >
            <AppText style={styles.actionBtnText}>Khám phá điểm đến ngay</AppText>
          </TouchableOpacity>
        </View>
      </AppCard>
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
  cardContent: {
    padding: tokens.spacing.sm,
    gap: 12,
    alignItems: 'center',
    textAlign: 'center',
  },
  cardIcon: {
    fontSize: 40,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.ink,
  },
  cardDesc: {
    fontSize: 13,
    color: tokens.colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionBtn: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
