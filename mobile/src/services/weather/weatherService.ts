export interface LiveWeatherAdvice {
  locationLabel: string;
  tempMin: number;
  tempMax: number;
  tempCurrent?: number;
  weatherCode: number;
  conditionLabel: string;
  advice: string;
  morningGoldenHour: string;
  eveningGoldenHour: string;
  goldenHourNote: string;
  source: 'open-meteo-daily' | 'open-meteo-current' | 'offline-fallback';
}

interface CoordsEntry {
  label: string;
  lat: number;
  lon: number;
  keywords: string[];
}

const VIETNAM_COORDS: CoordsEntry[] = [
  { label: 'Đà Nẵng', lat: 16.0544, lon: 108.2022, keywords: ['da nang', 'ba na', 'my khe', 'son tra'] },
  { label: 'Hội An', lat: 15.8801, lon: 108.338, keywords: ['hoi an', 'cu lao cham'] },
  { label: 'Huế', lat: 16.4637, lon: 107.5909, keywords: ['hue', 'thua thien'] },
  { label: 'Đà Lạt', lat: 11.9404, lon: 108.4583, keywords: ['da lat', 'lam dong'] },
  { label: 'Nha Trang', lat: 12.2388, lon: 109.1967, keywords: ['nha trang', 'khanh hoa'] },
  { label: 'Phú Quốc', lat: 10.2899, lon: 103.984, keywords: ['phu quoc', 'kien giang'] },
  { label: 'Hà Nội', lat: 21.0285, lon: 105.8542, keywords: ['ha noi', 'hanoi'] },
  { label: 'Hạ Long', lat: 20.9517, lon: 107.0748, keywords: ['ha long', 'quang ninh'] },
  { label: 'Ninh Bình', lat: 20.2506, lon: 105.9745, keywords: ['ninh binh', 'trang an', 'tam coc'] },
  { label: 'Sapa', lat: 22.3364, lon: 103.8438, keywords: ['sapa', 'sa pa', 'lao cai'] },
  { label: 'Hà Giang', lat: 22.8233, lon: 104.9836, keywords: ['ha giang'] },
  { label: 'TP. Hồ Chí Minh', lat: 10.8231, lon: 106.6297, keywords: ['ho chi minh', 'sai gon', 'saigon', 'tphcm'] },
  { label: 'Vũng Tàu', lat: 10.4114, lon: 107.1362, keywords: ['vung tau', 'ba ria'] },
  { label: 'Cần Thơ', lat: 10.0452, lon: 105.7469, keywords: ['can tho'] },
  { label: 'Quy Nhơn', lat: 13.782, lon: 109.2197, keywords: ['quy nhon', 'binh dinh'] },
  { label: 'Phan Thiết / Mũi Né', lat: 10.9289, lon: 108.1021, keywords: ['phan thiet', 'mui ne', 'binh thuan'] },
  { label: 'Phú Yên', lat: 13.0955, lon: 109.3209, keywords: ['phu yen', 'tuy hoa'] },
  { label: 'Quảng Bình', lat: 17.4689, lon: 106.6223, keywords: ['quang binh', 'phong nha', 'dong hoi'] },
];

const DEFAULT_COORDS: CoordsEntry = VIETNAM_COORDS[0]; // Đà Nẵng

function stripVietnamese(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function resolveDestinationCoords(
  locationText?: string | null,
  lat?: number | null,
  lon?: number | null
): { label: string; lat: number; lon: number } {
  if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
    return {
      label: locationText?.trim() || 'Điểm đến',
      lat,
      lon,
    };
  }
  const normalized = stripVietnamese(locationText || '');
  if (normalized) {
    const found = VIETNAM_COORDS.find((c) => c.keywords.some((kw) => normalized.includes(kw)));
    if (found) {
      return { label: found.label, lat: found.lat, lon: found.lon };
    }
  }
  return { label: DEFAULT_COORDS.label, lat: DEFAULT_COORDS.lat, lon: DEFAULT_COORDS.lon };
}

function interpretWmo(code: number): { condition: string; advice: string } {
  if (code === 0 || code === 1) {
    return {
      condition: 'Trời quang, nắng đẹp',
      advice: 'Thời tiết khô ráo, nắng nhẹ, rất lý tưởng cho các hoạt động tham quan và chụp ảnh ngoài trời.',
    };
  }
  if (code === 2 || code === 3) {
    return {
      condition: 'Nhiều mây, dịu mát',
      advice: 'Ánh sáng dịu nhẹ, không quá gắt, phù hợp đi bộ khám phá phố cổ, bảo tàng và di tích.',
    };
  }
  if (code === 45 || code === 48) {
    return {
      condition: 'Sương mù nhẹ',
      advice: 'Tầm nhìn buổi sáng có thể hạn chế; nên di chuyển chậm và ưu tiên tham quan từ giữa buổi.',
    };
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return {
      condition: 'Có mưa rào',
      advice: 'Nên mang theo ô/áo mưa gọn nhẹ và ưu tiên sắp xếp các điểm trong nhà, ẩm thực hoặc bảo tàng.',
    };
  }
  if (code >= 95) {
    return {
      condition: 'Có dông',
      advice: 'Hạn chế các hoạt động ngoài trời hoặc đi biển/đồi núi; ưu tiên điểm dừng an toàn trong nhà.',
    };
  }
  return {
    condition: 'Thời tiết ôn hòa',
    advice: 'Điều kiện thuận lợi cho lịch trình tham quan kết hợp ẩm thực địa phương.',
  };
}

