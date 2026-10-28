import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Clipboard,
} from 'react-native';

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

function maskAcc(acc?: string): string {
  if (!acc) return '';
  if (acc.length <= 4) return '****' + acc;
  return '******' + acc.slice(-4);
}

export function VietQRModal({
  visible,
  onClose,
  onConfirmPaid,
  receiverName,
  accountNumber,
  bankName,
  bankCode,
  amount,
  memo = 'VISTA Quyet toan chi phi',
}: VietQRModalProps) {
  const [imageError, setImageError] = useState(false);

  const hasValidAccount = Boolean(accountNumber && accountNumber.trim().length >= 4);

  const finalBankCode = bankCode || bankName || 'MB';
  const qrUrl = hasValidAccount
    ? `https://img.vietqr.io/image/${finalBankCode}-${accountNumber}-compact2.png?amount=${Math.round(
        amount
      )}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(receiverName || '')}`
    : '';

  const copyToClipboard = (label: string, text: string) => {
    Clipboard.setString(text);
    Alert.alert('Đã sao chép', `Đã sao chép ${label}: ${text}`);
  };

  const handleConfirmPaid = () => {
    if (onConfirmPaid) {
      onConfirmPaid();
    }
    onClose();
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

          {!hasValidAccount ? (
            /* Warning when receiver hasn't configured payout account */
            <View style={styles.unverifiedBox}>
              <Text style={styles.unverifiedIcon}>⚠️</Text>
              <Text style={styles.unverifiedTitle}>Người nhận chưa thiết lập tài khoản nhận tiền</Text>
              <Text style={styles.unverifiedDesc}>
                Thành viên này chưa liên kết tài khoản ngân hàng đã xác minh trong hệ thống VISTA.
                Vui lòng thông báo cho thành viên cập nhật thông tin tài khoản trước khi tạo mã QR chuyển khoản.
              </Text>
              <TouchableOpacity style={styles.closeSecondaryBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.closeSecondaryBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Security confirmation banner */}
              <View style={styles.securityBanner}>
                <Text style={styles.securityText}>
                  🛡️ Vui lòng kiểm tra lại tên chủ tài khoản và số tiền trên app ngân hàng trước khi xác nhận.
                </Text>
              </View>

              {/* QR Code Container */}
              <View style={styles.qrWrapper}>
                <View style={styles.qrInner}>
                  {!imageError ? (
                    <Image
                      source={{ uri: qrUrl }}
                      style={styles.qrImage}
                      resizeMode="contain"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <View style={styles.qrFallbackBox}>
                      <Text style={styles.qrFallbackText}>
                        Không thể tải mã QR trực quan.{'\n'}Vui lòng chuyển khoản thủ công bằng thông tin bên dưới.
                      </Text>
                    </View>
                  )}
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
                  <Text style={styles.infoValue}>{bankName || bankCode || 'Chưa thiết lập'}</Text>
                </View>

                {/* Beneficiary Name */}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Chủ tài khoản</Text>
                  <Text style={[styles.infoValue, styles.infoValueBold]}>{receiverName || 'Chưa thiết lập'}</Text>
                </View>

                {/* Account number with Copy */}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Số tài khoản</Text>
                  <View style={styles.copyRow}>
                    <Text style={[styles.infoValue, styles.infoValueBold]}>{accountNumber}</Text>
                    <TouchableOpacity
                      style={styles.copyBtn}
                      onPress={() => copyToClipboard('Số tài khoản', accountNumber || '')}
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
                  style={styles.confirmPaidBtn}
                  onPress={handleConfirmPaid}
                  activeOpacity={0.85}
                >
                  <Text style={styles.confirmPaidText}>✓ Đã chuyển khoản xong</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  securityBanner: {
    backgroundColor: '#fef3c7',
    borderColor: '#fcd34d',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  securityText: {
    fontSize: 11,
    color: '#92400e',
    lineHeight: 16,
  },
  qrWrapper: {
    alignItems: 'center',
    marginBottom: 14,
  },
  qrInner: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  qrImage: {
    width: 170,
    height: 170,
  },
  qrFallbackBox: {
    width: 170,
    height: 170,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
  },
  qrFallbackText: {
    fontSize: 11,
    color: '#ef4444',
    textAlign: 'center',
    lineHeight: 16,
  },
  qrScanHint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  infoTable: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  infoValue: {
    fontSize: 12,
    color: '#1e293b',
    textAlign: 'right',
  },
  infoValueBold: {
    fontWeight: '700',
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16a34a',
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copyBtn: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  copyBtnText: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '600',
  },
  actions: {
    gap: 8,
  },
  confirmPaidBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmPaidText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  unverifiedBox: {
    padding: 20,
    alignItems: 'center',
  },
  unverifiedIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  unverifiedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#b45309',
    textAlign: 'center',
    marginBottom: 8,
  },
  unverifiedDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  closeSecondaryBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  closeSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
});
