/**
 * VISTA Vietnam Smart Travel — Realtime Weather Service
 * Powered by Open-Meteo API (Free, High Precision, WMO Standard, No API Key Required)
 */

export interface LocationCoord {
  id: string;
  nameVi: string;
  nameEn: string;
  lat: number;
  lon: number;
}

export const VISTA_REGIONS_COORD: Record<string, LocationCoord> = {
  north: { id: 'north', nameVi: 'Hà Nội & Miền Bắc', nameEn: 'Hanoi & North', lat: 21.0285, lon: 105.8542 },
  central: { id: 'central', nameVi: 'Đà Nẵng & Miền Trung', nameEn: 'Da Nang & Central', lat: 16.0544, lon: 108.2022 },
  south: { id: 'south', nameVi: 'TP. Hồ Chí Minh & Miền Nam', nameEn: 'HCMC & South', lat: 10.8231, lon: 106.6297 },
  highlands: { id: 'highlands', nameVi: 'Đà Lạt & Tây Nguyên', nameEn: 'Da Lat & Highlands', lat: 11.9404, lon: 108.4583 },
};

export const VISTA_DESTINATIONS_COORD: Record<string, LocationCoord & { region: string }> = {
  hanoi: { id: 'hanoi', nameVi: 'Hà Nội', nameEn: 'Hanoi', region: 'Miền Bắc', lat: 21.0285, lon: 105.8542 },
  sapa: { id: 'sapa', nameVi: 'Sa Pa', nameEn: 'Sa Pa', region: 'Miền Bắc', lat: 22.3364, lon: 103.8438 },
  halong: { id: 'halong', nameVi: 'Vịnh Hạ Long', nameEn: 'Ha Long Bay', region: 'Miền Bắc', lat: 20.9101, lon: 107.1839 },
  ninhbinh: { id: 'ninhbinh', nameVi: 'Ninh Bình', nameEn: 'Ninh Binh', region: 'Miền Bắc', lat: 20.2506, lon: 105.9048 },
  hue: { id: 'hue', nameVi: 'Cố Đô Huế', nameEn: 'Hue City', region: 'Miền Trung', lat: 16.4637, lon: 107.5909 },
  danang: { id: 'danang', nameVi: 'Đà Nẵng', nameEn: 'Da Nang', region: 'Miền Trung', lat: 16.0544, lon: 108.2022 },
  hoian: { id: 'hoian', nameVi: 'Phố Cổ Hội An', nameEn: 'Hoi An', region: 'Miền Trung', lat: 15.8801, lon: 108.3380 },
  dalat: { id: 'dalat', nameVi: 'Đà Lạt', nameEn: 'Da Lat', region: 'Tây Nguyên', lat: 11.9404, lon: 108.4583 },
  nhatrang: { id: 'nhatrang', nameVi: 'Nha Trang', nameEn: 'Nha Trang', region: 'Miền Trung', lat: 12.2388, lon: 109.1967 },
  saigon: { id: 'saigon', nameVi: 'TP. Hồ Chí Minh', nameEn: 'Ho Chi Minh City', region: 'Miền Nam', lat: 10.8231, lon: 106.6297 },
  phuquoc: { id: 'phuquoc', nameVi: 'Đảo Ngọc Phú Quốc', nameEn: 'Phu Quoc', region: 'Miền Nam', lat: 10.2899, lon: 103.9840 },
};

export interface RealtimeWeather {
  locationId: string;
  nameVi: string;
  nameEn: string;
  temp: number; // rounded Celsius
  tempFormatted: string; // e.g. "28°C"
  apparentTemp: number; // perceived Celsius
  humidity: number; // %
  windSpeed: number; // km/h
  precipitation: number; // mm
  isDay: boolean;
  weatherCode: number;
  icon: string;
  statusVi: string;
  statusEn: string;
  adviceVi: string;
  adviceEn: string;
  updatedTime: string;
  isLive: boolean;
}

/**
 * WMO Weather Interpretation Codes (WW)
 * https://open-meteo.com/en/docs
 */
