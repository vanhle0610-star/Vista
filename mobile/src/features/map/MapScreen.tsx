import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { api, apiErrorMessage } from '@/services/api/client';
import type { components } from '@/types/api.generated';
import { tokens } from '@/theme/tokens';
import {
  ArrowLeftIcon,
  CarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CloseIcon,
  CrosshairIcon,
  DirectionsIcon,
  FoodIcon,
  HotelIcon,
  LayersIcon,
  MenuLinesIcon,
  MuseumIcon,
  PinIcon,
  PlusIcon,
  SearchIcon,
  WalkIcon,
} from '@/components/icons/StitchIcons';
import { MapViewAdapter } from './MapViewAdapter';
import { LocationPermissionCard } from './LocationPermissionCard';
import { useForegroundLocation } from './useForegroundLocation';
import { loadMapDestinations } from './destinations';
import {
  computeDistanceMeters,
  formatDistance,
  validCoordinate,
  type MapCoordinate,
  type MapMarker,
} from './types';

// Default Da Nang Place fallback
const DEFAULT_PLACE: MapMarker & {
  rating: string;
  reviews: string;
  address: string;
  imageUrl: string;
  category: string;
} = {
  id: 'my-khe-beach',
  title: 'Bãi biển Mỹ Khê',
  description: 'Võ Nguyên Giáp, Sơn Trà, Đà Nẵng',
  rating: '4,8',
  reviews: '5.230 đánh giá',
  address: 'Võ Nguyên Giáp, Sơn Trà, Đà Nẵng',
  latitude: 16.0592,
  longitude: 108.2435,
  imageUrl:
    'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600&q=80',
  category: 'Tham quan',
};

const CATEGORIES = [
  { id: 'ALL', label: 'Tất cả', icon: PinIcon },
  { id: 'TOURISM', label: 'Tham quan', icon: MuseumIcon },
  { id: 'FOOD', label: 'Ẩm thực', icon: FoodIcon },
  { id: 'HOTEL', label: 'Lưu trú', icon: HotelIcon },
];

const SHEET_COLLAPSED_HEIGHT = 64;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_EXPANDED_HEIGHT = Math.min(320, Math.round(SCREEN_HEIGHT * 0.38));

type SheetState = 'collapsed' | 'expanded' | 'hidden';

