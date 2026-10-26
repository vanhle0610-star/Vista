export function validPoint(value: unknown): value is { latitude: number; longitude: number } {
  return typeof value === 'object' && value !== null && 'latitude' in value && 'longitude' in value &&
    typeof value.latitude === 'number' && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 &&
    typeof value.longitude === 'number' && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180;
}
