'use client';

import React, { useEffect, useState } from 'react';

interface VietnamVectorSceneryProps {
  isNight: boolean;
  interactiveSpeed?: number;
}

export function VietnamVectorScenery({ isNight }: VietnamVectorSceneryProps) {
  // Mouse parallax state for interactive 2.5D depth
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse between -1 and 1
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className={`scenery-container ${isNight ? 'night-theme' : 'day-theme'}`}>
      <svg
        className="scenery-svg-canvas"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* ================= SKY GRADIENTS ================= */}
          <linearGradient id="vectorSkyDay" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4ea8de" />
            <stop offset="35%" stopColor="#72c1ec" />
            <stop offset="65%" stopColor="#a7daf5" />
            <stop offset="90%" stopColor="#d5effa" />
            <stop offset="100%" stopColor="#eef8ff" />
          </linearGradient>

          <linearGradient id="vectorSkyNight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#080e1f" />
            <stop offset="30%" stopColor="#151e3f" />
            <stop offset="60%" stopColor="#2c2756" />
            <stop offset="85%" stopColor="#5c345b" />
            <stop offset="100%" stopColor="#9a4d62" />
          </linearGradient>

          {/* ================= WATER GRADIENTS ================= */}
          <linearGradient id="vectorWaterDay" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4392b9" />
            <stop offset="40%" stopColor="#5ea7cd" />
            <stop offset="100%" stopColor="#81c4e0" />
          </linearGradient>

          <linearGradient id="vectorWaterNight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f1933" />
            <stop offset="50%" stopColor="#18274a" />
            <stop offset="100%" stopColor="#29274c" />
          </linearGradient>

          {/* ================= MOUNTAIN LAYERS (HẠ LONG & BÀ NÀ) ================= */}
          {/* Far Mountains (Misty distant peaks) */}
          <linearGradient id="farPeaksDay" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8cb7dc" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#b4d7f2" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="farPeaksNight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#181e3a" />
            <stop offset="100%" stopColor="#242c52" />
          </linearGradient>

          {/* Mid Mountains & Karsts (Vịnh Hạ Long & Bà Nà) */}
          <linearGradient id="karstMidDay" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3d728e" />
            <stop offset="60%" stopColor="#4d889b" />
            <stop offset="100%" stopColor="#67a4b2" />
          </linearGradient>

          <linearGradient id="karstMidNight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#13192e" />
            <stop offset="100%" stopColor="#1f2845" />
          </linearGradient>

          {/* Near Lush Mountain Ridge (Foreground) */}
          <linearGradient id="nearCliffDay" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#294f38" />
            <stop offset="50%" stopColor="#3b6947" />
            <stop offset="100%" stopColor="#4c7e56" />
          </linearGradient>

          <linearGradient id="nearCliffNight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#111c26" />
            <stop offset="100%" stopColor="#1b2a3a" />
          </linearGradient>

          {/* ================= GOLDEN BRIDGE GRADIENTS ================= */}
          <linearGradient id="goldenTrack" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e5a92b" />
            <stop offset="35%" stopColor="#ffdb66" />
            <stop offset="70%" stopColor="#ffd152" />
            <stop offset="100%" stopColor="#c88b1b" />
          </linearGradient>

          <linearGradient id="stoneHandShading" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d1d8df" />
            <stop offset="40%" stopColor="#98a8b8" />
            <stop offset="80%" stopColor="#647585" />
            <stop offset="100%" stopColor="#455462" />
          </linearGradient>

          {/* ================= PAGODA RED LACQUER & ROOF ================= */}
          <linearGradient id="pagodaRoofGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e15f41" />
            <stop offset="60%" stopColor="#c4452a" />
            <stop offset="100%" stopColor="#8d2812" />
          </linearGradient>

          {/* ================= CELESTIAL GLOWS ================= */}
          <radialGradient id="sunAmbientGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="25%" stopColor="#fff8dd" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#ffdb70" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffab2e" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="moonSoftGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="40%" stopColor="#ffeed2" stopOpacity="0.8" />
            <stop offset="75%" stopColor="#f8a76d" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f36c50" stopOpacity="0" />
          </radialGradient>

          {/* Lantern Glow Filters */}
          <filter id="lanternBloom" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ================= 1. SKY CANVAS ================= */}
        <rect
          x="0"
          y="0"
          width="1600"
          height="900"
          fill={isNight ? 'url(#vectorSkyNight)' : 'url(#vectorSkyDay)'}
        />

        {/* Celestial Starfield in Night Mode */}
        {isNight && (
          <g className="vector-starfield">
            <circle cx="120" cy="70" r="1.8" fill="#fff" opacity="0.9" className="twinkle-1" />
            <circle cx="260" cy="45" r="2.2" fill="#fff" opacity="0.85" className="twinkle-2" />
            <circle cx="380" cy="85" r="1.5" fill="#ffeaa7" opacity="0.9" className="twinkle-3" />
            <circle cx="510" cy="55" r="2.4" fill="#fff" opacity="0.9" className="twinkle-1" />
            <circle cx="680" cy="110" r="1.6" fill="#fff" opacity="0.75" className="twinkle-2" />
            <circle cx="830" cy="65" r="2.1" fill="#ffeaa7" opacity="0.9" className="twinkle-3" />
            <circle cx="980" cy="95" r="1.8" fill="#fff" opacity="0.85" className="twinkle-1" />
            <circle cx="1140" cy="50" r="2.3" fill="#fff" opacity="0.9" className="twinkle-2" />
            <circle cx="1320" cy="80" r="1.5" fill="#ffeaa7" opacity="0.8" className="twinkle-3" />
            <circle cx="1470" cy="115" r="2" fill="#fff" opacity="0.9" className="twinkle-1" />
          </g>
        )}

        {/* Celestial Sun or Moon */}
        {!isNight ? (
          <g
            className="vector-sun"
            transform={`translate(${340 + mousePos.x * 6}, ${130 + mousePos.y * 4})`}
          >
            <circle cx="0" cy="0" r="120" fill="url(#sunAmbientGlow)" />
            <circle cx="0" cy="0" r="34" fill="#ffffff" />
            {/* Rotating Solar Flare Beams */}
            <g className="rotating-solar-rays" opacity="0.45">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <line
                  key={`ray-${angle}`}
                  x1="0"
                  y1="-44"
                  x2="0"
                  y2="-68"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  transform={`rotate(${angle})`}
                />
              ))}
            </g>
          </g>
        ) : (
          <g
            className="vector-moon"
            transform={`translate(${360 + mousePos.x * 5}, ${130 + mousePos.y * 3})`}
          >
            <circle cx="0" cy="0" r="85" fill="url(#moonSoftGlow)" />
            {/* Elegant Crescent Moon */}
            <path
              d="M 12,-28 A 28,28 0 1,0 12,28 A 22,22 0 1,1 12,-28 Z"
              fill="#fff9e6"
              filter="url(#lanternBloom)"
            />
          </g>
        )}

        {/* ================= 2. LAYER 1: DRIFTING CLOUDS (PARALLAX FAR) ================= */}
        <g
          className="clouds-far-drift"
          opacity={isNight ? '0.2' : '0.45'}
          transform={`translate(${mousePos.x * 12}, 0)`}
        >
          <path
            d="M -100,210 Q 80,160 220,190 Q 380,140 540,180 Q 720,150 900,195 Q 1080,145 1250,185 Q 1440,140 1620,190 Q 1720,160 1850,210 L 1850,380 L -100,380 Z"
            fill="#ffffff"
          />
        </g>

        {/* Floating Hot Air Balloon over the hills */}
        <g
          className="floating-hot-air-balloon"
          transform={`translate(${580 + mousePos.x * 8}, ${190 + mousePos.y * 6}) scale(0.65)`}
          opacity={isNight ? '0.75' : '0.9'}
        >
          <ellipse cx="0" cy="0" rx="18" ry="24" fill={isNight ? '#e67e22' : '#f39c12'} />
          <path d="M -16,4 Q 0,26 16,4" fill="#e74c3c" opacity="0.85" />
          <path d="M -8,-20 Q 0,-24 8,-20 L 6,18 Q 0,24 -6,18 Z" fill="#f1c40f" opacity="0.85" />
          <polygon points="-7,22 7,22 4,28 -4,28" fill="#7f8c8d" />
          <rect x="-4" y="32" width="8" height="6" rx="1" fill="#795548" />
        </g>

        {/* Flock of Seabirds in flight */}
        <g
          className="flock-of-birds"
          transform={`translate(${740 + mousePos.x * 14}, ${150 + mousePos.y * 8}) scale(0.7)`}
          opacity={isNight ? '0.4' : '0.7'}
        >
          <path d="M 0,0 Q 8,-7 16,0 Q 24,-7 32,0" stroke="#34495e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M 45,-18 Q 51,-23 57,-18 Q 63,-23 69,-18" stroke="#34495e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M 28,18 Q 33,14 38,18 Q 43,14 48,18" stroke="#34495e" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>

        {/* ================= 3. LAYER 2: FAR DISTANT MISTY MOUNTAINS (Hải Vân / Trường Sơn) ================= */}
        <g
          className="far-mountains-layer"
          transform={`translate(${mousePos.x * 16}, 0)`}
        >
          <path
            d="M -50,440 Q 110,310 280,390 Q 420,290 600,400 Q 760,310 940,390 Q 1120,290 1300,380 Q 1460,320 1680,440 L 1680,560 L -50,560 Z"
            fill={isNight ? 'url(#farPeaksNight)' : 'url(#farPeaksDay)'}
          />
        </g>

        {/* ================= 4. LAYER 3: HA LONG BAY LIMESTONE KARSTS & PAGODA RIDGE ================= */}
        <g
          className="halong-karsts-layer"
          transform={`translate(${mousePos.x * 24}, 0)`}
        >
          {/* Iconic towering Karst pillars rising dramatically */}
          {/* Karst 1 (Left background) */}
          <path
            d="M 240,510 C 255,380 275,340 295,340 C 315,340 330,390 345,510 Z"
            fill={isNight ? 'url(#karstMidNight)' : 'url(#karstMidDay)'}
          />
          {/* Karst 2 (Center-left) */}
          <path
            d="M 370,520 C 390,390 410,360 425,360 C 440,360 455,400 470,520 Z"
            fill={isNight ? '#16223b' : '#497c92'}
          />
          {/* Karst 3 (Mid-bay islet) */}
          <path
            d="M 520,530 C 530,440 545,410 555,410 C 565,410 575,445 585,530 Z"
            fill={isNight ? '#182540' : '#52869a'}
          />

          {/* Broad mountain slope (Hanoi & Ba Na foothill ridge) */}
          <path
            d="M -40,520 Q 90,420 220,460 Q 360,390 480,450 Q 640,400 780,480 Q 940,410 1120,480 Q 1280,430 1480,490 Q 1580,460 1680,520 L 1680,620 L -40,620 Z"
            fill={isNight ? '#12182c' : '#3f6d7e'}
          />
        </g>

        {/* ================= 5. WATER BAY (VỊNH HẠ LONG / VỊNH ĐÀ NẴNG / SÔNG SÀI GÒN) ================= */}
        <rect
          x="0"
          y="520"
          width="1600"
          height="380"
          fill={isNight ? 'url(#vectorWaterNight)' : 'url(#vectorWaterDay)'}
        />

        {/* Animated Water Ripples with subtle horizontal drift */}
        <g className="animated-water-ripples" opacity={isNight ? '0.35' : '0.5'}>
          <ellipse cx="380" cy="570" rx="140" ry="2.5" fill="#ffffff" />
          <ellipse cx="620" cy="590" rx="210" ry="3.2" fill="#ffffff" />
          <ellipse cx="260" cy="625" rx="180" ry="2.6" fill="#ffffff" />
          <ellipse cx="800" cy="635" rx="260" ry="3.6" fill="#ffffff" />
          <ellipse cx="510" cy="670" rx="280" ry="3.8" fill="#ffffff" />
          <ellipse cx="940" cy="710" rx="200" ry="3" fill="#ffffff" />
        </g>

        {/* ================= 6. LANDMARKS & CITY LAYER ================= */}
        {/* LANDMARK 81 & MODERN SKYLINE (Far right city silhouette) */}
        <g
          className="skyline-landmark81"
          transform={`translate(${mousePos.x * 20}, 0)`}
          opacity={isNight ? '0.9' : '0.78'}
        >
          {/* Landmark 81 Tower Profile */}
          <g transform="translate(1080, 310)">
            {/* Spire needle */}
            <line x1="24" y1="0" x2="24" y2="45" stroke={isNight ? '#74b9ff' : '#6589a8'} strokeWidth="2.5" />
            <circle cx="24" cy="0" r="2.2" fill={isNight ? '#ff4757' : '#ffffff'} className="strobe-white" />
            {/* Tiered Bundled Glass Columns */}
            <polygon points="19,45 29,45 31,110 17,110" fill={isNight ? '#1e2b4d' : '#698ea9'} />
            <polygon points="12,110 36,110 39,180 9,180" fill={isNight ? '#192440' : '#5b819e'} />
            <polygon points="6,180 42,180 45,230 3,230" fill={isNight ? '#151f38' : '#527793'} />

            {/* Glowing night window grid on Landmark 81 */}
            {isNight && (
              <g fill="#ffeaa7" opacity="0.85">
                <rect x="21" y="65" width="2" height="3" />
                <rect x="25" y="65" width="2" height="3" />
                <rect x="21" y="80" width="2" height="3" />
                <rect x="25" y="80" width="2" height="3" />
                <rect x="15" y="130" width="2" height="3" />
                <rect x="23" y="130" width="2" height="3" />
                <rect x="31" y="130" width="2" height="3" />
                <rect x="15" y="150" width="2" height="3" />
                <rect x="31" y="150" width="2" height="3" />
              </g>
            )}
          </g>

          {/* Adjacent Da Nang & Saigon City Towers */}
          <path
            d="M 1000,540 L 1000,500 L 1020,500 L 1020,480 L 1040,480 L 1040,540
               L 1140,540 L 1140,490 L 1160,475 L 1180,490 L 1180,540
               L 1220,540 L 1220,505 L 1245,505 L 1245,540 Z"
            fill={isNight ? '#121a30' : '#5a7f9a'}
          />
        </g>

        {/* VÒNG QUAY MẶT TRỜI (SUN WHEEL - ROTATING VECTOR MECHANISM) */}
        <g
          className="vector-sun-wheel"
          transform={`translate(${880 + mousePos.x * 22}, 460)`}
        >
          {/* A-frame base support */}
          <polygon points="-24,80 0,0 4,0 28,80 18,80 0,8 -14,80" fill={isNight ? '#222f4f' : '#648398'} />

          {/* Real-time Smooth Rotating Wheel */}
          <g className="rotating-sun-wheel">
            <circle cx="0" cy="0" r="70" stroke={isNight ? '#ff4d4f' : '#ffffff'} strokeWidth="2.4" fill="none" opacity="0.9" />
            <circle cx="0" cy="0" r="67" stroke={isNight ? '#ffd166' : '#d2e7f7'} strokeWidth="1" fill="none" opacity="0.75" />
            <circle cx="0" cy="0" r="38" stroke={isNight ? '#06d6a0' : '#ffffff'} strokeWidth="1" fill="none" opacity="0.6" />
            <circle cx="0" cy="0" r="8" fill={isNight ? '#ffbe0b' : '#34495e'} />

            {/* 12 Wheel Spokes with Passenger Gondolas */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, idx) => {
              const rad = (angle * Math.PI) / 180;
              const x2 = Math.round(Math.cos(rad) * 70 * 100) / 100;
              const y2 = Math.round(Math.sin(rad) * 70 * 100) / 100;
              return (
                <g key={`sunspoke-${idx}`}>
                  <line
                    x1="0"
                    y1="0"
                    x2={x2}
                    y2={y2}
                    stroke={isNight ? (idx % 2 === 0 ? '#ff5252' : '#ffeb3b') : '#ffffff'}
                    strokeWidth="1.2"
                    opacity={isNight ? '0.85' : '0.7'}
                  />
                  <circle
                    cx={x2}
                    cy={y2}
                    r="3.5"
                    fill={isNight ? (idx % 3 === 0 ? '#ff1744' : idx % 3 === 1 ? '#00e676' : '#ffd600') : '#e74c3c'}
                    stroke="#ffffff"
                    strokeWidth="0.8"
                  />
                </g>
              );
            })}
          </g>

          {isNight && (
            <circle cx="0" cy="0" r="74" stroke="#ffeb3b" strokeWidth="2" fill="none" filter="url(#lanternBloom)" opacity="0.55" />
          )}
        </g>

        {/* HAN RIVER & SAIGON SUSPENSION BRIDGE */}
        <g className="cable-bridge-span" transform={`translate(${mousePos.x * 24}, 0)`}>
          <path d="M 460,542 L 950,542 L 950,547 L 460,547 Z" fill={isNight ? '#1e2b4a' : '#7f9fb7'} />
          {/* Bridge Pylon Tower */}
          <polygon points="620,547 624,495 628,495 632,547" fill={isNight ? '#f39c12' : '#ffffff'} />
          <polygon points="740,547 744,500 748,500 752,547" fill={isNight ? '#f39c12' : '#ffffff'} />
          {/* Cable stays */}
          <line x1="626" y1="500" x2="590" y2="542" stroke={isNight ? '#ffd166' : '#ffffff'} strokeWidth="1" opacity="0.6" />
          <line x1="626" y1="500" x2="610" y2="542" stroke={isNight ? '#ffd166' : '#ffffff'} strokeWidth="1" opacity="0.6" />
          <line x1="626" y1="500" x2="645" y2="542" stroke={isNight ? '#ffd166' : '#ffffff'} strokeWidth="1" opacity="0.6" />
          <line x1="626" y1="500" x2="665" y2="542" stroke={isNight ? '#ffd166' : '#ffffff'} strokeWidth="1" opacity="0.6" />

          {/* Bridge Night Fairy Lights */}
          {isNight && (
            <line x1="460" y1="542" x2="950" y2="542" stroke="#ffe066" strokeWidth="2.5" filter="url(#lanternBloom)" opacity="0.85" />
          )}
        </g>

        {/* KHUÊ VĂN CÁC (HANOI TEMPLE OF LITERATURE) ON THE PROMONTORY */}
        <g
          className="khue-van-cac-pavilion"
          transform={`translate(${730 + mousePos.x * 28}, 465) scale(0.85)`}
        >
          {/* Stone Base */}
          <rect x="-24" y="55" width="48" height="18" rx="2" fill={isNight ? '#353b48' : '#718093'} />
          {/* 4 Square Wooden Pillars */}
          <rect x="-20" y="24" width="4" height="32" fill="#78281f" />
          <rect x="-8" y="24" width="4" height="32" fill="#78281f" />
          <rect x="4" y="24" width="4" height="32" fill="#78281f" />
          <rect x="16" y="24" width="4" height="32" fill="#78281f" />

          {/* Lower Curved Eaves Roof */}
          <path
            d="M -32,26 C -20,20 0,18 0,18 C 0,18 20,20 32,26 C 20,23 0,23 -32,26 Z"
            fill="url(#pagodaRoofGrad)"
          />
          {/* Curved finial eaves */}
          <path d="M -32,26 Q -37,20 -30,20" stroke="#f1c40f" strokeWidth="1.5" fill="none" />
          <path d="M 32,26 Q 37,20 30,20" stroke="#f1c40f" strokeWidth="1.5" fill="none" />

          {/* Upper Floor with Iconic Round Solar Window (Thái Cực) */}
          <rect x="-16" y="2" width="32" height="18" fill="#9e2a2b" stroke="#6b1d1e" strokeWidth="1" />
          <circle cx="0" cy="11" r="5.5" fill="#f6b93b" stroke="#333" strokeWidth="1" />
          {/* Ray bars on round window */}
          <line x1="-5.5" y1="11" x2="5.5" y2="11" stroke="#333" strokeWidth="0.8" />
          <line x1="0" y1="5.5" x2="0" y2="16.5" stroke="#333" strokeWidth="0.8" />

          {/* Imperial Top Roof with finial */}
          <path
            d="M -26,3 C -15,-4 0,-6 0,-6 C 0,-6 15,-4 26,3 C 15,0 0,0 -26,3 Z"
            fill="url(#pagodaRoofGrad)"
          />
          <polygon points="0,-12 -3,-6 3,-6" fill="#f1c40f" />
        </g>

        {/* BOATS IN THE WATER (HẠ LONG JUNK BOATS & SAMPAN WITH NÓN LÁ) */}
        {/* Ha Long Traditional Wooden Junk Boat with Orange Fan Sails */}
        <g
          className="halong-junk-boat"
          transform={`translate(${510 + mousePos.x * 26}, 605) scale(0.85)`}
        >
          {/* Wooden Hull */}
          <path d="M 0,10 Q 25,18 50,10 L 46,2 Q 25,6 3,2 Z" fill="#4a2810" />
          {/* Cabin house */}
          <rect x="12" y="-3" width="18" height="7" rx="1" fill="#795548" />
          {/* Main Mast & Orange Battened Sail */}
          <line x1="22" y1="3" x2="22" y2="-32" stroke="#2c1a0e" strokeWidth="1.8" />
          <path
            d="M 22,-30 Q 36,-16 22,-2 L 22,-10 Q 33,-16 22,-22 Z"
            fill="#e67e22"
            stroke="#d35400"
            strokeWidth="0.8"
          />
          {/* Secondary Mast & Sail */}
          <line x1="38" y1="3" x2="38" y2="-22" stroke="#2c1a0e" strokeWidth="1.4" />
          <path
            d="M 38,-20 Q 48,-10 38,0 Z"
            fill="#d35400"
            opacity="0.9"
          />
        </g>

        {/* Sampan Boat with Vietnamese Boatman wearing Nón Lá (Thuyền nan & nón lá) */}
        <g
          className="sampan-non-la"
          transform={`translate(${650 + mousePos.x * 30}, 660) scale(0.95)`}
        >
          {/* Sampan wooden hull */}
          <path d="M 0,12 Q 24,20 48,11 L 44,7 Q 24,13 4,7 Z" fill="#3e2723" />
          <ellipse cx="24" cy="16" rx="20" ry="1.5" fill="#1b2a47" opacity="0.45" />

          {/* Boatman Body (Áo bà ba) */}
          <rect x="26" y="2" width="7" height="10" rx="1" fill={isNight ? '#2c3e50' : '#1e3799'} />
          {/* Oar paddle */}
          <line x1="28" y1="0" x2="16" y2="20" stroke="#5d4037" strokeWidth="1.8" />
          <ellipse cx="15" cy="19" rx="3" ry="1.2" fill="#4e342e" />

          {/* Traditional Nón Lá (Conical Hat) */}
          <polygon points="29.5,-5 21,2 38,2" fill="#faeed7" stroke="#d4b483" strokeWidth="0.8" />
          <line x1="29.5" y1="-5" x2="29.5" y2="2" stroke="#d4b483" strokeWidth="0.5" />
        </g>

        {/* ================= 7. LAYER 4: CẦU THÊ HÚC ĐỎ SON & ĐẢO NGỌC (VERMILION ARCHED BRIDGE) ================= */}
        <g
          className="the-huc-bridge-group"
          transform={`translate(${30 + mousePos.x * 28}, ${10 + mousePos.y * 10})`}
        >
          {/* Bridge Water Shadow & Reflection */}
          <ellipse
            cx="390"
            cy="685"
            rx="260"
            ry="12"
            fill={isNight ? '#0b162c' : '#2b5f77'}
            opacity="0.45"
          />

          {/* Stone Piers supporting the bridge */}
          <polygon points="220,665 228,665 230,715 218,715" fill={isNight ? '#26334a' : '#5d7182'} />
          <polygon points="380,635 388,635 390,705 378,705" fill={isNight ? '#26334a' : '#5d7182'} />
          <polygon points="540,655 548,655 550,710 538,710" fill={isNight ? '#26334a' : '#5d7182'} />

          {/* Wooden Arch Bridge Understructure */}
          <path
            d="M 120,685 Q 380,590 640,675"
            stroke={isNight ? '#5c1911' : '#8e2316'}
            strokeWidth="16"
            fill="none"
            strokeLinecap="round"
          />

          {/* Vermilion Red Bridge Deck (Cầu Thê Húc Đỏ Son) */}
          <path
            d="M 120,682 Q 380,587 640,672"
            stroke={isNight ? '#992d22' : '#d63031'}
            strokeWidth="11"
            fill="none"
            strokeLinecap="round"
          />

          {/* Golden Upper Handrails */}
          <path
            d="M 120,674 Q 380,579 640,664"
            stroke={isNight ? '#e74c3c' : '#ff7675'}
            strokeWidth="2.5"
            fill="none"
          />
          <path
            d="M 120,688 Q 380,593 640,678"
            stroke={isNight ? '#7c1c11' : '#b71515'}
            strokeWidth="2"
            fill="none"
          />

          {/* Traditional Vertical Balusters (Cọc lan can cầu) with Golden Tips */}
          {[150, 190, 230, 270, 310, 350, 390, 430, 470, 510, 550, 590, 620].map((bx, i) => {
            // calculate parabola arch Y
            const normalizedX = (bx - 380) / 260;
            const by = 587 + 90 * (normalizedX * normalizedX);
            return (
              <g key={`baluster-${i}`}>
                <line
                  x1={bx}
                  y1={by - 7}
                  x2={bx}
                  y2={by + 6}
                  stroke={isNight ? '#b71515' : '#e17055'}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Golden Cap Finial */}
                <circle cx={bx} cy={by - 8} r="1.8" fill="#f1c40f" />
              </g>
            );
          })}

          {/* Night Fairy Lights along the Red Arch Bridge */}
          {isNight && (
            <path
              d="M 120,674 Q 380,579 640,664"
              stroke="#ffeaa7"
              strokeWidth="3.5"
              strokeDasharray="6,12"
              fill="none"
              filter="url(#lanternBloom)"
            />
          )}

          {/* Blooming Pink Lotus Pond & Lily Pads around the Bridge Base */}
          <g className="lotus-pond-group" transform="translate(190, 700)">
            {/* Lily Pads */}
            <ellipse cx="0" cy="0" rx="22" ry="7" fill="#1b4d3e" opacity="0.85" />
            <ellipse cx="45" cy="15" rx="26" ry="8" fill="#1b4d3e" opacity="0.85" />
            <ellipse cx="-40" cy="12" rx="20" ry="6" fill="#1b4d3e" opacity="0.85" />

            {/* Lotus Blossom 1 */}
            <g transform="translate(2, -6) scale(0.9)">
              <ellipse cx="0" cy="0" rx="8" ry="12" fill="#fd79a8" />
              <ellipse cx="-4" cy="2" rx="6" ry="10" fill="#e84393" />
              <ellipse cx="4" cy="2" rx="6" ry="10" fill="#e84393" />
              <circle cx="0" cy="0" r="3" fill="#ffeaa7" />
            </g>

            {/* Lotus Blossom 2 */}
            <g transform="translate(48, 8) scale(0.75)">
              <ellipse cx="0" cy="0" rx="8" ry="12" fill="#fd79a8" />
              <ellipse cx="-4" cy="2" rx="6" ry="10" fill="#e84393" />
              <ellipse cx="4" cy="2" rx="6" ry="10" fill="#e84393" />
              <circle cx="0" cy="0" r="3" fill="#f1c40f" />
            </g>
          </g>
        </g>

        {/* HỘI AN LANTERNS IN NIGHT MODE (SWAYING & PULSING) */}
        {isNight && (
          <g className="hoian-lantern-strings">
            {/* Lantern Garland string */}
            <path d="M 0,210 Q 70,230 140,215 Q 210,200 280,220" stroke="#5d4037" strokeWidth="1.5" fill="none" />
            {/* Lantern 1 (Ruby Red) */}
            <g transform="translate(65, 225)" className="lantern-sway-1">
              <ellipse cx="0" cy="22" rx="14" ry="17" fill="#e74c3c" filter="url(#lanternBloom)" opacity="0.9" />
              <circle cx="0" cy="22" r="5" fill="#fff" />
              <line x1="0" y1="39" x2="0" y2="52" stroke="#f1c40f" strokeWidth="1.2" />
            </g>
            {/* Lantern 2 (Golden Amber) */}
            <g transform="translate(135, 220)" className="lantern-sway-2">
              <ellipse cx="0" cy="23" rx="15" ry="15" fill="#f39c12" filter="url(#lanternBloom)" opacity="0.9" />
              <circle cx="0" cy="23" r="5" fill="#fff" />
              <line x1="0" y1="38" x2="0" y2="50" stroke="#f1c40f" strokeWidth="1.2" />
            </g>
            {/* Lantern 3 (Lotus Pink) */}
            <g transform="translate(205, 212)" className="lantern-sway-3">
              <ellipse cx="0" cy="22" rx="13" ry="16" fill="#e84393" filter="url(#lanternBloom)" opacity="0.9" />
              <circle cx="0" cy="22" r="5" fill="#fff" />
              <line x1="0" y1="38" x2="0" y2="50" stroke="#fd79a8" strokeWidth="1.2" />
            </g>
          </g>
        )}

        {/* ================= 8. LAYER 5: FOREGROUND ROCK CLIFF, TRAVELER GIRL & DAISIES ================= */}
        <g
          className="foreground-cliff-traveler"
          transform={`translate(${mousePos.x * 40}, ${mousePos.y * 18})`}
        >
          {/* Mossy Mountain Crag */}
          <path
            d="M -30,650 Q 60,620 140,670 Q 210,690 230,740 Q 240,790 180,850 Q 120,910 -30,910 Z"
            fill={isNight ? 'url(#nearCliffNight)' : 'url(#nearCliffDay)'}
          />
          {/* Lush green ridge highlights */}
          <path
            d="M -30,680 Q 50,650 120,700 Q 160,730 170,790 Q 110,840 -30,830 Z"
            fill={isNight ? '#16283b' : '#578860'}
          />

          {/* Blooming White Daisies on the cliff */}
          <g className="wildflowers-daisies" transform="translate(45, 750)">
            <circle cx="0" cy="0" r="4.5" fill="#f1c40f" />
            <circle cx="-6" cy="0" r="3.5" fill="#ffffff" />
            <circle cx="6" cy="0" r="3.5" fill="#ffffff" />
            <circle cx="0" cy="-6" r="3.5" fill="#ffffff" />
            <circle cx="0" cy="6" r="3.5" fill="#ffffff" />
            <circle cx="-4" cy="-4" r="3.5" fill="#ffffff" />
            <circle cx="4" cy="4" r="3.5" fill="#ffffff" />
            <circle cx="-4" cy="4" r="3.5" fill="#ffffff" />
            <circle cx="4" cy="-4" r="3.5" fill="#ffffff" />
            <path d="M 0,6 Q 3,18 8,24" stroke="#2e7d32" strokeWidth="1.8" fill="none" />
          </g>
          <g className="wildflowers-daisies" transform="translate(85, 780) scale(0.8)">
            <circle cx="0" cy="0" r="4.5" fill="#f39c12" />
            <circle cx="-6" cy="0" r="3.5" fill="#ffffff" />
            <circle cx="6" cy="0" r="3.5" fill="#ffffff" />
            <circle cx="0" cy="-6" r="3.5" fill="#ffffff" />
            <circle cx="0" cy="6" r="3.5" fill="#ffffff" />
            <circle cx="-4" cy="-4" r="3.5" fill="#ffffff" />
            <circle cx="4" cy="4" r="3.5" fill="#ffffff" />
          </g>

          {/* THE TRAVELER GIRL SITTING ON THE CLIFF */}
          <g className="traveler-girl-figure" transform="translate(150, 650)">
            {/* Rock seat */}
            <ellipse cx="25" cy="115" rx="42" ry="16" fill={isNight ? '#0d182b' : '#2b3b48'} />

            {/* Travel Backpack with Straps */}
            <rect x="-14" y="62" width="26" height="38" rx="8" fill={isNight ? '#1b2a47' : '#1c3144'} />
            <rect x="-11" y="68" width="20" height="20" rx="4" fill={isNight ? '#23375c' : '#2a4d69'} />
            <line x1="-12" y1="78" x2="7" y2="78" stroke="#f39c12" strokeWidth="2" />
            <circle cx="-2" cy="74" r="2.5" fill="#e74c3c" />

            {/* Torso & White Top */}
            <ellipse cx="16" cy="68" rx="14" ry="18" fill="#f8f9fa" />
            {/* Blue Denim Trousers */}
            <path d="M 12,82 C 16,84 28,84 32,82 L 40,110 C 35,114 26,114 22,110 Z" fill="#2e5b82" />
            <path d="M 28,82 C 38,84 46,92 50,105 C 46,112 36,110 32,100 Z" fill="#3a6f9f" />

            {/* White Sneakers */}
            <ellipse cx="48" cy="110" rx="8" ry="4" fill="#ffffff" />
            <ellipse cx="28" cy="114" rx="8" ry="4" fill="#f1f2f6" />
            <path d="M 44,110 L 52,110" stroke="#e74c3c" strokeWidth="1" />

            {/* Arms resting on knees */}
            <path d="M 18,65 C 26,72 35,80 40,94" stroke="#e8beac" strokeWidth="5" strokeLinecap="round" fill="none" />

            {/* Hair */}
            <path d="M 10,38 C 2,52 6,70 12,78 C 16,68 18,52 14,40 Z" fill="#2c1d11" />
            {/* Head */}
            <ellipse cx="16" cy="38" rx="8" ry="10" fill="#e8beac" />

            {/* Traveler Sun Hat */}
            <g transform="translate(16, 32)">
              <ellipse cx="0" cy="0" rx="28" ry="9" fill="#e6d5b8" stroke="#cbb493" strokeWidth="1" />
              <path d="M -12,-1 C -12,-15 12,-15 12,-1" fill="#dfcca9" />
              <ellipse cx="0" cy="-2" rx="13" ry="4" fill="#2d3436" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