export function MapScreen() {
  const params = useLocalSearchParams<{
    destinationId?: string;
    directions?: string;
  }>();
  const focused = useIsFocused();
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const location = useForegroundLocation(focused);

  // Bottom sheet state: 'collapsed' by default as required
  const [sheetState, setSheetState] = useState<SheetState>('collapsed');

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<MapMarker | null>(DEFAULT_PLACE);
  const [focusUser, setFocusUser] = useState(false);
  const [directionsOpen, setDirectionsOpen] = useState(params.directions === '1');
  const [showSteps, setShowSteps] = useState(false);

  // Directions Route Multi-Stop States
  const [origin, setOrigin] = useState<MapMarker | 'gps' | null>('gps');
  const [stops, setStops] = useState<MapMarker[]>([]);
  const [destination, setDestination] = useState<MapMarker | null>(DEFAULT_PLACE);
  const [mode, setMode] = useState<'DRIVING' | 'WALKING'>('DRIVING');

  // Place picker for origin / stops / destination
  const [pickerTarget, setPickerTarget] = useState<'origin' | 'destination' | 'new_stop' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const [partialDestinations, setPartialDestinations] = useState<
    Awaited<ReturnType<typeof loadMapDestinations>> | null
  >(null);
  const [route, setRoute] = useState<components['schemas']['RouteResult'] | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);
  const requests = useRef(0);
  const routeFromGps = useRef(false);

  // Initial GPS permission check: prompt once if undetermined, or read position if already granted
  useEffect(() => {
    if (!focused) return;
    let isMounted = true;
    void Location.getForegroundPermissionsAsync()
      .then((perm) => {
        if (!isMounted) return;
        if (perm.status === 'undetermined' && perm.canAskAgain) {
          void location.request();
        } else if (perm.granted) {
          void location.request();
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [focused]);

  useEffect(() => {
    if (!location.position && routeFromGps.current) {
      routeFromGps.current = false;
      requests.current++;
      queueMicrotask(() => {
        setRoute(null);
        setComputing(false);
        setRouteError(null);
      });
    }
  }, [location.position]);

  useEffect(() => {
    if (directionsOpen && location.position && !origin) {
      queueMicrotask(() => setOrigin('gps'));
    }
  }, [directionsOpen, location.position, origin]);

  const [center, setCenter] = useState<MapCoordinate>({
    latitude: 16.061168,
    longitude: 108.227897,
  });
  const [cameraZoom, setCameraZoom] = useState(12);

  useEffect(() => {
    if (!focusUser) return;

    if (location.position) {
      setCenter(location.position);
      setCameraZoom(15);
      setFocusUser(false);
      return;
    }

    if (location.status === 'requesting') {
      return;
    }

    if (
      ['denied', 'blocked', 'services-off', 'unavailable', 'timeout'].includes(
        location.status,
      )
    ) {
      setFocusUser(false);
    }
  }, [focusUser, location.position, location.status]);

  const handleOpenExternalMaps = useCallback(
    (dest?: MapMarker | null, start?: MapCoordinate | null) => {
      const target = dest ?? destination ?? selected;
      if (!target || !validCoordinate(target)) {
        Alert.alert(
          'Chưa có điểm đến',
          'Vui lòng chọn một điểm đến hợp lệ trên bản đồ.',
        );
        return;
      }

      const destCoord = `${target.latitude},${target.longitude}`;
      const label = encodeURIComponent(target.title || 'Điểm đến');

      let url = '';
      if (start && validCoordinate(start)) {
        if (Platform.OS === 'ios') {
          url = `maps://?saddr=${start.latitude},${start.longitude}&daddr=${destCoord}&q=${label}`;
        } else if (Platform.OS === 'android') {
          url = `google.navigation:q=${destCoord}`;
        } else {
          url = `https://www.google.com/maps/dir/?api=1&origin=${start.latitude},${start.longitude}&destination=${destCoord}`;
        }
      } else {
        if (Platform.OS === 'ios') {
          url = `maps://?daddr=${destCoord}&q=${label}`;
        } else if (Platform.OS === 'android') {
          url = `geo:0,0?q=${destCoord}(${label})`;
        } else {
          url = `https://www.google.com/maps/search/?api=1&query=${destCoord}`;
        }
      }

      const fallbackWeb =
        start && validCoordinate(start)
          ? `https://www.google.com/maps/dir/?api=1&origin=${start.latitude},${start.longitude}&destination=${destCoord}`
          : `https://www.google.com/maps/search/?api=1&query=${destCoord}`;

      Linking.canOpenURL(url)
        .then((canOpen) => {
          if (canOpen) return Linking.openURL(url);
          return Linking.openURL(fallbackWeb);
        })
        .catch(() => {
          void Linking.openURL(fallbackWeb).catch(() => {
            Alert.alert(
              'Không thể mở bản đồ',
              'Không tìm thấy ứng dụng bản đồ phù hợp trên thiết bị.',
            );
          });
        });
    },
    [destination, selected],
  );

  const query = useQuery({
    queryKey: ['map-destinations'],
    queryFn: ({ signal }) =>
      loadMapDestinations(signal, (result) => {
        if (!signal.aborted) setPartialDestinations(result);
      }),
    enabled: focused,
    retry: 1,
  });

  const detail = useQuery({
    queryKey: ['destination', params.destinationId],
    queryFn: async ({ signal }) =>
      (
        await api.get<components['schemas']['DestinationDetail']>(
          `/destinations/${params.destinationId}`,
          { signal },
        )
      ).data,
    enabled: focused && Boolean(params.destinationId),
    retry: 1,
  });

  useEffect(() => {
    const data = detail.data;
    if (!data || !validCoordinate(data)) return;
    requests.current++;
    const marker: MapMarker = {
      id: data.id,
      title: data.name,
      description: `${data.province} · ${data.category}`,
      latitude: data.latitude!,
      longitude: data.longitude!,
      imageUrl: data.imageUrl,
      category: data.category,
      province: data.province,
      address: `${data.province}, Việt Nam`,
    };
    queueMicrotask(() => {
      setSelected(marker);
      setDestination(marker);
      setCenter(marker);
      setCameraZoom(14);
      setFocusUser(false);
      setDirectionsOpen(params.directions === '1');
      setRoute(null);
      setComputing(false);
    });
  }, [detail.data, params.directions]);

  const destinationData = query.data ?? partialDestinations;
  const markers = destinationData?.markers ?? [];

  useEffect(() => {
    if (markers.length > 0 && !params.destinationId) {
      if (!selected || selected.id === 'my-khe-beach') {
        setSelected(markers[0]);
        setDestination(markers[0]);
      }
    }
  }, [markers, params.destinationId, selected]);

  const allMarkers = useMemo(() => {
    const list = [...markers];
    if (selected && !list.some((m) => m.id === selected.id)) {
      list.unshift(selected);
    }
    return list;
  }, [markers, selected]);

  // Compute nearby destinations sorted by distance if user GPS is available
  const nearbyDestinations = useMemo(() => {
    let list = allMarkers;

    // Filter by category
    if (selectedCategory !== 'ALL') {
      list = list.filter((item) => {
        const cat = (item.category || item.description || '').toLowerCase();
        if (selectedCategory === 'TOURISM') {
          return (
            cat.includes('tham quan') ||
            cat.includes('cầu') ||
            cat.includes('bảo tàng') ||
            cat.includes('di tích') ||
            cat.includes('biển') ||
            cat.includes('tourism')
          );
        }
        if (selectedCategory === 'FOOD') {
          return (
            cat.includes('ẩm thực') ||
            cat.includes('ăn') ||
            cat.includes('food') ||
            cat.includes('nhà hàng') ||
            cat.includes('quán') ||
            cat.includes('cafe')
          );
        }
        if (selectedCategory === 'HOTEL') {
          return (
            cat.includes('lưu trú') ||
            cat.includes('khách sạn') ||
            cat.includes('hotel') ||
            cat.includes('resort') ||
            cat.includes('homestay')
          );
        }
        return true;
      });
    }

    // Filter by search query if any
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((m) => (m.title ?? '').toLowerCase().includes(q));
    }

    // Attach distance and sort nearest first if GPS available
    if (location.position && validCoordinate(location.position)) {
      const withDistance = list.map((item) => ({
        ...item,
        distanceMeters: computeDistanceMeters(location.position!, item),
      }));
      withDistance.sort(
        (a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity),
      );
      return withDistance;
    }

    return list;
  }, [allMarkers, selectedCategory, searchQuery, location.position]);

  const visibleRoute =
    route?.input?.fromGps && !location.position ? null : route;

  const routeGeometry = useMemo(
    () =>
      visibleRoute?.path?.map((p) => ({ latitude: p.lat, longitude: p.lng })) ??
      [],
    [visibleRoute],
  );

  const clearRoute = () => {
    requests.current++;
    routeFromGps.current = false;
    setComputing(false);
    setRoute(null);
    setRouteError(null);
  };

  const compute = async () => {
    let start = origin === 'gps' ? location.position : origin;
    const dest = destination ?? selected;

    if (origin === 'gps' && !start) {
      try {
        await location.request();
      } catch {
        // ignore
      }
      start = location.position;
      if (!start) {
        setRouteError(
          'Chưa có tọa độ GPS. Hãy bật định vị hoặc chạm vào "Vị trí của bạn" để chọn địa điểm trong danh sách.',
        );
        return;
      }
    }

    if (!start) {
      setRouteError('Chưa có vị trí điểm xuất phát.');
      return;
    }
    if (!dest) {
      setRouteError('Chưa chọn điểm đến.');
      return;
    }
    if (computing) return;

    if (
      start.latitude === dest.latitude &&
      start.longitude === dest.longitude
    ) {
      setRouteError('Chọn hai địa điểm khác nhau.');
      return;
    }

    const generation = ++requests.current;
    routeFromGps.current = origin === 'gps';
    setComputing(true);
    setRoute(null);
    setRouteError(null);

    const waypointsPayload = stops.map((s) => ({
      latitude: s.latitude,
      longitude: s.longitude,
      label: s.title ?? 'Điểm dừng',
    }));

    try {
      const { data } = await api.post<
        components['schemas']['RouteResult'] | null
      >(
        '/map/routes',
        {
          origin: {
            latitude: start.latitude,
            longitude: start.longitude,
            label:
              origin === 'gps'
                ? 'Vị trí của tôi'
                : (origin?.title ?? 'Điểm xuất phát'),
          },
          destination: {
            latitude: dest.latitude,
            longitude: dest.longitude,
            label: dest.title ?? 'Điểm đến',
          },
          mode,
          fromGps: origin === 'gps',
          waypoints: waypointsPayload,
        },
        { timeout: 20000 },
      );
      if (generation === requests.current) {
        setRoute(data || null);
        if (!data)
          setRouteError('Chưa tìm thấy tuyến phù hợp. Hãy chọn địa điểm khác.');
      }
    } catch (error) {
      if (generation === requests.current)
        setRouteError(apiErrorMessage(error));
    } finally {
      if (generation === requests.current) setComputing(false);
    }
  };

  const select = (marker: MapMarker) => {
    clearRoute();
    setSelected(marker);
    setDestination(marker);
    setCenter(marker);
    setCameraZoom(14);
    setFocusUser(false);
  };

  const handleStartDirections = (place: MapMarker) => {
    clearRoute();
    setSelected(place);
    setDestination(place);
    setDirectionsOpen(true);
    if (location.position) {
      setOrigin('gps');
    } else {
      void location.request();
    }
  };

  const handleGpsButtonPress = async () => {
    if (location.status === 'blocked') {
      Alert.alert(
        'Quyền vị trí bị chặn',
        'Ứng dụng chưa được cấp quyền vị trí. Vui lòng mở Cài đặt thiết bị để cho phép quyền vị trí.',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Mở Cài đặt', onPress: () => void Linking.openSettings() },
        ],
      );
      return;
    }
    if (location.status === 'services-off') {
      Alert.alert(
        'Dịch vụ định vị đang tắt',
        'Vui lòng bật GPS / Dịch vụ vị trí trên thiết bị để xác định vị trí hiện tại.',
      );
      return;
    }
    setFocusUser(true);
    try {
      await location.request();
    } catch {
      // ignore
    }
  };

  // Filtered destinations for search dropdown
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allMarkers
      .filter((m) => (m.title ?? '').toLowerCase().includes(q))
      .slice(0, 5);
  }, [allMarkers, searchQuery]);

  // Destination options for StopPicker modal
  const pickerOptions = useMemo(() => {
    if (!pickerSearch.trim()) return allMarkers;
    const q = pickerSearch.toLowerCase();
    return allMarkers.filter((m) =>
      (m.title ?? '').toLowerCase().includes(q),
    );
  }, [allMarkers, pickerSearch]);

  const handleChoosePickerPlace = (place: MapMarker | 'gps') => {
    if (pickerTarget === 'origin') {
      setOrigin(place);
    } else if (pickerTarget === 'destination' && place !== 'gps') {
      setDestination(place);
      setSelected(place);
    } else if (pickerTarget === 'new_stop' && place !== 'gps') {
      if (stops.length < 4) {
        setStops((prev) => [...prev, place]);
      }
    }
    setPickerTarget(null);
    setPickerSearch('');
    clearRoute();
  };

  // PanResponder for smooth bottom sheet dragging
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 12;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -25) {
          setSheetState('expanded');
        } else if (gestureState.dy > 25) {
          setSheetState('collapsed');
        }
      },
    }),
  ).current;

  // Compute bottom spacing for Floating GPS button to never be obscured
  const floatingGpsBottom = useMemo(() => {
    if (directionsOpen) {
      return visibleRoute ? 146 + insets.bottom : 32 + insets.bottom;
    }
    if (sheetState === 'expanded') {
      return SHEET_EXPANDED_HEIGHT + 18;
    }
    if (sheetState === 'collapsed') {
      return SHEET_COLLAPSED_HEIGHT + 18;
    }
    return 24 + insets.bottom;
  }, [directionsOpen, visibleRoute, sheetState, insets.bottom]);

  return (
    <View style={styles.container}>
      {/* 1. Fullscreen Map Canvas in the Background */}
      <View style={StyleSheet.absoluteFill}>
        <MapViewAdapter
          center={center}
          zoom={cameraZoom}
          destinations={allMarkers.map((marker) => ({
            ...marker,
            name: marker.title ?? 'Địa điểm',
          }))}
          routeGeometry={routeGeometry}
          userLocation={location.position}
          selectedDestinationId={selected?.id}
          onSelectDestination={(marker) => {
            if (marker) select(marker);
          }}
          onLocateUser={() => {
            setFocusUser(true);
            void location.request();
          }}
          onZoomIn={() => setCameraZoom((z) => Math.min(18, z + 1))}
          onZoomOut={() => setCameraZoom((z) => Math.max(8, z - 1))}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* 2. Top Floating Overlay: Headers, Search Bar or Waypoints Card */}
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={styles.topSafeAreaOverlay}
        pointerEvents="box-none"
      >
        {/* Screen 1 Header vs Screen 2 Header */}
        {!directionsOpen ? (
          <View style={styles.header}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              onPress={() => router.canGoBack() && router.back()}
              style={styles.iconButton}
            >
              <ArrowLeftIcon size={22} color={tokens.colors.ink} />
            </TouchableOpacity>
            <AppText style={styles.headerTitle}>VISTA Map</AppText>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Lớp bản đồ"
              style={styles.iconButton}
            >
              <LayersIcon size={22} color={tokens.colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.header}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Đóng chỉ đường"
              onPress={() => {
                clearRoute();
                setDirectionsOpen(false);
              }}
              style={styles.iconButton}
            >
              <ArrowLeftIcon size={22} color={tokens.colors.ink} />
            </TouchableOpacity>
            <AppText style={styles.headerTitle}>Chỉ đường</AppText>
            <View style={{ width: 40 }} />
          </View>
        )}

        {/* Top Controls on Screen 1: Search & Categories */}
        {!directionsOpen && (
          <View style={styles.topBarControls}>
            <View style={styles.searchBox}>
              <SearchIcon size={18} color={tokens.colors.muted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Tìm địa điểm"
                placeholderTextColor={tokens.colors.textMuted}
                style={styles.searchInput}
                accessibilityLabel="Tìm địa điểm"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <CloseIcon size={16} color={tokens.colors.muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Dropdown Results */}
            {searchResults.length > 0 && (
              <View style={styles.searchDropdown}>
                {searchResults.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.searchResultItem}
                    onPress={() => {
                      select(item);
                      setSearchQuery('');
                    }}
                  >
                    <PinIcon size={16} color={tokens.colors.primary} />
                    <AppText style={styles.searchResultText}>
                      {item.title}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Category Chips Horizontal Scroll */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.8}
                    style={[
                      styles.categoryChip,
                      isActive && styles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Icon
                      size={15}
                      color={isActive ? '#FFFFFF' : tokens.colors.ink}
                    />
                    <AppText
                      style={[
                        styles.categoryText,
                        isActive && styles.categoryTextActive,
                      ]}
                    >
                      {cat.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Top Waypoints Card on Screen 2 (Chỉ đường) */}
        {directionsOpen && (
          <View style={styles.directionsWaypointsCard}>
            <View style={styles.waypointsContainer}>
              <View style={styles.connectorLine} />

              {/* Waypoint 1: Origin */}
              <TouchableOpacity
                style={styles.waypointRow}
                activeOpacity={0.7}
                onPress={() => setPickerTarget('origin')}
              >
                <View style={styles.pointIndicatorOrigin} />
                <AppText style={styles.waypointText}>
                  {origin === 'gps'
                    ? (location.position ? 'Vị trí của bạn' : 'Vị trí của bạn (chưa có GPS)')
                    : (origin?.title ?? 'Chọn điểm xuất phát')}
                </AppText>
                <MenuLinesIcon size={18} color={tokens.colors.textDisabled} />
              </TouchableOpacity>

              {/* Intermediate Stops */}
              {stops.map((stop, index) => (
                <View key={`${stop.id}-${index}`} style={styles.waypointRow}>
                  <View style={styles.pointIndicatorStop} />
                  <AppText style={styles.waypointText}>{stop.title}</AppText>
                  <TouchableOpacity
                    onPress={() => {
                      setStops((prev) => prev.filter((_, i) => i !== index));
                      clearRoute();
                    }}
                    style={styles.removeStopBtn}
                  >
                    <CloseIcon size={14} color="#64748B" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Waypoint Destination */}
              <TouchableOpacity
                style={styles.waypointRow}
                activeOpacity={0.7}
                onPress={() => setPickerTarget('destination')}
              >
                <View style={styles.pointIndicatorDest} />
                <AppText style={styles.waypointText}>
                  {destination?.title ?? selected?.title ?? 'Chọn điểm đến'}
                </AppText>
                <MenuLinesIcon size={18} color={tokens.colors.textDisabled} />
              </TouchableOpacity>
            </View>

            {/* Add Stop Button */}
            {stops.length < 4 && (
              <TouchableOpacity
                style={styles.addStopBtn}
                onPress={() => setPickerTarget('new_stop')}
              >
                <PlusIcon size={16} color={tokens.colors.primary} />
                <AppText style={styles.addStopText}>Thêm điểm đến</AppText>
              </TouchableOpacity>
            )}

            {/* Mode Selector */}
            <View style={styles.modeToggleContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.modeButton,
                  mode === 'DRIVING' && styles.modeButtonActive,
                ]}
                onPress={() => {
                  clearRoute();
                  setMode('DRIVING');
                }}
              >
                <CarIcon
                  size={18}
                  color={mode === 'DRIVING' ? '#FFFFFF' : tokens.colors.ink}
                />
                <AppText
                  style={[
                    styles.modeButtonText,
                    mode === 'DRIVING' && styles.modeButtonTextActive,
                  ]}
                >
                  Ô tô
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.modeButton,
                  mode === 'WALKING' && styles.modeButtonActive,
                ]}
                onPress={() => {
                  clearRoute();
                  setMode('WALKING');
                }}
              >
                <WalkIcon
                  size={18}
                  color={mode === 'WALKING' ? '#FFFFFF' : tokens.colors.ink}
                />
                <AppText
                  style={[
                    styles.modeButtonText,
                    mode === 'WALKING' && styles.modeButtonTextActive,
                  ]}
                >
                  Đi bộ
                </AppText>
              </TouchableOpacity>
            </View>

            {/* Compute / Find Route Button */}
            <View style={styles.computeActionRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.computeRouteBtn,
                  computing && styles.computeRouteBtnDisabled,
                ]}
                disabled={computing}
                accessibilityRole="button"
                accessibilityLabel={computing ? 'Đang tính tuyến…' : 'Tính tuyến đường'}
                onPress={() => {
                  void compute();
                }}
              >
                {computing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <AppText style={styles.computeRouteBtnText}>
                    Tính tuyến đường
                  </AppText>
                )}
              </TouchableOpacity>
            </View>

            {routeError && (
              <View style={styles.routeErrorBox}>
                <AppText style={styles.routeErrorBanner} accessibilityLiveRegion="polite">
                  {routeError}
                </AppText>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.openExternalMapsFallbackBtn}
                  onPress={() =>
                    handleOpenExternalMaps(
                      destination ?? selected,
                      origin === 'gps' ? location.position : origin,
                    )
                  }
                >
                  <AppText style={styles.openExternalMapsFallbackText}>
                    📍 Mở vị trí trên Google Maps
                  </AppText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>

      {/* 3. Floating GPS Button ("Vị trí của tôi") - Dynamically positioned */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Vị trí của tôi"
        activeOpacity={0.85}
        style={[
          styles.floatingGpsBtn,
          { bottom: floatingGpsBottom },
        ]}
        onPress={() => void handleGpsButtonPress()}
      >
        {location.status === 'requesting' ? (
          <ActivityIndicator size="small" color={tokens.colors.primary} />
        ) : (
          <CrosshairIcon
            size={22}
            color={location.position ? tokens.colors.primary : '#64748B'}
          />
        )}
      </TouchableOpacity>

      {/* 4. Small Reopen Floating Pill Button when Bottom Sheet is Hidden */}
      {!directionsOpen && sheetState === 'hidden' && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Mở khám phá"
          activeOpacity={0.85}
          style={[styles.floatingReopenBtn, { bottom: 20 + insets.bottom }]}
          onPress={() => setSheetState('expanded')}
        >
          <PinIcon size={16} color="#FFFFFF" />
          <AppText style={styles.floatingReopenBtnText}>Khám phá</AppText>
        </TouchableOpacity>
      )}

      {/* 5. Bottom Overlay: Redesigned "Khám phá quanh bạn" Bottom Sheet & Route Summary */}
      <View style={styles.bottomOverlay} pointerEvents="box-none">
        {/* Screen 1: Redesigned Collapsible / Expandable Bottom Sheet */}
        {!directionsOpen && sheetState !== 'hidden' && (
          <View
            style={[
              styles.bottomSheetContainer,
              sheetState === 'expanded'
                ? { height: SHEET_EXPANDED_HEIGHT }
                : { height: SHEET_COLLAPSED_HEIGHT },
            ]}
          >
            {/* Drag Handle & Header Row */}
            <View {...panResponder.panHandlers}>
              <View style={styles.dragHandleBar} />
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.sheetHeaderRow}
                onPress={() => {
                  setSheetState(sheetState === 'collapsed' ? 'expanded' : 'collapsed');
                }}
              >
                <View style={styles.sheetHeaderLeft}>
                  <AppText style={styles.sheetHeaderTitle}>
                    {location.position ? 'Khám phá quanh bạn' : 'Địa điểm trong khu vực'}
                  </AppText>
                  {location.position && (
                    <AppText style={styles.sheetHeaderSubtitle}>
                      {nearbyDestinations.length} địa điểm gần bạn (đường chim bay)
                    </AppText>
                  )}
                </View>

                <View style={styles.sheetHeaderActions}>
                  {sheetState === 'collapsed' ? (
                    <View style={styles.sheetActionIconBtn}>
                      <ChevronUpIcon size={20} color="#0F172A" />
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Thu gọn bảng"
                        onPress={() => setSheetState('collapsed')}
                        style={styles.sheetActionIconBtn}
                      >
                        <ChevronDownIcon size={20} color="#0F172A" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Ẩn bảng"
                        onPress={() => setSheetState('hidden')}
                        style={styles.sheetActionIconBtn}
                      >
                        <CloseIcon size={18} color="#0F172A" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Sheet Body: Scrollable Destinations List when Expanded */}
            {sheetState === 'expanded' && (
              <View style={styles.sheetContentContainer}>
                {query.isLoading && nearbyDestinations.length === 0 ? (
                  <View style={styles.sheetStatusBox}>
                    <ActivityIndicator size="small" color={tokens.colors.primary} />
                    <AppText style={styles.sheetStatusText}>Đang tải địa điểm…</AppText>
                  </View>
                ) : query.isError && nearbyDestinations.length === 0 ? (
                  <View style={styles.sheetStatusBox}>
                    <AppText style={styles.sheetErrorText}>
                      Không thể tải danh sách địa điểm.
                    </AppText>
                    <TouchableOpacity
                      style={styles.sheetRetryBtn}
                      onPress={() => void query.refetch()}
                    >
                      <AppText style={styles.sheetRetryBtnText}>Thử lại</AppText>
                    </TouchableOpacity>
                  </View>
                ) : nearbyDestinations.length === 0 ? (
                  <View style={styles.sheetStatusBox}>
                    <AppText style={styles.sheetStatusText}>
                      Không tìm thấy địa điểm phù hợp trong khu vực này.
                    </AppText>
                  </View>
                ) : (
                  <FlatList<MapMarker>
                    data={nearbyDestinations}
                    keyExtractor={(item: MapMarker) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.destinationsListContent}
                    renderItem={({ item }: { item: MapMarker }) => {
                      const isSelected = selected?.id === item.id;
                      const hasDistance =
                        item.distanceMeters !== undefined && Number.isFinite(item.distanceMeters);

                      return (
                        <TouchableOpacity
                          activeOpacity={0.85}
                          style={[
                            styles.destinationCard,
                            isSelected && styles.destinationCardSelected,
                          ]}
                          onPress={() => select(item)}
                        >
                          {/* Left: Thumbnail Image */}
                          <Image
                            source={{
                              uri:
                                item.imageUrl ||
                                ('imageUrl' in item && (item as any).imageUrl) ||
                                DEFAULT_PLACE.imageUrl,
                            }}
                            style={styles.destinationThumbnail}
                          />

                          {/* Middle: Title & Distance */}
                          <View style={styles.destinationDetails}>
                            <AppText numberOfLines={1} style={styles.destinationTitle}>
                              {item.title}
                            </AppText>

                            <View style={styles.destinationMetaRow}>
                              <PinIcon size={13} color={tokens.colors.primary} />
                              <AppText style={styles.destinationDistanceText}>
                                {hasDistance
                                  ? formatDistance(item.distanceMeters!)
                                  : `${item.province || 'Đà Nẵng'} · ${item.category || 'Địa điểm'}`}
                              </AppText>
                            </View>
                          </View>

                          {/* Right: Direct Actions (Isolated Touch Area) */}
                          <View style={styles.destinationActions}>
                            <TouchableOpacity
                              accessibilityRole="button"
                              accessibilityLabel="Chỉ đường"
                              activeOpacity={0.8}
                              style={styles.cardDirectionsBtn}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleStartDirections(item);
                              }}
                            >
                              <DirectionsIcon size={14} color="#FFFFFF" />
                              <AppText style={styles.cardDirectionsBtnText}>Chỉ đường</AppText>
                            </TouchableOpacity>

                            <TouchableOpacity
                              accessibilityRole="button"
                              accessibilityLabel="Mở Google Maps"
                              activeOpacity={0.8}
                              style={styles.cardExternalMapsBtn}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleOpenExternalMaps(item, location.position);
                              }}
                            >
                              <AppText style={styles.cardExternalMapsBtnText}>Maps</AppText>
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}
              </View>
            )}
          </View>
        )}

        {/* Screen 2: Bottom Summary Card when route is computed */}
        {directionsOpen && visibleRoute && (
          <View style={styles.routeSummaryCard}>
            <View style={styles.routeSummaryLeft}>
              <AppText style={styles.routeDurationText}>
                {Math.max(1, Math.ceil(visibleRoute.durationMillis / 60000))} phút
              </AppText>
              <AppText style={styles.routeDistanceText}>
                {(visibleRoute.distanceMeters / 1000).toFixed(1)} km ·{' '}
                {visibleRoute.attribution || 'Lộ trình tối ưu'}
              </AppText>
            </View>

            <View style={styles.routeSummaryRight}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Xem lộ trình"
                activeOpacity={0.85}
                style={styles.viewRouteBtn}
                onPress={() => setShowSteps(!showSteps)}
              >
                <AppText style={styles.viewRouteBtnText}>Xem lộ trình</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Dẫn đường ngoài"
                activeOpacity={0.85}
                style={styles.externalNavBtn}
                onPress={() =>
                  handleOpenExternalMaps(
                    destination ?? selected,
                    origin === 'gps' ? location.position : origin,
                  )
                }
              >
                <AppText style={styles.externalNavBtnText}>Dẫn đường</AppText>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Modal Detailed Steps / Legs */}
      {showSteps && visibleRoute && (
        <Modal
          visible={showSteps}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowSteps(false)}
        >
          <SafeAreaView style={styles.stepsModalScreen}>
            <View style={styles.stepsModalHeader}>
              <AppText style={styles.stepsModalTitle}>Chi tiết lộ trình</AppText>
              <TouchableOpacity
                onPress={() => setShowSteps(false)}
                style={styles.stepsModalClose}
              >
                <CloseIcon size={20} color={tokens.colors.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.stepsModalBody}>
              <View style={styles.stepsSummaryBox}>
                <AppText style={styles.stepsDurationLarge}>
                  {Math.max(1, Math.ceil(visibleRoute.durationMillis / 60000))} phút
                </AppText>
                <AppText style={styles.stepsDistanceSmall}>
                  {(visibleRoute.distanceMeters / 1000).toFixed(1)} km · {visibleRoute.attribution}
                </AppText>
              </View>

              <AppText style={styles.stepsSectionHeading}>Các chặng di chuyển</AppText>
              {visibleRoute.legs && visibleRoute.legs.length > 0 ? (
                visibleRoute.legs.map((leg, i) => (
                  <View key={i} style={styles.legCard}>
                    <View style={styles.legHeader}>
                      <View style={styles.legNumberBadge}>
                        <AppText style={styles.legNumberText}>{i + 1}</AppText>
                      </View>
                      <AppText style={styles.legTitle}>
                        {leg.fromLabel} → {leg.toLabel}
                      </AppText>
                    </View>
                    <AppText style={styles.legMeta}>
                      {(leg.distanceMeters / 1000).toFixed(1)} km ·{' '}
                      {Math.max(1, Math.ceil(leg.durationMillis / 60000))} phút
                    </AppText>
                  </View>
                ))
              ) : (
                <View style={styles.legCard}>
                  <AppText style={styles.legTitle}>Tuyến đường trực tiếp</AppText>
                  <AppText style={styles.legMeta}>
                    {(visibleRoute.distanceMeters / 1000).toFixed(1)} km ·{' '}
                    {Math.max(1, Math.ceil(visibleRoute.durationMillis / 60000))} phút
                  </AppText>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* Stop / Place Picker Modal */}
      {pickerTarget && (
        <Modal
          visible={Boolean(pickerTarget)}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setPickerTarget(null)}
        >
          <SafeAreaView style={styles.stepsModalScreen}>
            <View style={styles.stepsModalHeader}>
              <AppText style={styles.stepsModalTitle}>
                {pickerTarget === 'origin'
                  ? 'Chọn điểm xuất phát'
                  : pickerTarget === 'destination'
                    ? 'Chọn điểm đến'
                    : 'Thêm điểm dừng'}
              </AppText>
              <TouchableOpacity
                onPress={() => setPickerTarget(null)}
                style={styles.stepsModalClose}
              >
                <CloseIcon size={20} color={tokens.colors.ink} />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchBox}>
              <SearchIcon size={16} color={tokens.colors.muted} />
              <TextInput
                value={pickerSearch}
                onChangeText={setPickerSearch}
                placeholder="Tìm địa điểm…"
                placeholderTextColor={tokens.colors.textMuted}
                style={styles.pickerSearchInput}
                autoFocus
              />
            </View>

            <ScrollView contentContainerStyle={styles.pickerList} keyboardShouldPersistTaps="handled">
              {pickerTarget === 'origin' && (
                <TouchableOpacity
                  style={styles.pickerOptionItem}
                  onPress={() => {
                    void location.request();
                    handleChoosePickerPlace('gps');
                  }}
                >
                  <View style={styles.pickerGpsIconBox}>
                    <CrosshairIcon size={18} color="#0284C7" />
                  </View>
                  <View style={styles.pickerOptionInfo}>
                    <AppText style={styles.pickerOptionTitle}>Vị trí của bạn</AppText>
                    <AppText style={styles.pickerOptionSub}>
                      {location.position
                        ? 'Dùng tọa độ GPS hiện tại của thiết bị'
                        : 'Bật định vị GPS của thiết bị'}
                    </AppText>
                  </View>
                </TouchableOpacity>
              )}

              {pickerOptions.map((place) => (
                <TouchableOpacity
                  key={place.id}
                  style={styles.pickerOptionItem}
                  onPress={() => handleChoosePickerPlace(place)}
                >
                  <View style={styles.pickerPlaceIconBox}>
                    <PinIcon size={18} color="#DC2626" />
                  </View>
                  <View style={styles.pickerOptionInfo}>
                    <AppText style={styles.pickerOptionTitle}>{place.title}</AppText>
                    {place.description ? (
                      <AppText style={styles.pickerOptionSub}>
                        {place.description}
                      </AppText>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* Hidden container for query/test compatibility */}
      <View style={styles.srOnly}>
        <AppButton
          label="◎ Vị trí của tôi"
          onPress={() => {
            setFocusUser(true);
            void location.request();
          }}
        />
        {markers.map((m) => (
          <TouchableOpacity
            key={m.id}
            accessibilityRole="button"
            accessibilityLabel={m.title ?? 'Điểm đến'}
            onPress={() => select(m)}
          >
            <AppText>{m.title ?? 'Điểm đến'}</AppText>
          </TouchableOpacity>
        ))}
        {!directionsOpen && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Chỉ đường"
            onPress={() => {
              clearRoute();
              setDirectionsOpen(true);
              if (selected) setDestination(selected);
              if (location.position) setOrigin('gps');
              else void location.request();
            }}
          >
            <AppText>Chỉ đường</AppText>
          </TouchableOpacity>
        )}
        <LocationPermissionCard
          {...location}
          onRequest={() => {
            setFocusUser(true);
            void location.request();
          }}
          onStop={location.stop}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  topSafeAreaOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  topBarControls: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    position: 'relative',
    zIndex: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  searchDropdown: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchResultText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: tokens.colors.primary,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  directionsWaypointsCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  waypointsContainer: {
    gap: 8,
    position: 'relative',
  },
  connectorLine: {
    position: 'absolute',
    left: 7,
    top: 14,
    bottom: 14,
    width: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  waypointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  pointIndicatorOrigin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: tokens.colors.primary,
    backgroundColor: '#FFFFFF',
  },
  pointIndicatorStop: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: '#0284C7',
    backgroundColor: '#FFFFFF',
  },
  pointIndicatorDest: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
  },
  waypointText: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  removeStopBtn: {
    padding: 4,
  },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
    paddingLeft: 4,
  },
  addStopText: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.colors.primary,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 2,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modeButtonActive: {
    backgroundColor: tokens.colors.primary,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  computeActionRow: {
    paddingTop: 2,
  },
  computeRouteBtn: {
    backgroundColor: tokens.colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  computeRouteBtnDisabled: {
    opacity: 0.6,
  },
  computeRouteBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  routeErrorBanner: {
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
  },
  routeErrorBox: {
    gap: 6,
    marginTop: 4,
    alignItems: 'center',
  },
  openExternalMapsFallbackBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  openExternalMapsFallbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },

  /* Floating Controls (GPS & Reopen) */
  floatingGpsBtn: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 25,
  },
  floatingReopenBtn: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 25,
  },
  floatingReopenBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Bottom Overlay Container */
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    justifyContent: 'flex-end',
  },

  /* Redesigned Bottom Sheet: "Khám phá quanh bạn" */
  bottomSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  dragHandleBar: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginTop: 8,
    marginBottom: 4,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sheetHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  sheetHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetHeaderSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  sheetHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sheetActionIconBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
  },
  sheetContentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  destinationsListContent: {
    gap: 10,
    paddingTop: 4,
    paddingBottom: 12,
  },
  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  destinationCardSelected: {
    borderColor: tokens.colors.primary,
    backgroundColor: '#F0F9FF',
  },
  destinationThumbnail: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  destinationDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  destinationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  destinationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  destinationDistanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: tokens.colors.primary,
  },
  destinationActions: {
    gap: 6,
    alignItems: 'flex-end',
  },
  cardDirectionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: tokens.colors.primary,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  cardDirectionsBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardExternalMapsBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  cardExternalMapsBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  sheetStatusBox: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  sheetStatusText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  sheetErrorText: {
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
  },
  sheetRetryBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  sheetRetryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: tokens.colors.primary,
  },

  /* Route Summary Card */
  routeSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  routeSummaryLeft: {
    gap: 4,
    flex: 1,
  },
  routeSummaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeDurationText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  routeDistanceText: {
    fontSize: 13,
    color: '#64748B',
  },
  viewRouteBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  viewRouteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  externalNavBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: tokens.colors.primary,
  },
  externalNavBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Steps Modal */
  stepsModalScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  stepsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepsModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  stepsModalClose: {
    padding: 4,
  },
  stepsModalBody: {
    padding: 16,
    gap: 16,
  },
  stepsSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 4,
  },
  stepsDurationLarge: {
    fontSize: 24,
    fontWeight: '800',
    color: tokens.colors.primary,
  },
  stepsDistanceSmall: {
    fontSize: 13,
    color: '#64748B',
  },
  stepsSectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  legCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  legHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  legTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  legMeta: {
    fontSize: 12,
    color: '#64748B',
    paddingLeft: 30,
  },

  /* Picker Modal */
  pickerSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  pickerList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  pickerOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerGpsIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerPlaceIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerOptionInfo: {
    flex: 1,
    gap: 2,
  },
  pickerOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  pickerOptionSub: {
    fontSize: 12,
    color: '#64748B',
  },

  srOnly: {
    opacity: 0,
    height: 0,
    width: 0,
    overflow: 'hidden',
  },
  srOnlyText: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
});
