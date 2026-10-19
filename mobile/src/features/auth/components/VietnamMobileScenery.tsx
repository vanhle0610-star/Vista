import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import Svg, {
  Path,
  Rect,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  G,
  Text as SvgText,
} from 'react-native-svg';

interface VietnamMobileSceneryProps {
  isNight?: boolean;
  height?: number;
}

export function VietnamMobileScenery({
  isNight = false,
  height = 320,
}: VietnamMobileSceneryProps) {
  const SCENERY_HEIGHT = height;

  return (
    <View style={[styles.container, { height: SCENERY_HEIGHT }]}>
      {/* 1. Photorealistic Ha Long Bay Digital Art Background */}
      <ImageBackground
        source={require('../../../../assets/images/vista_auth_hero.jpg')}
        style={styles.imageBackground}
        resizeMode="cover"
      >
        {/* 2. Vintage Travel Postmarks & Delicate Topo Overlay in SVG */}
        <Svg
          width="100%"
          height={SCENERY_HEIGHT}
          viewBox={`0 0 390 ${SCENERY_HEIGHT}`}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            {/* Smooth fade to pure white at bottom edge to blend with white card */}
            <LinearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <Stop offset="55%" stopColor="#ffffff" stopOpacity="0.4" />
              <Stop offset="85%" stopColor="#ffffff" stopOpacity="0.85" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Top Left Vintage Stamp: "VIET NAM" */}
          <G transform="translate(16, 32) rotate(-4)" opacity={0.5}>
            <Rect
              x="0"
              y="0"
              width="54"
              height="46"
              rx="4"
              fill="none"
              stroke="#64748b"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
            <SvgText
              x="27"
              y="13"
              fontSize="6.5"
              fontWeight="bold"
              fill="#475569"
              textAnchor="middle"
              letterSpacing={1.2}
            >
              VIET NAM
            </SvgText>
            {/* Temple sketch */}
            <Path
              d="M 14,35 L 40,35 M 18,35 L 18,25 L 36,25 L 36,35 M 12,25 L 27,18 L 42,25 Z"
              stroke="#475569"
              strokeWidth="0.9"
              fill="none"
            />
            <SvgText x="27" y="42" fontSize="5" fill="#64748b" textAnchor="middle">
              POSTAGE 2026
            </SvgText>
          </G>

          {/* Top Right Vintage Postmark: "EXPLORE • DISCOVER" */}
          <G transform="translate(332, 60) rotate(14)" opacity={0.45}>
            <Circle
              cx="0"
              cy="0"
              r="28"
              fill="none"
              stroke="#475569"
              strokeWidth="1.2"
              strokeDasharray="4 2"
            />
            <Circle cx="0" cy="0" r="22" fill="none" stroke="#64748b" strokeWidth="0.8" />
            <Path
              d="M -16,-4 L 16,-4 M -18,2 L 18,2 M -14,8 L 14,8"
              stroke="#64748b"
              strokeWidth="0.8"
              fill="none"
            />
            <SvgText
              x="0"
              y="-10"
              fontSize="4.8"
              fontWeight="bold"
              fill="#475569"
              textAnchor="middle"
              letterSpacing={0.8}
            >
              EXPLORE
            </SvgText>
            <SvgText
              x="0"
              y="16"
              fontSize="4.8"
              fontWeight="bold"
              fill="#475569"
              textAnchor="middle"
              letterSpacing={0.8}
            >
              DISCOVER
            </SvgText>
          </G>

          {/* Bottom gradient fade into pure white */}
          <Rect
            x="0"
            y={SCENERY_HEIGHT - 90}
            width="390"
            height={90}
            fill="url(#bottomFade)"
          />
        </Svg>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#e0f2fe',
  },
  imageBackground: {
    width: '100%',
    height: '100%',
  },
});
