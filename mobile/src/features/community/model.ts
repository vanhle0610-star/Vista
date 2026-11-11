import type { components } from '@/types/api.generated';

export const FEELINGS = [
  { code: 'HAPPY', icon: '😊', label: 'Vui vẻ' },
  { code: 'DELIGHTED', icon: '😍', label: 'Thích thú' },
  { code: 'EXCITED', icon: '🤩', label: 'Hào hứng' },
  { code: 'RELAXED', icon: '😌', label: 'Thư giãn' },
  { code: 'GRATEFUL', icon: '🥰', label: 'Biết ơn' },
  { code: 'CONFIDENT', icon: '😎', label: 'Tự tin' },
  { code: 'SAD', icon: '😢', label: 'Buồn' },
  { code: 'TIRED', icon: '😴', label: 'Mệt mỏi' },
] as const;
export type FeelingCode = (typeof FEELINGS)[number]['code'];
export type Place = Pick<
  components['schemas']['DestinationSummary'],
  'id' | 'name'
> &
  Partial<Omit<components['schemas']['DestinationSummary'], 'id' | 'name'>> & {
    area?: string | null;
  };
export type PlacePage = components['schemas']['DestinationPage'];
export const PLACE_PAGE_SIZE = 20;
export const normalizeSearch = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
export const formatDistance = (km: number) =>
  !Number.isFinite(km)
    ? ''
    : km < 1
      ? `≈ ${Math.max(1, Math.round(km * 1000))} m`
      : `≈ ${km.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km`;
export type Coordinates = { latitude: number; longitude: number };
export function distanceKm(a: Coordinates, b: Coordinates) {
  if (
    ![a.latitude, a.longitude, b.latitude, b.longitude].every(
      Number.isFinite,
    ) ||
    Math.abs(a.latitude) > 90 ||
    Math.abs(b.latitude) > 90 ||
    Math.abs(a.longitude) > 180 ||
    Math.abs(b.longitude) > 180
  )
    return Infinity;
  const rad = Math.PI / 180;
  const d =
    Math.sin(((b.latitude - a.latitude) * rad) / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(((b.longitude - a.longitude) * rad) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, d)));
}
export function nearbyPlaces(
  items: Place[],
  coords: Coordinates | null,
  radiusKm: number,
) {
  return items
    .map((place) => ({
      ...place,
      distance:
        coords &&
        typeof place.latitude === 'number' &&
        typeof place.longitude === 'number'
          ? distanceKm(coords, {
              latitude: place.latitude,
              longitude: place.longitude,
            })
          : Infinity,
    }))
    .filter((place) => !coords || place.distance <= radiusKm)
    .sort((a, b) =>
      coords
        ? a.distance - b.distance || a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name),
    );
}
export const feelingText = (code?: string | null) => {
  const value = FEELINGS.find((item) => item.code === code);
  return value ? `${value.icon} ${value.label}` : '';
};