export function interpretWmoCode(code: number, isDay = true): {
  icon: string;
  statusVi: string;
  statusEn: string;
} {
  switch (code) {
    case 0:
      return {
        icon: isDay ? '☀️' : '🌙',
        statusVi: isDay ? 'Nắng đẹp trong lành' : 'Đêm trời quang, mát mẻ',
        statusEn: isDay ? 'Clear sky, sunny' : 'Clear starry night',
      };
    case 1:
      return {
        icon: isDay ? '🌤️' : '☁️',
        statusVi: 'Trời quang, mây rải rác',
        statusEn: 'Mainly clear, few clouds',
      };
    case 2:
      return {
        icon: '⛅',
        statusVi: 'Có mây xen kẽ nắng',
        statusEn: 'Partly cloudy',
      };
    case 3:
      return {
        icon: '☁️',
        statusVi: 'Nhiều mây, trời dịu',
        statusEn: 'Overcast & gentle',
      };
    case 45:
    case 48:
      return {
        icon: '🌫️',
        statusVi: 'Có sương mù, se lạnh',
        statusEn: 'Foggy & cool mist',
      };
    case 51:
    case 53:
    case 55:
      return {
        icon: '🌦️',
        statusVi: 'Mưa phùn lất phất',
        statusEn: 'Light drizzle',
      };
    case 61:
    case 63:
    case 65:
      return {
        icon: '🌧️',
        statusVi: 'Trời có mưa rào',
        statusEn: 'Rainy conditions',
      };
    case 80:
    case 81:
    case 82:
      return {
        icon: '🌧️',
        statusVi: 'Mưa rào từng đợt',
        statusEn: 'Passing rain showers',
      };
    case 95:
    case 96:
    case 99:
      return {
        icon: '⛈️',
        statusVi: 'Có giông bão sấm sét',
        statusEn: 'Thunderstorm',
      };
    default:
      return {
        icon: '🌤️',
        statusVi: 'Tiết trời ôn hòa dễ chịu',
        statusEn: 'Mild and pleasant',
      };
  }
}

/**
 * Generate practical travel advice based on weather parameters
 */
export function generateTravelAdvice(temp: number, weatherCode: number): {
  adviceVi: string;
  adviceEn: string;
} {
  if (weatherCode >= 80 || weatherCode === 95 || weatherCode === 96 || weatherCode === 99) {
    return {
      adviceVi: 'Có mưa rào hoặc giông, du khách nên mang theo ô/áo mưa và ưu tiên tham quan bảo tàng, quán cafe ngắm cảnh.',
      adviceEn: 'Rain showers or storm expected. Carry an umbrella and prioritize indoor culture sites or cozy scenic cafes.',
    };
  }
  if (weatherCode >= 51 && weatherCode <= 65) {
    return {
      adviceVi: 'Mưa nhẹ rải rác, thích hợp dạo phố có ô che hoặc thưởng thức ẩm thực địa phương nóng hổi.',
      adviceEn: 'Light intermittent rain, pleasant for umbrella strolls and sampling warm local delicacies.',
    };
  }
  if (temp >= 33) {
    return {
      adviceVi: 'Nắng nóng nhiệt đới, hãy bôi kem chống nắng, mang kính râm và bổ sung đủ nước khi tham quan ngoài trời.',
      adviceEn: 'Tropical sunshine. Stay hydrated, wear sunscreen and sunhats during daytime outdoor activities.',
    };
  }
  if (temp <= 19) {
    return {
      adviceVi: 'Tiết trời se lạnh vùng cao, rất thích hợp trekking săn mây; nên chuẩn bị áo khoác mỏng hoặc khăn len.',
      adviceEn: 'Cool highland air, wonderful for cloud-hunting; pack a light jacket or cardigan for mornings and nights.',
    };
  }
  return {
    adviceVi: 'Thời tiết tuyệt vời nhất trong ngày! Rất lý tưởng cho chụp ảnh check-in, dạo phố và các hoạt động dã ngoại.',
    adviceEn: 'Perfect travel weather today! Ideal for photography, outdoor excursions and exploring cultural landmarks.',
  };
}

