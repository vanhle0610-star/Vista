import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { tokens } from '../../../theme/tokens';
import { tripApi, InvitationPreviewDto } from '../../../services/api/tripApi';

interface InviteCodeModalProps {
  visible: boolean;
  onClose: () => void;
  onJoined: () => void;
}

export function InviteCodeModal({ visible, onClose, onJoined }: InviteCodeModalProps) {
  const [token, setToken] = useState('');
  const [preview, setPreview] = useState<InvitationPreviewDto | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCheckCode = async () => {
    const cleanToken = token.trim();
    if (!cleanToken) {
      Alert.alert('Chưa nhập mã', 'Vui lòng nhập mã lời mời hoặc mã token 6 ký tự.');
      return;
    }

    setIsChecking(true);
    setPreview(null);
    try {
      const res = await tripApi.previewInvitation(cleanToken);
      setPreview(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Mã lời mời không hợp lệ hoặc đã hết hạn.';
      Alert.alert('Không tìm thấy', msg);
    } finally {
      setIsChecking(false);
    }
  };

  const handleAcceptInvite = async () => {
    const cleanToken = token.trim();
    if (!cleanToken) return;

    setIsJoining(true);
    try {
      await tripApi.acceptInvitation(cleanToken);
      Alert.alert('Thành công', 'Bạn đã tham gia chuyến đi thành công!');
      onJoined();
      onClose();
      setToken('');
      setPreview(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tham gia chuyến đi.';
      Alert.alert('Lỗi', msg);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Nhập mã lời mời</Text>
              <Text style={styles.subtitle}>Nhập mã 6 ký tự để đồng bộ và tham gia chuyến đi</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Token Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nhập mã token (VD: ABC123)"
              placeholderTextColor={tokens.colors.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              value={token}
              onChangeText={setToken}
            />
            <TouchableOpacity
              style={styles.checkBtn}
              onPress={handleCheckCode}
              disabled={isChecking || !token.trim()}
              activeOpacity={0.8}
            >
              {isChecking ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.checkBtnText}>Kiểm tra</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Trip Preview Card */}
          {preview && (
            <View style={styles.previewCard}>
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>Chuyến đi tìm thấy</Text>
              </View>
              <Text style={styles.previewTitle}>{preview.tripTitle}</Text>
              {preview.destinationSummary ? (
                <Text style={styles.previewDest}>📍 {preview.destinationSummary}</Text>
              ) : null}
              {preview.inviterName ? (
                <Text style={styles.previewInviter}>Người mời: {preview.inviterName}</Text>
              ) : null}

              <TouchableOpacity
                style={styles.joinBtn}
                onPress={handleAcceptInvite}
                disabled={isJoining}
                activeOpacity={0.85}
              >
                {isJoining ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.joinBtnText}>Tham gia ngay</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Footer note */}
          <View style={styles.footerNote}>
            <Text style={styles.footerNoteText}>
              💡 Mã lời mời do chủ phòng hoặc thành viên chia sẻ qua link hoặc mã tin nhắn.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
    color: '#0f172a',
  },
  checkBtn: {
    height: 48,
    paddingHorizontal: 18,
    backgroundColor: '#005ea5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  previewCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
  },
  previewBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  previewBadgeText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  previewDest: {
    fontSize: 13,
    color: '#15803d',
    marginBottom: 2,
  },
  previewInviter: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 12,
  },
  joinBtn: {
    height: 44,
    backgroundColor: '#16a34a',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  joinBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  footerNote: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  footerNoteText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
});
