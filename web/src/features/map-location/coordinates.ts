export function validPoint(value: unknown): value is { latitude: number; longitude: number } {
  return typeof value === 'object' && value !== null && 'latitude' in value && 'longitude' in value &&
    typeof value.latitude === 'number' && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 &&
    typeof value.longitude === 'number' && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180;
}

/** Geodesic polygon: radius is the device accuracy in meters, independent of zoom. */
export function accuracyRing(latitude: number, longitude: number, meters: number): [number, number][] {
  const lat = latitude * Math.PI / 180, lng = longitude * Math.PI / 180;
  const distance = meters / 6371008.8;
  return Array.from({ length: 65 }, (_, index) => {
    const bearing = index * 2 * Math.PI / 64;
    const nextLat = Math.asin(Math.sin(lat) * Math.cos(distance) + Math.cos(lat) * Math.sin(distance) * Math.cos(bearing));
    const nextLng = lng + Math.atan2(Math.sin(bearing) * Math.sin(distance) * Math.cos(lat), Math.cos(distance) - Math.sin(lat) * Math.sin(nextLat));
    return [((nextLng * 180 / Math.PI + 540) % 360) - 180, nextLat * 180 / Math.PI];
  });
}
