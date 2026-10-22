import type { Bridge3DConfig } from '../types';

/**
 * OSM feature 694831926 and its two carriageways (199383481, 295386151).
 * Verified against the returned polygon/lines in artifacts/tv5-map/osm-bridge.json.
 * https://www.openstreetmap.org/way/694831926
 * The axis bearing (~88.1 degrees) is calculated from the WGS84 road endpoints.
 * The 666 m structural model is centred on that axis; approaches are omitted.
 * Width/length source: https://visitdanang.travel/en/dragon-bridge-2204
 * Deck elevation, arch profile, piers and dragon details are illustrative, not CAD.
 */
export const DRAGON_BRIDGE_CONFIG: Bridge3DConfig = {
  id: 'danang-dragon-bridge',
  name: 'Cầu Rồng Đà Nẵng (Dragon Bridge)',
  anchor: { latitude: 16.0611682, longitude: 108.2278968, altitude: 0 },
  westAbutment: { latitude: 16.061068, longitude: 108.224785 },
  eastAbutment: { latitude: 16.061269, longitude: 108.231009 },
  bearing: 88.08,
  deckElevationMeters: 7.5,
  totalLengthMeters: 666,
  deckWidthMeters: 37.5,
  dragonMaxHeightMeters: 34,
  scale: 1,
  coordinateSource:
    'OpenStreetMap way 694831926 polygon centre and carriageway axes; ODbL 1.0.',
  notes:
    'Mô hình procedural đơn giản hóa; vị trí và hướng theo OSM, kích thước chính theo nguồn du lịch Đà Nẵng. Không phải bản vẽ thi công.',
};
