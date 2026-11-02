import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tokens } from '../../../theme/tokens';
import { CloseIcon, CheckIcon } from './BudgetIcons';

export interface PayerMember {
  id: string;
  name: string;
  initials: string;
}

export interface AddExpensePayload {
  title: string;
  amount: number;
  category: 'FOOD' | 'TRANSPORT' | 'ACCOMMODATION' | 'ACTIVITIES' | 'OTHER';
  paidById: string;
  paidByName: string;
  splitType: 'EQUAL' | 'CUSTOM';
  participantIds: string[];
}

export interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (expense: AddExpensePayload) => void;
  members: PayerMember[];
  currency?: string;
}

const CATEGORIES: Array<{ key: AddExpensePayload['category']; label: string }> = [
  { key: 'FOOD', label: 'ẨM THỰC' },
  { key: 'TRANSPORT', label: 'DI CHUYỂN' },
  { key: 'ACCOMMODATION', label: 'LƯU TRÚ' },
  { key: 'ACTIVITIES', label: 'VÉ THAM QUAN' },
  { key: 'OTHER', label: 'KHÁC' },
];

const QUICK_AMOUNTS = [
  { label: '+50k', value: 50000 },
  { label: '+100k', value: 100000 },
  { label: '+200k', value: 200000 },
  { label: '+500k', value: 500000 },
  { label: '+1M', value: 1000000 },
];

