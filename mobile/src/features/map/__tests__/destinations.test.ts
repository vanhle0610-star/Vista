import { api } from '@/services/api/client';
import { destinationMarkers, loadMapDestinations } from '../destinations';
import { selectMarker, validCoordinate } from '../types';
jest.mock('@/services/api/client', () => ({ api: { get: jest.fn() } }));
const a = {
  id: 'a',
  name: 'Cầu Rồng',
  province: 'Đà Nẵng',
  category: 'Cầu',
  latitude: 16.061,
  longitude: 108.228,
  status: 'PUBLISHED' as const,
};
describe('Map destination integration', () => {
  beforeEach(() => jest.clearAllMocks());
  it('validates empty and invalid coordinates without swapping longitude and latitude', () => {
    expect(destinationMarkers([])).toEqual({ markers: [], rejected: 0 });
    const result = destinationMarkers([
      a,
      { ...a, id: 'bad', latitude: 108, longitude: 16 },
      { ...a, id: 'null', latitude: null },
    ]);
    expect(result.rejected).toBe(2);
    expect(result.markers[0].longitude).toBe(108.228);
    expect(validCoordinate({ latitude: NaN, longitude: 10 })).toBe(false);
    expect(selectMarker(result.markers, 'a')?.title).toBe('Cầu Rồng');
    expect(selectMarker(result.markers, 'bad')).toBeUndefined();
  });
  it('loads all pages and deduplicates IDs', async () => {
    jest
      .mocked(api.get)
      .mockResolvedValueOnce({ data: { items: [a], total: 2 } })
      .mockResolvedValueOnce({
        data: { items: [a, { ...a, id: 'b' }], total: 2 },
      });
    expect((await loadMapDestinations()).markers).toHaveLength(2);
    expect(api.get).toHaveBeenLastCalledWith(
      '/destinations',
      expect.objectContaining({ params: { page: 1, size: 20 } }),
    );
  });
  it('does not silently replace network failure with fixtures', async () => {
    jest.mocked(api.get).mockRejectedValue(new Error('offline'));
    await expect(loadMapDestinations()).rejects.toThrow('offline');
  });
  it('keeps completed pages available when a later page fails', async () => {
    const progress = jest.fn();
    jest.mocked(api.get)
      .mockResolvedValueOnce({ data: { items: [a], total: 2 } })
      .mockRejectedValueOnce(new Error('offline on next page'));
    await expect(loadMapDestinations(undefined, progress)).rejects.toThrow('offline');
    expect(progress).toHaveBeenCalledWith(expect.objectContaining({
      markers: [expect.objectContaining({ id: 'a' })],
    }));
  });
  it('rejects stuck pagination rather than reporting partial data as complete', async () => {
    jest.mocked(api.get).mockResolvedValue({ data: { items: [a], total: 2 } });
    await expect(loadMapDestinations()).rejects.toThrow('phân trang');
  });
});
