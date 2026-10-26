import type { Coordinates, DestinationMarker } from '../types';

export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function getDestinationStats(d: { id: string; name: string; province: string; category?: string }) {
  // Deterministic hash based on id
  let hash = 0;
  for (let i = 0; i < d.id.length; i++) {
    hash = (hash << 5) - hash + d.id.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);

  // Ratings between 4.6 and 4.9
  const rating = (4.6 + (abs % 4) * 0.1).toFixed(1);

  // Review counts from 1,200 to 4,500
  const countRaw = (abs % 3300) + 1200;
  const reviewCount = countRaw.toLocaleString('vi-VN');

  // Realistic district mapping for popular areas
  let district = '';
  const n = d.name.toLowerCase();
  const p = d.province.toLowerCase();

  if (n.includes('bà nà') || n.includes('hòa phú')) district = 'Hòa Vang';
  else if (n.includes('sơn trà') || n.includes('linh ứng') || n.includes('mỹ khê')) district = 'Sơn Trà';
  else if (n.includes('ngũ hành sơn') || n.includes('non nước')) district = 'Ngũ Hành Sơn';
  else if (n.includes('cầu rồng') || n.includes('chợ hàn') || n.includes('hải châu')) district = 'Hải Châu';
  else if (n.includes('hội an') || n.includes('an bàng') || n.includes('chùa cầu')) district = 'TP. Hội An';
  else if (n.includes('mỹ sơn')) district = 'Duy Xuyên';
  else if (n.includes('đại nội') || n.includes('thiên mụ') || n.includes('hương giang')) district = 'TP. Huế';
  else if (n.includes('hoàn kiếm') || n.includes('phố cổ') || n.includes('hồ gươm')) district = 'Hoàn Kiếm';
  else if (n.includes('tây hồ') || n.includes('chùa trấn quốc')) district = 'Tây Hồ';
  else if (n.includes('bến thành') || n.includes('dinh độc lập')) district = 'Quận 1';
  else if (p.includes('đà nẵng')) district = 'TP. Đà Nẵng';
  else district = d.province.startsWith('TP.') ? d.province : `Tỉnh ${d.province}`;

  return { rating, reviewCount, district };
}
