import {
  distanceKm,
  FEELINGS,
  feelingText,
  normalizeSearch,
  formatDistance,
  nearbyPlaces,
} from '../model';

test('feeling codes are unique, stable, allowlisted and do not render arbitrary input', () => {
  expect(new Set(FEELINGS.map((value) => value.code)).size).toBe(8);
  expect(feelingText('HAPPY')).toBe('😊 Vui vẻ');
  expect(feelingText('<script>')).toBe('');
  expect(feelingText(null)).toBe('');
});
test('Haversine distances and radius sort actual coordinates with missing/invalid coordinates excluded', () => {
  expect(
    distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }),
  ).toBeCloseTo(111.19, 1);
  expect(
    distanceKm({ latitude: 100, longitude: 0 }, { latitude: 0, longitude: 1 }),
  ).toBe(Infinity);
  const items = [
    { id: 'far', name: 'Far', latitude: 0, longitude: 1 },
    { id: 'near', name: 'Near', latitude: 0, longitude: 0.01 },
    { id: 'unknown', name: 'Unknown' },
  ];
  expect(
    nearbyPlaces(items, { latitude: 0, longitude: 0 }, 10).map(
      (item) => item.id,
    ),
  ).toEqual(['near']);
  expect(
    nearbyPlaces(items, { latitude: 0, longitude: 0 }, 200).map(
      (item) => item.id,
    ),
  ).toEqual(['near', 'far']);
  expect(nearbyPlaces(items, null, 10)).toHaveLength(3);
});
test('Vietnamese labels match unaccented queries and distances use m/km', () => {
  expect(normalizeSearch('Hào hứng')).toBe('hao hung');
  expect(normalizeSearch('Đà Nẵng')).toBe('da nang');
  expect(formatDistance(0.25)).toBe('≈ 250 m');
  expect(formatDistance(Infinity)).toBe('');
});
