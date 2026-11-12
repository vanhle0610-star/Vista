'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapViewAdapter } from '@/features/map-location/adapter/MapViewAdapter';
import { DestinationList, filterDestinations } from '@/features/map-location/components/DestinationList';
import { DirectionsPanel } from '@/features/map-location/components/DirectionsPanel';
import { fetchMapDestinations, validPoint } from '@/features/map-location/data/publicDestinations';
import { VIETNAM_1000_DESTINATIONS } from '@/features/map-location/data/vietnam1000Destinations';
import { rememberDestination, viewedDestination } from '@/features/map-location/data/viewedDestinations';
import { apiRequest } from '@/lib/api';
import type { components } from '@/types/api.generated';
import { GPS_MAX_AGE_MS, useGeolocation } from '@/features/map-location/hooks/useGeolocation';
import { useRoutePlanner } from '@/features/map-location/hooks/useRoutePlanner';
import type { Coordinates, DestinationMarker, RouteStop } from '@/features/map-location/types';
import { createStop, initialStops, resolveStops, stopRole, MAX_ROUTE_POINTS, type PlannerStop } from '@/features/map-location/routing/stops';
import type { TravelMode } from '@/features/map-location/routing/routes';
import { IconRoute, IconSearch } from '@/features/map-location/components/MapIcons';
import styles from './map-page.module.css';