function formatHmFromIso(iso?: string, offsetMinutes = 0): string | null {
  if (!iso || !iso.includes('T')) return null;
  const timePart = iso.split('T')[1];
  const [hStr, mStr] = timePart.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return null;
  const total = Math.max(0, Math.min(23 * 60 + 59, h * 60 + m + offsetMinutes));
  const outH = String(Math.floor(total / 60)).padStart(2, '0');
  const outM = String(total % 60).padStart(2, '0');
  return `${outH}:${outM}`;
}

function computeGoldenHours(sunriseIso?: string, sunsetIso?: string) {
  const mStart = formatHmFromIso(sunriseIso, 15) || '06:00';
  const mEnd = formatHmFromIso(sunriseIso, 90) || '07:15';
  const eStart = formatHmFromIso(sunsetIso, -75) || '16:45';
  const eEnd = formatHmFromIso(sunsetIso, 0) || '18:00';
  return {
    morningGoldenHour: `${mStart} - ${mEnd}`,
    eveningGoldenHour: `${eStart} - ${eEnd}`,
  };
}

const weatherCache = new Map<string, { data: LiveWeatherAdvice; expiresAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

export async function fetchLiveWeatherAdvice(options: {
  locationText?: string | null;
  dateStr?: string | null;
  lat?: number | null;
  lon?: number | null;
}): Promise<LiveWeatherAdvice> {
  const coords = resolveDestinationCoords(options.locationText, options.lat, options.lon);
  const targetDate = options.dateStr ? options.dateStr.split('T')[0] : '';
  const cacheKey = `${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}:${targetDate}`;

  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${coords.lat}&longitude=${coords.lon}` +
    `&current=temperature_2m,weather_code` +
    `&daily=temperature_2m_min,temperature_2m_max,weather_code,sunrise,sunset` +
    `&timezone=Asia%2FBangkok&forecast_days=16`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP ${res.status}`);
    }
    const json = await res.json();
    const daily = json?.daily;
    const current = json?.current;

    const times: string[] = Array.isArray(daily?.time) ? daily.time : [];
    const matchedIdx = targetDate ? times.indexOf(targetDate) : -1;

    if (matchedIdx !== -1) {
      const tMin = Math.round(daily.temperature_2m_min?.[matchedIdx] ?? current?.temperature_2m ?? 24);
      const tMax = Math.round(daily.temperature_2m_max?.[matchedIdx] ?? current?.temperature_2m ?? 29);
      const code = Number(daily.weather_code?.[matchedIdx] ?? current?.weather_code ?? 1);
      const { condition, advice } = interpretWmo(code);
      const golden = computeGoldenHours(daily.sunrise?.[matchedIdx], daily.sunset?.[matchedIdx]);

      const result: LiveWeatherAdvice = {
        locationLabel: coords.label,
        tempMin: tMin,
        tempMax: tMax,
        tempCurrent:
          typeof current?.temperature_2m === 'number' ? Math.round(current.temperature_2m) : undefined,
        weatherCode: code,
        conditionLabel: condition,
        advice,
        ...golden,
        goldenHourNote: `Tính theo giờ bình minh & hoàng hôn thực tế tại ${coords.label}.`,
        source: 'open-meteo-daily',
      };
      weatherCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
      return result;
    }

    // Fallback to Open-Meteo current weather + today's sunrise/sunset when date is outside 16-day window
    const curTemp = Math.round(current?.temperature_2m ?? daily?.temperature_2m_max?.[0] ?? 26);
    const tMin = Math.round(daily?.temperature_2m_min?.[0] ?? curTemp - 3);
    const tMax = Math.round(daily?.temperature_2m_max?.[0] ?? curTemp + 2);
    const code = Number(current?.weather_code ?? daily?.weather_code?.[0] ?? 1);
    const { condition, advice } = interpretWmo(code);
    const golden = computeGoldenHours(daily?.sunrise?.[0], daily?.sunset?.[0]);

    const result: LiveWeatherAdvice = {
      locationLabel: coords.label,
      tempMin: tMin,
      tempMax: tMax,
      tempCurrent: curTemp,
      weatherCode: code,
      conditionLabel: condition,
      advice: `${advice} (Khí tượng hiện tại tại ${coords.label})`,
      ...golden,
      goldenHourNote: `Tính theo khung giờ mặt trời mọc/lặn tại ${coords.label}.`,
      source: 'open-meteo-current',
    };
    weatherCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch {
    return {
      locationLabel: coords.label,
      tempMin: 23,
      tempMax: 29,
      weatherCode: 1,
      conditionLabel: 'Thời tiết tham khảo',
      advice: `Không thể tải dự báo trực tuyến lúc này — đề xuất chuẩn bị trang phục linh hoạt cho ${coords.label}.`,
      morningGoldenHour: '06:00 - 07:15',
      eveningGoldenHour: '16:45 - 18:00',
      goldenHourNote: 'Khung giờ tham khảo khi ngoại tuyến.',
      source: 'offline-fallback',
    };
  }
}
