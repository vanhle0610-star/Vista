import { pickDefaultTrip } from '../../../app/(tabs)/treasury';
import { TripDto } from '../../../services/api/tripApi';

describe('Treasury - pickDefaultTrip Selection Logic', () => {
  const tripPlanning1: TripDto = {
    id: 'trip-plan-1',
    ownerId: 'u1',
    title: 'Đà Nẵng Lên Kế Hoạch',
    startDate: '2026-12-01',
    endDate: '2026-12-05',
    status: 'PLANNING',
    members: [],
  };

  const tripActive: TripDto = {
    id: 'trip-active',
    ownerId: 'u1',
    title: 'Hà Giang Đang Đi (ACTIVE)',
    startDate: '2026-11-18',
    endDate: '2026-11-22',
    status: 'ACTIVE',
    members: [],
  };

  const tripOngoing: TripDto = {
    id: 'trip-ongoing',
    ownerId: 'u1',
    title: 'Phú Quốc Đang Đi (ONGOING)',
    startDate: '2026-11-18',
    endDate: '2026-11-22',
    status: 'ONGOING',
    members: [],
  };

  const tripCompleted: TripDto = {
    id: 'trip-done',
    ownerId: 'u1',
    title: 'Huế Đã Xong',
    startDate: '2026-10-01',
    endDate: '2026-10-05',
    status: 'COMPLETED',
    members: [],
  };

  it('prioritizes ACTIVE trip when present in the list', () => {
    const list = [tripPlanning1, tripCompleted, tripActive];
    const result = pickDefaultTrip(list);
    expect(result).toBeDefined();
    expect(result?.id).toBe('trip-active');
  });

  it('prioritizes ONGOING trip when present and no ACTIVE trip', () => {
    const list = [tripPlanning1, tripOngoing, tripCompleted];
    const result = pickDefaultTrip(list);
    expect(result).toBeDefined();
    expect(result?.id).toBe('trip-ongoing');
  });

  it('selects PLANNING trip when no ACTIVE or ONGOING trip exists', () => {
    const list = [tripCompleted, tripPlanning1];
    const result = pickDefaultTrip(list);
    expect(result).toBeDefined();
    expect(result?.id).toBe('trip-plan-1');
  });

  it('falls back to the first trip if only COMPLETED or other status exist', () => {
    const tripCancelled: TripDto = { ...tripPlanning1, id: 'trip-cancel', status: 'CANCELLED' };
    const list = [tripCompleted, tripCancelled];
    const result = pickDefaultTrip(list);
    expect(result).toBeDefined();
    expect(result?.id).toBe('trip-done');
  });

  it('returns null when trips list is empty', () => {
    const result = pickDefaultTrip([]);
    expect(result).toBeNull();
  });

  it('returns null when trips is null or undefined', () => {
    // @ts-expect-error Testing runtime undefined safety
    expect(pickDefaultTrip(undefined)).toBeNull();
    // @ts-expect-error Testing runtime null safety
    expect(pickDefaultTrip(null)).toBeNull();
  });
});
