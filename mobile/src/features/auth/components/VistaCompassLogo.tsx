import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Circle,
  Polygon,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

interface VistaCompassLogoProps {
  color?: string;
  taglineColor?: string;
}

export function VistaCompassLogo({
  color = '#0284c7',
  taglineColor = '#475569',
}: VistaCompassLogoProps) {
  return (
    <View style={styles.container}>
      {/* Compass + Mountain + Sun Icon */}
      <Svg width={68} height={68} viewBox="0 0 100 100" fill="none">
        <Defs>
          {/* Compass ring gradient */}
          <LinearGradient id="compassRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#0284c7" />
            <Stop offset="50%" stopColor="#38bdf8" />
            <Stop offset="100%" stopColor="#0369a1" />
          </LinearGradient>

          {/* Mountains gradient */}
          <LinearGradient id="mountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#0284c7" />
            <Stop offset="100%" stopColor="#0f172a" />
          </LinearGradient>

          {/* Mountain 2 gradient */}
          <LinearGradient id="mountainGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#0369a1" />
            <Stop offset="100%" stopColor="#1e293b" />
          </LinearGradient>

          {/* Sun gradient */}
          <LinearGradient id="sunGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#fde047" />
            <Stop offset="100%" stopColor="#f59e0b" />
          </LinearGradient>
        </Defs>

        {/* Outer Compass Points */}
        <Polygon points="50,4 54,16 46,16" fill="#0284c7" />
        <Polygon points="50,96 54,84 46,84" fill="#0284c7" />
        <Polygon points="4,50 16,54 16,46" fill="#0284c7" />
        <Polygon points="96,50 84,54 84,46" fill="#0284c7" />

        {/* Compass Outer Circle */}
        <Circle
          cx="50"
          cy="50"
          r="36"
          stroke="url(#compassRing)"
          strokeWidth="3.2"
          strokeDasharray="52 4"
        />

        {/* Inner delicate circle */}
        <Circle
          cx="50"
          cy="50"
          r="30"
          stroke="#ffffff"
          strokeWidth="1.2"
          opacity={0.8}
        />

        {/* Rising Golden Sun */}
        <Circle cx="50" cy="42" r="11" fill="url(#sunGrad)" />

        {/* Mountain 2 (Behind, Right) */}
        <Path
          d="M 46,64 L 64,36 L 82,64 Z"
          fill="url(#mountainGrad2)"
        />
        {/* Mountain 2 Snow / Sun Highlight */}
        <Polygon points="64,36 71,48 64,45 57,48" fill="#bae6fd" opacity={0.8} />

        {/* Mountain 1 (Front, Left) */}
        <Path
          d="M 22,66 L 44,28 L 66,66 Z"
          fill="url(#mountainGrad)"
        />
        {/* Mountain 1 Snow / Sun Highlight */}
        <Polygon points="44,28 53,44 44,40 35,44" fill="#ffffff" opacity={0.95} />

        {/* Base horizon line */}
        <Path
          d="M 20,66 L 80,66"
          stroke="#0284c7"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </Svg>

      {/* Brand Text VISTA */}
      <Text style={[styles.brandTitle, { color }]}>VISTA</Text>

      {/* Slogan */}
      <Text style={[styles.brandTagline, { color: taglineColor }]}>
        Khám phá Việt Nam theo cách thông minh
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 4.5,
    marginTop: 6,
    textShadowColor: 'rgba(255, 255, 255, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  brandTagline: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginTop: 3,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
