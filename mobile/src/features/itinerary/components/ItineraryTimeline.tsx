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
import { ItineraryDayDto, ItineraryItemDto, collaborationApi } from '../../../services/api/collaborationApi';

interface ItineraryTimelineProps {
  tripId: string;
  days: ItineraryDayDto[];
  isLoading?: boolean;
  onRefresh: () => void;
}

export function ItineraryTimeline({
  tripId,
  days,
  isLoading,
  onRefresh,
}: ItineraryTimelineProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAddDayModalOpen, setIsAddDayModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for Add Item
  const [customStopName, setCustomStopName] = useState('');
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('11:00');
  const [note, setNote] = useState('');

  // Form states for Add Day
  const [dayNumberInput, setDayNumberInput] = useState(String((days?.length || 0) + 1));
  const [tripDateInput, setTripDateInput] = useState(
    new Date().toISOString().split('T')[0]
  );

  const activeDay = days && days.length > 0 ? days[selectedDayIndex] || days[0] : null;

  const handleAddItem = async () => {
    if (!activeDay) {
      Alert.alert('Lỗi', 'Vui lòng chọn hoặc tạo ngày lịch trình trước');
      return;
    }
    if (!customStopName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên điểm đến');
      return;
    }

    setIsSubmitting(true);
    try {
      await collaborationApi.createItineraryItem(activeDay.id, {
        customStopName: customStopName.trim(),
        startTime: startTime.trim() ? `${startTime.trim()}:00` : null,
        endTime: endTime.trim() ? `${endTime.trim()}:00` : null,
        note: note.trim() || undefined,
        sortOrder: activeDay.items?.length || 0,
      });

      setCustomStopName('');
      setNote('');
      setIsAddItemModalOpen(false);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể thêm điểm dừng';
      Alert.alert('Lỗi', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDay = async () => {
    const dayNum = parseInt(dayNumberInput) || (days?.length || 0) + 1;
    if (!tripDateInput) {
      Alert.alert('Thiếu ngày', 'Vui lòng nhập ngày (YYYY-MM-DD)');
      return;
    }

    setIsSubmitting(true);
    try {
      await collaborationApi.createItineraryDay(tripId, dayNum, tripDateInput);
      setIsAddDayModalOpen(false);
      onRefresh();
      setSelectedDayIndex(days?.length || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo ngày mới';
      Alert.alert('Lỗi', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = (item: ItineraryItemDto) => {
    Alert.alert(
      'Xóa điểm dừng',
      `Bạn có chắc muốn xóa "${item.customStopName || 'Điểm dừng'}" khỏi lịch trình?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await collaborationApi.deleteItineraryItem(item.id);
              onRefresh();
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Lỗi khi xóa điểm dừng';
              Alert.alert('Lỗi', msg);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#005ea5" />
        <Text style={styles.loadingText}>Đang tải lịch trình nhóm...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Day Selector Chips */}
      <View style={styles.daySelectorWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayScrollContent}
        >
          {days?.map((day, idx) => {
            const isSelected = idx === selectedDayIndex;
            return (
              <TouchableOpacity
                key={day.id || idx}
                testID={`day-chip-${day.dayNumber}`}
                style={[styles.dayChip, isSelected && styles.dayChipActive]}
                onPress={() => setSelectedDayIndex(idx)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayChipTitle, isSelected && styles.dayChipTitleActive]}>
                  {`Ngày ${day.dayNumber}`}
                </Text>
                <Text style={[styles.dayChipSub, isSelected && styles.dayChipSubActive]}>
                  {day.tripDate ? day.tripDate.slice(5) : `Chặng ${idx + 1}`}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.addDayChip}
            onPress={() => setIsAddDayModalOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.addDayChipPlus}>+</Text>
            <Text style={styles.addDayChipText}>Thêm ngày</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Timeline Section */}
      <View style={styles.timelineContainer}>
        <View style={styles.timelineHeaderRow}>
          <View>
            <Text style={styles.timelineSectionTitle}>
              {activeDay ? `Lịch trình Ngày ${activeDay.dayNumber}` : 'Chưa có lịch trình'}
            </Text>
            {activeDay?.tripDate ? (
              <Text style={styles.timelineDateText}>Ngày: {activeDay.tripDate}</Text>
            ) : null}
          </View>

          {activeDay ? (
            <TouchableOpacity
              style={styles.addStopBtn}
              onPress={() => setIsAddItemModalOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.addStopBtnText}>+ Thêm điểm dừng</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* List of stops */}
        {(!activeDay || !activeDay.items || activeDay.items.length === 0) ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyTitle}>Chưa có điểm dừng nào</Text>
            <Text style={styles.emptySub}>
              Bấm "+ Thêm điểm dừng" hoặc dùng tính năng Trợ lý AI để gợi ý địa điểm thú vị.
            </Text>
            {activeDay ? (
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setIsAddItemModalOpen(true)}
              >
                <Text style={styles.emptyAddBtnText}>Thêm điểm dừng đầu tiên</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.stopsListContent}
          >
            {activeDay.items.map((item, idx) => {
              const isLast = idx === activeDay.items.length - 1;
              const timeDisplay =
                item.startTime && item.endTime
                  ? `${item.startTime.slice(0, 5)} – ${item.endTime.slice(0, 5)}`
                  : item.startTime
                  ? `Từ ${item.startTime.slice(0, 5)}`
                  : `Chặng ${idx + 1}`;

              return (
                <View key={item.id || idx} style={styles.timelineRow}>
                  {/* Left Column: Timeline Dot & Line */}
                  <View style={styles.timelineAxis}>
                    <View style={styles.timelineDot}>
                      <Text style={styles.timelineDotNumber}>{idx + 1}</Text>
                    </View>
                    {!isLast && <View style={styles.timelineVerticalLine} />}
                  </View>

                  {/* Right Column: Card Content */}
                  <View style={styles.stopCard}>
                    <View style={styles.stopCardTop}>
                      <View style={styles.timeBadge}>
                        <Text style={styles.timeBadgeText}>🕒 {timeDisplay}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteItem(item)}
                        style={styles.deleteStopBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={styles.deleteStopText}>✕</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.stopName}>
                      {item.customStopName || 'Điểm tham quan'}
                    </Text>

                    {item.note ? (
                      <Text style={styles.stopNote}>{item.note}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Modal: Thêm điểm dừng */}
      <Modal
        visible={isAddItemModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddItemModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm điểm dừng</Text>
              <TouchableOpacity onPress={() => setIsAddItemModalOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Tên điểm đến / Điểm dừng *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="VD: Cầu Rồng, Phố Cổ Hội An..."
              placeholderTextColor="#94a3b8"
              value={customStopName}
              onChangeText={setCustomStopName}
            />

            <View style={styles.timeRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputLabel}>Giờ bắt đầu</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="08:30"
                  placeholderTextColor="#94a3b8"
                  value={startTime}
                  onChangeText={setStartTime}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.inputLabel}>Giờ kết thúc</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="11:00"
                  placeholderTextColor="#94a3b8"
                  value={endTime}
                  onChangeText={setEndTime}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Ghi chú / Dự toán chi phí</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Ghi chú vé tham quan, trải nghiệm gợi ý..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              value={note}
              onChangeText={setNote}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsAddItemModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAddItem}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Thêm vào ngày</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Thêm ngày lịch trình */}
      <Modal
        visible={isAddDayModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddDayModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm ngày vào lịch trình</Text>
              <TouchableOpacity onPress={() => setIsAddDayModalOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Số thứ tự ngày (1, 2, 3...)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="number-pad"
              value={dayNumberInput}
              onChangeText={setDayNumberInput}
            />

            <Text style={styles.inputLabel}>Ngày diễn ra (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="2026-11-10"
              placeholderTextColor="#94a3b8"
              value={tripDateInput}
              onChangeText={setTripDateInput}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsAddDayModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAddDay}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Tạo ngày</Text>
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
  daySelectorWrapper: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 12,
  },
  dayScrollContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    minWidth: 80,
  },
  dayChipActive: {
    backgroundColor: '#005ea5',
  },
  dayChipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  dayChipTitleActive: {
    color: '#ffffff',
  },
  dayChipSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  dayChipSubActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  addDayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  addDayChipPlus: {
    fontSize: 15,
    fontWeight: '700',
    color: '#005ea5',
    marginRight: 4,
  },
  addDayChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#005ea5',
  },
  timelineContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  timelineDateText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  addStopBtn: {
    backgroundColor: '#005ea5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addStopBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  stopsListContent: {
    paddingBottom: 40,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineAxis: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#005ea5',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineDotNumber: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  timelineVerticalLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#cbd5e1',
    marginVertical: 4,
  },
  stopCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  stopCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timeBadge: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timeBadgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  deleteStopBtn: {
    padding: 4,
  },
  deleteStopText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '700',
  },
  stopName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  stopNote: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  emptyState: {
    padding: 30,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 10,
  },
  emptyIcon: {
    fontSize: 40,
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
  emptyAddBtn: {
    backgroundColor: '#005ea5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyAddBtnText: {
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
    maxHeight: '85%',
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
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  timeRow: {
    flexDirection: 'row',
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
    backgroundColor: '#005ea5',
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
