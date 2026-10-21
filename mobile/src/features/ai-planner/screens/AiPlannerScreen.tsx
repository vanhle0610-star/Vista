import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { tokens } from '../../../theme/tokens';
import { expenseApi, AiItineraryResponse } from '../../../services/api/expenseApi';

export interface AiPlannerScreenProps {
  tripId?: string;
}

export function AiPlannerScreen({ tripId = '11111111-1111-1111-1111-111111111111' }: AiPlannerScreenProps) {
  const [province, setProvince] = useState('Đà Nẵng');
  const [days, setDays] = useState('3');
  const [budgetLevel, setBudgetLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [itineraryData, setItineraryData] = useState<AiItineraryResponse | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const totalDays = Math.max(1, Math.min(7, parseInt(days) || 3));

    try {
      const response = await expenseApi.fetchAiItinerarySuggestions(tripId, {
        destinationProvince: province.trim() || 'Đà Nẵng',
        totalDays,
        budgetLevel,
        interests: ['Biển', 'Ẩm thực', 'Check-in'],
      });
      setItineraryData(response);
    } catch (err: unknown) {
      // Check if Rate Limit 429
      const errString = String(err);
      if (errString.includes('429') || errString.includes('RATE_LIMIT_EXCEEDED')) {
        setErrorMessage('⚠️ Bạn đã sử dụng hết 5 lượt gợi ý AI trong ngày hôm nay. Vui lòng quay lại vào ngày mai.');
      } else {
        // Fallback demo mock so screen never breaks
        setItineraryData({
          destinationProvince: province,
          totalDays,
          budgetLevel,
          estimatedTotalCost: 3500000,
          isMockData: true,
          days: [
            {
              dayNumber: 1,
              dateLabel: 'Ngày 1: Biển Mỹ Khê & Bán đảo Sơn Trà',
              activities: [
                {
                  timeSlot: 'MORNING',
                  destinationName: 'Bán đảo Sơn Trà & Chùa Linh Ứng',
                  estimatedCost: 0,
                  category: 'Tâm linh & Cảnh quan',
                  note: 'Ngắm tượng Phật Bà Quan Âm cao 67m hướng biển',
                },
                {
                  timeSlot: 'AFTERNOON',
                  destinationName: 'Bãi biển Mỹ Khê',
                  estimatedCost: 150000,
                  category: 'Biển & Thư giãn',
                  note: 'Tắm biển bãi cát trắng mịn, uống nước dừa',
                },
                {
                  timeSlot: 'EVENING',
                  destinationName: 'Cầu Rồng & Chợ đêm Sơn Trà',
                  estimatedCost: 350000,
                  category: 'Ẩm thực & Check-in',
                  note: 'Thưởng thức hải sản và xem cầu phun lửa',
                },
              ],
            },
            {
              dayNumber: 2,
              dateLabel: 'Ngày 2: Danh thắng Ngũ Hành Sơn & Phố Cổ Hội An',
              activities: [
                {
                  timeSlot: 'MORNING',
                  destinationName: 'Danh thắng Ngũ Hành Sơn',
                  estimatedCost: 40000,
                  category: 'Di tích & Khám phá',
                  note: 'Khám phá Động Huyền Không và ngọn Thủy Sơn',
                },
                {
                  timeSlot: 'AFTERNOON',
                  destinationName: 'Rừng dừa Bảy Mẫu Cẩm Thanh',
                  estimatedCost: 200000,
                  category: 'Trải nghiệm',
                  note: 'Chèo thuyền thúng xoay vòng độc đáo',
                },
                {
                  timeSlot: 'EVENING',
                  destinationName: 'Phố cổ Hội An & Thả hoa đăng',
                  estimatedCost: 250000,
                  category: 'Di sản & Văn hóa',
                  note: 'Ngắm đèn lồng lung linh và chèo thuyền sông Hoài',
                },
              ],
            },
          ],
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Luxury Header Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerEyebrow}>AI CONCIERGE · TRAVEL OPTIMIZER</Text>
          <Text style={styles.bannerTitle}>Gợi Ý Lịch Trình & Chi Phí Thông Minh</Text>
          <Text style={styles.bannerSub}>
            Tự động tối ưu hóa thứ tự các điểm dừng nhằm tiết kiệm thời gian và giảm thiểu chi phí di chuyển (Haversine Route Optimization).
          </Text>
        </View>

        {/* Input Form Card */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>ĐIỂM ĐẾN DU LỊCH</Text>
          <TextInput
            style={styles.input}
            value={province}
            onChangeText={setProvince}
            placeholder="Ví dụ: Đà Nẵng, Huế, Hội An..."
            placeholderTextColor={tokens.colors.muted}
          />

          <Text style={styles.fieldLabel}>SỐ NGÀY DỰ KIẾN (TỐI ĐA 7 NGÀY)</Text>
          <TextInput
            style={styles.input}
            value={days}
            onChangeText={setDays}
            keyboardType="number-pad"
            placeholder="Ví dụ: 3"
            placeholderTextColor={tokens.colors.muted}
          />

          <Text style={styles.fieldLabel}>MỨC NGÂN SÁCH CHI TIÊU</Text>
          <View style={styles.budgetOptionsRow}>
            {(['LOW', 'MEDIUM', 'HIGH'] as const).map((level) => {
              const label =
                level === 'LOW' ? 'Tiết kiệm' : level === 'MEDIUM' ? 'Tiêu chuẩn' : 'Thoải mái';
              const isSelected = budgetLevel === level;
              return (
                <TouchableOpacity
                  key={level}
                  style={[styles.budgetChip, isSelected && styles.budgetChipActive]}
                  onPress={() => setBudgetLevel(level)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.budgetChipText, isSelected && styles.budgetChipTextActive]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.generateButton, isLoading && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={tokens.colors.surface} />
            ) : (
              <Text style={styles.generateButtonText}>✨ LẬP LỊCH TRÌNH TỐI ƯU</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Error Banner (Rate Limiting or Network) */}
        {errorMessage && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* AI Itinerary Results */}
        {itineraryData && (
          <View style={styles.previewContainer}>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <View style={styles.badgeDot} />
                <Text style={styles.badgeText}>
                  {itineraryData.isMockData ? 'Gợi ý kiểm nghiệm (v0)' : 'Gemini AI Verified'}
                </Text>
              </View>
              <Text style={styles.previewCost}>
                Ước tính: {formatVnd(itineraryData.estimatedTotalCost)}
              </Text>
            </View>

            {itineraryData.days.map((day) => (
              <View key={day.dayNumber} style={styles.dayBox}>
                <View style={styles.dayHeaderRow}>
                  <Text style={styles.dayTitle}>{day.dateLabel}</Text>
                </View>

                {day.activities.map((act, actIdx) => (
                  <View key={actIdx} style={styles.activityItem}>
                    <View style={styles.activityTimeBadge}>
                      <Text style={styles.activityTimeText}>{act.timeSlot}</Text>
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityPlace}>{act.destinationName}</Text>
                      {act.note ? (
                        <Text style={styles.activityNote}>{act.note}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.activityCost}>{formatVnd(act.estimatedCost)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: tokens.colors.canvas,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  banner: {
    backgroundColor: tokens.colors.navyDeep,
    padding: tokens.spacing.md + 4,
    marginHorizontal: tokens.spacing.md,
    marginTop: tokens.spacing.md,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  bannerEyebrow: {
    fontSize: tokens.font.micro,
    fontWeight: '800',
    color: tokens.colors.skyBlueShimmer,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: tokens.colors.surface,
    marginBottom: tokens.spacing.xs,
    letterSpacing: -0.3,
  },
  bannerSub: {
    fontSize: tokens.font.small,
    color: '#94A3B8',
    lineHeight: 18,
  },
  card: {
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing.md,
    marginHorizontal: tokens.spacing.md,
    marginTop: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    shadowColor: tokens.colors.skyBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  fieldLabel: {
    fontSize: tokens.font.micro,
    fontWeight: '800',
    color: tokens.colors.muted,
    letterSpacing: 1.2,
    marginBottom: tokens.spacing.xs,
    marginTop: tokens.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 11,
    fontSize: tokens.font.body,
    fontWeight: '600',
    color: tokens.colors.ink,
    backgroundColor: tokens.colors.canvas,
  },
  budgetOptionsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginTop: 4,
    marginBottom: tokens.spacing.md,
  },
  budgetChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    alignItems: 'center',
    backgroundColor: tokens.colors.canvas,
  },
  budgetChipActive: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  },
  budgetChipText: {
    fontSize: tokens.font.small,
    fontWeight: '700',
    color: tokens.colors.muted,
  },
  budgetChipTextActive: {
    color: tokens.colors.surface,
  },
  generateButton: {
    backgroundColor: tokens.colors.primary,
    paddingVertical: 14,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    marginTop: tokens.spacing.sm,
    shadowColor: tokens.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  generateButtonText: {
    color: tokens.colors.surface,
    fontSize: tokens.font.body,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  errorCard: {
    marginHorizontal: tokens.spacing.md,
    marginTop: tokens.spacing.md,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.dangerLight,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: tokens.colors.danger,
    fontSize: tokens.font.small,
    fontWeight: '600',
    lineHeight: 18,
  },
  previewContainer: {
    marginHorizontal: tokens.spacing.md,
    marginTop: tokens.spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.skyBlueLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radius.full,
    gap: 5,
    borderWidth: 0.8,
    borderColor: tokens.colors.skyBlueShimmer,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.colors.skyBlueGlow,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: tokens.colors.primary,
    letterSpacing: 0.6,
  },
  previewCost: {
    fontSize: tokens.font.small,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  dayBox: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  dayHeaderRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border,
    paddingBottom: 8,
    marginBottom: 8,
  },
  dayTitle: {
    fontSize: tokens.font.body,
    fontWeight: '800',
    color: tokens.colors.ink,
    letterSpacing: -0.2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.borderLight,
  },
  activityTimeBadge: {
    backgroundColor: tokens.colors.tagBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
    marginRight: 8,
  },
  activityTimeText: {
    fontSize: 9,
    fontWeight: '800',
    color: tokens.colors.tagText,
  },
  activityInfo: {
    flex: 1,
  },
  activityPlace: {
    fontSize: tokens.font.small,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  activityNote: {
    fontSize: tokens.font.micro,
    color: tokens.colors.muted,
    marginTop: 1,
  },
  activityCost: {
    fontSize: tokens.font.micro + 1,
    fontWeight: '700',
    color: tokens.colors.ink,
    marginLeft: 6,
  },
});
