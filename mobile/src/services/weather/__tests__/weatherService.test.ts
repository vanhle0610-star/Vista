import { fetchLiveWeatherAdvice, resolveDestinationCoords } from '../weatherService';

describe('weatherService', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves coordinates for Vietnamese destinations regardless of accents', () => {
    expect(resolveDestinationCoords('Đà Lạt, Lâm Đồng').label).toBe('Đà Lạt');
    expect(resolveDestinationCoords('Phố cổ Hội An').label).toBe('Hội An');
    expect(resolveDestinationCoords('Phu Quoc').label).toBe('Phú Quốc');
  });

  it('parses Open-Meteo daily forecast and computes dynamic golden hours', async () => {
    globalThis.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        current: { temperature_2m: 20, weather_code: 2 },
        daily: {
          time: ['2026-11-27'],
          temperature_2m_min: [15],
          temperature_2m_max: [22],
          weather_code: [61],
          sunrise: ['2026-11-27T05:50'],
          sunset: ['2026-11-27T17:30'],
        },
      }),
    }) as any;

    const result = await fetchLiveWeatherAdvice({
      locationText: 'Đà Lạt',
      dateStr: '2026-11-27',
    });

    expect(result.source).toBe('open-meteo-daily');
    expect(result.tempMin).toBe(15);
    expect(result.tempMax).toBe(22);
    expect(result.conditionLabel).toBe('Có mưa rào');
    expect(result.morningGoldenHour).toBe('06:05 - 07:20');
    expect(result.eveningGoldenHour).toBe('16:15 - 17:30');
  });
});
