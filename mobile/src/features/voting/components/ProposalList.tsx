import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { authStorage } from '@/services/auth/authStorage';
import { ProposalDto, collaborationApi } from '../../../services/api/collaborationApi';

interface ProposalListProps {
  tripId: string;
  proposals: ProposalDto[];
  isLoading?: boolean;
  onRefresh: () => void;
}

export function ProposalList({
  tripId,
  proposals,
  isLoading,
  onRefresh,
}: ProposalListProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);

  const handleCreateProposal = async () => {
    const token = await authStorage.getAccessToken();
    if (!token) {
      setIsAddModalOpen(false);
      Alert.alert('Yêu cầu đăng nhập', 'Bạn cần đăng nhập tài khoản thành viên để đề xuất địa điểm.', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng nhập', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    if (!title.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên địa điểm muốn đề xuất');
      return;
    }

    setIsSubmitting(true);
    try {
      await collaborationApi.createProposal(tripId, {
        title: title.trim(),
      });
      setTitle('');
      setIsAddModalOpen(false);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi đề xuất';
      Alert.alert('Lỗi', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (proposalId: string, voteType: 'UP' | 'DOWN') => {
    const token = await authStorage.getAccessToken();
    if (!token) {
      Alert.alert('Yêu cầu đăng nhập', 'Bạn cần đăng nhập tài khoản thành viên để tham gia biểu quyết.', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng nhập', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    setVotingId(proposalId);
    try {
      await collaborationApi.castVote(proposalId, voteType);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi bỏ phiếu';
      Alert.alert('Lỗi', msg);
    } finally {
      setVotingId(null);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8455ef" />
        <Text style={styles.loadingText}>Đang tải danh sách đề xuất & biểu quyết...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>Đề xuất & Biểu quyết</Text>
          <Text style={styles.headerSub}>
            Các thành viên cùng đề xuất điểm đến và vote trước khi chốt lịch trình
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addProposalBtn}
          onPress={() => setIsAddModalOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.addProposalBtnText}>+ Đề xuất</Text>
        </TouchableOpacity>
      </View>

      {/* Proposals list */}
      {(!proposals || proposals.length === 0) ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🗳️</Text>
          <Text style={styles.emptyTitle}>Chưa có đề xuất nào</Text>
          <Text style={styles.emptySub}>
            Hãy là người đầu tiên gợi ý một địa điểm ăn uống, vui chơi thú vị cho chuyến đi nhóm!
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => setIsAddModalOpen(true)}
          >
            <Text style={styles.emptyBtnText}>+ Đề xuất địa điểm mới</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {proposals.map((item) => {
            const isVotingThis = votingId === item.id;
            const statusLabel =
              item.status === 'ACCEPTED'
                ? 'Đã duyệt vào lịch trình'
                : item.status === 'REJECTED'
                ? 'Đã từ chối'
                : 'Đang biểu quyết';

            const statusColor =
              item.status === 'ACCEPTED'
                ? '#16a34a'
                : item.status === 'REJECTED'
                ? '#dc2626'
                : '#8455ef';

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.statusTag, { borderColor: statusColor }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {statusLabel}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>
                    {item.createdAt ? item.createdAt.slice(0, 10) : ''}
                  </Text>
                </View>

                <Text style={styles.proposalTitle}>{item.title}</Text>

                {/* Voting Bar */}
                <View style={styles.voteBar}>
                  <TouchableOpacity
                    style={[styles.voteButton, styles.upvoteBtn]}
                    onPress={() => handleVote(item.id, 'UP')}
                    disabled={isVotingThis || item.status !== 'OPEN'}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.voteEmoji}>👍</Text>
                    <Text style={styles.upvoteCount}>{item.upVotes || 0}</Text>
                    <Text style={styles.voteActionLabel}>Đồng ý</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.voteButton, styles.downvoteBtn]}
                    onPress={() => handleVote(item.id, 'DOWN')}
                    disabled={isVotingThis || item.status !== 'OPEN'}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.voteEmoji}>👎</Text>
                    <Text style={styles.downvoteCount}>{item.downVotes || 0}</Text>
                    <Text style={styles.voteActionLabel}>Không thích</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Modal tạo đề xuất */}
      <Modal
        visible={isAddModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đề xuất địa điểm mới</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Tên địa điểm / Quán ăn / Hoạt động *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="VD: Cà phê ngắm hoàng hôn Bán đảo Sơn Trà"
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsAddModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateProposal}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Gửi đề xuất</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf8ff',
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    maxWidth: 240,
  },
  addProposalBtn: {
    backgroundColor: '#8455ef',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addProposalBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  proposalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 14,
    lineHeight: 22,
  },
  voteBar: {
    flexDirection: 'row',
    gap: 12,
  },
  voteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  upvoteBtn: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  downvoteBtn: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  voteEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  upvoteCount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#16a34a',
    marginRight: 6,
  },
  downvoteCount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#dc2626',
    marginRight: 6,
  },
  voteActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  emptyContainer: {
    padding: 30,
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyBtn: {
    backgroundColor: '#8455ef',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748b',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  modalActionRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  submitBtn: {
    flex: 2,
    backgroundColor: '#8455ef',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
