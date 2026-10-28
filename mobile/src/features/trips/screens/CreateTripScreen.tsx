import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { authStorage } from '@/services/auth/authStorage';
import { AuthGatekeeperCard } from '@/components/feedback/AuthGatekeeperCard';
import { AppText } from '@/components/ui/AppText';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { tokens } from '@/theme/tokens';
import { tripApi } from '../services/tripApi';
import { LockIcon, GlobeIcon, SparkleIcon, CheckIcon } from '@/components/icons/StitchIcons';

const POPULAR_DESTINATIONS = [
  'Đà Nẵng',
  'Phú Quốc',
  'Hà Nội',
  'Đà Lạt',
  'Hội An',
  'Nha Trang',
];

export function CreateTripScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const checkAuth = useCallback(async () => {
    const token = await authStorage.getAccessToken();
    setIsAuthenticated(!!token);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useFocusEffect(
    useCallback(() => {
      checkAuth();
    }, [checkAuth])
  );

  const today = new Date().toISOString().split('T')[0];
  const next3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(next3Days);
  const [destinationSummary, setDestinationSummary] = useState('');
  const [budgetTotal, setBudgetTotal] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [aiSuggestionsEnabled, setAiSuggestionsEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề chuyến đi');
      return;
    }
    if (!startDate.trim() || !endDate.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập ngày bắt đầu và kết thúc (Định dạng YYYY-MM-DD)');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate.trim()) || !dateRegex.test(endDate.trim())) {
      Alert.alert('Lỗi định dạng ngày', 'Vui lòng nhập ngày theo định dạng YYYY-MM-DD (Ví dụ: 2026-11-01)');
      return;
    }

    if (startDate.trim() < today) {
      Alert.alert('Lỗi ngày', 'Ngày bắt đầu không được chọn trong quá khứ!');
      return;
    }

    if (endDate.trim() < startDate.trim()) {
      Alert.alert('Lỗi', 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
      return;
    }

    let budgetNum: number | undefined = undefined;
    if (budgetTotal.trim()) {
      budgetNum = parseFloat(budgetTotal.trim());
      if (isNaN(budgetNum) || budgetNum < 0) {
        Alert.alert('Lỗi', 'Ngân sách dự kiến phải là số không âm');
        return;
      }
    }

    setSubmitting(true);
    try {
      const created = await tripApi.createTrip({
        title: title.trim(),
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        destinationSummary: destinationSummary.trim() || undefined,
        budgetTotal: budgetNum,
        currency: 'VND',
        visibility: isPrivate ? 'PRIVATE' : 'PUBLIC',
      });

      Alert.alert(
        'Thành công',
        `Chuyến đi "${created.title}" đã được tạo thành công! Bạn là Chủ chuyến đi.`,
        [
          {
            text: 'Xem chi tiết',
            onPress: () => router.replace(`/trip/${created.id}`),
          },
        ]
      );
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Không thể tạo chuyến đi. Vui lòng kiểm tra lại thông tin.';
      Alert.alert('Lỗi tạo chuyến đi', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: tokens.colors.canvas }}>
        <ActivityIndicator size="large" color={tokens.colors.primary} />
      </View>
    );
  }

  if (isAuthenticated === false) {
    return (
      <ScrollView contentContainerStyle={[styles.container, { justifyContent: 'center', flexGrow: 1 }]}>
        <AuthGatekeeperCard
          title="Tạo chuyến đi mới"
          description="Bạn cần đăng nhập hoặc tạo tài khoản VISTA để bắt đầu xây dựng lịch trình và mời bạn bè tham gia chuyến đi."
          iconType="trips"
        />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <AppText style={styles.title}>Tạo chuyến đi mới</AppText>
          <AppText style={styles.subtitle}>
            Lên kế hoạch du lịch và mời bạn bè cùng tham gia
          </AppText>
        </View>

        <View style={styles.formGroup}>
          <AppText style={styles.label}>Tên chuyến đi *</AppText>
          <AppInput
            placeholder="Ví dụ: Khám phá Đà Nẵng 3 ngày 2 đêm"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.formGroup}>
          <AppText style={styles.label}>Điểm đến hoặc khu vực</AppText>
          <AppInput
            placeholder="Ví dụ: Đà Nẵng, Quảng Nam"
            value={destinationSummary}
            onChangeText={setDestinationSummary}
          />
          {/* Quick Destination Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsContent}
          >
            <AppText style={styles.chipHint}>Gợi ý:</AppText>
            {POPULAR_DESTINATIONS.map((dest) => {
              const isSelected = destinationSummary.includes(dest);
              return (
                <TouchableOpacity
                  key={dest}
                  style={[styles.destChip, isSelected && styles.destChipActive]}
                  onPress={() => setDestinationSummary(dest)}
                  activeOpacity={0.8}
                >
                  {isSelected ? (
                    <CheckIcon size={12} color="#ffffff" style={{ marginRight: 4 }} />
                  ) : null}
                  <AppText
                    style={[styles.destChipText, isSelected && styles.destChipTextActive]}
                  >
                    {dest}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <AppText style={styles.label}>Ngày đi (YYYY-MM-DD) *</AppText>
            <AppInput
              placeholder="2026-11-01"
              value={startDate}
              onChangeText={setStartDate}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <AppText style={styles.label}>Ngày về (YYYY-MM-DD) *</AppText>
            <AppInput
              placeholder="2026-11-03"
              value={endDate}
              onChangeText={setEndDate}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <AppText style={styles.label}>Ngân sách dự kiến (VND)</AppText>
          <AppInput
            placeholder="Ví dụ: 15000000"
            keyboardType="numeric"
            value={budgetTotal}
            onChangeText={setBudgetTotal}
          />
        </View>

        {/* Privacy Selector */}
        <View style={styles.formGroup}>
          <AppText style={styles.label}>Quyền riêng tư</AppText>
          <View style={styles.privacyContainer}>
            <TouchableOpacity
              style={[styles.privacyCard, isPrivate && styles.privacyCardSelected]}
              onPress={() => setIsPrivate(true)}
              activeOpacity={0.85}
            >
              <View style={styles.privacyIconWrap}>
                <LockIcon size={18} color={isPrivate ? tokens.colors.primary : tokens.colors.textMuted} />
              </View>
              <View style={styles.privacyMeta}>
                <View style={styles.privacyHeaderRow}>
                  <AppText style={[styles.privacyTitle, isPrivate && styles.privacyTitleActive]}>
                    Chỉ thành viên được mời
                  </AppText>
                  {isPrivate ? (
                    <View style={styles.recommendedBadge}>
                      <AppText style={styles.recommendedBadgeText}>Khuyên dùng</AppText>
                    </View>
                  ) : null}
                </View>
                <AppText style={styles.privacyDesc}>
                  Chỉ những người nhận được mã mời mới xem & chỉnh sửa.
                </AppText>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.privacyCard, !isPrivate && styles.privacyCardSelected]}
              onPress={() => setIsPrivate(false)}
              activeOpacity={0.85}
            >
              <View style={styles.privacyIconWrap}>
                <GlobeIcon size={18} color={!isPrivate ? tokens.colors.primary : tokens.colors.textMuted} />
              </View>
              <View style={styles.privacyMeta}>
                <AppText style={[styles.privacyTitle, !isPrivate && styles.privacyTitleActive]}>
                  Công khai trên VISTA Community
                </AppText>
                <AppText style={styles.privacyDesc}>
                  Mọi người có thể tìm kiếm và tham khảo lịch trình của nhóm.
                </AppText>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Itinerary Toggle */}
        <View style={styles.aiCard}>
          <View style={styles.aiLeft}>
            <View style={styles.aiIconWrap}>
              <SparkleIcon size={18} color="#ffffff" />
            </View>
            <View style={styles.aiMeta}>
              <View style={styles.aiHeaderRow}>
                <AppText style={styles.aiTitle}>VISTA AI Lịch trình</AppText>
                <View style={styles.aiBadge}>
                  <AppText style={styles.aiBadgeText}>Thông minh</AppText>
                </View>
              </View>
              <AppText style={styles.aiDesc}>
                Tự động đề xuất lịch trình tối ưu điểm đến & thời gian di chuyển.
              </AppText>
            </View>
          </View>
          <Switch
            value={aiSuggestionsEnabled}
            onValueChange={setAiSuggestionsEnabled}
            trackColor={{ false: '#cbd5e1', true: tokens.colors.aiCoPilot }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.actions}>
          <AppButton
            label={submitting ? 'Đang tạo...' : 'Tạo chuyến đi'}
            onPress={handleSubmit}
            disabled={submitting}
          />
          <AppButton
            label="Hủy bỏ"
            variant="secondary"
            onPress={() => router.back()}
            disabled={submitting}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: tokens.spacing.md,
    gap: tokens.spacing.md,
    backgroundColor: tokens.colors.canvas,
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    marginBottom: tokens.spacing.xs,
  },
  title: {
    fontSize: tokens.font.heading,
    fontWeight: '800',
    color: tokens.colors.ink,
  },
  subtitle: {
    fontSize: tokens.font.body,
    color: tokens.colors.textMuted,
    marginTop: 4,
  },
  formGroup: {
    gap: tokens.spacing.xs,
  },
  label: {
    fontSize: tokens.font.small,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  row: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
  },
  chipsScroll: {
    marginTop: 4,
  },
  chipsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipHint: {
    fontSize: 11,
    fontWeight: '700',
    color: tokens.colors.textMuted,
    textTransform: 'uppercase',
    marginRight: 4,
  },
  destChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: tokens.colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  destChipActive: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  },
  destChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: tokens.colors.textSecondary,
  },
  destChipTextActive: {
    color: '#ffffff',
  },
  privacyContainer: {
    gap: 8,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    gap: 10,
  },
  privacyCardSelected: {
    backgroundColor: tokens.colors.primarySoft,
    borderColor: tokens.colors.primaryLight,
  },
  privacyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: tokens.colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyMeta: {
    flex: 1,
  },
  privacyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  privacyTitleActive: {
    color: tokens.colors.primaryDark,
  },
  recommendedBadge: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  privacyDesc: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: tokens.colors.aiSoft,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b2e3e7',
    gap: 10,
  },
  aiLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  aiIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: tokens.colors.aiCoPilot,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiMeta: {
    flex: 1,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  aiBadge: {
    backgroundColor: tokens.colors.aiCoPilot,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  aiDesc: {
    fontSize: 11,
    color: tokens.colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    marginTop: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
});