// Coordinates for flyTo camera to center of 63 Vietnam provinces
const PROVINCE_CENTERS: Record<string, { latitude: number; longitude: number; zoom: number }> = {
  'Đà Nẵng': { latitude: 16.0544, longitude: 108.2022, zoom: 12 },
  'Thừa Thiên Huế': { latitude: 16.4637, longitude: 107.5843, zoom: 12 },
  'Quảng Nam': { latitude: 15.8778, longitude: 108.3283, zoom: 12 },
  'Hà Nội': { latitude: 21.0285, longitude: 105.8542, zoom: 12 },
  'TP. Hồ Chí Minh': { latitude: 10.7769, longitude: 106.7009, zoom: 12 },
  'Lâm Đồng': { latitude: 11.9404, longitude: 108.4583, zoom: 12 },
  'Kiên Giang': { latitude: 10.2289, longitude: 103.9572, zoom: 11 },
  'Khánh Hòa': { latitude: 12.2471, longitude: 109.1899, zoom: 12 },
  'Ninh Bình': { latitude: 20.2506, longitude: 105.9744, zoom: 12 },
  'Quảng Ninh': { latitude: 20.9505, longitude: 107.0734, zoom: 11.5 },
  'Hải Phòng': { latitude: 20.8449, longitude: 106.6881, zoom: 12 },
  'Cần Thơ': { latitude: 10.0452, longitude: 105.7469, zoom: 12 },
  'Lào Cai': { latitude: 22.3364, longitude: 103.8438, zoom: 12 },
  'Sơn La': { latitude: 20.8711, longitude: 104.6292, zoom: 12 },
  'Hà Giang': { latitude: 22.8233, longitude: 104.9836, zoom: 12 },
  'Cao Bằng': { latitude: 22.6657, longitude: 106.2575, zoom: 12 },
  'Bắc Kạn': { latitude: 22.1470, longitude: 105.8348, zoom: 12 },
  'Phú Thọ': { latitude: 21.3228, longitude: 105.4019, zoom: 12 },
  'Hòa Bình': { latitude: 20.8172, longitude: 105.3376, zoom: 12 },
  'Điện Biên': { latitude: 21.3860, longitude: 103.0233, zoom: 12 },
  'Vĩnh Phúc': { latitude: 21.3089, longitude: 105.6049, zoom: 12 },
  'Hà Nam': { latitude: 20.5453, longitude: 105.9123, zoom: 12 },
  'Thanh Hóa': { latitude: 19.8067, longitude: 105.7852, zoom: 12 },
  'Nghệ An': { latitude: 18.6734, longitude: 105.6813, zoom: 12 },
  'Hà Tĩnh': { latitude: 18.3433, longitude: 105.9058, zoom: 12 },
  'Quảng Bình': { latitude: 17.4690, longitude: 106.6224, zoom: 12 },
  'Quảng Trị': { latitude: 16.8163, longitude: 107.1004, zoom: 12 },
  'Quảng Ngãi': { latitude: 15.1205, longitude: 108.7923, zoom: 12 },
  'Bình Định': { latitude: 13.7830, longitude: 109.2197, zoom: 12 },
  'Phú Yên': { latitude: 13.0882, longitude: 109.3144, zoom: 12 },
  'Ninh Thuận': { latitude: 11.5681, longitude: 108.9868, zoom: 12 },
  'Bình Thuận': { latitude: 10.9333, longitude: 108.1000, zoom: 12 },
  'Kon Tum': { latitude: 14.3497, longitude: 108.0005, zoom: 12 },
  'Gia Lai': { latitude: 13.9833, longitude: 108.0000, zoom: 12 },
  'Đắk Lắk': { latitude: 12.6667, longitude: 108.0500, zoom: 12 },
  'Đắk Nông': { latitude: 12.0042, longitude: 107.6875, zoom: 12 },
  'Bà Rịa - Vũng Tàu': { latitude: 10.4114, longitude: 107.1362, zoom: 12 },
  'Tây Ninh': { latitude: 11.3100, longitude: 106.0983, zoom: 12 },
  'Bình Dương': { latitude: 10.9805, longitude: 106.6519, zoom: 12 },
  'Đồng Nai': { latitude: 10.9575, longitude: 106.8427, zoom: 12 },
  'Long An': { latitude: 10.5360, longitude: 106.4134, zoom: 12 },
  'Tiền Giang': { latitude: 10.3600, longitude: 106.3600, zoom: 12 },
  'Bến Tre': { latitude: 10.2415, longitude: 106.3759, zoom: 12 },
  'Vĩnh Long': { latitude: 10.2537, longitude: 105.9722, zoom: 12 },
  'Đồng Tháp': { latitude: 10.4573, longitude: 105.6328, zoom: 12 },
  'An Giang': { latitude: 10.3831, longitude: 105.4358, zoom: 12 },
  'Bắc Giang': { latitude: 21.2731, longitude: 106.1946, zoom: 12 },
  'Bắc Ninh': { latitude: 21.1861, longitude: 106.0763, zoom: 12 },
  'Hưng Yên': { latitude: 20.6464, longitude: 106.0511, zoom: 12 },
  'Hải Dương': { latitude: 20.9373, longitude: 106.3146, zoom: 12 },
  'Thái Bình': { latitude: 20.4464, longitude: 106.3366, zoom: 12 },
  'Nam Định': { latitude: 20.4344, longitude: 106.1773, zoom: 12 },
  'Lai Châu': { latitude: 22.3964, longitude: 103.4583, zoom: 12 },
  'Lạng Sơn': { latitude: 21.8537, longitude: 106.7615, zoom: 12 },
  'Thái Nguyên': { latitude: 21.5942, longitude: 105.8482, zoom: 12 },
  'Tuyên Quang': { latitude: 21.8236, longitude: 105.2140, zoom: 12 },
  'Yên Bái': { latitude: 21.7168, longitude: 104.8986, zoom: 12 },
  'Bình Phước': { latitude: 11.5333, longitude: 106.8833, zoom: 12 },
  'Trà Vinh': { latitude: 9.9347, longitude: 106.3455, zoom: 12 },
  'Hậu Giang': { latitude: 9.7844, longitude: 105.4702, zoom: 12 },
  'Sóc Trăng': { latitude: 9.6033, longitude: 105.9800, zoom: 12 },
  'Bạc Liêu': { latitude: 9.2941, longitude: 105.7244, zoom: 12 },
  'Cà Mau': { latitude: 9.1769, longitude: 105.1524, zoom: 12 },
};