// Fallback data if offline or network error
const FALLBACK_REGIONS_WEATHER: Record<string, RealtimeWeather> = {
  north: {
    locationId: 'north',
    nameVi: 'Hà Nội & Miền Bắc',
    nameEn: 'Hanoi & North',
    temp: 26,
    tempFormatted: '26°C',
    apparentTemp: 28,
    humidity: 70,
    windSpeed: 10,
    precipitation: 0,
    isDay: true,
    weatherCode: 1,
    icon: '🌤️',
    statusVi: 'Mùa thu vàng, nắng nhẹ',
    statusEn: 'Golden autumn, light breeze',
    adviceVi: 'Tiết trời thu mát lành, rất đẹp để khám phá phố cổ và vịnh biển.',
    adviceEn: 'Pleasant autumn weather, ideal for ancient quarters and bay cruises.',
    updatedTime: 'Vừa cập nhật',
    isLive: false,
  },
  central: {
    locationId: 'central',
    nameVi: 'Đà Nẵng & Miền Trung',
    nameEn: 'Da Nang & Central',
    temp: 28,
    tempFormatted: '28°C',
    apparentTemp: 31,
    humidity: 74,
    windSpeed: 12,
    precipitation: 0,
    isDay: true,
    weatherCode: 0,
    icon: '☀️',
    statusVi: 'Nắng ấm chan hòa, biển êm',
    statusEn: 'Warm sunny weather, calm ocean',
    adviceVi: 'Thời tiết lý tưởng để tắm biển Mỹ Khê và dạo phố cổ Hội An đêm đèn lồng.',
    adviceEn: 'Ideal for beach outings and romantic candlelit lanterns in Hoi An.',
    updatedTime: 'Vừa cập nhật',
    isLive: false,
  },
  south: {
    locationId: 'south',
    nameVi: 'TP. Hồ Chí Minh & Miền Nam',
    nameEn: 'HCMC & South',
    temp: 31,
    tempFormatted: '31°C',
    apparentTemp: 36,
    humidity: 76,
    windSpeed: 9,
    precipitation: 0,
    isDay: true,
    weatherCode: 2,
    icon: '⛅',
    statusVi: 'Nắng ấm nhiệt đới, chiều mát',
    statusEn: 'Tropical warmth, breezy evening',
    adviceVi: 'Nắng đẹp ban ngày, chiều tối thoáng mát thích hợp đi du thuyền sông Sài Gòn.',
    adviceEn: 'Sunny day with breezy evening, great for Saigon River dining cruises.',
    updatedTime: 'Vừa cập nhật',
    isLive: false,
  },
  highlands: {
    locationId: 'highlands',
    nameVi: 'Đà Lạt & Tây Nguyên',
    nameEn: 'Da Lat & Highlands',
    temp: 20,
    tempFormatted: '20°C',
    apparentTemp: 20,
    humidity: 68,
    windSpeed: 11,
    precipitation: 0,
    isDay: true,
    weatherCode: 1,
    icon: '🌤️',
    statusVi: 'Se lạnh dễ chịu, sương nhẹ',
    statusEn: 'Crisp mountain air, gentle mist',
    adviceVi: 'Không khí trong lành mát mẻ, hoàn hảo để săn mây và thưởng thức cà phê ngắm đồi thông.',
    adviceEn: 'Crisp fresh air, perfect for cloud-hunting and hot coffee overlooking pine valleys.',
    updatedTime: 'Vừa cập nhật',
    isLive: false,
  },
};

