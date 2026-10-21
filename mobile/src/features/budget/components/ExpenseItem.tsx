import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { tokens } from '../../../theme/tokens';

export type ExpenseCategoryKey = 'FOOD' | 'TRANSPORT' | 'ACCOMMODATION' | 'ACTIVITIES' | 'OTHER';

export interface ExpenseItemProps {
  id?: string;
  title: string;
  amount: number;
  currency?: string;
  paidByName: string;
  participantCount?: number;
  category?: ExpenseCategoryKey | string | null;
  occurredAt?: string;
  imageUrl?: string;
  myShareAmount?: number;
  onPress?: () => void;
  isLast?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  FOOD: 'ẨM THỰC',
  DINING: 'ẨM THỰC',
  TRANSPORT: 'DI CHUYỂN',
  TRANSIT: 'DI CHUYỂN',
  ACCOMMODATION: 'LƯU TRÚ',
  LODGING: 'LƯU TRÚ',
  ACTIVITIES: 'VÉ THAM QUAN',
  EXPERIENCE: 'VÉ THAM QUAN',
  OTHER: 'KHÁC',
};

const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  FOOD: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&q=80',
  TRANSPORT: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=300&q=80',
  ACCOMMODATION: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300&q=80',
  ACTIVITIES: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&q=80',
  OTHER: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=300&q=80',
};

export function ExpenseItem({
  title,
  amount,
  currency = '₫',
  paidByName,
  participantCount = 4,
  category = 'OTHER',
  imageUrl,
  myShareAmount,
  onPress,
  isLast = false,
}: ExpenseItemProps) {
  const normCategory = (category ?? 'OTHER').toUpperCase();
  const catLabel = CATEGORY_LABELS[normCategory] ?? 'KHÁC';
  const displayImage =
    imageUrl || DEFAULT_CATEGORY_IMAGES[normCategory] || DEFAULT_CATEGORY_IMAGES.OTHER;

  const calculatedMyShare =
    myShareAmount !== undefined
      ? myShareAmount
      : Math.round(amount / (participantCount > 0 ? participantCount : 1));

  const formatVndNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={styles.container}
    >
      {/* Left Timeline Indicator */}
      <View style={styles.timelineColumn}>
        <View style={styles.timelineDotOuter}>
          <View style={styles.timelineDotInner} />
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      {/* Main Row Content */}
      <View style={styles.contentCard}>
        {/* Venue / Expense Thumbnail */}
        <Image source={{ uri: displayImage }} style={styles.thumbnail} />

        {/* Middle Info */}
        <View style={styles.infoColumn}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{catLabel}</Text>
            </View>
          </View>

          <Text style={styles.subtitle} numberOfLines={1}>
            {paidByName} đã trả • Chia đều {participantCount} người
          </Text>
        </View>

        {/* Right Amount & Share */}
        <View style={styles.amountColumn}>
          <Text style={styles.totalAmount}>
            {formatVndNumber(amount)} {currency}
          </Text>
          <Text style={styles.myShare}>
            Phần bạn: {formatVndNumber(calculatedMyShare)} {currency}
          </Text>
        </View>

        {/* Chevron */}
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  timelineColumn: {
    width: 24,
    alignItems: 'center',
    paddingTop: 12,
  },
  timelineDotOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#00cec9',
    backgroundColor: 'rgba(0, 206, 201, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00cec9',
  },
  timelineLine: {
    flex: 1,
    width: 1.5,
    backgroundColor: 'rgba(9, 132, 227, 0.25)',
    marginTop: 4,
    marginBottom: -8,
  },
  contentCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginRight: 10,
  },
  infoColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    flexShrink: 1,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(9, 132, 227, 0.2)',
    borderWidth: 0.8,
    borderColor: 'rgba(0, 206, 201, 0.4)',
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#81ecec',
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  amountColumn: {
    alignItems: 'flex-end',
    marginLeft: 8,
    marginRight: 6,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  myShare: {
    fontSize: 11,
    color: '#94A3B8',
  },
  chevron: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 2,
  },
});
