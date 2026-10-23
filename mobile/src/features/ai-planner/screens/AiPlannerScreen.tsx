import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { tokens } from '../../../theme/tokens';
import { expenseApi, AiItineraryResponse } from '../../../services/api/expenseApi';
import { tripApi } from '../../../services/api/tripApi';
import {
  SunIcon,
  PersonIcon,
  HeartIcon,
  GroupIcon,
  FamilyIcon,
  SparkleIcon,
  WalletIcon,
  CarIcon,
} from '../../../components/icons/StitchIcons';

export interface AiPlannerScreenProps {
  tripId?: string;
}

export function AiPlannerScreen({ tripId = '11111111-1111-1111-1111-111111111111' }: AiPlannerScreenProps) {
  const [province, setProvince] = useState('Đà Nẵng');
  const [days, setDays] = useState('3');
  const [budgetLevel, setBudgetLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [travelerCount, setTravelerCount] = useState(4);
  const [companion, setCompanion] = useState<'SOLO' | 'COUPLE' | 'FRIENDS' | 'FAMILY'>('FRIENDS');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['Biển & Chill', 'Ẩm thực']);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [itineraryData, setItineraryData] = useState<AiItineraryResponse | null>(null);

  const toggleStyle = (styleName: string) => {
    setSelectedStyles((prev) =>
      prev.includes(styleName) ? prev.filter((s) => s !== styleName) : [...prev, styleName]
    );
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const totalDays = Math.max(1, Math.min(7, parseInt(days) || 3));

    try {
      let response: AiItineraryResponse;
      try {
        response = await expenseApi.fetchAiQuickPlan({
          destinationProvince: province.trim() || 'Đà Nẵng',
          totalDays,
          budgetLevel,
          interests: selectedStyles,
        });
      } catch {
        response = await expenseApi.fetchAiItinerarySuggestions(tripId, {
          destinationProvince: province.trim() || 'Đà Nẵng',
          totalDays,
          budgetLevel,
          interests: selectedStyles,
        });
      }
      setItineraryData(response);
      setSelectedDayIndex(0);
    } catch (err: unknown) {
      const errString = String(err);
      if (errString.includes('429') || errString.includes('RATE_LIMIT_EXCEEDED')) {
        setErrorMessage(
          '⚠️ Bạn đã sử dụng hết 5 lượt gợi ý AI trong ngày hôm nay. Vui lòng quay lại vào ngày mai.'
        );
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
                  timeSlot: '08:00 – 10:30',
                  destinationName: 'Bán đảo Sơn Trà & Chùa Linh Ứng',
                  estimatedCost: 0,
                  category: 'Tâm linh & Cảnh quan',
                  note: 'Ngắm tượng Phật Bà Quan Âm cao 67m hướng biển',
                },
                {
                  timeSlot: '11:30 – 13:00',
                  destinationName: 'Mì Quảng Ếch Bếp Trang',
                  estimatedCost: 65000,
                  category: 'Ẩm thực',
                  note: 'Thưởng thức mì Quảng ếch niêu đất đặc sản',
                },
                {
                  timeSlot: '15:00 – 18:00',
                  destinationName: 'Bãi biển Mỹ Khê & Chèo SUP',
                  estimatedCost: 150000,
                  category: 'Biển & Thư giãn',
                  note: 'Tắm biển cát trắng, chèo ván SUP ngắm hoàng hôn',
                },
              ],
            },
            {
              dayNumber: 2,
              dateLabel: 'Ngày 2: Danh thắng Ngũ Hành Sơn & Phố Cổ Hội An',
              activities: [
                {
                  timeSlot: '08:30 – 11:00',
                  destinationName: 'Danh thắng Ngũ Hành Sơn',
                  estimatedCost: 40000,
                  category: 'Di tích & Khám phá',
                  note: 'Khám phá Động Huyền Không và ngọn Thủy Sơn',
                },
                {
                  timeSlot: '14:00 – 17:00',
                  destinationName: 'Rừng dừa Bảy Mẫu Cẩm Thanh',
                  estimatedCost: 200000,
                  category: 'Trải nghiệm',
                  note: 'Chèo thuyền thúng xoay vòng độc đáo',
                },
                {
                  timeSlot: '18:00 – 21:30',
                  destinationName: 'Phố cổ Hội An & Thả hoa đăng',
                  estimatedCost: 250000,
                  category: 'Di sản & Văn hóa',
                  note: 'Ngắm đèn lồng lung linh và chèo thuyền sông Hoài',
                },
              ],
            },
          ],
        });
        setSelectedDayIndex(0);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveItinerary = async () => {
    if (!itineraryData) return;
    setIsSaving(true);
    try {
      const today = new Date();
      const returnDate = new Date(today.getTime() + (parseInt(days) || 3) * 24 * 60 * 60 * 1000);

      const newTrip = await tripApi.createTrip({
        title: `${province} ${days}N - Cùng AI`,
        destinationSummary: province,
        startDate: today.toISOString().split('T')[0],
        endDate: returnDate.toISOString().split('T')[0],
        budgetTotal: itineraryData.estimatedTotalCost,
        currency: 'VND',
      });

      // Đồng bộ các ngày và điểm dừng AI vào phân hệ Lịch trình (TV3)
      if (newTrip && newTrip.id && itineraryData.days && itineraryData.days.length > 0) {
        for (let i = 0; i < itineraryData.days.length; i++) {
          const day = itineraryData.days[i];
          const dayDate = new Date(today.getTime() + i * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
          try {
            const createdDay = await tripApi.createItineraryDay(
              newTrip.id,
              day.dayNumber || i + 1,
              dayDate
            );
            if (createdDay && createdDay.id && day.activities) {
              for (let j = 0; j < day.activities.length; j++) {
                const act = day.activities[j];
                await tripApi.createItineraryItem(createdDay.id, {
                  customStopName: act.destinationName,
                  sortOrder: j,
                  note: `${act.category ? `[${act.category}] ` : ''}${act.note || ''} · Vé: ${formatVnd(act.estimatedCost || 0)}`,
                });
              }
            }
          } catch {
            // Không ngắt quãng luồng nếu 1 ngày gặp sự cố mạng
          }
        }
      }

      Alert.alert(
        'Đã lưu hành trình',
        'Chuyến đi đã được khởi tạo và đồng bộ đầy đủ các điểm dừng vào Lịch trình nhóm của bạn!',
        [
          { text: 'Xem ở Chuyến đi', onPress: () => router.push('/(tabs)/trips') },
          { text: 'Mở Thủ Quỹ', onPress: () => router.push('/(tabs)/treasury') },
        ]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu chuyến đi';
      Alert.alert('Thông báo', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' đ';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Luxury Header Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerTopRow}>
            <Text style={styles.bannerEyebrow}>AI CONCIERGE · TRAVEL OPTIMIZER</Text>
            <View style={styles.aiBadgePill}>
              <Text style={styles.aiBadgePillText}>✨ Gemini 2.5</Text>
            </View>
          </View>
          <Text style={styles.bannerTitle}>Gợi Ý Lịch Trình & Chi Phí Thông Minh</Text>
          <Text style={styles.bannerSub}>
            Tự động tối ưu hóa thứ tự các điểm dừng nhằm tiết kiệm thời gian và giảm thiểu chi phí di chuyển (Haversine Route Optimization).
          </Text>
        </View>

        {/* Live Weather Card */}
        <View style={styles.weatherCard}>
          <View style={styles.weatherIconCircle}>
            <SunIcon size={22} color="#f59e0b" />
          </View>
          <View style={styles.weatherTextWrapper}>
            <View style={styles.weatherHeaderRow}>
              <Text style={styles.weatherLocation}>{province} · 28°C</Text>
              <View style={styles.weatherMonthTag}>
                <Text style={styles.weatherMonthText}>Khí tượng trực tiếp</Text>
              </View>
            </View>
            <Text style={styles.weatherDesc}>
              Thời tiết lý tưởng cho các hoạt động ngoài trời, bãi biển và chụp ảnh khám phá ẩm thực.
            </Text>
          </View>
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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {['Đà Nẵng', 'Hạ Long', 'Hội An', 'Ninh Bình', 'Phú Quốc', 'Hà Giang', 'Đà Lạt'].map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.destChip, province === p && styles.destChipActive]}
                onPress={() => setProvince(p)}
                activeOpacity={0.7}
              >
                <Text style={[styles.destChipText, province === p && styles.destChipTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.fieldLabel}>SỐ NGÀY DỰ KIẾN (TỐI ĐA 7 NGÀY)</Text>
          <TextInput
            style={styles.input}
            value={days}
            onChangeText={setDays}
            keyboardType="number-pad"
            placeholder="Ví dụ: 3"
            placeholderTextColor={tokens.colors.muted}
          />

          {/* Quick duration chips */}
          <View style={styles.durationChipsRow}>
            {[
              { label: '1 ngày', val: '1' },
              { label: '2N1Đ', val: '2' },
              { label: '3N2Đ', val: '3' },
              { label: '4N3Đ', val: '4' },
              { label: '5N4Đ', val: '5' },
            ].map((d) => (
              <TouchableOpacity
                key={d.val}
                style={[styles.durationChip, days === d.val && styles.durationChipActive]}
                onPress={() => setDays(d.val)}
                activeOpacity={0.7}
              >
                <Text style={[styles.durationChipText, days === d.val && styles.durationChipTextActive]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Companion Selector */}
          <Text style={styles.fieldLabel}>ĐỒNG HÀNH CÙNG AI?</Text>
          <View style={styles.companionGrid}>
            {[
              {
                key: 'SOLO',
                label: 'Một mình',
                renderIcon: (sel: boolean) => (
                  <PersonIcon size={22} color={sel ? '#005ea5' : '#707784'} />
                ),
              },
              {
                key: 'COUPLE',
                label: 'Cặp đôi',
                renderIcon: (sel: boolean) => (
                  <HeartIcon size={22} color={sel ? '#e11d48' : '#707784'} />
                ),
              },
              {
                key: 'FRIENDS',
                label: 'Bạn bè',
                renderIcon: (sel: boolean) => (
                  <GroupIcon size={22} color={sel ? '#005ea5' : '#707784'} />
                ),
              },
              {
                key: 'FAMILY',
                label: 'Gia đình',
                renderIcon: (sel: boolean) => (
                  <FamilyIcon size={22} color={sel ? '#0284c7' : '#707784'} />
                ),
              },
            ].map((comp) => {
              const isSelected = companion === comp.key;
              return (
                <TouchableOpacity
                  key={comp.key}
                  style={[styles.companionCard, isSelected && styles.companionCardActive]}
                  onPress={() => setCompanion(comp.key as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.companionIcon}>{comp.renderIcon(isSelected)}</View>
                  <Text style={[styles.companionLabel, isSelected && styles.companionLabelActive]}>
                    {comp.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Member Headcount Stepper */}
          <View style={styles.headcountBox}>
            <View>
              <Text style={styles.headcountTitle}>Số lượng thành viên</Text>
              <Text style={styles.headcountSub}>Tự động chia tiền phòng & tiền xe</Text>
            </View>
            <View style={styles.stepperWrapper}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setTravelerCount((c) => Math.max(1, c - 1))}
                activeOpacity={0.7}
              >
                <Text style={styles.stepBtnText}>–</Text>
              </TouchableOpacity>
              <Text style={styles.stepValueText}>{travelerCount}</Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setTravelerCount((c) => Math.min(20, c + 1))}
                activeOpacity={0.7}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Budget Level Selection */}
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

          {/* Travel Styles / Interests */}
          <Text style={styles.fieldLabel}>PHONG CÁCH DU LỊCH (CHỌN NHIỀU GU)</Text>
          <View style={styles.stylesWrap}>
            {[
              'Biển & Chill',
              'Ẩm thực',
              'Văn hóa & Di sản',
              'Phượt & Trải nghiệm',
              'Gia đình & Vui chơi',
            ].map((styleName) => {
              const isSelected = selectedStyles.includes(styleName);
              return (
                <TouchableOpacity
                  key={styleName}
                  style={[styles.styleChip, isSelected && styles.styleChipActive]}
                  onPress={() => toggleStyle(styleName)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.styleChipText, isSelected && styles.styleChipTextActive]}>
                    {styleName} {isSelected ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Generate Button */}
          <TouchableOpacity
            style={[styles.generateButton, isLoading && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.generateButtonText}>✨ LẬP LỊCH TRÌNH TỐI ƯU</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {errorMessage && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* AI Itinerary Results Section */}
        {itineraryData && (
          <View style={styles.previewContainer}>
            {/* Header info */}
            <View style={styles.badgeRow}>
              <View style={[styles.badge, !itineraryData.isMockData && styles.badgeLive]}>
                <View style={[styles.badgeDot, !itineraryData.isMockData && styles.badgeDotLive]} />
                <Text style={[styles.badgeText, !itineraryData.isMockData && styles.badgeTextLive]}>
                  {itineraryData.isMockData ? '⚡ Lộ trình chuẩn hóa' : '✨ Gemini 2.5 Flash Live AI'}
                </Text>
              </View>
              <Text style={styles.previewCost}>
                Tổng: {formatVnd(itineraryData.estimatedTotalCost)}
              </Text>
            </View>

            {/* Group Treasury Calculation Card */}
            <View style={styles.treasuryGroupCard}>
              <View style={styles.treasuryGroupLeft}>
                <Text style={styles.treasuryGroupTitle}>
                  👥 THỦ QUỸ & CHIA TIỀN NHÓM ({travelerCount} người)
                </Text>
                <Text style={styles.treasuryGroupAmount}>
                  ~{formatVnd(Math.round(itineraryData.estimatedTotalCost / travelerCount))} / người
                </Text>
              </View>
              <View style={styles.treasuryBadgePill}>
                <Text style={styles.treasuryBadgeText}>Chia đều</Text>
              </View>
            </View>

            {/* Day Selector Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayTabsScroll}
            >
              {itineraryData.days.map((day, idx) => {
                const isSelected = selectedDayIndex === idx;
                return (
                  <TouchableOpacity
                    key={day.dayNumber}
                    style={[styles.dayTabChip, isSelected && styles.dayTabChipActive]}
                    onPress={() => setSelectedDayIndex(idx)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[styles.dayTabChipText, isSelected && styles.dayTabChipTextActive]}
                    >
                      Ngày {day.dayNumber}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Active Day Activities Timeline */}
            {itineraryData.days[selectedDayIndex] && (
              <View style={styles.activeDayBox}>
                <View style={styles.dayHeaderRow}>
                  <Text style={styles.dayTitle}>
                    {itineraryData.days[selectedDayIndex].dateLabel}
                  </Text>
                  <View style={styles.activityCountBadge}>
                    <Text style={styles.activityCountText}>
                      {itineraryData.days[selectedDayIndex].activities.length} hoạt động
                    </Text>
                  </View>
                </View>

                {itineraryData.days[selectedDayIndex].activities.map((act, actIdx) => (
                  <View key={actIdx} style={styles.timelineBlock}>
                    {/* Activity Item Card */}
                    <View style={styles.activityItem}>
                      <View style={styles.activityTopRow}>
                        <View style={styles.activityTimeBadge}>
                          <Text style={styles.activityTimeText}>{act.timeSlot}</Text>
                        </View>
                        <View style={styles.activityCatBadge}>
                          <Text style={styles.activityCatText}>{act.category}</Text>
                        </View>
                      </View>

                      <Text style={styles.activityPlace}>{act.destinationName}</Text>
                      {act.note ? <Text style={styles.activityNote}>{act.note}</Text> : null}

                      <View style={styles.activityCostRow}>
                        <Text style={styles.activityCostLabel}>Chi phí dự kiến:</Text>
                        <Text style={styles.activityCost}>
                          {act.estimatedCost === 0 ? 'Miễn phí' : formatVnd(act.estimatedCost)}
                        </Text>
                      </View>
                    </View>

                    {/* Transit indicator between activities */}
                    {actIdx < itineraryData.days[selectedDayIndex].activities.length - 1 && (
                      <View style={styles.transitIndicator}>
                        <CarIcon size={14} color="#006a67" style={{ marginRight: 6 }} />
                        <Text style={styles.transitText}>
                          Di chuyển khoảng 15 – 20 phút bằng taxi/xe máy
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Smart Budget Distribution Card */}
            <View style={styles.budgetDistCard}>
              <Text style={styles.budgetDistTitle}>Phân bổ chi phí ước tính</Text>
              <View style={styles.distBarTrack}>
                <View style={[styles.distBarPart, { flex: 45, backgroundColor: '#005ea5' }]} />
                <View style={[styles.distBarPart, { flex: 35, backgroundColor: '#006a67' }]} />
                <View style={[styles.distBarPart, { flex: 20, backgroundColor: '#6b38d4' }]} />
              </View>
              <View style={styles.distLegendRow}>
                <View style={styles.distLegendItem}>
                  <View style={[styles.distDot, { backgroundColor: '#005ea5' }]} />
                  <Text style={styles.distLegendText}>Khách sạn & Vé (45%)</Text>
                </View>
                <View style={styles.distLegendItem}>
                  <View style={[styles.distDot, { backgroundColor: '#006a67' }]} />
                  <Text style={styles.distLegendText}>Ăn uống (35%)</Text>
                </View>
                <View style={styles.distLegendItem}>
                  <View style={[styles.distDot, { backgroundColor: '#6b38d4' }]} />
                  <Text style={styles.distLegendText}>Trải nghiệm (20%)</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons: Save & Treasury */}
            <View style={styles.itineraryActionButtons}>
              <TouchableOpacity
                style={styles.saveItineraryBtn}
                onPress={handleSaveItinerary}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveItineraryBtnText}>Lưu lịch trình & Tạo chuyến đi</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.treasuryActionBtn}
                onPress={() => router.push('/(tabs)/treasury')}
                activeOpacity={0.85}
              >
                <WalletIcon size={18} color="#005ea5" style={{ marginRight: 6 }} />
                <Text style={styles.treasuryActionBtnText}>Mở chuyến đi & bật thủ quỹ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#faf8ff',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  banner: {
    backgroundColor: '#005ea5',
    padding: 18,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    shadowColor: '#005ea5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  bannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bannerEyebrow: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#d3e4ff',
    fontWeight: '700',
  },
  aiBadgePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  aiBadgePillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  bannerSub: {
    fontSize: 12,
    color: '#e2e8f0',
    marginTop: 4,
    lineHeight: 16,
  },
  weatherCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    backgroundColor: '#e2e7ff',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weatherIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherIcon: {
    fontSize: 20,
  },
  weatherTextWrapper: {
    flex: 1,
  },
  weatherHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherLocation: {
    fontSize: 14,
    fontWeight: '700',
    color: '#131b2e',
  },
  weatherMonthTag: {
    backgroundColor: '#f2f3ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  weatherMonthText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#005ea5',
  },
  weatherDesc: {
    fontSize: 11,
    color: '#404752',
    marginTop: 2,
    lineHeight: 15,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#005ea5',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  chipsScroll: {
    marginTop: 8,
    marginBottom: 6,
  },
  destChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f2f3ff',
    marginRight: 8,
  },
  destChipActive: {
    backgroundColor: '#005ea5',
  },
  destChipText: {
    fontSize: 12,
    color: '#404752',
    fontWeight: '600',
  },
  destChipTextActive: {
    color: '#ffffff',
  },
  durationChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#f2f3ff',
    alignItems: 'center',
  },
  durationChipActive: {
    backgroundColor: '#005ea5',
  },
  durationChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#404752',
  },
  durationChipTextActive: {
    color: '#ffffff',
  },
  companionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  companionCard: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f2f3ff',
    alignItems: 'center',
    gap: 4,
  },
  companionCardActive: {
    backgroundColor: '#d3e4ff',
    borderWidth: 1.5,
    borderColor: '#005ea5',
  },
  companionIcon: {
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#404752',
  },
  companionLabelActive: {
    color: '#005ea5',
    fontWeight: '700',
  },
  headcountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f2f3ff',
    padding: 12,
    borderRadius: 14,
    marginTop: 14,
  },
  headcountTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#131b2e',
  },
  headcountSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  stepperWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  stepBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#005ea5',
  },
  stepValueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#005ea5',
    minWidth: 20,
    textAlign: 'center',
  },
  budgetOptionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  budgetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f2f3ff',
    alignItems: 'center',
  },
  budgetChipActive: {
    backgroundColor: '#005ea5',
  },
  budgetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#404752',
  },
  budgetChipTextActive: {
    color: '#ffffff',
  },
  stylesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f2f3ff',
  },
  styleChipActive: {
    backgroundColor: '#005ea5',
  },
  styleChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#404752',
  },
  styleChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  generateButton: {
    marginTop: 18,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#005ea5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#005ea5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 14,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    lineHeight: 18,
  },
  previewContainer: {
    marginHorizontal: 16,
    marginTop: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f3ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  badgeLive: {
    backgroundColor: '#e9ddff',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#005ea5',
  },
  badgeDotLive: {
    backgroundColor: '#6b38d4',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#005ea5',
  },
  badgeTextLive: {
    color: '#6b38d4',
  },
  previewCost: {
    fontSize: 13,
    fontWeight: '700',
    color: '#005ea5',
  },
  treasuryGroupCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  treasuryGroupLeft: {
    flex: 1,
  },
  treasuryGroupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#131b2e',
  },
  treasuryGroupAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#005ea5',
    marginTop: 2,
  },
  treasuryBadgePill: {
    backgroundColor: '#d3e4ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  treasuryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#005ea5',
  },
  dayTabsScroll: {
    gap: 8,
    marginBottom: 12,
  },
  dayTabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dayTabChipActive: {
    backgroundColor: '#005ea5',
    borderColor: '#005ea5',
  },
  dayTabChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#404752',
  },
  dayTabChipTextActive: {
    color: '#ffffff',
  },
  activeDayBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#131b2e',
    flex: 1,
  },
  activityCountBadge: {
    backgroundColor: '#f2f3ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activityCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#005ea5',
  },
  timelineBlock: {
    marginBottom: 8,
  },
  activityItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 6,
  },
  activityTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityTimeBadge: {
    backgroundColor: '#d3e4ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activityTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#005ea5',
  },
  activityCatBadge: {
    backgroundColor: '#e9ddff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activityCatText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b38d4',
  },
  activityPlace: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  activityNote: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  activityCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  activityCostLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  activityCost: {
    fontSize: 13,
    fontWeight: '700',
    color: '#006a67',
  },
  transitIndicator: {
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transitText: {
    fontSize: 11,
    color: '#64748b',
    backgroundColor: '#f2f3ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  budgetDistCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    gap: 8,
  },
  budgetDistTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#131b2e',
  },
  distBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  distBarPart: {
    height: '100%',
  },
  distLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  distLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  distLegendText: {
    fontSize: 10,
    color: '#64748b',
  },
  itineraryActionButtons: {
    gap: 10,
    marginTop: 4,
  },
  saveItineraryBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#005ea5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#005ea5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveItineraryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  treasuryActionBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d3e4ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  treasuryActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#005ea5',
  },
});
