import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Clipboard,
  Platform,
  Share,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { tokens } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { tripFeatureApi } from '../api';
import { Invitation } from '../types';
import { tripApi } from '@/services/api/tripApi';

interface InviteCodeModalProps {
  visible: boolean;
  tripId?: string;
  tripTitle?: string;
  onClose: () => void;
  onJoined?: () => void;
}

export function InviteCodeModal({
  visible,
  tripId,
  tripTitle,
  onClose,
  onJoined,
}: InviteCodeModalProps) {
  // Mode 1: Ticket / Invite Creation mode (when tripId is provided)
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Mode 2: Join by token mode (when tripId is omitted)
  const [tokenInput, setTokenInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Automatically generate invitation link when modal opens with tripId
  useEffect(() => {
    if (visible && tripId) {
      generateInviteLink();
    } else {
      setInvitation(null);
      setCopied(false);
    }
  }, [visible, tripId]);

  const generateInviteLink = async () => {
    if (!tripId) return;
    setIsGenerating(true);
    try {
      const invite = await tripFeatureApi.createInvitation(tripId, {
        role: 'MEMBER',
        expireDays: 7,
      });
      setInvitation(invite);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        Alert.alert(
          'Đã có lời mời',
          'Chuyến đi này hiện đã có một lời mời đang hoạt động hoặc bạn đã là thành viên.'
        );
      } else {
        const msg = err?.response?.data?.detail || 'Không thể tạo mã mời lúc này.';
        Alert.alert('Lỗi tạo lời mời', msg);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    const link =
      invitation?.inviteLink ||
      `https://vista.travel/trips/join?code=${invitation?.token || invitation?.rawToken || tripId?.slice(0, 6).toUpperCase()}`;
    Clipboard.setString(link);
    setCopied(true);
    Alert.alert('Đã sao chép liên kết mời', link);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShare = async () => {
    const link =
      invitation?.inviteLink ||
      `https://vista.travel/trips/join?code=${invitation?.token || invitation?.rawToken || tripId?.slice(0, 6).toUpperCase()}`;
    try {
      await Share.share({
        message: `Tham gia chuyến đi "${tripTitle || 'VISTA'}" cùng tôi trên VISTA: ${link}`,
      });
    } catch {
      // ignore
    }
  };

  // For Join by token mode
  const handleJoinByToken = async () => {
    const clean = tokenInput.trim();
    if (!clean) {
      Alert.alert('Thiếu mã', 'Vui lòng nhập mã lời mời.');
      return;
    }
    setIsJoining(true);
    try {
      await tripApi.acceptInvitation(clean);
      Alert.alert('Thành công', 'Bạn đã tham gia chuyến đi thành công!');
      onJoined?.();
      onClose();
      setTokenInput('');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Mã lời mời không hợp lệ hoặc đã hết hạn.';
      Alert.alert('Lỗi', msg);
    } finally {
      setIsJoining(false);
    }
  };

  const inviteCode =
    invitation?.rawToken || invitation?.token || (tripId ? tripId.slice(0, 6).toUpperCase() : 'VISTA8');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <AppText style={styles.headerSubtitle}>VÉ MỜI ĐỒNG HÀNH</AppText>
              <AppText style={styles.headerTitle}>
                {tripId ? 'Mời bạn bè tham gia' : 'Nhập mã lời mời'}
              </AppText>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Đóng">
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M18 6L6 18M6 6l12 12"
                  stroke={tokens.colors.ink}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>

          {tripId ? (
            /* Boarding Ticket Style View */
            <View style={styles.ticketWrapper}>
              <View style={styles.boardingPass}>
                {/* Top Section */}
                <View style={styles.ticketTop}>
                  <View style={styles.ticketTopLeft}>
                    <AppText style={styles.ticketAirline}>VISTA EXPEDITIONS</AppText>
                    <AppText style={styles.ticketTripName} numberOfLines={1}>
                      {tripTitle || 'Hành trình khám phá'}
                    </AppText>
                  </View>
                  <View style={styles.ticketBadge}>
                    <AppText style={styles.ticketBadgeText}>PASS</AppText>
                  </View>
                </View>

                {/* Perforation Line */}
                <View style={styles.perforationRow}>
                  <View style={styles.leftHole} />
                  <View style={styles.dashedLine} />
                  <View style={styles.rightHole} />
                </View>

                {/* Bottom Section */}
                <View style={styles.ticketBottom}>
                  <View style={styles.codeRow}>
                    <View>
                      <AppText style={styles.codeLabel}>MÃ LỜI MỜI</AppText>
                      <AppText style={styles.codeText}>{inviteCode}</AppText>
                    </View>
                    <View style={styles.expiryCol}>
                      <AppText style={styles.codeLabel}>THỜI HẠN</AppText>
                      <AppText style={styles.expiryText}>7 Ngày</AppText>
                    </View>
                  </View>

                  <AppText style={styles.ticketNote}>
                    * Người nhận cần đăng nhập vào VISTA để đồng ý tham gia chuyến đi này.
                  </AppText>
                </View>
              </View>

              {isGenerating ? (
                <View style={styles.generatingState}>
                  <ActivityIndicator size="small" color={tokens.colors.primary} />
                  <AppText style={styles.generatingText}>Đang khởi tạo liên kết mời...</AppText>
                </View>
              ) : (
                <View style={styles.ticketActions}>
                  <AppButton
                    label={copied ? '✓ Đã sao chép link' : '📋 Sao chép link mời'}
                    onPress={handleCopyLink}
                    variant="primary"
                    fullWidth
                  />
                  <AppButton
                    label="📤 Chia sẻ chuyến đi"
                    onPress={handleShare}
                    variant="secondary"
                    fullWidth
                    style={{ marginTop: tokens.spacing.sm }}
                  />
                </View>
              )}
            </View>
          ) : (
            /* Join by Token Input Mode */
            <View style={styles.joinInputContainer}>
              <AppText style={styles.joinLabel}>Nhập mã 6 ký tự để tham gia nhóm:</AppText>
              <TextInput
                style={styles.tokenInput}
                value={tokenInput}
                onChangeText={setTokenInput}
                placeholder="VD: VST882"
                placeholderTextColor={tokens.colors.textDisabled}
                autoCapitalize="characters"
              />
              <AppButton
                label={isJoining ? 'Đang tham gia...' : 'Tham gia chuyến đi'}
                onPress={handleJoinByToken}
                variant="primary"
                loading={isJoining}
                fullWidth
                style={{ marginTop: tokens.spacing.md }}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: tokens.colors.surface,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
  },
  headerSubtitle: {
    fontSize: tokens.font.micro,
    fontWeight: '800',
    color: tokens.colors.primary,
    letterSpacing: 0.8,
    lineHeight: 14,
  },
  headerTitle: {
    fontSize: tokens.font.heading,
    fontWeight: '800',
    color: tokens.colors.ink,
    lineHeight: 24,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Boarding Pass Ticket
  ticketWrapper: {
    paddingBottom: tokens.spacing.md,
  },
  boardingPass: {
    backgroundColor: tokens.colors.canvas,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    overflow: 'hidden',
    shadowColor: tokens.colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  ticketTop: {
    backgroundColor: tokens.colors.primary,
    padding: tokens.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketTopLeft: {
    flex: 1,
  },
  ticketAirline: {
    fontSize: tokens.font.micro,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
    lineHeight: 14,
  },
  ticketTripName: {
    fontSize: tokens.font.subtitle,
    fontWeight: '800',
    color: tokens.colors.surface,
    lineHeight: 22,
    marginTop: 2,
  },
  ticketBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radius.xs,
  },
  ticketBadgeText: {
    fontSize: tokens.font.micro,
    fontWeight: '900',
    color: tokens.colors.surface,
    lineHeight: 14,
  },

  // Perforation
  perforationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    height: 20,
    backgroundColor: tokens.colors.canvas,
  },
  leftHole: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: tokens.colors.surface,
    marginLeft: -8,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderStyle: 'dashed',
  },
  rightHole: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: tokens.colors.surface,
    marginRight: -8,
  },

  ticketBottom: {
    padding: tokens.spacing.lg,
    backgroundColor: tokens.colors.canvas,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  codeLabel: {
    fontSize: tokens.font.micro,
    fontWeight: '700',
    color: tokens.colors.textMuted,
    lineHeight: 14,
  },
  codeText: {
    fontSize: tokens.font.display,
    fontWeight: '900',
    color: tokens.colors.primary,
    letterSpacing: 2,
    lineHeight: 30,
    marginTop: 2,
  },
  expiryCol: {
    alignItems: 'flex-end',
  },
  expiryText: {
    fontSize: tokens.font.body,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 20,
    marginTop: 2,
  },
  ticketNote: {
    fontSize: tokens.font.caption,
    color: tokens.colors.textMuted,
    lineHeight: 18,
    marginTop: tokens.spacing.md,
  },

  generatingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    paddingVertical: tokens.spacing.lg,
  },
  generatingText: {
    fontSize: tokens.font.caption,
    color: tokens.colors.textMuted,
    lineHeight: 18,
  },
  ticketActions: {
    marginTop: tokens.spacing.lg,
  },

  // Join Mode
  joinInputContainer: {
    paddingBottom: tokens.spacing.lg,
  },
  joinLabel: {
    fontSize: tokens.font.body,
    color: tokens.colors.ink,
    lineHeight: 20,
    marginBottom: tokens.spacing.sm,
  },
  tokenInput: {
    backgroundColor: tokens.colors.canvas,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    fontSize: tokens.font.heading,
    fontWeight: '700',
    color: tokens.colors.ink,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
});
