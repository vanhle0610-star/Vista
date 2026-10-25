# Kiểm kê thay thế Map & Location TV5

Ngày: 24/10/2026. Danh sách code cũ đã được tra import và thay trong phạm vi TV5. Bản sửa có sẵn được sao lưu trong cache local; migration đã áp dụng giữ nguyên.

- `web/src/features/map-location/adapter/MapViewAdapter.tsx`
- `web/src/features/map-location/adapter/MapViewAdapter.module.css`
- `web/src/features/map-location/3d/DragonBridgeBuilder.ts`
- `web/src/features/map-location/3d/MapLibre3DBridgeLayer.ts`
- `web/src/features/map-location/data/bridgeConfig.ts`
- `web/src/features/map-location/data/destinations.ts`
- `web/src/features/map-location/hooks/useTwoDeviceSync.ts`
- `web/src/features/map-location/components/MapViewer.tsx`
- `web/src/features/map-location/components/PermissionCard.tsx`
- `web/src/features/map-location/components/TestingHarnessCard.tsx`
- `web/src/features/map-location/components/TwoDeviceSyncCard.tsx`
- `web/src/features/map-location/components/MapComparisonModal.tsx`
- `web/src/features/map-location/components/MapLocationHeader.tsx`
- `web/src/features/map-location/components/MapLocationHeader.module.css`
- `web/src/features/map-location/google/loader.ts`
- `web/src/features/map-location/google/routes.ts`
- `web/src/features/map-location/google/GoogleMapView.tsx`
- `web/src/features/map-location/google/GoogleMapView.module.css`
- `web/src/app/dev/map-location/map-location.module.css`
- `web/src/app/dev/map-3d/map-page.module.css`
- `mobile/src/features/map/MapLocationHarness.tsx`
- `mobile/src/features/map/MockPollingSpike.ts`
- `web/scripts/test-google-map.mjs`
- `web/scripts/verify-google-map.mjs`
- `web/scripts/verify-tv5-map.mjs`
- `web/scripts/verify-tv5-geometry.mjs`
- `docs/decisions/D4-web-google-maps.md`
- `docs/deployment/google-maps-web.md`

Đã gỡ dependency web: `@googlemaps/js-api-loader`, `@types/google.maps`, `three`, `@types/three` sau khi tìm toàn bộ import. Leaflet trước đây nạp bằng CDN trong MapViewer; không có package npm riêng. Route `/dev/map-location` và `/dev/map-3d` chuyển về `/map`. Giữ ảnh địa điểm Cầu Rồng thật, không phải model 3D. Giữ `GOOGLE_CLIENT_ID` của đăng nhập; chỉ loại bỏ cấu hình Google Maps cũ.
