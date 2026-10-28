import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Clipboard,
  Platform,
} from 'react-native';
import { tokens } from '../../../theme/tokens';

export interface VietQRModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmPaid?: () => void;
  receiverName?: string;
  accountNumber?: string;
  bankName?: string;
  bankCode?: string;
  amount: number;
  memo?: string;
}

function formatVnd(val: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
}

export function VietQRModal({
  visible,
  onClose,
  onConfirmPaid,
  receiverName = 'TRẦN VÂN ÁNH',
  accountNumber = '0984838888',
  bankName = 'MB Bank (Quân Đội)',
  bankCode = 'MB',
  amount,
  memo = 'VISTA Quyet toan chi phi',
}: VietQRModalProps) {
  const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${Math.round(
    amount
  )}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(receiverName)}`;

  const copyToClipboard = (label: string, text: string) => {
    Clipboard.setString(text);
    Alert.alert('Đã sao chép', `Đã sao chép ${label}: ${text}`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.cardContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Thanh toán VietQR</Text>
              <Text style={styles.subtitle}>Quét mã chuyển khoản tức thì qua Napas 247</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* QR Code Container */}
          <View style={styles.qrWrapper}>
            <View style={styles.qrInner}>
              <Image
                source={{ uri: qrUrl }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.qrScanHint}>
              Mở bất kỳ app ngân hàng hoặc ví điện tử để quét mã Napas247
            </Text>
          </View>

          {/* Bank Info Table */}
          <View style={styles.infoTable}>
            {/* Bank name */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngân hàng</Text>
              <Text style={styles.infoValue}>{bankName}</Text>
            </View>

            {/* Beneficiary Name */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Chủ tài khoản</Text>
              <Text style={[styles.infoValue, styles.infoValueBold]}>{receiverName}</Text>
            </View>

            {/* Account number with Copy */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số tài khoản</Text>
              <View style={styles.copyRow}>
                <Text style={[styles.infoValue, styles.infoValueBold]}>{accountNumber}</Text>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => copyToClipboard('Số tài khoản', accountNumber)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.copyBtnText}>Sao chép</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Amount with Copy */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số tiền</Text>
              <View style={styles.copyRow}>
                <Text style={styles.amountValue}>{formatVnd(amount)}</Text>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => copyToClipboard('Số tiền', String(Math.round(amount)))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.copyBtnText}>Sao chép</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Memo with Copy */}
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Nội dung</Text>
              <View style={styles.copyRow}>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {memo}
                </Text>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => copyToClipboard('Nội dung chuyển khoản', memo)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.copyBtnText}>Sao chép</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => {
                Alert.alert('Thành công', 'Đã ghi nhận bạn chuyển khoản thành công!');
                onConfirmPaid?.();
                onClose();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnText}>✓ Đã chuyển khoản xong</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  qrWrapper: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  qrInner: {
    width: 190,
    height: 190,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrScanHint: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  infoTable: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 13,
    color: '#0f172a',
  },
  infoValueBold: {
    fontWeight: '700',
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '700',
    color: tokens.colors.primary,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyBtn: {
    backgroundColor: tokens.colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: tokens.colors.primary,
  },
  actions: {
    gap: 8,
  },
  confirmBtn: {
    height: 46,
    backgroundColor: tokens.colors.primary,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: tokens.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
});