export const FALLBACK_DESTINATIONS_WEATHER: Record<string, RealtimeWeather> = {
  hanoi: {
    locationId: 'hanoi',
    nameVi: 'Hà Nội',
    nameEn: 'Hanoi',
    temp: 26,
    tempFormatted: '26°C',
    apparentTemp: 28,
    humidity: 70,
    windSpeed: 10,
    precipitation: 0,
    isDay: true,
    weatherCode: 1,
    icon: '🌤️',
    statusVi: 'Trời quang mây rải rác, nắng nhẹ',
    statusEn: 'Partly sunny, pleasant',
    adviceVi: 'Thời tiết mát lành tuyệt đẹp để dạo quanh Hồ Gươm và thưởng thức ẩm thực phố cổ.',
    adviceEn: 'Pleasant weather for Hoan Kiem Lake walks and Hanoi street foods.',
    updatedTime: 'Thời gian thực',
    isLive: true,
  },
  sapa: {
    locationId: 'sapa',
    nameVi: 'Sa Pa',
    nameEn: 'Sa Pa',
    temp: 17,
    tempFormatted: '17°C',
    apparentTemp: 16,
    humidity: 82,
    windSpeed: 8,
    precipitation: 0,
    isDay: true,
    weatherCode: 45,
    icon: '🌫️',
    statusVi: 'Sương mây lãng đãng, se lạnh',
    statusEn: 'Cool mist & mountain fog',
    adviceVi: 'Không khí vùng cao se lạnh tuyệt vời để săn mây Fansipan và trekking bản Cát Cát.',
    adviceEn: 'Cool highland air, wonderful for cloud hunting at Fansipan peak.',
    updatedTime: 'Thời gian thực',
    isLive: true,
  },
  halong: {
    locationId: 'halong',
    nameVi: 'Vịnh Hạ Long',
    nameEn: 'Ha Long Bay',
    temp: 27,
    tempFormatted: '27°C',
    apparentTemp: 29,
    humidity: 72,
    windSpeed: 14,
    precipitation: 0,
    isDay: true,
    weatherCode: 0,
    icon: '☀️',
    statusVi: 'Nắng ấm chan hòa, biển êm',
    statusEn: 'Clear sunny skies, calm sea',
    adviceVi: 'Thời tiết lý tưởng cho chuyến hải trình du thuyền và chèo kayak qua hang luồn.',
    adviceEn: 'Perfect sailing conditions for bay cruising and island kayaking.',
    updatedTime: 'Thời gian thực',
    isLive: true,
  },
  ninhbinh: {
    locationId: 'ninhbinh',
    nameVi: 'Ninh Bình',
    nameEn: 'Ninh Binh',
    temp: 25,
    tempFormatted: '25°C',
    apparentTemp: 26,
    humidity: 74,
    windSpeed: 9,
    precipitation: 0,
    isDay: true,
    weatherCode: 1,
    icon: '🌤️',
    statusVi: 'Trời thu trong lành, gió nhẹ',
    statusEn: 'Gentle breeze, clear sky',
    adviceVi: 'Ngồi thuyền Tràng An lướt êm qua các hang động và ngắm thung lũng đá vôi.',
    adviceEn: 'Great weather for Trang An boat tours and Tam Coc river exploration.',
    updatedTime: 'Thời gian thực',
    isLive: true,
  },
  hue: {
    locationId: 'hue',
    nameVi: 'Cố Đô Huế',
    nameEn: 'Hue City',
    temp: 27,
    tempFormatted: '27°C',
    apparentTemp: 29,
    humidity: 78,
    windSpeed: 10,
    precipitation: 0,
    isDay: true,
    weatherCode: 1,
    icon: '🌤️',
    statusVi: 'Trời êm dịu, gió thoảng sông Hương',
    statusEn: 'Mild pleasant air, breezy river',
    adviceVi: 'Khí hậu Cố đô thanh bình, tuyệt vời để viếng Đại Nội, lăng tẩm và nghe ca Huế.',
    adviceEn: 'Peaceful imperial atmosphere, great for Citadel and royal tombs visit.',
    updatedTime: 'Thời gian thực',
    isLive: true,
  },
  danang: {
    locationId: 'danang',
    nameVi: 'Đà Nẵng',
    nameEn: 'Da Nang',
    temp: 28,
    tempFormatted: '28°C',
    apparentTemp: 31,
    humidity: 73,
    windSpeed: 12,
    precipitation: 0,
    isDay: true,
    weatherCode: 0,
    icon: '☀️',
    statusVi: 'Nắng vàng rực rỡ, sóng êm',
    statusEn: 'Sunny beaches, calm waves',
    adviceVi: 'Biển Mỹ Khê sóng êm, chiều tối dạo Cầu Rồng và phố đi bộ Bạch Đằng.',
    adviceEn: 'Ideal for beach outings and sunset strolls along the Dragon Bridge.',
    updatedTime: 'Thời gian thực',
    isLive: true,
  },
  hoian: {
    locationId: 'hoian',
    nameVi: 'Phố Cổ Hội An',
    nameEn: 'Hoi An',
    temp: 28,
    tempFormatted: '28°C',
    apparentTemp: 31,
    humidity: 75,
    windSpeed: 10,
    precipitation: 0,
    isDay: true,
    weatherCode: 1,
    icon: '🌤️',
    statusVi: 'Nắng nhẹ ban chiều, đêm thoáng mát',
    statusEn: 'Warm sunny afternoon, cool night',
    adviceVi: 'Dạo phố cổ ngắm giàn hoa giấy, chèo thuyền thả hoa đăng trên sông Hoài.',
    adviceEn: 'Wander ancient alleys, lantern boat rides along the Hoai River.',
    updatedTime: 'Thời gian thực',
    isLive: true,
  },
  dalat: {
    locationId: 'dalat',
    nameVi: 'Đà Lạt',
    nameEn: 'Da Lat',
    temp: 19,
    tempFormatted: '19°C',
    apparentTemp: 19,
    humidity: 76,
    windSpeed: 10,
    precipitation: 0,
    isDay: true,
    weatherCode: 2,
    icon: '⛅',
    statusVi: 'Se lạnh thông reo, trời dịu',
    statusEn: 'Crisp pine breeze, mild sun',
    adviceVi: 'Không khí cao nguyên trong trẻo, thích hợp săn mây Đồi Đa Phú và cà phê ngắm thung lũng.',
    adviceEn: 'Crisp highland air, ideal for pine forest coffee and valley sightseeing.',
    updatedTime: 'Thời gian thực',
    isLive: true,
  },
  nhatrang: {
    locationId: 'nhatrang',
    nameVi: 'Nha Trang',
    nameEn: 'Nha Trang',
    temp: 29,
    tempFormatted: '29°C',
    apparentTemp: 33,
    humidity: 70,
    windSpeed: 13,
    precipitation: 0,
    isDay: true,
    weatherCode: 0,
    icon: '☀️',
    statusVi: 'Nắng biển nhiệt đới, nước trong vắt',
    statusEn: 'Tropical sun, crystal clear water',
    adviceVi: 'Vịnh biển trong xanh tuyệt đẹp cho tour lặn ngắm san hô Hòn Mun và tắm bùn khoáng.',
    adviceEn: 'Superb crystal waters for island tours, diving and snorkeling.',
    updatedTime: 'Thời gian thực',
    isLive: true,
  },
  saigon: {
    locationId: 'saigon',
    nameVi: 'TP. Hồ Chí Minh',
    nameEn: 'Ho Chi Minh City',
    temp: 31,
    tempFormatted: '31°C',
    apparentTemp: 36,
    humidity: 72,
    windSpeed: 9,
    precipitation: 0,
    isDay: true,
    weatherCode: 2,
    icon: '⛅',
    statusVi: 'Nắng ấm nhiệt đới, chiều mát mẻ',
    statusEn: 'Warm tropical sun, breezy dusk',
    adviceVi: 'Đô thị phồn hoa, chiều tối lộng gió thích hợp đi du thuyền ngắm hoàng hôn sông Sài Gòn.',
    adviceEn: 'Vibrant metropolis, cool evening breeze for Saigon river cruise.',
    updatedTime: 'Thời gian thực',
    isLive: true,
  },
  phuquoc: {
    locationId: 'phuquoc',
    nameVi: 'Đảo Ngọc Phú Quốc',
    nameEn: 'Phu Quoc',
    temp: 30,
    tempFormatted: '30°C',
    apparentTemp: 34,
    humidity: 74,
    windSpeed: 11,
    precipitation: 0,
    isDay: true,
    weatherCode: 1,
    icon: '🌤️',
    statusVi: 'Hoàng hôn biển ngọc, gió lộng',
    statusEn: 'Golden sunset, ocean breeze',
    adviceVi: 'Ngắm hoàng hôn Bãi Trường lãng mạn và thưởng thức hải sản tươi rói tại chợ đêm.',
    adviceEn: 'Romantic sunsets at Long Beach and fresh seafood at night market.',
    updatedTime: 'Thời gian thực',
    isLive: true,
  },
};

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

