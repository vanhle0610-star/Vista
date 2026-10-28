import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { tokens } from '../../../theme/tokens';

export interface SettlementMember {
  id: string;
  initials: string;
  name: string;
  balance: number;
}

export interface SettlementTransferItem {
  id: string;
  fromName: string;
  fromAvatar?: string;
  toName: string;
  toAvatar?: string;
  amount: number;
  bankAccount?: string;
}

export interface SettlementDeltaRowProps {
  myBalance?: number;
  transfers?: SettlementTransferItem[];
  members?: SettlementMember[];
  selectedMemberId?: string | null;
  onSelectMember?: (memberId: string | null) => void;
  onCopyAccount?: (item: SettlementTransferItem) => void;
  onOpenVietQr?: (item: SettlementTransferItem) => void;
}

const DEFAULT_TRANSFERS: SettlementTransferItem[] = [
  {
    id: '1',
    fromName: 'Tuấn Anh',
    fromAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    toName: 'Vân Ánh',
    toAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    amount: 450000,
  },
  {
    id: '2',
    fromName: 'Hải Nam',
    fromAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
    toName: 'Vân Ánh',
    toAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    amount: 800000,
  },
];

export function SettlementDeltaRow({
  myBalance = 1250000,
  transfers = DEFAULT_TRANSFERS,
  onCopyAccount,
  onOpenVietQr,
}: SettlementDeltaRowProps) {
  const formatVndNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(val));
  };

  const isCreditor = myBalance > 0;
  const isDebtor = myBalance < 0;

  return (
    <View style={styles.card}>
      {/* Eyebrow Label */}
      <Text style={styles.eyebrow}>VỊ THẾ TÀI CHÍNH CỦA BẠN</Text>

      {/* Main Status Callout */}
      <View style={styles.statusRow}>
        <Text style={styles.statusPrefix}>
          {isCreditor
            ? 'Bạn sẽ nhận lại'
            : isDebtor
            ? 'Bạn cần chuyển khoản'
            : 'Số dư cân bằng'}
        </Text>
        <Text
          style={[
            styles.balanceAmount,
            isCreditor && styles.balanceCreditor,
            isDebtor && styles.balanceDebtor,
          ]}
        >
          {isCreditor ? `+${formatVndNumber(myBalance)} ₫` : isDebtor ? `-${formatVndNumber(myBalance)} ₫` : '0 ₫'}{' '}
          <Text style={styles.statusSuffix}>
            {isCreditor ? 'từ nhóm' : isDebtor ? 'vào quỹ nhóm' : 'với cả nhóm'}
          </Text>
        </Text>
      </View>

      {/* Transfer Item Rows */}
      <View style={styles.transfersList}>
        {transfers.map((item) => (
          <View key={item.id} style={styles.transferRow}>
            {/* From User */}
            <View style={styles.personContainer}>
              {item.fromAvatar ? (
                <Image source={{ uri: item.fromAvatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{item.fromName.charAt(0)}</Text>
                </View>
              )}
              <Text style={styles.personName} numberOfLines={1}>
                {item.fromName}
              </Text>
            </View>

            {/* Arrow */}
            <Text style={styles.arrowIcon}>→</Text>

            {/* To User */}
            <View style={styles.personContainer}>
              {item.toAvatar ? (
                <Image source={{ uri: item.toAvatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{item.toName.charAt(0)}</Text>
                </View>
              )}
              <Text style={styles.personName} numberOfLines={1}>
                {item.toName}
              </Text>
            </View>

            {/* Amount & Actions */}
            <View style={styles.rightGroup}>
              <Text style={styles.transferAmount}>{formatVndNumber(item.amount)} ₫</Text>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.qrButton}
                  onPress={() => onOpenVietQr?.(item)}
                >
                  <Text style={styles.qrButtonText}>VIETQR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.copyButton}
                  onPress={() => onCopyAccount?.(item)}
                >
                  <Text style={styles.copyButtonText}>SAO CHÉP STK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e7ff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#005ea5',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statusRow: {
    marginBottom: 12,
  },
  statusPrefix: {
    fontSize: 13,
    color: '#404752',
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#131b2e',
  },
  balanceCreditor: {
    color: '#10B981',
  },
  balanceDebtor: {
    color: '#dc2626',
  },
  statusSuffix: {
    fontSize: 13,
    fontWeight: '400',
    color: '#707784',
  },
  transfersList: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    gap: 10,
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  personContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 90,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e2e7ff',
  },
  avatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  personName: {
    fontSize: 12,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  arrowIcon: {
    fontSize: 14,
    color: tokens.colors.primary,
    marginHorizontal: 4,
  },
  rightGroup: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transferAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  qrButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: tokens.colors.primarySoft,
    borderWidth: 1,
    borderColor: tokens.colors.primary,
  },
  qrButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: tokens.colors.primary,
    letterSpacing: 0.4,
  },
  copyButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: tokens.colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  copyButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: tokens.colors.textSecondary,
    letterSpacing: 0.4,
  },
});

