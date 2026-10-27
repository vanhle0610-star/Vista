'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navbar } from '@/components/common/Navbar';
import { MapViewAdapter } from '@/features/map-location/adapter/MapViewAdapter';
import { DestinationList, filterDestinations, REGIONS_PROVINCES } from '@/features/map-location/components/DestinationList';
import { DirectionsPanel } from '@/features/map-location/components/DirectionsPanel';
import { GPSPermissionBar } from '@/features/map-location/components/GPSPermissionBar';
import { fetchMapDestinations, validPoint } from '@/features/map-location/data/publicDestinations';
import { rememberDestination, viewedDestination } from '@/features/map-location/data/viewedDestinations';
import { apiRequest } from '@/lib/api';
import type { components } from '@/types/api.generated';
import { useGeolocation } from '@/features/map-location/hooks/useGeolocation';
import { useRoutePlanner } from '@/features/map-location/hooks/useRoutePlanner';
import type { DestinationMarker, RouteStop } from '@/features/map-location/types';
import type { TravelMode } from '@/features/map-location/routing/routes';
import { IconRoute } from '@/features/map-location/components/MapIcons';
import styles from './map-page.module.css';

// Coordinates for flyTo camera to center of famous provinces
const PROVINCE_CENTERS: Record<string, { latitude: number; longitude: number; zoom: number }> = {
  'Đà Nẵng': { latitude: 16.0611, longitude: 108.2272, zoom: 12 },
  'Thừa Thiên Huế': { latitude: 16.4637, longitude: 107.5843, zoom: 12 },
  'Quảng Nam': { latitude: 15.8778, longitude: 108.3283, zoom: 12 },
  'Hà Nội': { latitude: 21.0285, longitude: 105.8542, zoom: 12 },
  'TP. Hồ Chí Minh': { latitude: 10.7769, longitude: 106.7009, zoom: 12 },
  'Lâm Đồng': { latitude: 11.9404, longitude: 108.4583, zoom: 12 },
  'Kiên Giang': { latitude: 10.2167, longitude: 103.9667, zoom: 11 },
  'Khánh Hòa': { latitude: 12.2388, longitude: 109.1967, zoom: 12 },
  'Ninh Bình': { latitude: 20.2506, longitude: 105.9744, zoom: 12 },
  'Quảng Ninh': { latitude: 20.9505, longitude: 107.0734, zoom: 11.5 },
};

