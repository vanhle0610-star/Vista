import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { tokens } from '@/theme/tokens';
import { api } from '@/services/api/client';
import { LocationController } from '@/features/map/locationController';
import {
  FEELINGS,
  nearbyPlaces,
  normalizeSearch,
  formatDistance,
  PLACE_PAGE_SIZE,
  type FeelingCode,
  type Place,
  type PlacePage,
} from './model';
import { usePlaceSearch } from './usePlaceSearch';

export function PublicAvatar({
  author,
}: {
  author?: { displayName?: string | null; avatarUrl?: string | null } | null;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = author?.avatarUrl;
  return url && /^https?:\/\//.test(url) && failedUrl !== url ? (
    <Image
      source={{ uri: url }}
      onError={() => setFailedUrl(url)}
      style={ui.avatar}
      accessibilityLabel={`Avatar ${author?.displayName || 'Người dùng VISTA'}`}
    />
  ) : (
    <View style={ui.avatar}>
      <AppText>
        {author?.displayName?.trim().slice(0, 1).toUpperCase() || 'V'}
      </AppText>
    </View>
  );
}

function PickerModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={ui.screen}>
        <KeyboardAvoidingView
          style={ui.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={ui.header}>
            <View style={ui.flex}>
              <AppText style={ui.eyebrow}>CHIA SẺ CÙNG VISTA</AppText>
              <AppText accessibilityRole="header" style={ui.title}>
                {title}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng popup"
              onPress={onClose}
              style={ui.close}
            >
              <AppText style={ui.closeText}>×</AppText>
            </Pressable>
          </View>
          {children}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function SearchField({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (text: string) => void;
  label: string;
  placeholder: string;
}) {
  return (
    <View style={ui.searchRow}>
      <TextInput
        accessibilityLabel={label}
        placeholder={placeholder}
        placeholderTextColor={tokens.colors.muted}
        value={value}
        onChangeText={onChange}
        style={ui.searchInput}
        autoCorrect={false}
        returnKeyType="search"
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Xóa tìm kiếm"
          style={ui.close}
          onPress={() => onChange('')}
        >
          <AppText>×</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function FeelingPicker({
  value,
  onChange,
  onClose,
}: {
  value: string | null;
  onChange: (code: FeelingCode | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const { width } = useWindowDimensions();
  const items = FEELINGS.filter((item) =>
    normalizeSearch(item.label).includes(normalizeSearch(query)),
  );
  return (
    <PickerModal title="Bạn đang cảm thấy thế nào?" onClose={onClose}>
      <View style={ui.controls}>
        <SearchField
          value={query}
          onChange={setQuery}
          label="Tìm cảm xúc"
          placeholder="Tìm cảm xúc…"
        />
      </View>
      <ScrollView
        style={ui.flex}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={ui.list}
      >
        <AppText style={ui.sectionLabel}>Cảm xúc của bạn</AppText>
        <View style={ui.grid}>
          {items.map((item) => (
            <Pressable
              key={item.code}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: value === item.code }}
              style={({ pressed }) => [
                ui.feeling,
                { width: width < 380 ? '100%' : '48%' },
                (value === item.code || pressed) && ui.selected,
              ]}
              onPress={() => {
                onChange(item.code);
                onClose();
              }}
            >
              <AppText style={ui.emoji}>{item.icon}</AppText>
              <AppText style={ui.feelingLabel}>{item.label}</AppText>
              {value === item.code && <AppText style={ui.check}>✓</AppText>}
            </Pressable>
          ))}
        </View>
        {!items.length && (
          <AppText style={ui.muted} accessibilityLiveRegion="polite">
            Không tìm thấy cảm xúc phù hợp. Thử từ khóa khác nhé.
          </AppText>
        )}
      </ScrollView>
      <View style={ui.footer}>
        <AppText style={ui.muted}>Chọn một cảm xúc cho bài chia sẻ.</AppText>
        {value && (
          <AppButton
            label="Bỏ cảm xúc"
            variant="secondary"
            onPress={() => {
              onChange(null);
              onClose();
            }}
          />
        )}
      </View>
    </PickerModal>
  );
}

function usePickerLocation() {
  const [controller] = useState(
    () =>
      new LocationController({
        permission: Location.getForegroundPermissionsAsync,
        request: Location.requestForegroundPermissionsAsync,
        services: Location.hasServicesEnabledAsync,
        watch: (success, failure) =>
          Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, distanceInterval: 5 },
            (position) => success(position.coords),
            failure,
          ),
      }),
  );
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useEffect(() => {
    controller.setActive(AppState.currentState === 'active');
    controller.resumeOptIn();
    const sub = AppState.addEventListener('change', (value) =>
      controller.setActive(value === 'active'),
    );
    return () => {
      sub.remove();
      controller.setActive(false);
    };
  }, [controller]);
  return { ...state, request: controller.request };
}

const gpsErrors: Record<string, string> = {
  denied: 'Bạn chưa cấp quyền vị trí. Vẫn có thể tìm theo tên.',
  blocked:
    'Quyền vị trí bị chặn. Có thể cấp lại trong cài đặt thiết bị hoặc tìm theo tên.',
  'services-off': 'GPS đang tắt. Bật dịch vụ vị trí hoặc tìm theo tên.',
  timeout: 'Tìm vị trí quá lâu. Thử lại hoặc tìm theo tên.',
  unavailable: 'Chưa xác định được vị trí. Thử lại hoặc tìm theo tên.',
};

const fetchPlaces = async (
  keyword: string,
  page: number,
  signal: AbortSignal,
) =>
  (
    await api.get<PlacePage>('/destinations', {
      params: { keyword, page, size: PLACE_PAGE_SIZE },
      signal,
    })
  ).data;
function PlaceImage({ place }: { place: Place }) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={ui.placeImage}>
      <AppText>📍</AppText>
      {place.imageUrl && /^https?:\/\//.test(place.imageUrl) && !failed && <Image
        source={{ uri: place.imageUrl }}
        onError={() => setFailed(true)}
        style={[ui.placeImage, StyleSheet.absoluteFillObject]}
      />}
    </View>
  );
}
export function PlacePicker({
  value,
  onSelect,
  onClose,
}: {
  value?: string | null;
  onSelect: (place: Place) => void;
  onClose: () => void;
}) {
  const search = usePlaceSearch(fetchPlaces);
  const gps = usePickerLocation();
  const validGps =
    gps.position &&
    Number.isFinite(gps.position.latitude) &&
    Number.isFinite(gps.position.longitude) &&
    Math.abs(gps.position.latitude) <= 90 &&
    Math.abs(gps.position.longitude) <= 180
      ? gps.position
      : null;
  const items = nearbyPlaces(search.places, validGps, Infinity);
  return (
    <PickerModal title="Gắn địa điểm" onClose={onClose}>
      <View style={ui.controls}>
        <SearchField
          value={search.query}
          onChange={search.setQuery}
          label="Tìm địa điểm"
          placeholder="Tìm địa điểm…"
        />
        <AppText style={ui.muted}>
          Dùng vị trí để ưu tiên địa điểm gần bạn. Bạn vẫn có thể tìm theo tên.
        </AppText>
        <Pressable
          style={ui.gpsButton}
          accessibilityRole="button"
          disabled={['requesting', 'denied', 'blocked'].includes(gps.status)}
          onPress={() => {
            void gps.request();
          }}
        >
          <AppText style={ui.link}>
            {gps.status === 'requesting'
              ? 'Đang định vị…'
              : validGps
                ? 'Cập nhật vị trí'
                : 'Dùng vị trí của tôi'}
          </AppText>
        </Pressable>
        {gpsErrors[gps.status] && (
          <AppText style={ui.muted} accessibilityLiveRegion="polite">
            {gpsErrors[gps.status]}
          </AppText>
        )}
      </View>
      <FlatList
        style={ui.flex}
        data={items}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={ui.list}
        ListHeaderComponent={
          <View style={ui.gap}>
            <AppText style={ui.sectionLabel}>
              {search.query.trim()
                ? 'Kết quả tìm kiếm'
                : validGps
                  ? 'Gần bạn'
                  : 'Địa điểm gợi ý'}
            </AppText>
            {validGps && (
              <AppText style={ui.muted}>
                Ưu tiên gần trong các kết quả đã tải; chưa tìm gần nhất toàn hệ
                thống. Khoảng cách đường chim bay ước tính.
                {gps.approximate ? ' Độ chính xác GPS thấp.' : ''}
              </AppText>
            )}
          </View>
        }
        ListEmptyComponent={
          !search.loading && !search.error ? (
            <AppText style={ui.empty}>
              Không tìm thấy địa điểm phù hợp. Thử tên hoặc khu vực khác.
            </AppText>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.name}
            accessibilityState={{ selected: value === item.id }}
            style={({ pressed }) => [
              ui.place,
              (pressed || value === item.id) && ui.selected,
            ]}
            onPress={() => {
              onSelect(item);
              onClose();
            }}
          >
            <PlaceImage place={item} />
            <View style={ui.flex}>
              <AppText style={ui.strong}>{item.name}</AppText>
              <AppText style={ui.muted}>
                {item.province || item.area || 'Địa điểm VISTA'}
              </AppText>
              {Number.isFinite(item.distance) && (
                <AppText style={ui.link}>
                  {formatDistance(item.distance)}
                </AppText>
              )}
            </View>
            {value === item.id && <AppText style={ui.check}>✓</AppText>}
          </Pressable>
        )}
        ListFooterComponent={
          <View style={ui.gap}>
            {search.loading && (
              <ActivityIndicator
                color={tokens.colors.primary}
                accessibilityLabel="Đang tải địa điểm"
              />
            )}
            {search.error && (
              <>
                <AppText style={ui.muted} accessibilityLiveRegion="polite">
                  Không tải được địa điểm. Vui lòng thử lại.
                </AppText>
                <AppButton
                  label="Thử lại địa điểm"
                  variant="secondary"
                  onPress={search.retry}
                />
              </>
            )}
            {search.hasMore && !search.error && (
              <AppButton
                label="Tải thêm địa điểm"
                variant="secondary"
                disabled={search.loading}
                onPress={search.loadMore}
              />
            )}
          </View>
        }
      />
      <View style={ui.footer}>
        <AppText style={ui.muted}>
          Địa điểm bạn chọn sẽ xuất hiện cùng bài đăng.
        </AppText>
      </View>
    </PickerModal>
  );
}
export function SelectionChip({
  label,
  onEdit,
  onRemove,
  disabled = false,
  kind,
}: {
  label: string;
  onEdit: () => void;
  onRemove: () => void;
  disabled?: boolean;
  kind: string;
}) {
  return (
    <View style={ui.chipRow}>
      <Pressable
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={'Đổi ' + kind}
        style={ui.chipEdit}
        onPress={onEdit}
      >
        <AppText style={ui.chipLabel}>{label}</AppText>
      </Pressable>
      <Pressable
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={'Bỏ ' + kind}
        style={ui.close}
        onPress={onRemove}
      >
        <AppText style={ui.link}>×</AppText>
      </Pressable>
    </View>
  );
}
export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.colors.canvas },
  flex: { flex: 1 },
  list: { padding: 16, gap: 8, paddingBottom: 20 },
  gap: { gap: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  controls: { padding: 16, gap: 10 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: tokens.colors.cyan },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: tokens.colors.muted },
  muted: { color: tokens.colors.muted, fontSize: 12, lineHeight: 18 },
  strong: { fontWeight: '700', flexShrink: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  feeling: {
    minHeight: 60,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  feelingLabel: { fontSize: 14, flexShrink: 1 },
  selected: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.tagBg,
  },
  emoji: { fontSize: 27, lineHeight: 34 },
  check: { color: tokens.colors.cyan, marginLeft: 'auto' },
  input: {
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    borderRadius: 12,
    padding: 12,
    backgroundColor: tokens.colors.surface,
    color: tokens.colors.ink,
    minHeight: 48,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: tokens.colors.ink,
    fontSize: 15,
  },
  close: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  closeText: { color: tokens.colors.muted, fontSize: 26, lineHeight: 30 },
  gpsButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  link: { color: tokens.colors.primaryLight, fontSize: 12 },
  placeImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: tokens.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  place: {
    padding: 12,
    minHeight: 76,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  empty: {
    color: tokens.colors.muted,
    textAlign: 'center',
    padding: 24,
    fontSize: 13,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
    gap: 8,
  },
  chip: {
    borderRadius: 16,
    backgroundColor: tokens.colors.tagBg,
    padding: 8,
    color: tokens.colors.primaryLight,
    fontSize: 13,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: tokens.colors.tagBg,
  },
  chipEdit: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  chipLabel: { fontSize: 13, color: tokens.colors.primaryLight },
});
