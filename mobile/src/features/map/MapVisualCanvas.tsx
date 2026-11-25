import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  Rect,
  Text as SvgText,
  G,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { AppText } from '@/components/ui/AppText';
import {
  CrosshairIcon,
  PlusIcon,
  MinusIcon,
  PinIcon,
  MuseumIcon,
  FoodIcon,
  HotelIcon,
} from '@/components/icons/StitchIcons';
import { tokens } from '@/theme/tokens';
import type { MapCoordinate, MapMarker } from './types';

export interface MapVisualCanvasProps {
  markers?: MapMarker[];
  selectedMarkerId?: string | null;
  onSelectMarker?: (marker: MapMarker) => void;
  userLocation?: MapCoordinate | null;
  routeGeometry?: MapCoordinate[];
  routeMode?: boolean;
  onLocateUser?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  style?: any;
}

// Bounding box for Central Da Nang area
const MIN_LAT = 15.98;
const MAX_LAT = 16.15;
const MIN_LNG = 108.12;
const MAX_LNG = 108.31;

function projectToCanvas(lat: number, lng: number): { x: number; y: number } {
  const normX = Math.max(0.04, Math.min(0.96, (lng - MIN_LNG) / (MAX_LNG - MIN_LNG)));
  const normY = Math.max(0.04, Math.min(0.96, (MAX_LAT - lat) / (MAX_LAT - MIN_LAT)));
  return {
    x: normX * 360 + 20,
    y: normY * 440 + 20,
  };
}

