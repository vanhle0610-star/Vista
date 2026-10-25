# Dùng MapViewAdapter của TV5

Renderer tách khỏi API và GPS. Caller sở hữu dữ liệu, lựa chọn, tuyến và trạng thái quyền. Web dùng MapLibre GL JS; native dùng binding MapLibre React Native trong development build.

## Web

```tsx
import { MapViewAdapter } from '@/features/map-location';

<MapViewAdapter
  destinations={destinations}
  selectedDestinationId={selectedId}
  onSelectDestination={(destination) => setSelectedId(destination?.id ?? null)}
  userLocation={position}
  routeGeometry={route?.path}
  onRequestUserLocation={requestCurrentPosition}
  onStatusChange={setMapStatus}
/>
```

`destinations`: mảng `{id,name,province,category,latitude,longitude,description,thumbnailUrl?}`. `userLocation` là tọa độ tạm thời có accuracy/timestamp; `routeGeometry` là mảng `{lat,lng}`. Có thể truyền `initialCenter`, `onDirections`, `showSelectedCard=false` để nhúng trong màn lịch trình có card riêng. Wrapper ở `adapter/MapViewAdapter.tsx` giữ đường dẫn import cũ; chỉ có một renderer thật.

## Mobile của nhóm

```tsx
import { MapViewAdapter } from '@/features/map';

<MapViewAdapter
  center={initialCenter}
  destinations={itineraryItems.map((item) => ({
    id: item.id,
    name: item.name,
    latitude: item.latitude,
    longitude: item.longitude,
  }))}
  selectedDestinationId={selectedId}
  onSelectDestination={(destination) => setSelectedId(destination?.id ?? null)}
  userLocation={position}
  routeGeometry={route?.path.map((point) => ({ latitude: point.lat, longitude: point.lng }))}
  onStatusChange={setMapStatus}
/>
```

Memoize `routeGeometry` khi nhúng để tránh yêu cầu camera fit lại theo các render không liên quan. Các alias cũ `markers`, `onMarkerPress`, `routePoints` được giữ cho consumer hiện có; code mới ưu tiên `destinations`, `onSelectDestination`, `routeGeometry`. Props center không bắt buộc. Không import renderer native trực tiếp trong module khác hoặc đưa MapLibre GL JS vào native bundle.

Tọa độ nội bộ dạng latitude/longitude; GeoJSON/SDK luôn dùng `[longitude,latitude]`. Chỉ truyền tọa độ hợp lệ. Trước khi nhúng điểm lịch trình/AI, lấy dữ liệu qua public service/API của module sở hữu; ví dụ trên không yêu cầu sửa module TV3/TV4. Adapter không tự bật GPS hoặc gọi dịch vụ chỉ đường.

Khi map báo lỗi, giữ card/thông tin caller đang có và cho retry bản đồ. Khi API lần đầu lỗi và chưa có dữ liệu, hiển thị lỗi/empty phù hợp; đây không phải hỗ trợ offline đầy đủ.

API renderer đã bỏ props/provider thử nghiệm, `mode=3d`, `showBridge3D`, `bridgeConfig`, fixture và mock partner. Consumer cũ trong repo chỉ nằm ở route dev; các route này được chuyển về bản đồ thật.
