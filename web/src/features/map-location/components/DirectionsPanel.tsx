'use client';

import { useState, useMemo } from 'react';
import type { Coordinates, DestinationMarker } from '../types';
import type { RouteResult, TravelMode } from '../routing/routes';
import { REGIONS_PROVINCES, HOTSPOT_PROVINCES } from './DestinationList';
import { IconPin, IconClose, IconCar, IconWalk, IconSparkles, IconCrosshair } from './MapIcons';
import styles from './DirectionsPanel.module.css';

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

interface Props {
  destinations: DestinationMarker[];
  coords: Coordinates | null;
  originId: string;
  destinationId: string;
  mode: TravelMode;
  selectedProvince?: string;
  onProvinceChange?: (prov: string) => void;
  onOrigin: (value: string) => void;
  onDestination: (value: string) => void;
  onMode: (value: TravelMode) => void;
  onRequestGps: () => void;
  onCompute: (waypointIds?: string[]) => void;
  onClear: () => void;
  onClose: () => void;
  configured: boolean;
  status: 'idle' | 'loading' | 'success' | 'empty' | 'error';
  error: string | null;
  route: RouteResult | null;
}

// Công thức tính khoảng cách Haversine (km)
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function DirectionsPanel(props: Props) {
  const { destinations, coords, originId, destinationId, mode, route, status, selectedProvince = 'all' } = props;
  const [waypointIds, setWaypointIds] = useState<string[]>([]);
  const [optimizeNotice, setOptimizeNotice] = useState<string | null>(null);

  // Scoped destinations based on chosen city / province
  const scopedDestinations = useMemo(() => {
    if (!selectedProvince || selectedProvince === 'all') {
      return destinations;
    }
    const norm = normalize(selectedProvince);
    const filtered = destinations.filter((d) => {
      const provNorm = normalize(d.province);
      return provNorm.includes(norm) || norm.includes(provNorm);
    });
    return filtered.length > 0 ? filtered : destinations;
  }, [destinations, selectedProvince]);

  const destMap = new Map<string, DestinationMarker>(destinations.map((d) => [d.id, d]));

  const valid = Boolean(
    destinationId &&
      originId &&
      (originId !== 'gps' || coords) &&
      originId !== destinationId
  );

  const handleAddWaypoint = () => {
    if (waypointIds.length >= 4) return;
    setWaypointIds([...waypointIds, '']);
  };

  const handleUpdateWaypoint = (index: number, val: string) => {
    const updated = [...waypointIds];
    updated[index] = val;
    setWaypointIds(updated);
    setOptimizeNotice(null);
    props.onClear();
  };

  const handleRemoveWaypoint = (index: number) => {
    const updated = waypointIds.filter((_, i) => i !== index);
    setWaypointIds(updated);
    setOptimizeNotice(null);
    props.onClear();
  };

  // Hoán đổi vị trí 2 điểm dừng
  const handleSwapStops = (idxA: number, idxB: number) => {
    const updated = [...waypointIds];
    const temp = updated[idxA];
    updated[idxA] = updated[idxB];
    updated[idxB] = temp;
    setWaypointIds(updated);
    props.onClear();
  };

  // Thuật toán Tối ưu hóa thứ tự ghé thăm Nearest Neighbor TSP
  const handleOptimizeRoute = () => {
    // Thu thập tọa độ điểm xuất phát
    let startLat = 0;
    let startLng = 0;
    if (originId === 'gps' && coords) {
      startLat = coords.latitude;
      startLng = coords.longitude;
    } else if (destMap.has(originId)) {
      const d = destMap.get(originId)!;
      startLat = d.latitude;
      startLng = d.longitude;
    } else {
      return;
    }

    // Các điểm cần ghé (bao gồm các waypoints hợp lệ + điểm đến cuối cùng)
    const validWps = waypointIds.filter((id) => Boolean(id) && destMap.has(id));
    if (!destinationId || !destMap.has(destinationId)) return;

    const allStops = [...new Set([...validWps, destinationId])];
    if (allStops.length < 2) {
      setOptimizeNotice('Cần ít nhất 2 điểm dừng để tối ưu hóa thứ tự.');
      return;
    }

    // Tính tổng quãng đường ban đầu
    let origDist = 0;
    let curr = { lat: startLat, lng: startLng };
    for (const stopId of allStops) {
      const target = destMap.get(stopId)!;
      origDist += haversineKm(curr.lat, curr.lng, target.latitude, target.longitude);
      curr = { lat: target.latitude, lng: target.longitude };
    }

    // Thuật toán Nearest Neighbor
    const unvisited = [...allStops];
    const ordered: string[] = [];
    curr = { lat: startLat, lng: startLng };

    while (unvisited.length > 0) {
      let nearestIdx = -1;
      let minDist = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const candidate = destMap.get(unvisited[i])!;
        const d = haversineKm(curr.lat, curr.lng, candidate.latitude, candidate.longitude);
        if (d < minDist) {
          minDist = d;
          nearestIdx = i;
        }
      }

      const nextStop = unvisited.splice(nearestIdx, 1)[0];
      ordered.push(nextStop);
      const nextTarget = destMap.get(nextStop)!;
      curr = { lat: nextTarget.latitude, lng: nextTarget.longitude };
    }

    // Tính tổng quãng đường sau tối ưu
    let newDist = 0;
    curr = { lat: startLat, lng: startLng };
    for (const stopId of ordered) {
      const target = destMap.get(stopId)!;
      newDist += haversineKm(curr.lat, curr.lng, target.latitude, target.longitude);
      curr = { lat: target.latitude, lng: target.longitude };
    }

    // Gán lại waypoints và destination
    const newWaypoints = ordered.slice(0, -1);
    const newDestId = ordered[ordered.length - 1];

    setWaypointIds(newWaypoints);
    props.onDestination(newDestId);

    const savedKm = Math.max(0, origDist - newDist).toFixed(1);
    if (parseFloat(savedKm) > 0.5) {
      setOptimizeNotice(`Đã tối ưu thứ tự các điểm dừng, tiết kiệm ~${savedKm} km di chuyển.`);
    } else {
      setOptimizeNotice('Thứ tự các điểm dừng hiện tại đã tối ưu nhất.');
    }

    // Tự động tính tuyến mới
    props.onCompute(newWaypoints);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWaypoints = waypointIds.filter(Boolean);
    props.onCompute(cleanWaypoints);
  };

  // Ước tính giá taxi (khoảng 14.000 VNĐ / km)
  const taxiFare = route ? Math.round((route.distanceMeters / 1000) * 14000) : 0;

  // Nhãn ký hiệu chữ cái điểm đến cuối cùng: A -> B (nếu ko có waypoint), hoặc A -> B -> C (nếu 1 waypoint)
  const finalDestBadge = String.fromCharCode(65 + 1 + waypointIds.length);

  // Chuỗi tóm tắt toàn bộ lộ trình các trạm
  const routeStopsSummary = useMemo(() => {
    if (!route) return '';
    const parts: string[] = [];
    const origLabel = route.input?.origin?.label || 'Xuất phát';
    parts.push(`A: ${origLabel}`);
    const wps = (route.input as any)?.waypoints || [];
    wps.forEach((wp: any, i: number) => {
      parts.push(`${String.fromCharCode(66 + i)}: ${wp.label || `Điểm ${i + 1}`}`);
    });
    const destTag = String.fromCharCode(65 + 1 + wps.length);
    const destLabel = route.input?.destination?.label || 'Điểm đến';
    parts.push(`${destTag}: ${destLabel}`);
    return parts.join(' ➔ ');
  }, [route]);

  return (
    <section className={styles.panel} aria-label="Chỉ đường thông minh VISTA">
      <div className={styles.heading}>
        <div>
          <span className={styles.subTitle}>VISTA ROUTE PLANNER</span>
          <h2 className={styles.mainTitle}>Chỉ đường & Lộ trình</h2>
        </div>
        <button type="button" className={styles.btnClose} onClick={props.onClose} title="Đóng bảng chỉ đường">
          <IconClose size={11} />
          <span>Thu gọn</span>
        </button>
      </div>

      {/* Khoanh vùng thành phố selector */}
      <div className={styles.cityScopeBar}>
        <span className={styles.cityScopeLabel}>
          <IconPin size={13} />
          <span>Khoanh vùng:</span>
        </span>
        <select
          className={styles.cityScopeSelect}
          value={selectedProvince}
          onChange={(e) => {
            props.onProvinceChange?.(e.target.value);
            props.onClear();
          }}
          aria-label="Khoanh vùng theo thành phố"
        >
          <option value="all">Toàn quốc</option>
          {REGIONS_PROVINCES.map((reg) => (
            <optgroup key={reg.region} label={reg.region}>
              {reg.provinces.map((prov) => {
                const count = destinations.filter((d) => normalize(d.province).includes(normalize(prov))).length;
                if (count === 0) return null;
                return (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                );
              })}
            </optgroup>
          ))}
        </select>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Timeline Stepper Container */}
        <div className={styles.stepperContainer}>
          {/* Origin Stop */}
          <div className={styles.stopItem}>
            <div className={styles.stopBadgeA}>A</div>
            <div className={styles.stopContent}>
              <span className={styles.stopLabel}>Điểm xuất phát</span>
              <select
                className={styles.selectInput}
                aria-label="Điểm xuất phát"
                value={originId}
                onChange={(event) => {
                  if (event.target.value === '__switch_all__') {
                    props.onProvinceChange?.('all');
                    return;
                  }
                  props.onOrigin(event.target.value);
                  setOptimizeNotice(null);
                }}
              >
                <option value="">
                  {selectedProvince !== 'all'
                    ? `Chọn điểm tại ${selectedProvince}`
                    : 'Chọn điểm xuất phát'}
                </option>
                <option value="gps">
                  Vị trí của tôi {coords ? '(GPS sẵn sàng)' : '(Chưa bật định vị)'}
                </option>
                {scopedDestinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {selectedProvince === 'all' ? `· ${d.province}` : ''}
                  </option>
                ))}
                {selectedProvince !== 'all' && (
                  <option value="__switch_all__">Mở rộng sang Toàn quốc…</option>
                )}
              </select>
            </div>
          </div>

          {originId === 'gps' && !coords && (
            <button
              type="button"
              className={styles.btnGpsRequest}
              onClick={props.onRequestGps}
            >
              <IconCrosshair size={13} />
              <span>Cho phép truy cập vị trí hiện tại</span>
            </button>
          )}

          {/* Intermediate Stops */}
          {waypointIds.map((wpId, idx) => {
            const stopLetter = String.fromCharCode(66 + idx);
            return (
              <div key={idx} className={styles.stopItem}>
                <div className={styles.stopBadgeMid}>{stopLetter}</div>
                <div className={styles.stopContent}>
                  <div className={styles.stopHeader}>
                    <span className={styles.stopLabel}>Điểm ghé thăm {stopLetter}</span>
                    <div className={styles.stopActions}>
                      {idx > 0 && (
                        <button
                          type="button"
                          className={styles.btnReorder}
                          onClick={() => handleSwapStops(idx, idx - 1)}
                          title="Đổi lên trước"
                        >
                          ↑
                        </button>
                      )}
                      {idx < waypointIds.length - 1 && (
                        <button
                          type="button"
                          className={styles.btnReorder}
                          onClick={() => handleSwapStops(idx, idx + 1)}
                          title="Đổi xuống sau"
                        >
                          ↓
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.btnRemoveStop}
                        onClick={() => handleRemoveWaypoint(idx)}
                        title="Xóa điểm ghé thăm"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <select
                    className={styles.selectInput}
                    value={wpId}
                    onChange={(e) => {
                      if (e.target.value === '__switch_all__') {
                        props.onProvinceChange?.('all');
                        return;
                      }
                      handleUpdateWaypoint(idx, e.target.value);
                    }}
                    aria-label={`Điểm dừng ${stopLetter}`}
                  >
                    <option value="">
                      {selectedProvince !== 'all'
                        ? `Chọn điểm tại ${selectedProvince}`
                        : 'Chọn điểm ghé thăm dọc đường'}
                    </option>
                    {scopedDestinations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {selectedProvince === 'all' ? `· ${d.province}` : ''}
                      </option>
                    ))}
                    {selectedProvince !== 'all' && (
                      <option value="__switch_all__">Mở rộng sang Toàn quốc…</option>
                    )}
                  </select>
                </div>
              </div>
            );
          })}

          {/* Final Destination Stop */}
          <div className={styles.stopItem}>
            <div className={styles.stopBadgeB}>{finalDestBadge}</div>
            <div className={styles.stopContent}>
              <span className={styles.stopLabel}>Điểm đến cuối cùng</span>
              <select
                className={styles.selectInput}
                aria-label="Điểm đến"
                value={destinationId}
                onChange={(event) => {
                  if (event.target.value === '__switch_all__') {
                    props.onProvinceChange?.('all');
                    return;
                  }
                  props.onDestination(event.target.value);
                  setOptimizeNotice(null);
                }}
              >
                <option value="">
                  {selectedProvince !== 'all'
                    ? `Chọn điểm đến tại ${selectedProvince}`
                    : 'Chọn điểm đến cuối cùng'}
                </option>
                {scopedDestinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {selectedProvince === 'all' ? `· ${d.province}` : ''}
                  </option>
                ))}
                {selectedProvince !== 'all' && (
                  <option value="__switch_all__">Mở rộng sang Toàn quốc…</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Action Row: Add Stop + Optimize */}
        <div className={styles.stepperActions}>
          {waypointIds.length < 4 && (
            <button
              type="button"
              className={styles.btnAddStop}
              onClick={handleAddWaypoint}
            >
              + Thêm điểm ghé thăm
            </button>
          )}

          {waypointIds.filter(Boolean).length >= 1 && destinationId && (
            <button
              type="button"
              className={styles.btnOptimize}
              onClick={handleOptimizeRoute}
              title="Tự động sắp xếp lại chuỗi điểm dừng ngắn nhất (Nearest Neighbor TSP)"
            >
              <IconSparkles size={13} />
              <span>Tối ưu thứ tự</span>
            </button>
          )}
        </div>

        {/* Optimize Toast Notice */}
        {optimizeNotice && (
          <div className={styles.optimizeBadge}>
            {optimizeNotice}
          </div>
        )}

        {/* Travel Mode Pills */}
        <div className={styles.modeSection}>
          <span className={styles.modeTitle}>Phương tiện di chuyển:</span>
          <div className={styles.modePills}>
            <button
              type="button"
              className={`${styles.modePill} ${mode === 'DRIVING' ? styles.modePillActive : ''}`}
              onClick={() => props.onMode('DRIVING')}
            >
              <IconCar size={14} />
              <span>Ô tô / Xe máy</span>
            </button>
            <button
              type="button"
              className={`${styles.modePill} ${mode === 'WALKING' ? styles.modePillActive : ''}`}
              onClick={() => props.onMode('WALKING')}
            >
              <IconWalk size={14} />
              <span>Đi bộ</span>
            </button>
          </div>
        </div>

        {/* Submit Route Compute Button */}
        <button
          className={styles.btnCompute}
          disabled={!valid || status === 'loading'}
          type="submit"
        >
          {status === 'loading'
            ? 'Đang tính toán tuyến đường…'
            : waypointIds.length > 0
              ? `Tính lộ trình ${waypointIds.filter(Boolean).length + 2} điểm dừng`
              : 'Tính tuyến đường'}
        </button>
      </form>

      {/* Results View */}
      <div className={styles.resultContainer} aria-live="polite">
        {status === 'error' && (
          <div className={styles.errorNotice} role="alert">
            {props.error || 'Không thể tìm thấy tuyến đường phù hợp. Vui lòng thử lại.'}
          </div>
        )}

        {status === 'empty' && (
          <div className={styles.emptyNotice}>
            Chưa tìm thấy tuyến phù hợp. Hãy thử đổi địa điểm hoặc phương tiện.
          </div>
        )}

        {route && (
          <section className={styles.resultCard} aria-label="Kết quả tuyến đường">
            <div className={styles.resultHeader}>
              <span className={styles.resultTag}>THÔNG TIN HÀNH TRÌNH</span>
              <button type="button" className={styles.btnClearRoute} onClick={props.onClear}>
                Xóa tuyến
              </button>
            </div>

            <h3 className={styles.routeSummaryText}>
              {routeStopsSummary || `${route.input.origin.label} ➔ ${route.input.destination.label}`}
            </h3>

            {/* Quick Metrics */}
            <div className={styles.metricsGrid}>
              <div className={styles.metricItem}>
                <span className={styles.metricValue}>
                  {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(
                    route.distanceMeters / 1000
                  )}{' '}
                  km
                </span>
                <span className={styles.metricLabel}>Khoảng cách</span>
              </div>

              <div className={styles.metricItem}>
                <span className={styles.metricValue}>
                  {Math.max(1, Math.ceil(route.durationMillis / 60000))} phút
                </span>
                <span className={styles.metricLabel}>Thời gian dự tính</span>
              </div>

              {taxiFare > 0 && mode === 'DRIVING' && (
                <div className={styles.metricItem}>
                  <span className={styles.metricValueHighlight}>
                    ~{new Intl.NumberFormat('vi-VN').format(taxiFare)} đ
                  </span>
                  <span className={styles.metricLabel}>Ước tính taxi / xe</span>
                </div>
              )}
            </div>

            <p className={styles.routeFooterNote}>
              Tuyến đường được tính toán theo dữ liệu giao thông thực tế OpenStreetMap (OSRM).
            </p>
          </section>
        )}
      </div>
    </section>
  );
}