export function MapVisualCanvas({
  markers = [],
  selectedMarkerId,
  onSelectMarker,
  userLocation,
  routeGeometry = [],
  routeMode = false,
  onLocateUser,
  onZoomIn,
  onZoomOut,
  style,
}: MapVisualCanvasProps) {
  // Compute SVG polyline path string from real route geometry if available
  const routeSvgPath = React.useMemo(() => {
    if (!routeGeometry || routeGeometry.length < 2) return null;
    return routeGeometry.reduce((acc, pt, index) => {
      const { x, y } = projectToCanvas(pt.latitude, pt.longitude);
      return index === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [routeGeometry]);

  // Projected user coordinates if valid GPS fix is known
  const userProjected = React.useMemo(() => {
    if (
      !userLocation ||
      !Number.isFinite(userLocation.latitude) ||
      !Number.isFinite(userLocation.longitude)
    ) {
      return null;
    }
    return projectToCanvas(userLocation.latitude, userLocation.longitude);
  }, [userLocation]);

  return (
    <View style={[styles.container, style]}>
      {/* Visual Vector Geography of Da Nang */}
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 400 480"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id="waterGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#bae6fd" stopOpacity="0.8" />
            <Stop offset="1" stopColor="#7dd3fc" stopOpacity="0.9" />
          </LinearGradient>
          <LinearGradient id="seaGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#e0f2fe" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#bae6fd" stopOpacity="0.85" />
          </LinearGradient>
          <LinearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#6366F1" />
            <Stop offset="1" stopColor="#0284C7" />
          </LinearGradient>
        </Defs>

        {/* Land Background (Urban & Greenery) */}
        <Rect width="400" height="480" fill="#f1f5f9" />

        {/* Son Tra Peninsula (Green Nature Mass top right) */}
        <Path
          d="M 230 0 Q 320 10 370 70 Q 400 130 330 160 Q 280 180 250 130 Q 230 80 230 0 Z"
          fill="#dcfce7"
        />

        {/* Da Nang City Coastline & Eastern Sea (Bien Dong) */}
        <Path
          d="M 330 160 Q 340 220 345 300 Q 350 400 360 480 L 400 480 L 400 0 L 370 70 Z"
          fill="url(#seaGrad)"
        />

        {/* Song Han (Han River) */}
        <Path
          d="M 170 0 Q 185 70 175 140 Q 165 210 170 280 Q 175 360 160 480 L 195 480 Q 215 360 210 280 Q 200 210 215 140 Q 225 70 205 0 Z"
          fill="url(#waterGrad)"
        />

        {/* Bridges across Song Han */}
        <Path d="M 172 110 L 210 115" stroke="#cbd5e1" strokeWidth="4" />
        <Path d="M 168 200 L 208 204" stroke="#cbd5e1" strokeWidth="4" />
        <Path d="M 168 280 L 212 284" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round" />
        <Path d="M 166 335 L 208 338" stroke="#cbd5e1" strokeWidth="4" />

        {/* Main Road Network */}
        <Path
          d="M 260 140 Q 290 200 320 280 Q 335 370 345 480"
          stroke="#ffffff"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <Path
          d="M 260 140 Q 290 200 320 280 Q 335 370 345 480"
          stroke="#fed7aa"
          strokeWidth="3"
          strokeLinecap="round"
        />

        <Path
          d="M 20 280 L 168 280 L 212 284 Q 260 285 320 280"
          stroke="#ffffff"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <Path
          d="M 20 280 L 168 280 L 212 284 Q 260 285 320 280"
          stroke="#fde68a"
          strokeWidth="3"
          strokeLinecap="round"
        />

        <Path d="M 166 240 L 164 420" stroke="#ffffff" strokeWidth="5" />
        <Path d="M 166 240 L 164 420" stroke="#e2e8f0" strokeWidth="2.5" />

        {/* Geographic Labels */}
        <SvgText x="14" y="220" fill="#0F172A" fontSize="16" fontWeight="800" opacity="0.8">
          Đà Nẵng
        </SvgText>

        <SvgText
          x="185"
          y="180"
          fill="#0284C7"
          fontSize="11"
          fontWeight="600"
          opacity="0.75"
          transform="rotate(80, 185, 180)"
        >
          Sông Hàn
        </SvgText>

        <SvgText x="270" y="55" fill="#15803d" fontSize="12" fontWeight="700">
          Sơn Trà
        </SvgText>
        <SvgText x="275" y="80" fill="#16a34a" fontSize="10" fontWeight="600" opacity="0.8">
          Bán đảo Sơn Trà
        </SvgText>

        {/* Real Route Polyline drawn from geometry */}
        {routeMode && routeSvgPath && (
          <G>
            <Path
              d={routeSvgPath}
              fill="none"
              stroke="#818cf8"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.5"
            />
            <Path
              d={routeSvgPath}
              fill="none"
              stroke="url(#routeGrad)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </G>
        )}
      </Svg>

      {/* Dynamic Markers rendered from real loaded destinations */}
      {markers.map((marker) => {
        const { x, y } = projectToCanvas(marker.latitude, marker.longitude);
        const isSelected = selectedMarkerId === marker.id;
        const isDestInRoute = routeMode && isSelected;

        // Choose appropriate icon based on category
        const categoryLower = (marker.description || '').toLowerCase();
        let CategoryIcon = PinIcon;
        if (categoryLower.includes('tham quan') || categoryLower.includes('di tích')) {
          CategoryIcon = MuseumIcon;
        } else if (categoryLower.includes('ẩm thực') || categoryLower.includes('ăn uống')) {
          CategoryIcon = FoodIcon;
        } else if (categoryLower.includes('khách sạn') || categoryLower.includes('lưu trú')) {
          CategoryIcon = HotelIcon;
        }

        return (
          <Pressable
            key={marker.id}
            accessibilityRole="button"
            accessibilityLabel={marker.title ?? 'Điểm đến'}
            style={[
              styles.poiBadge,
              { left: Math.max(10, Math.min(300, x - 30)), top: Math.max(10, Math.min(420, y - 16)) },
              isSelected && styles.poiBadgeSelected,
              isDestInRoute && styles.poiBadgeDestRoute,
            ]}
            onPress={() => onSelectMarker?.(marker)}
          >
            <View style={[styles.poiIconBox, isDestInRoute && styles.poiIconBoxDest]}>
              <CategoryIcon size={13} color={isDestInRoute ? '#FFFFFF' : '#006C75'} />
            </View>
            <AppText
              numberOfLines={1}
              style={[styles.poiText, isDestInRoute && styles.poiTextDest]}
            >
              {marker.title ?? 'Địa điểm'}
            </AppText>
          </Pressable>
        );
      })}

      {/* Real GPS Location Indicator */}
      {userProjected && (
        <View
          style={[
            styles.userPulseWrapper,
            { left: userProjected.x - 16, top: userProjected.y - 16 },
          ]}
        >
          <View style={styles.userPulseRing} />
          <View style={styles.userDot} />
        </View>
      )}

      {/* Floating Map Action Controls on Right (Positioned high enough to clear bottom sheet) */}
      <View style={styles.floatingControls}>
        {/* GPS Locate Button (Hiển thị vị trí của bạn) */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="◎ Vị trí của tôi"
          activeOpacity={0.8}
          style={styles.floatingBtn}
          onPress={onLocateUser}
        >
          <CrosshairIcon size={20} color={tokens.colors.primary} />
        </TouchableOpacity>

        {/* Stacked Zoom Controls (+ / -) */}
        <View style={styles.zoomStack}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Phóng to"
            activeOpacity={0.7}
            style={styles.zoomBtn}
            onPress={onZoomIn}
          >
            <PlusIcon size={18} color={tokens.colors.ink} />
          </TouchableOpacity>
          <View style={styles.zoomDivider} />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Thu nhỏ"
            activeOpacity={0.7}
            style={styles.zoomBtn}
            onPress={onZoomOut}
          >
            <MinusIcon size={18} color={tokens.colors.ink} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  poiBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 5,
    maxWidth: 150,
  },
  poiBadgeSelected: {
    borderColor: tokens.colors.primary,
    backgroundColor: '#EFF6FF',
    transform: [{ scale: 1.08 }],
    zIndex: 10,
  },
  poiBadgeDestRoute: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
    transform: [{ scale: 1.1 }],
    zIndex: 12,
  },
  poiIconBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E6F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  poiIconBoxDest: {
    backgroundColor: '#EF4444',
  },
  poiText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  poiTextDest: {
    color: '#B91C1C',
  },
  userPulseWrapper: {
    position: 'absolute',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  userPulseRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(2, 132, 199, 0.28)',
  },
  userDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: tokens.colors.primary,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 3,
    elevation: 5,
  },
  floatingControls: {
    position: 'absolute',
    right: 14,
    bottom: 190, // Elevated so bottom sheet never covers it
    gap: 10,
    alignItems: 'center',
    zIndex: 20,
  },
  floatingBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  zoomStack: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },
  zoomBtn: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
});
