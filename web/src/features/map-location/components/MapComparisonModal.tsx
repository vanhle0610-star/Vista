'use client';

import React from 'react';

interface MapComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MapComparisonModal({ isOpen, onClose }: MapComparisonModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-eyebrow">BÁO CÁO KỸ THUẬT TV5 • TUẦN 1</span>
            <h3 className="modal-title">So Sánh Hai Phương Án Bản Đồ Cho Nền Tảng VISTA</h3>
          </div>
          <button type="button" onClick={onClose} className="modal-close-btn" aria-label="Đóng">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* BẢNG SO SÁNH */}
          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Tiêu chí đánh giá</th>
                  <th>Phương án 1: Leaflet / OpenStreetMap (Raster)</th>
                  <th>Phương án 2: MapLibre GL / Vector Tile (WebGL)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Kiến trúc kết xuất</strong></td>
                  <td>Mảnh ảnh Raster (PNG 256x256), nhẹ nhàng, tương thích 100% mọi trình duyệt cũ/mới.</td>
                  <td>Đồ họa Vector WebGL / Canvas client-side. Hỗ trợ xoay 360°, nghiêng 3D, mượt mà ở màn hình Retina.</td>
                </tr>
                <tr>
                  <td><strong>Dung lượng SDK</strong></td>
                  <td>Rất nhẹ (~42 KB Gzip JS + CSS). Không cần bundle cồng kềnh.</td>
                  <td>Khá nặng (~210 - 250 KB Gzip JS + CSS). Đòi hỏi thiết bị có GPU hỗ trợ WebGL.</td>
                </tr>
                <tr>
                  <td><strong>Marker & Popup tương tác</strong></td>
                  <td>Hỗ trợ tuyệt vời qua L.divIcon, L.popup, hoàn toàn tùy biến CSS/HTML linh hoạt.</td>
                  <td>Hỗ trợ Marker HTML và Symbol Layer vector. Hiệu năng cao khi vẽ hàng nghìn điểm cùng lúc.</td>
                </tr>
                <tr>
                  <td><strong>Khả năng Mở chỉ đường</strong></td>
                  <td>URL Scheme chuẩn: <code>https://www.google.com/maps/dir/?api=1&destination=lat,lng</code>.</td>
                  <td>Tương tự, điều hướng mở dịch vụ bản đồ ngoài hoặc tích hợp OSRM/Valhalla vector routing.</td>
                </tr>
                <tr>
                  <td><strong>Geocoding Tiếng Việt</strong></td>
                  <td>Dùng Nominatim OSM API (miễn phí, 1 req/s) hoặc Photon Geocoder. Hỗ trợ tốt tên tỉnh thành/địa danh Việt Nam có dấu.</td>
                  <td>Cần dịch vụ Geocoding bên thứ ba (Mapbox Geocoding, Goong Maps VN, hoặc Pelias self-host).</td>
                </tr>
                <tr>
                  <td><strong>API Key, Quota & Chi phí</strong></td>
                  <td>
                    <span className="badge-free">Miễn phí 100%</span> tuân theo <em>OSM Tile Usage Policy</em> (không dùng cho app thương mại traffic lớn đột biến).
                  </td>
                  <td>
                    Cần Vector Tile Server (như Maptiler: 100k requests/tháng free, hoặc Protomaps PMTiles self-host trên Cloudflare R2).
                  </td>
                </tr>
                <tr>
                  <td><strong>Attribution bắt buộc</strong></td>
                  <td><strong>Bắt buộc:</strong> <code>&copy; OpenStreetMap contributors</code> hiển thị góc dưới bản đồ. Không được xóa.</td>
                  <td><strong>Bắt buộc:</strong> Ghi rõ nguồn Style, OpenMapTiles hoặc MapLibre tùy theo nguồn vector style sử dụng.</td>
                </tr>
                <tr>
                  <td><strong>Khả năng chạy đa nền tảng (Web & Mobile)</strong></td>
                  <td>Web chạy mượt. Trên Mobile React Native có thể nhúng qua <code>react-native-webview</code> hoặc dùng <code>react-native-maps</code>.</td>
                  <td>Web xuất sắc. Mobile tích hợp qua <code>@maplibre/maplibre-react-native</code> rất mạnh mẽ.</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* KHUYẾN NGHỊ KỸ THUẬT (D3 & D4) */}
          <div className="recommendations-box">
            <h4 className="rec-title">Đề xuất Quyết định Kiến trúc (Architectural Recommendations)</h4>
            <div className="rec-grid">
              <div className="rec-card">
                <div className="rec-badge">ĐỀ XUẤT D4: BẢN ĐỒ VISTA</div>
                <h5>Giai đoạn MVP (Tuần 1 - 4): Leaflet / OSM</h5>
                <p>
                  Chọn <strong>Phương án 1 (Leaflet + OpenStreetMap)</strong> cho Web Admin và Spike Tuần 1 vì tính gọn nhẹ, miễn phí, không phụ thuộc API key bí mật, triển khai nhanh và đáp ứng đầy đủ yêu cầu hiển thị điểm đến + popup chỉ đường.
                </p>
                <p>
                  <em>Lộ trình tương lai (Giai đoạn mở rộng):</em> Chuyển sang <strong>MapLibre GL</strong> kết hợp <strong>Protomaps PMTiles</strong> self-host khi cần trải nghiệm đồ họa 3D xoay bản đồ trên ứng dụng di động.
                </p>
              </div>

              <div className="rec-card">
                <div className="rec-badge">ĐỀ XUẤT D3: CẬP NHẬT VỊ TRÍ NHÓM</div>
                <h5>Chiến lược Polling 10-15s & Opt-in Consent</h5>
                <p>
                  Áp dụng cơ chế <strong>Opt-in rõ ràng</strong> (chỉ gửi tọa độ khi người dùng chủ động bật).
                </p>
                <p>
                  Sử dụng <strong>chu kỳ Polling 10–15s</strong> khi trang/ứng dụng đang ở tiêu điểm (Active). Khi chuyển sang nền (Hidden), <strong>tự động ngắt watcher</strong> qua Page Visibility API để bảo vệ pin và quyền riêng tư của khách du lịch.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-pill-primary">
            Đã hiểu và Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