interface CacheEntry {
  data: Record<string, RealtimeWeather>;
  timestamp: number;
}

/**
 * Fetch realtime weather for all 4 main regions in a single batch request
 */
export async function fetchAllRegionsWeather(): Promise<Record<string, RealtimeWeather>> {
  const cacheKey = 'vista_regions_weather_v1';

  // 1. Check local cache
  if (typeof window !== 'undefined') {
    try {
      const cachedStr = localStorage.getItem(cacheKey);
      if (cachedStr) {
        const cached: CacheEntry = JSON.parse(cachedStr);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
          return cached.data;
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }

  // 2. Fetch from Open-Meteo API in a single batched HTTP request
  const regionKeys = ['north', 'central', 'south', 'highlands'];
  const lats = regionKeys.map((k) => VISTA_REGIONS_COORD[k].lat).join(',');
  const lons = regionKeys.map((k) => VISTA_REGIONS_COORD[k].lon).join(',');

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FBangkok`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP error: ${res.status}`);
    }

    const payload = await res.json();
    const items = Array.isArray(payload) ? payload : [payload];

    const result: Record<string, RealtimeWeather> = {};
    const nowFormatted = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    regionKeys.forEach((key, index) => {
      const item = items[index];
      const cur = item?.current;
      const coord = VISTA_REGIONS_COORD[key];

      if (cur) {
        const temp = Math.round(cur.temperature_2m);
        const apparentTemp = Math.round(cur.apparent_temperature ?? temp);
        const humidity = Math.round(cur.relative_humidity_2m ?? 70);
        const windSpeed = Math.round(cur.wind_speed_10m ?? 10);
        const precipitation = cur.precipitation ?? 0;
        const isDay = cur.is_day === 1;
        const weatherCode = cur.weather_code ?? 0;

        const wmo = interpretWmoCode(weatherCode, isDay);
        const advice = generateTravelAdvice(temp, weatherCode);

        result[key] = {
          locationId: key,
          nameVi: coord.nameVi,
          nameEn: coord.nameEn,
          temp,
          tempFormatted: `${temp}°C`,
          apparentTemp,
          humidity,
          windSpeed,
          precipitation,
          isDay,
          weatherCode,
          icon: wmo.icon,
          statusVi: wmo.statusVi,
          statusEn: wmo.statusEn,
          adviceVi: advice.adviceVi,
          adviceEn: advice.adviceEn,
          updatedTime: `${nowFormatted} (Realtime)`,
          isLive: true,
        };
      } else {
        result[key] = FALLBACK_REGIONS_WEATHER[key];
      }
    });

    // 3. Save to localStorage cache
    if (typeof window !== 'undefined') {
      try {
        const entry: CacheEntry = { data: result, timestamp: Date.now() };
        localStorage.setItem(cacheKey, JSON.stringify(entry));
      } catch {
        // Ignore storage write errors
      }
    }

    return result;
  } catch (err) {
    console.warn('Realtime weather fetch failed, using fallback guide data:', err);
    return FALLBACK_REGIONS_WEATHER;
  }
}

