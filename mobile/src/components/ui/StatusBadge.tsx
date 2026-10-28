import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { tokens } from '@/theme/tokens';

export type TripStatusType = 'ACTIVE' | 'PLANNING' | 'COMPLETED' | 'CANCELLED';

export interface StatusBadgeProps {
  status: TripStatusType | string;
  label?: string;
  size?: 'small' | 'medium';
}

export function StatusBadge({ status, label, size = 'medium' }: StatusBadgeProps) {
  let bg: string = tokens.colors.primarySoft;
  let textCol: string = tokens.colors.primary;
  let defaultLabel = 'Đang lên kế hoạch';

  switch (status) {
    case 'ACTIVE':
      bg = tokens.colors.successSoft;
      textCol = tokens.colors.success;
      defaultLabel = 'Đang diễn ra';
      break;
    case 'PLANNING':
      bg = tokens.colors.warningSoft;
      textCol = tokens.colors.warning;
      defaultLabel = 'Đang lên kế hoạch';
      break;
    case 'COMPLETED':
      bg = tokens.colors.primarySoft;
      textCol = tokens.colors.primary;
      defaultLabel = 'Đã hoàn thành';
      break;
    case 'CANCELLED':
      bg = tokens.colors.dangerSoft;
      textCol = tokens.colors.danger;
      defaultLabel = 'Đã hủy';
      break;
  }

  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg },
        isSmall && styles.badgeSmall,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: textCol },
          isSmall && styles.textSmall,
        ]}
      >
        {label || defaultLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textSmall: {
    fontSize: 10,
    fontWeight: '600',
  },
});
