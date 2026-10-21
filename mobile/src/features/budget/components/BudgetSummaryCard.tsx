import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tokens } from '../../../theme/tokens';

export interface BudgetSummaryCardProps {
  totalSpent: number;
  budgetTotal?: number | null;
  currency?: string;
}

export function BudgetSummaryCard({
  totalSpent,
  budgetTotal = 25000000,
  currency = '₫',
}: BudgetSummaryCardProps) {
  const targetBudget = budgetTotal && budgetTotal > 0 ? budgetTotal : 25000000;
  const remainingBudget = Math.max(0, targetBudget - totalSpent);
  const percentage = Math.min(Math.round((totalSpent / targetBudget) * 100), 100);
  const isOverBudget = totalSpent > targetBudget;
  const isNearLimit = percentage >= 80 && !isOverBudget;

  const formatVndNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  return (
    <View style={styles.outerContainer}>
      <LinearGradient
        colors={[
          'rgba(9, 132, 227, 0.38)',
          'rgba(0, 206, 201, 0.18)',
          'rgba(11, 19, 41, 0.92)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Subtle glossy top highlight sheen */}
        <View style={styles.topSheen} />

        {/* Header Row: NGÂN QUỸ KHẢ DỤNG + BADGE */}
        <View style={styles.headerRow}>
          <Text style={styles.headerLabel}>NGÂN QUỸ KHẢ DỤNG</Text>
          <View
            style={[
              styles.statusBadge,
              isOverBudget && styles.statusBadgeDanger,
              isNearLimit && styles.statusBadgeWarning,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                isOverBudget && styles.statusDotDanger,
                isNearLimit && styles.statusDotWarning,
              ]}
            />
            <Text
              style={[
                styles.statusText,
                isOverBudget && styles.statusTextDanger,
                isNearLimit && styles.statusTextWarning,
              ]}
            >
              {isOverBudget
                ? 'VƯỢT HẠN MỨC'
                : isNearLimit
                ? 'TIỆM CẬN TRẦN'
                : 'MỨC CHI AN TOÀN'}
            </Text>
          </View>
        </View>

        {/* Hero Amount: 14.250.000 ₫ */}
        <View style={styles.amountContainer}>
          <Text style={styles.heroAmount}>
            {formatVndNumber(remainingBudget)}{' '}
            <Text style={styles.currencySymbol}>{currency}</Text>
          </Text>
        </View>

        {/* Percentage Label */}
        <View style={styles.percentageRow}>
          <Text style={styles.percentageText}>{percentage}% ĐÃ CHI</Text>
        </View>

        {/* Luminous Sky Blue Progress Rail (4px high) */}
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={
              isOverBudget
                ? ['#F87171', '#EF4444']
                : ['#0984e3', '#00cec9']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${percentage}%` }]}
          />
        </View>

        {/* Bottom Metrics: Tổng dự toán & Đã chi */}
        <View style={styles.footerRow}>
          <View style={styles.metricColumn}>
            <Text style={styles.metricLabel}>Tổng dự toán</Text>
            <Text style={styles.metricValue}>
              {formatVndNumber(targetBudget)} {currency}
            </Text>
          </View>

          <View style={styles.dividerVertical} />

          <View style={styles.metricColumn}>
            <Text style={styles.metricLabel}>Đã chi</Text>
            <Text style={styles.metricValue}>
              {formatVndNumber(totalSpent)} {currency}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 24,
    shadowColor: '#00cec9',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 206, 201, 0.45)',
    overflow: 'hidden',
    position: 'relative',
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#81ecec',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 206, 201, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 206, 201, 0.4)',
  },
  statusBadgeDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  statusBadgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00cec9',
    marginRight: 6,
  },
  statusDotDanger: {
    backgroundColor: '#EF4444',
  },
  statusDotWarning: {
    backgroundColor: '#F59E0B',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#81ecec',
    letterSpacing: 0.3,
  },
  statusTextDanger: {
    color: '#F87171',
  },
  statusTextWarning: {
    color: '#FCD34D',
  },
  amountContainer: {
    marginVertical: 4,
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '500',
    color: '#81ecec',
  },
  percentageRow: {
    marginTop: 8,
    marginBottom: 6,
  },
  percentageText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    overflow: 'hidden',
    marginBottom: 18,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(186, 230, 253, 0.15)',
  },
  metricColumn: {
    flex: 1,
  },
  dividerVertical: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(186, 230, 253, 0.15)',
    marginHorizontal: 16,
  },
  metricLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 3,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
});