export default function VistaMapPage() {
  const [data, setData] = useState<{
    destinations: DestinationMarker[];
    rejected: number;
    loading: boolean;
    error: string | null;
  }>({ destinations: VIETNAM_1000_DESTINATIONS, rejected: 0, loading: false, error: null });

  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedProvince, setSelectedProvince] = useState('Đà Nẵng');
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState<number | null>(null);
  const [cameraTarget, setCameraTarget] = useState<{ latitude: number; longitude: number; zoom?: number } | null>(null);

  // 2 Distinct Modes: 'explore' vs 'directions'
  const [sidebarMode, setSidebarMode] = useState<'explore' | 'directions'>('explore');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [stops, setStops] = useState<PlannerStop[]>(initialStops);
  const stopsRef = useRef(stops);
  const [gpsOrigin, setGpsOrigin] = useState<Coordinates | null>(null);
  const originRequest = useRef(0);
  const routeActive = useRef(false);
  const [mode, setMode] = useState<TravelMode>('DRIVING');

  // Add To Trip Modal State
  const [showAddToTripModal, setShowAddToTripModal] = useState(false);
  const [destinationForTrip, setDestinationForTrip] = useState<DestinationMarker | null>(null);
  const [availableTrips, setAvailableTrips] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Linked destination from URL params
  const [linked, setLinked] = useState<DestinationMarker | null>(null);
  const [linkNotice, setLinkNotice] = useState<string | null>(null);
  const [linkAttempt, setLinkAttempt] = useState(0);

  // GPS
  const { coords, status, errorMessage, requestCurrentPosition } = useGeolocation();
  const planner = useRoutePlanner(Boolean(gpsOrigin));
  const { clear: clearRoute, compute: computeRoute } = planner;
  const changeStops = useCallback((next: PlannerStop[]) => {
    if (next[0].placeId !== stopsRef.current[0].placeId || next[0].id !== stopsRef.current[0].id) {
      originRequest.current++; setGpsOrigin(null);
    }
    stopsRef.current = next; setStops(next); clearRoute();
  }, [clearRoute]);
  const requestGpsOrigin = useCallback(async () => {
    const generation = ++originRequest.current;
    const originId = stopsRef.current[0].id;
    const fix = await requestCurrentPosition();
    if (fix && generation === originRequest.current && stopsRef.current[0].id === originId && stopsRef.current[0].placeId === 'gps') {
      setGpsOrigin(fix);
    }
  }, [requestCurrentPosition]);
  const viewUserLocation = async () => {
    const fix = await requestCurrentPosition();
    if (fix) setCameraTarget({ latitude: fix.latitude, longitude: fix.longitude, zoom: 15.5 });
  };

  // Read URL query params (?destinationId=...&directions=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('destinationId');
    if (!id) return;
    const abort = new AbortController();

    const selectLinked = (detail: components['schemas']['DestinationDetail']) => {
      if (abort.signal.aborted) return;
      if (!validPoint(detail)) {
        setLinkNotice(`${detail.name}: chưa có tọa độ hợp lệ để định vị.`);
        return;
      }
      setLinked({
        id: detail.id,
        name: detail.name,
        province: detail.province,
        category: detail.category,
        latitude: detail.latitude,
        longitude: detail.longitude,
        description: detail.description ?? '',
        sourceUrl: detail.sourceUrl ?? undefined,
      });
      setSelectedId(detail.id);
      if (params.get('directions') === '1') {
        const next = [createStop(''), createStop(detail.id)];
        stopsRef.current = next; setStops(next); clearRoute();
        setSidebarMode('directions');
      }
    };

    const cached = viewedDestination(id);
    if (cached) queueMicrotask(() => selectLinked(cached));

    void apiRequest<components['schemas']['DestinationDetail']>(`/destinations/${encodeURIComponent(id)}`, {
      signal: abort.signal,
    })
      .then((detail) => {
        if (abort.signal.aborted) return;
        rememberDestination(detail);
        setLinkNotice(null);
        selectLinked(detail);
      })
      .catch(() => {
        if (!abort.signal.aborted) {
          setLinkNotice('Chưa tải được địa điểm từ liên kết. Kiểm tra mạng rồi thử lại.');
        }
      });

    return () => abort.abort();
  }, [linkAttempt, clearRoute]);

  // Merge destinations
  const destinations = useMemo(
    () => (linked && !data.destinations.some((d) => d.id === linked.id) ? [linked, ...data.destinations] : data.destinations),
    [linked, data.destinations]
  );

  // Fetch all 350 destinations + backend
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) setData((old) => ({ ...old, loading: true, error: null }));
    });

    void fetchMapDestinations(controller.signal, (result) => {
      if (!controller.signal.aborted) {
        setData((old) => ({
          ...result,
          destinations: [
            ...new Map([...old.destinations, ...result.destinations].map((dest) => [dest.id, dest])).values(),
          ],
          loading: false,
          error: null,
        }));
      }
    })
      .then((result) => {
        if (!controller.signal.aborted) setData({ ...result, loading: false, error: null });
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setData((old) => ({
            ...old,
            loading: false,
            error:
              reason instanceof Error && !['TimeoutError', 'TypeError'].includes(reason.name)
                ? reason.message
                : 'Đang hiển thị 350 địa điểm chuẩn hóa ngoại tuyến.',
          }));
        }
      });

    return () => controller.abort();
  }, [attempt]);

  // Filtered destinations
  const filtered = useMemo(
    () => filterDestinations(destinations, search, category, selectedProvince, coords, nearbyRadiusKm),
    [destinations, search, category, selectedProvince, coords, nearbyRadiusKm]
  );

  const select = useCallback((destination: DestinationMarker | null) => {
    setSelectedId(destination?.id ?? null);
  }, []);

  // Handle Province Click & FlyTo
  const handleProvinceChange = (province: string) => {
    setSelectedProvince(province);
    setNearbyRadiusKm(null);

    if (province === 'all') {
      setCameraTarget({ latitude: 16.0611, longitude: 108.2272, zoom: 6.2 });
    } else if (PROVINCE_CENTERS[province]) {
      setCameraTarget(PROVINCE_CENTERS[province]);
    } else {
      const firstInProv = destinations.find((d) => d.province.includes(province) || province.includes(d.province));
      if (firstInProv) {
        setCameraTarget({ latitude: firstInProv.latitude, longitude: firstInProv.longitude, zoom: 12 });
      }
    }
  };

  const compute = useCallback((next: PlannerStop[] = stopsRef.current, nextMode: TravelMode = mode) => {
    routeActive.current = true;
    if (next[0].placeId === 'gps' && (!gpsOrigin || Date.now() - gpsOrigin.timestamp > GPS_MAX_AGE_MS)) {
      clearRoute(); void requestGpsOrigin(); return;
    }
    try {
      const points = resolveStops(next, destinations, gpsOrigin);
      computeRoute({ origin: points[0], destination: points[points.length - 1], waypoints: points.slice(1, -1), mode: nextMode, fromGps: next[0].placeId === 'gps' });
    } catch { clearRoute(); }
  }, [mode, destinations, gpsOrigin, computeRoute, clearRoute, requestGpsOrigin]);

  useEffect(() => {
    if (routeActive.current) compute(stops, mode);
  }, [stops, mode, compute]);

  const openDirections = (destination: DestinationMarker) => {
    const next = [{ ...stopsRef.current[0] }, createStop(destination.id)];
    changeStops(next); setSelectedId(destination.id); setSidebarMode('directions'); setSidebarCollapsed(false);
    routeActive.current = true;
  };

  // Card action inserts a waypoint before the final destination; append uses the form action.
  const handleAddStop = (destination: DestinationMarker) => {
    if (stops.some((stop) => stop.placeId === destination.id)) { showToast('Địa điểm này đã có trong lộ trình.'); return; }
    if (stops.length >= MAX_ROUTE_POINTS) { showToast('Lộ trình hỗ trợ tối đa ' + MAX_ROUTE_POINTS + ' điểm.'); return; }
    const next = [...stops.slice(0, -1), createStop(destination.id), stops[stops.length - 1]];
    changeStops(next); showToast('Đã thêm “' + destination.name + '” làm điểm dừng trước điểm đến.');
  };

  // Add To Trip Handler using real backend APIs
  const handleOpenAddToTrip = async (destination: DestinationMarker) => {
    setDestinationForTrip(destination);

    const token = typeof window !== 'undefined' ? localStorage.getItem('vista_token') : null;
    if (!token) {
      showToast('Vui lòng đăng nhập để thêm địa điểm vào chuyến đi.');
      return;
    }

    try {
      const trips = await apiRequest<Array<{ id: string; title: string }>>('/trips');
      if (trips && trips.length > 0) {
        setAvailableTrips(trips);
        setSelectedTripId(trips[0].id);
        setShowAddToTripModal(true);
      } else {
        showToast('Bạn chưa có chuyến đi nào. Vui lòng tạo chuyến đi mới trước.');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Chưa tải được danh sách chuyến đi của bạn.');
    }
  };

  const handleConfirmAddToTrip = async () => {
    if (!destinationForTrip || !selectedTripId) return;

    try {
      const days = await apiRequest<Array<{ id: string; dayNumber: number }>>(
        `/trips/${selectedTripId}/itinerary/days`
      );
      let targetDay = days?.find((d) => d.dayNumber === selectedDayNumber);

      if (!targetDay) {
        targetDay = await apiRequest<{ id: string; dayNumber: number }>(
          `/trips/${selectedTripId}/itinerary/days`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dayNumber: selectedDayNumber,
              tripDate: new Date().toISOString().split('T')[0],
            }),
          }
        );
      }

      await apiRequest(`/itinerary/days/${targetDay.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationId: destinationForTrip.id,
          name: destinationForTrip.name,
          latitude: destinationForTrip.latitude,
          longitude: destinationForTrip.longitude,
          notes: `Điểm đến: ${destinationForTrip.province} · ${destinationForTrip.category}`,
        }),
      });

      showToast(`Đã thêm "${destinationForTrip.name}" vào lịch trình Ngày ${selectedDayNumber}!`);
      setShowAddToTripModal(false);
    } catch (err) {
      showToast(`Lỗi: ${err instanceof Error ? err.message : 'Không thể thêm vào chuyến đi'}`);
    }
  };

  const route = planner.route;
  const routeStops = useMemo<RouteStop[]>(() => stops.flatMap((stop, index) => {
    const point = stop.placeId === 'gps' && index === 0 ? gpsOrigin : destinations.find((destination) => destination.id === stop.placeId);
    if (!point) return [];
    return [{ id: stop.id, latitude: point.latitude, longitude: point.longitude, label: 'name' in point ? point.name : 'Vị trí của bạn', role: stopRole(index, stops.length), type: index === 0 ? 'origin' as const : index === stops.length - 1 ? 'destination' as const : 'waypoint' as const }];
  }), [stops, gpsOrigin, destinations]);
  const validStopsCount = stops.filter((stop) => Boolean(stop.placeId)).length;

  return (
    <div className={styles.page}>
      <main className={styles.content}>
        <div className={styles.layout}>
          {/* ─── SIDEBAR: 2 DISTINCT MODES (KHÁM PHÁ & LỘ TRÌNH) ─── */}
          <aside
            className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}
            aria-label="Bảng điều khiển du lịch"
          >
            <div className={styles.sidebarInner}>
              {/* Mode Tabs Switcher */}
              <div className={styles.modeTabs} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={sidebarMode === 'explore'}
                  className={`${styles.modeTab} ${sidebarMode === 'explore' ? styles.modeTabActive : ''}`}
                  onClick={() => setSidebarMode('explore')}
                >
                  <IconSearch size={14} />
                  <span>Khám phá</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={sidebarMode === 'directions'}
                  className={`${styles.modeTab} ${sidebarMode === 'directions' ? styles.modeTabActive : ''}`}
                  onClick={() => setSidebarMode('directions')}
                >
                  <IconRoute size={14} />
                  <span>Lộ trình</span>
                  {validStopsCount >= 2 && (
                    <span className={styles.routeBadgeCount}>
                      {validStopsCount}
                    </span>
                  )}
                </button>
              </div>

              {linkNotice && (
                <div role="alert" className={styles.dataNotice}>
                  <p>{linkNotice}</p>
                  <button type="button" onClick={() => setLinkAttempt((v) => v + 1)}>
                    Thử tải lại địa điểm
                  </button>
                </div>
              )}

              {/* Mode 1: Khám phá */}
              {sidebarMode === 'explore' && (
                <div className={styles.modeContainer}>
                  {data.error && (
                    <div className={styles.dataNotice} role="alert">
                      <p>{data.error}</p>
                      <button type="button" onClick={() => setAttempt((v) => v + 1)}>
                        Thử tải lại
                      </button>
                    </div>
                  )}
                  <DestinationList
                    destinations={destinations}
                    filtered={filtered}
                    selectedId={selectedId}
                    selectedProvince={selectedProvince}
                    userCoords={coords}
                    nearbyRadiusKm={nearbyRadiusKm}
                    onSelect={select}
                    search={search}
                    category={category}
                    onSearch={setSearch}
                    onCategory={setCategory}
                    onProvinceChange={handleProvinceChange}
                    onNearbyRadiusChange={setNearbyRadiusKm}
                    onDirections={openDirections}
                    onAddStop={handleAddStop}
                    directionsOpen={validStopsCount >= 2}
                    onToggleDirections={() => setSidebarMode('directions')}
                    onCollapseSidebar={() => setSidebarCollapsed(true)}
                  />
                </div>
              )}

              {/* Mode 2: Lộ trình */}
              {sidebarMode === 'directions' && (
                <div className={styles.modeContainer}>
                  <DirectionsPanel
                    destinations={destinations}
                    coords={gpsOrigin}
                    stops={stops}
                    onStopsChange={changeStops}
                    mode={mode}
                    onMode={(newMode) => {
                      setMode(newMode);
                      planner.clear();
                    }}
                    selectedProvince={selectedProvince}
                    onProvinceChange={handleProvinceChange}
                    onRequestGps={() => { void requestGpsOrigin(); }}
                    gpsStatus={status}
                    gpsError={errorMessage}
                    onCompute={() => compute()}
                    onClear={() => {
                      routeActive.current = false;
                      clearRoute();
                    }}
                    onClose={() => setSidebarCollapsed(true)}
                    status={planner.status}
                    error={planner.error}
                    route={route}
                  />
                </div>
              )}
            </div>
          </aside>

          {/* ─── MAP CANVAS ─── */}
          <section className={styles.map} data-sidebar-open={!sidebarCollapsed} aria-label="Bản đồ khám phá">
            {/* Button to Reopen Sidebar if collapsed */}
            {sidebarCollapsed && (
              <button
                type="button"
                className={styles.btnExpandSidebar}
                onClick={() => setSidebarCollapsed(false)}
                title="Mở bảng điều khiển"
              >
                <span>❯</span>
                <span>{sidebarMode === 'directions' ? 'Lộ trình' : 'Khám phá'}</span>
              </button>
            )}

            <MapViewAdapter
              destinations={sidebarMode === 'directions' ? destinations : filtered}
              selectedDestinationId={selectedId}
              onSelectDestination={select}
              userLocation={coords}
              cameraTarget={cameraTarget}
              onRequestUserLocation={() => { void viewUserLocation(); }}
              gpsStatus={status}
              gpsError={errorMessage}
              routeGeometry={route?.path}
              routeStops={routeStops}
              onDirections={openDirections}
              onAddToTrip={handleOpenAddToTrip}
              route={route}
              currentCityName={selectedProvince !== 'all' ? selectedProvince : 'Toàn quốc'}
              sidebarCollapsed={sidebarCollapsed}
              onOpenRouteDetail={() => {
                setSidebarMode('directions');
                setSidebarCollapsed(false);
              }}
            />

            {/* Discrete Footer Overlay */}
            <div className={styles.footerOverlay}>
              ● {destinations.length} điểm đến chuẩn hóa · Dữ liệu VISTA & OpenStreetMap
            </div>
          </section>
        </div>

        {/* ─── SLIM BOTTOM TELEMETRY STATUS BAR (REAL DATA ONLY) ─── */}
        <footer className={styles.bottomBar}>
          <div className={styles.bottomBarLeft}>
            <span className={coords ? styles.liveGpsDot : styles.liveGpsDotOff} />
            <span className={styles.bottomBarBold}>GPS:</span>
            {coords ? (
              <span>
                Đã xác định · Tọa độ: {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)} {Number.isFinite(coords.accuracy) && coords.accuracy > 0 ? '(Sai số ±' + Math.round(coords.accuracy) + ' m)' : '(Chưa có dữ liệu sai số)'}
              </span>
            ) : status === 'requesting' ? (
              <span>Đang xác định vị trí thiết bị…</span>
            ) : (
              <span>{errorMessage || 'Chưa xác định vị trí · Nhấn nút định vị trên bản đồ để lấy vị trí thiết bị'}</span>
            )}
          </div>

          <div className={styles.bottomBarRight}>
            {route ? (
              <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <IconRoute size={14} /> Tuyến đang chọn: <strong>{Math.round(route.distanceMeters / 100) / 10} km</strong> ({Math.max(1, Math.ceil(route.durationMillis / 60000))} phút)
                </span>
                <button
                  type="button"
                  className={styles.btnRouteDetails}
                  onClick={() => {
                    setSidebarMode('directions');
                    setSidebarCollapsed(false);
                  }}
                >
                  Xem chi tiết lộ trình &gt;
                </button>
              </>
            ) : (
              <span>Chọn điểm đến hoặc bấm &quot;Chỉ đường&quot; để tính lộ trình thông minh</span>
            )}
          </div>
        </footer>
      </main>

      {/* ─── MODAL: THÊM VÀO CHUYẾN ĐI ─── */}
      {showAddToTripModal && destinationForTrip && (
        <div className={styles.modalOverlay} onClick={() => setShowAddToTripModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Thêm vào Chuyến đi</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowAddToTripModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ margin: 0, fontSize: 13.5, color: '#475569' }}>
                Gắn <strong>{destinationForTrip.name}</strong> ({destinationForTrip.province}) vào lịch trình của bạn:
              </p>

              <div className={styles.modalField}>
                <label>Chọn Chuyến đi:</label>
                {availableTrips.length > 0 ? (
                  <select
                    value={selectedTripId}
                    onChange={(e) => setSelectedTripId(e.target.value)}
                  >
                    {availableTrips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value={`Tạo chuyến đi mới: Khám phá ${destinationForTrip.province}`}
                  />
                )}
              </div>

              <div className={styles.modalField}>
                <label>Vào ngày thứ mấy trong hành trình:</label>
                <select
                  value={selectedDayNumber}
                  onChange={(e) => setSelectedDayNumber(Number(e.target.value))}
                >
                  <option value={1}>Ngày 1 (Khởi hành & Check-in)</option>
                  <option value={2}>Ngày 2 (Tham quan chính)</option>
                  <option value={3}>Ngày 3 (Khám phá & Trở về)</option>
                  <option value={4}>Ngày 4 (Mở rộng)</option>
                </select>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalBtnCancel}
                  onClick={() => setShowAddToTripModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className={styles.modalBtnSubmit}
                  onClick={handleConfirmAddToTrip}
                >
                  Xác nhận thêm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMessage && (
        <div className={styles.toastNotification}>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
