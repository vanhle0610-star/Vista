'use client';
import type { Coordinates, DestinationMarker } from '../types';
import type { RouteResult, TravelMode } from '../routing/routes';
import styles from './DirectionsPanel.module.css';

interface Props {
  destinations: DestinationMarker[]; coords: Coordinates | null;
  originId: string; destinationId: string; mode: TravelMode;
  onOrigin: (value: string) => void; onDestination: (value: string) => void;
  onMode: (value: TravelMode) => void; onRequestGps: () => void;
  onCompute: () => void; onClear: () => void; onClose: () => void;
  configured: boolean; status: 'idle' | 'loading' | 'success' | 'empty' | 'error';
  error: string | null; route: RouteResult | null;
}
export function DirectionsPanel(props: Props) {
  const { destinations, coords, originId, destinationId, mode, route, status } = props;
  const valid = Boolean(destinationId && originId && (originId !== 'gps' || coords) && originId !== destinationId);
  return <section className={styles.panel} aria-label="Chỉ đường trong VISTA">
    <div className={styles.heading}><div><span>KHÁM PHÁ CÙNG VISTA</span><h2>Chỉ đường</h2></div><button onClick={props.onClose}>Quay lại danh sách</button></div>
    <form onSubmit={(event) => { event.preventDefault(); props.onCompute(); }}>
      <label>Điểm xuất phát<select aria-label="Điểm xuất phát" value={originId} onChange={(event) => props.onOrigin(event.target.value)}>
        <option value="">Chọn điểm xuất phát</option><option value="gps">Vị trí của tôi{coords ? '' : ' — cần cho phép định vị'}</option>
        {destinations.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.province}</option>)}
      </select></label>
      {originId === 'gps' && !coords && <button type="button" className={styles.secondary} onClick={props.onRequestGps}>Cho phép lấy vị trí</button>}
      <label>Điểm đến<select aria-label="Điểm đến" value={destinationId} onChange={(event) => props.onDestination(event.target.value)}>
        <option value="">Chọn điểm đến</option>{destinations.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.province}</option>)}
      </select></label>
      <label>Phương tiện<select aria-label="Phương tiện" value={mode} onChange={(event) => props.onMode(event.target.value === 'WALKING' ? 'WALKING' : 'DRIVING')}>
        <option value="DRIVING">Ô tô</option><option value="WALKING">Đi bộ</option>
      </select></label>
      <p className={styles.privacy}>Khi bạn tính tuyến, hai tọa độ được gửi qua VISTA đến dịch vụ chỉ đường. Không tự chia sẻ vị trí cho nhóm.</p>
      {!props.configured && <p role="status">Dịch vụ bản đồ và chỉ đường chưa được cấu hình. Bạn vẫn có thể chọn địa điểm.</p>}
      {!valid && <p className={styles.hint}>Chọn hai địa điểm khác nhau hoặc cho phép định vị để bắt đầu.</p>}
      <button className={styles.primary} disabled={!valid || !props.configured || status === 'loading'} type="submit">{status === 'loading' ? 'Đang tính tuyến…' : status === 'error' ? 'Thử tính lại tuyến' : 'Tính tuyến đường'}</button>
    </form>
    <div aria-live="polite" aria-atomic="true">
      {status === 'error' && <p role="alert">{props.error}</p>}
      {status === 'empty' && <p>Chưa tìm thấy tuyến phù hợp. Thử đổi địa điểm hoặc phương tiện.</p>}
      {route && <section className={styles.result} aria-label="Kết quả tuyến đường">
        <h3>{route.input.origin.label} → {route.input.destination.label}</h3>
        <div className={styles.metrics}><strong>{new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(route.distanceMeters / 1000)} km</strong><strong>{Math.max(1, Math.ceil(route.durationMillis / 60000))} phút <small>dự kiến</small></strong></div>
        <p>Thời gian tham khảo, chưa sử dụng thông tin giao thông trực tiếp.</p>
        {route.warnings.map((warning, index) => <p key={index}>{warning}</p>)}
        <p>{route.attribution}</p>
        {route.input.mode === 'WALKING' && <p>Đường đi bộ có thể thiếu vỉa hè hoặc lối đi phù hợp. Hãy kiểm tra điều kiện thực tế.</p>}
      </section>}
      {status !== 'idle' && <button className={styles.secondary} onClick={props.onClear}>Xóa tuyến</button>}
    </div>
  </section>;
}