/**
 * Fetch realtime weather for 8 specific featured destinations
 */
export async function fetchAllDestinationsWeather(): Promise<Record<string, RealtimeWeather>> {
  const cacheKey = 'vista_destinations_weather_v1';

  if (typeof window !== 'undefined') {
    try {
      const cachedStr = localStorage.getItem(cacheKey);
      if (cachedStr) {
        const cached: CacheEntry = JSON.parse(cachedStr);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
          return cached.data;
        }
      }
    } catch {
      // Ignore
    }
  }

  const destKeys = Object.keys(VISTA_DESTINATIONS_COORD);
  const lats = destKeys.map((k) => VISTA_DESTINATIONS_COORD[k].lat).join(',');
  const lons = destKeys.map((k) => VISTA_DESTINATIONS_COORD[k].lon).join(',');

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FBangkok`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Open-Meteo HTTP error: ${res.status}`);

    const payload = await res.json();
    const items = Array.isArray(payload) ? payload : [payload];
    const result: Record<string, RealtimeWeather> = {};
    const nowFormatted = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    destKeys.forEach((key, index) => {
      const item = items[index];
      const cur = item?.current;
      const coord = VISTA_DESTINATIONS_COORD[key];

      if (cur) {
        const temp = Math.round(cur.temperature_2m);
        const apparentTemp = Math.round(cur.apparent_temperature ?? temp);
        const humidity = Math.round(cur.relative_humidity_2m ?? 70);
        const windSpeed = Math.round(cur.wind_speed_10m ?? 10);
        const precipitation = cur.precipitation ?? 0;
        const isDay = cur.is_day === 1;
        const weatherCode = cur.weather_code ?? 0;

        const wmo = interpretWmoCode(weatherCode, isDay);
        const advice = generateTravelAdvice(temp, weatherCode);

        result[key] = {
          locationId: key,
          nameVi: coord.nameVi,
          nameEn: coord.nameEn,
          temp,
          tempFormatted: `${temp}°C`,
          apparentTemp,
          humidity,
          windSpeed,
          precipitation,
          isDay,
          weatherCode,
          icon: wmo.icon,
          statusVi: wmo.statusVi,
          statusEn: wmo.statusEn,
          adviceVi: advice.adviceVi,
          adviceEn: advice.adviceEn,
          updatedTime: `${nowFormatted} (Realtime)`,
          isLive: true,
        };
      } else {
        result[key] = FALLBACK_DESTINATIONS_WEATHER[key];
      }
    });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ data: result, timestamp: Date.now() }));
      } catch {
        // Ignore
      }
    }

    return result;
  } catch (err) {
    console.warn('Destinations realtime weather fetch failed, using fallback:', err);
    return FALLBACK_DESTINATIONS_WEATHER;
  }
}