export function AddExpenseModal({
  visible,
  onClose,
  onSubmit,
  members,
  currency = '₫',
}: AddExpenseModalProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(900000);
  const [category, setCategory] = useState<AddExpensePayload['category']>('FOOD');
  const [paidById, setPaidById] = useState<string>(members[0]?.id ?? '');
  const [splitMode, setSplitMode] = useState<'EQUAL' | 'CUSTOM'>('EQUAL');

  const [selectedParticipants, setSelectedParticipants] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    members.forEach((m) => (init[m.id] = true));
    return init;
  });

  const activeParticipantCount = useMemo(() => {
    return Object.values(selectedParticipants).filter(Boolean).length;
  }, [selectedParticipants]);

  const splitDetails = useMemo(() => {
    if (activeParticipantCount === 0 || amount <= 0) {
      return { perMember: 0, remainder: 0 };
    }
    const perMember = Math.floor(amount / activeParticipantCount);
    const remainder = amount % activeParticipantCount;
    return { perMember, remainder };
  }, [amount, activeParticipantCount]);

  const toggleParticipant = (memberId: string) => {
    setSelectedParticipants((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  const handleQuickAdd = (delta: number) => {
    setAmount((prev) => Math.max(0, prev + delta));
  };

  const handleResetAmount = () => {
    setAmount(0);
  };

  const handleSubmit = () => {
    if (!title.trim() || amount <= 0 || activeParticipantCount === 0) {
      return;
    }
    const payer = members.find((m) => m.id === paidById) ?? members[0];
    const participantIds = Object.keys(selectedParticipants).filter(
      (id) => selectedParticipants[id],
    );

    onSubmit({
      title: title.trim(),
      amount,
      category,
      paidById: payer.id,
      paidByName: payer.name,
      splitType: splitMode,
      participantIds,
    });

    setTitle('');
    setAmount(900000);
    onClose();
  };

  const formatVndNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropDismiss} onPress={onClose} />

        <View style={styles.modalSheet}>
          <View style={styles.sheetContainer}>
            {/* Grab Handle */}
            <View style={styles.grabHandleRow}>
              <View style={styles.grabHandle} />
            </View>

            {/* Header: Title + Close Button */}
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>TRANSACTION ENTRY</Text>
                <Text style={styles.title}>RECORD NEW EXPENSE</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <CloseIcon size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollBody}
            >
              {/* Amount Display & Quick Chips */}
              <View style={styles.amountHeroBox}>
                <Text style={styles.amountHeroLabel}>SỐ TIỀN CHI TIÊU</Text>
                <View style={styles.amountInputRow}>
                  <Text style={styles.amountHeroValue}>
                    {formatVndNumber(amount)}
                  </Text>
                  <Text style={styles.amountCurrency}>{currency}</Text>
                </View>

                {/* Quick Add Chips */}
                <View style={styles.quickChipsRow}>
                  {QUICK_AMOUNTS.map((chip) => (
                    <TouchableOpacity
                      key={chip.label}
                      onPress={() => handleQuickAdd(chip.value)}
                      style={styles.quickChip}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.quickChipText}>{chip.label}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    onPress={handleResetAmount}
                    style={[styles.quickChip, styles.resetChip]}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.resetChipText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Expense Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.sectionLabel}>TÊN KHOẢN CHI & GHI CHÚ</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Ví dụ: Hải sản Năm Đảnh, Novotel..."
                  placeholderTextColor="#94a3b8"
                  style={styles.textInput}
                />
              </View>

              {/* Category Pills */}
              <View style={styles.inputGroup}>
                <Text style={styles.sectionLabel}>DANH MỤC CHI PHÍ</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScroll}
                >
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.key;
                    return (
                      <TouchableOpacity
                        key={cat.key}
                        onPress={() => setCategory(cat.key)}
                        style={[
                          styles.categoryChip,
                          isSelected && styles.categoryChipSelected,
                        ]}
                        activeOpacity={0.75}
                      >
                        <View
                          style={[
                            styles.categoryDot,
                            isSelected && styles.categoryDotSelected,
                          ]}
                        />
                        <Text
                          style={[
                            styles.categoryChipText,
                            isSelected && styles.categoryChipTextSelected,
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Payer Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.sectionLabel}>NGƯỜI ỨNG TIỀN TRƯỚC</Text>
                <View style={styles.payerRow}>
                  {members.map((m) => {
                    const isPayer = paidById === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => setPaidById(m.id)}
                        style={[
                          styles.payerCard,
                          isPayer && styles.payerCardSelected,
                        ]}
                        activeOpacity={0.75}
                      >
                        <View
                          style={[
                            styles.payerAvatar,
                            isPayer && styles.payerAvatarSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.payerAvatarText,
                              isPayer && styles.payerAvatarTextSelected,
                            ]}
                          >
                            {m.initials}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.payerName,
                            isPayer && styles.payerNameSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {m.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Split Mechanism */}
              <View style={styles.inputGroup}>
                <View style={styles.splitHeaderRow}>
                  <Text style={styles.sectionLabel}>SMART SPLIT CALCULATION</Text>
                  <View style={styles.splitToggleContainer}>
                    <TouchableOpacity
                      onPress={() => setSplitMode('EQUAL')}
                      style={[
                        styles.toggleBtn,
                        splitMode === 'EQUAL' && styles.toggleBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.toggleBtnText,
                          splitMode === 'EQUAL' && styles.toggleBtnTextActive,
                        ]}
                      >
                        EQUAL SPLIT
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setSplitMode('CUSTOM')}
                      style={[
                        styles.toggleBtn,
                        splitMode === 'CUSTOM' && styles.toggleBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.toggleBtnText,
                          splitMode === 'CUSTOM' && styles.toggleBtnTextActive,
                        ]}
                      >
                        CUSTOM
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Participant Split Rows */}
                <View style={styles.participantsList}>
                  {members.map((member) => {
                    const isSelected = !!selectedParticipants[member.id];
                    return (
                      <TouchableOpacity
                        key={member.id}
                        onPress={() => toggleParticipant(member.id)}
                        style={[
                          styles.participantRow,
                          isSelected && styles.participantRowActive,
                        ]}
                        activeOpacity={0.75}
                      >
                        <View style={styles.participantLeft}>
                          <View
                            style={[
                              styles.checkbox,
                              isSelected && styles.checkboxActive,
                            ]}
                          >
                            {isSelected && (
                              <CheckIcon size={12} color="#ffffff" />
                            )}
                          </View>
                          <Text
                            style={[
                              styles.participantName,
                              isSelected && styles.participantNameActive,
                            ]}
                          >
                            {member.name}
                          </Text>
                        </View>

                        <Text
                          style={[
                            styles.participantShare,
                            isSelected && styles.participantShareActive,
                          ]}
                        >
                          {isSelected
                            ? `${formatVndNumber(splitDetails.perMember)} ${currency}`
                            : 'Không chia'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!title.trim() || amount <= 0 || activeParticipantCount === 0}
                style={[
                  styles.submitBtn,
                  (!title.trim() || amount <= 0 || activeParticipantCount === 0) &&
                    styles.submitBtnDisabled,
                ]}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#0284C7', '#0284c7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitBtnGradient}
                >
                  <Text style={styles.submitBtnText}>CONFIRM TRANSACTION →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backdropDismiss: {
    flex: 1,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    maxHeight: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderRadius: Platform.OS === 'web' ? 28 : undefined,
    marginBottom: Platform.OS === 'web' ? 20 : 0,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e7ff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  grabHandleRow: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  grabHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#131b2e',
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  amountHeroBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  amountHeroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  amountHeroValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: -0.5,
  },
  amountCurrency: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0284c7',
    marginLeft: 6,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  resetChip: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  resetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  inputGroup: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#131b2e',
  },
  categoryScroll: {
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  categoryChipSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94a3b8',
  },
  categoryDotSelected: {
    backgroundColor: '#ffffff',
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.4,
  },
  categoryChipTextSelected: {
    color: '#ffffff',
  },
  payerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  payerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
  },
  payerCardSelected: {
    backgroundColor: '#eef2ff',
    borderColor: '#0284C7',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  payerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payerAvatarSelected: {
    backgroundColor: '#0284C7',
  },
  payerAvatarText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  payerAvatarTextSelected: {
    color: '#ffffff',
  },
  payerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    flexShrink: 1,
  },
  payerNameSelected: {
    color: '#0284C7',
  },
  splitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  splitToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: '#0284C7',
  },
  toggleBtnText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },
  toggleBtnTextActive: {
    color: '#ffffff',
  },
  participantsList: {
    gap: 6,
  },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  participantRowActive: {
    borderColor: '#93c5fd',
    backgroundColor: '#f8fafc',
  },
  participantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  participantName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  participantNameActive: {
    color: '#131b2e',
    fontWeight: '700',
  },
  participantShare: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  participantShareActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: 8,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
  },
  submitBtnGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
});