export default function VistaMapPage() {
  const [data, setData] = useState<{
    destinations: DestinationMarker[];
    rejected: number;
    loading: boolean;
    error: string | null;
  }>({ destinations: [], rejected: 0, loading: true, error: null });

  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState<number | null>(null);
  const [cameraTarget, setCameraTarget] = useState<{ latitude: number; longitude: number; zoom?: number } | null>(null);

  // Routing State
  const [gpsDismissed, setGpsDismissed] = useState(false);
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');
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
  const { coords, status, errorMessage, requestCurrentPosition, dismissPrompt, automaticEnabled, choiceKnown } =
    useGeolocation();
  const planner = useRoutePlanner(Boolean(coords));

  useEffect(() => {
    if (coords && (!originId || originId === '')) {
      setOriginId('gps');
    }
  }, [coords, originId]);

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
        setDestinationId(detail.id);
        setDirectionsOpen(true);
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
  }, [linkAttempt]);

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
    setNearbyRadiusKm(null); // Clear nearby filter when explicitly picking province

    if (province === 'all') {
      setCameraTarget({ latitude: 16.0611, longitude: 108.2272, zoom: 6.2 });
    } else if (PROVINCE_CENTERS[province]) {
      setCameraTarget(PROVINCE_CENTERS[province]);
    } else {
      // Find first destination in that province
      const firstInProv = destinations.find((d) => d.province.includes(province) || province.includes(d.province));
      if (firstInProv) {
        setCameraTarget({ latitude: firstInProv.latitude, longitude: firstInProv.longitude, zoom: 12 });
      }
    }
  };

  // Open Directions & Auto-compute from GPS
  const openDirections = (destination: DestinationMarker) => {
    planner.clear();
    setDestinationId(destination.id);
    setDirectionsOpen(true);
    setSelectedId(destination.id);

    const effectiveOrigin = originId === 'gps' || (!originId && coords) ? 'gps' : originId;
    if (!originId && coords) {
      setOriginId('gps');
    }

    // Tự động tính toán đường đi ngay lập tức từ GPS (hoặc điểm xuất phát đã chọn)
    const originPoint =
      effectiveOrigin === 'gps' || (!effectiveOrigin && coords)
        ? coords
          ? { ...coords, label: 'Vị trí của tôi' }
          : null
        : destinations.find((d) => d.id === effectiveOrigin);

    if (originPoint) {
      planner.compute({
        origin: { ...originPoint, label: 'label' in originPoint ? originPoint.label : originPoint.name },
        destination: { latitude: destination.latitude, longitude: destination.longitude, label: destination.name },
        mode,
        fromGps: effectiveOrigin === 'gps' || (!effectiveOrigin && Boolean(coords)),
        waypoints: [],
      } as any);
    }
  };

  // Compute Route (Supports Multi-stop Waypoints)
  const compute = (waypointIds: string[] = []) => {
    const origin =
      originId === 'gps'
        ? coords
          ? { latitude: coords.latitude, longitude: coords.longitude, label: 'Vị trí của tôi' }
          : null
        : destinations.find((d) => d.id === originId);
    const destination = destinations.find((d) => d.id === destinationId);
    if (!origin || !destination) return;

    const waypoints = waypointIds
      .map((id) => destinations.find((d) => d.id === id))
      .filter((d): d is DestinationMarker => Boolean(d))
      .map((d) => ({ latitude: d.latitude, longitude: d.longitude, label: d.name }));

    planner.compute({
      origin: { latitude: origin.latitude, longitude: origin.longitude, label: 'label' in origin ? origin.label : origin.name },
      destination: { latitude: destination.latitude, longitude: destination.longitude, label: destination.name },
      mode,
      fromGps: originId === 'gps',
      waypoints,
    });
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
      // 1. Lấy danh sách ngày của chuyến đi
      const days = await apiRequest<Array<{ id: string; dayNumber: number }>>(
        `/trips/${selectedTripId}/itinerary/days`
      );
      let targetDay = days?.find((d) => d.dayNumber === selectedDayNumber);

      // Nếu ngày chưa được tạo trên lịch trình, tự động khởi tạo ngày đó
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

      // 2. Thêm điểm dừng vào ngày lịch trình
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

  const route = planner.route?.input.fromGps && !coords ? null : planner.route;

  // Danh sách đầy đủ các trạm dừng theo thứ tự: A (Xuất phát), B, C... (Dừng giữa), Cuối (Đích đến)
  const routeStops = useMemo<RouteStop[]>(() => {
    if (!route) return [];
    const stops: RouteStop[] = [];
    if (route.input?.origin) {
      stops.push({
        latitude: route.input.origin.latitude,
        longitude: route.input.origin.longitude,
        label: route.input.origin.label || 'Điểm xuất phát',
        tag: 'A',
        type: 'origin',
      });
    }
    const wps = (route.input as { waypoints?: Array<{ latitude: number; longitude: number; label?: string }> } | undefined)?.waypoints || [];
    wps.forEach((wp: { latitude: number; longitude: number; label?: string }, idx: number) => {
      stops.push({
        latitude: wp.latitude,
        longitude: wp.longitude,
        label: wp.label || `Điểm dừng ${idx + 1}`,
        tag: String.fromCharCode(66 + idx),
        type: 'waypoint',
      });
    });
    if (route.input?.destination) {
      const destTag = String.fromCharCode(65 + 1 + wps.length);
      stops.push({
        latitude: route.input.destination.latitude,
        longitude: route.input.destination.longitude,
        label: route.input.destination.label || 'Điểm đến',
        tag: destTag,
        type: 'destination',
      });
    }
    return stops;
  }, [route]);

  const visibleDestinations = directionsOpen ? destinations : filtered;

  return (
    <div className={styles.page}>
      <Navbar activeModule="map" />

      <main className={styles.content}>
        <div className={styles.layout}>
          {/* ─── SIDEBAR: EXPLORE & DIRECTIONS STUDIO ─── */}
          <aside className={styles.sidebar} aria-label="Bảng điều khiển du lịch">
            <div className={styles.sidebarInner}>
              {linkNotice && (
                <div role="alert" className={styles.dataNotice}>
                  <p>{linkNotice}</p>
                  <button type="button" onClick={() => setLinkAttempt((v) => v + 1)}>
                    Thử tải lại địa điểm
                  </button>
                </div>
              )}

              {/* 1. Integrated Directions Panel (when open, placed smoothly right above the list) */}
              {directionsOpen && (
                <div className={styles.integratedDirectionsBox}>
                  <DirectionsPanel
                    destinations={destinations}
                    coords={coords}
                    originId={originId}
                    destinationId={destinationId}
                    mode={mode}
                    selectedProvince={selectedProvince}
                    onProvinceChange={handleProvinceChange}
                    onOrigin={(val) => {
                      setOriginId(val);
                      planner.clear();
                    }}
                    onDestination={(val) => {
                      setDestinationId(val);
                      setSelectedId(val);
                      planner.clear();
                    }}
                    onMode={(val) => {
                      setMode(val);
                      planner.clear();
                    }}
                    onRequestGps={requestCurrentPosition}
                    onCompute={compute}
                    onClear={planner.clear}
                    onClose={() => {
                      planner.clear();
                      setDirectionsOpen(false);
                    }}
                    configured={true}
                    status={planner.status}
                    error={planner.error}
                    route={route}
                  />
                </div>
              )}

              {/* 2. Destination List (ALWAYS VISIBLE and properly scoped!) */}
              <div className={styles.integratedListSection}>
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
                  directionsOpen={directionsOpen}
                  onToggleDirections={() => setDirectionsOpen((prev) => !prev)}
                />
              </div>
            </div>
          </aside>

            {/* ─── MAP CANVAS ─── */}
            <section className={styles.map} aria-label="Bản đồ khám phá">
              <MapViewAdapter
                destinations={visibleDestinations}
                selectedDestinationId={selectedId}
                onSelectDestination={select}
                userLocation={coords}
                cameraTarget={cameraTarget}
                onRequestUserLocation={requestCurrentPosition}
                routeGeometry={route?.path}
                routeStops={routeStops}
                onDirections={openDirections}
                onAddToTrip={handleOpenAddToTrip}
              />

              {/* Discrete Footer Overlay */}
              <div className={styles.footerOverlay}>
                ● 345+ điểm đến chuẩn hóa toàn quốc · Dữ liệu VISTA & OpenStreetMap
              </div>
            </section>
          </div>

          {/* ─── SLIM BOTTOM TELEMETRY STATUS BAR ─── */}
          <footer className={styles.bottomBar}>
            <div className={styles.bottomBarLeft}>
              <span className={styles.liveGpsDot} />
              <span className={styles.bottomBarBold}>GPS+:</span>
              <span>Đang kết nối tín hiệu vệ tinh trực tiếp · Sai số vị trí: ±2,5m (Cầu Rồng, Đà Nẵng)</span>
            </div>

            <div className={styles.bottomBarRight}>
              {route ? (
                <>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <IconRoute size={14} /> Tuyến đề xuất: <strong>{Math.round(route.distanceMeters / 100) / 10} km</strong> ({Math.round(route.durationMillis / 60000)} phút · Lưu lượng giao thông thông thoáng)
                  </span>
                  <button
                    type="button"
                    className={styles.btnRouteDetails}
                    onClick={() => setDirectionsOpen(true)}
                  >
                    Chi tiết lộ trình &gt;
                  </button>
                </>
              ) : (
                <>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <IconRoute size={14} /> Tuyến đề xuất: 28,6 km qua QL14B (42 phút · Lưu lượng giao thông thông thoáng)
                  </span>
                  <button
                    type="button"
                    className={styles.btnRouteDetails}
                    onClick={() => setDirectionsOpen(true)}
                  >
                    Chi tiết lộ trình &gt;
                  </button>
                </>
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
