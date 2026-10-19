import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {
  Path,
  Polygon,
  Rect,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Ellipse,
} from 'react-native-svg';

interface MobileAnimatedAirplaneProps {
  onTap?: () => void;
}

export function MobileAnimatedAirplane({ onTap }: MobileAnimatedAirplaneProps) {
  const flightAnim = useRef(new Animated.Value(0)).current;
  const stuntAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Smooth looping flight across the upper sky
    const flightLoop = Animated.loop(
      Animated.timing(flightAnim, {
        toValue: 1,
        duration: 12000,
        easing: Easing.bezier(0.42, 0, 0.58, 1),
        useNativeDriver: true,
      })
    );
    flightLoop.start();

    return () => flightLoop.stop();
  }, [flightAnim]);

  const handlePress = () => {
    stuntAnim.setValue(0);
    Animated.timing(stuntAnim, {
      toValue: 1,
      duration: 1100,
      easing: Easing.bezier(0.34, 1.56, 0.64, 1),
      useNativeDriver: true,
    }).start();

    if (onTap) onTap();
  };

  // Trajectory: high in the clear sky above the logo
  const translateX = flightAnim.interpolate({
    inputRange: [0, 0.35, 0.7, 1],
    outputRange: [-90, 80, 240, 420],
  });

  const translateY = flightAnim.interpolate({
    inputRange: [0, 0.35, 0.7, 1],
    outputRange: [38, 16, 26, 14],
  });

  const flightTilt = flightAnim.interpolate({
    inputRange: [0, 0.35, 0.7, 1],
    outputRange: ['-10deg', '3deg', '-6deg', '4deg'],
  });

  const stuntRotate = stuntAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '360deg', '720deg'],
  });

  const stuntScale = stuntAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.25, 1],
  });

  return (
    <View style={styles.skyArea} pointerEvents="box-none">
      {/* 1. Curved Dotted Flight Trail in the Upper Sky */}
      <Svg
        width="100%"
        height={90}
        viewBox="0 0 390 90"
        style={styles.trailSvg}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="contrailGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <Stop offset="25%" stopColor="#ffffff" stopOpacity="0.8" />
            <Stop offset="80%" stopColor="#ffffff" stopOpacity="0.95" />
            <Stop offset="100%" stopColor="#0284c7" stopOpacity="0.85" />
          </LinearGradient>
        </Defs>

        {/* Primary Dotted Contrail Trail (Always fill="none") */}
        <Path
          d="M -30,42 C 65,16 140,32 225,22 C 295,12 340,24 415,16"
          fill="none"
          stroke="url(#contrailGlow)"
          strokeWidth="2.2"
          strokeDasharray="7 5"
          strokeLinecap="round"
        />

        {/* Secondary Delicate Contrail */}
        <Path
          d="M -25,45 C 70,19 145,35 230,25 C 300,15 345,27 420,19"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1"
          strokeDasharray="3 6"
          opacity={0.6}
        />

        {/* Destination Pin Marker at target */}
        <Circle cx="330" cy="20" r="3.5" fill="#f59e0b" />
        <Circle
          cx="330"
          cy="20"
          r="7.5"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1"
          strokeDasharray="2 2"
          opacity={0.7}
        />

        {/* Sparkle Markers */}
        <Path
          d="M 120,24 L 122,28 L 126,30 L 122,32 L 120,36 L 118,32 L 114,30 L 118,28 Z"
          fill="#ffffff"
          opacity={0.8}
        />
        <Path
          d="M 265,16 L 266.5,19.5 L 270,21 L 266.5,22.5 L 265,26 L 263.5,22.5 L 260,21 L 263.5,19.5 Z"
          fill="#fef08a"
          opacity={0.85}
        />
      </Svg>

      {/* 2. Moving Airplane Follower */}
      <Animated.View
        style={[
          styles.airplaneFollower,
          {
            transform: [
              { translateX },
              { translateY },
              { rotate: flightTilt },
              { scale: stuntScale },
            ],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handlePress}
          style={styles.touchableWrapper}
        >
          <Animated.View style={{ transform: [{ rotate: stuntRotate }] }}>
            {/* Jet Airliner SVG */}
            <Svg width={72} height={38} viewBox="0 0 160 80">
              <Defs>
                <LinearGradient id="fuselageSky" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#ffffff" />
                  <Stop offset="65%" stopColor="#f8fafc" />
                  <Stop offset="100%" stopColor="#cbd5e1" />
                </LinearGradient>
              </Defs>

              {/* Far Wing */}
              <Polygon
                points="56,36 94,14 112,15 88,37"
                fill="#94a3b8"
                stroke="#64748b"
                strokeWidth="0.8"
              />

              {/* Fuselage Body */}
              <Path
                d="M 18,36 C 18,33 26,30 38,29 L 132,32 C 146,33 156,38 156,41 C 156,44 144,48 130,49 L 36,48 C 24,47 18,43 18,36 Z"
                fill="url(#fuselageSky)"
                stroke="#64748b"
                strokeWidth="1.2"
              />

              {/* Cockpit Window */}
              <Path
                d="M 136,34 C 144,35 150,38 152,40 L 140,41 C 137,39 135,36 136,34 Z"
                fill="#0f172a"
              />

              {/* VISTA Sky Blue Fuselage Cheatlines */}
              <Path
                d="M 28,40 L 144,42 C 146,43 145,44 142,44 L 28,43 Z"
                fill="#0284c7"
              />
              <Path
                d="M 26,43 L 136,44.5 C 138,45.5 136,46 132,46 L 26,45 Z"
                fill="#38bdf8"
              />

              {/* Passenger Windows */}
              {[46, 56, 66, 76, 86, 96, 106, 116, 126].map((wx) => (
                <Ellipse key={wx} cx={wx} cy="38" rx="2" ry="2.5" fill="#1e293b" />
              ))}

              {/* Tail Fin with Sky Blue VISTA Accent */}
              <Polygon
                points="20,35 14,8 32,8 48,34"
                fill="#0284c7"
                stroke="#0369a1"
                strokeWidth="0.8"
              />
              <Polygon points="22,10 30,10 44,32 36,32" fill="#38bdf8" />

              {/* Gold Star / Emblem on Tail */}
              <Circle cx="28" cy="18" r="4.5" fill="#ea580c" />
              <Polygon
                points="28,15 29,17.5 31.5,17.5 29.5,19 30.5,21.5 28,20 25.5,21.5 26.5,19 24.5,17.5 27,17.5"
                fill="#fbbf24"
              />

              {/* Horizontal Stabilizer (Elevator) */}
              <Polygon
                points="12,36 2,33 12,31 24,35"
                fill="#cbd5e1"
                stroke="#94a3b8"
                strokeWidth="0.8"
              />

              {/* Near Wing */}
              <Polygon
                points="68,44 98,68 116,68 96,44"
                fill="url(#fuselageSky)"
                stroke="#94a3b8"
                strokeWidth="1"
              />
              <Polygon points="112,68 117,62 119,62 116,68" fill="#0284c7" />

              {/* Turbofan Jet Engine */}
              <Rect
                x="82"
                y="52"
                width="24"
                height="10"
                rx="4"
                fill="#334155"
                stroke="#1e293b"
                strokeWidth="0.8"
              />
              <Circle cx="104" cy="57" r="3.5" fill="#0284c7" />
            </Svg>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  skyArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    zIndex: 15,
  },
  trailSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  airplaneFollower: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 72,
    height: 40,
  },
  touchableWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
