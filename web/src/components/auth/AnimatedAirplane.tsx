'use client';

import React, { useState } from 'react';

interface AnimatedAirplaneProps {
  isNight: boolean;
  onPlaneClick?: () => void;
}

export function AnimatedAirplane({ isNight }: AnimatedAirplaneProps) {
  const [isStunt, setIsStunt] = useState(false);
  const [modelType, setModelType] = useState<'jet' | 'paper'>('jet');
  const [boost, setBoost] = useState(false);

  const triggerStunt = () => {
    setIsStunt(true);
    setBoost(true);
    setTimeout(() => setIsStunt(false), 1400);
    setTimeout(() => setBoost(false), 2200);
  };

  const toggleModel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModelType((prev) => (prev === 'jet' ? 'paper' : 'jet'));
  };

  return (
    <div className="airplane-sky-system">
      {/* Background Flight Contrail Path */}
      <svg
        className="flight-path-svg"
        viewBox="0 0 1600 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="contrailDay" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="30%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="85%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="contrailNight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffd166" stopOpacity="0" />
            <stop offset="40%" stopColor="#ff9f43" stopOpacity="0.3" />
            <stop offset="85%" stopColor="#f368e0" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#54a0ff" stopOpacity="0.95" />
          </linearGradient>

          <filter id="trailGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* The Animated Dotted Flight Trail (Traced curved path in open sky) */}
        <path
          id="flightCurve"
          className="flight-trail-line"
          d="M -80,200 C 220,90 420,240 700,120 C 980,30 1180,110 1500,50 C 1680,25 1780,40 1880,30"
          stroke={isNight ? 'url(#contrailNight)' : 'url(#contrailDay)'}
          strokeWidth="3"
          strokeDasharray="9,7"
          strokeLinecap="round"
          filter={isNight ? 'url(#trailGlow)' : undefined}
        />

        {/* Secondary gentle wave trail */}
        <path
          d="M -60,215 C 230,105 430,255 710,135 C 990,45 1190,125 1510,65"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeDasharray="4,10"
          opacity={isNight ? '0.3' : '0.45'}
        />

        {/* Trail Floating Travel Heart / Sparkle Markers */}
        <g className="trail-markers" opacity={isNight ? '0.75' : '0.6'}>
          {/* Sparkle 1 */}
          <g transform="translate(380, 160) scale(0.8)">
            <path d="M 0,-8 L 2,-2 L 8,0 L 2,2 L 0,8 L -2,2 L -8,0 L -2,-2 Z" fill={isNight ? '#ffd166' : '#ffffff'} />
          </g>
          {/* Heart at peak */}
          <g transform="translate(860, 65) scale(0.65)">
            <path
              d="M 0,0 C -5,-7 -12,-3 -12,4 C -12,11 0,18 0,18 C 0,18 12,11 12,4 C 12,-3 5,-7 0,0 Z"
              fill={isNight ? '#ff6b81' : '#ff4757'}
            />
          </g>
          {/* Sparkle 2 */}
          <g transform="translate(1360, 80) scale(0.7)">
            <path d="M 0,-8 L 2,-2 L 8,0 L 2,2 L 0,8 L -2,2 L -8,0 L -2,-2 Z" fill="#ffffff" />
          </g>
        </g>
      </svg>

      {/* The Moving Airplane Actor */}
      <div
        className={`airplane-follower ${boost ? 'boost-speed' : ''}`}
        onClick={triggerStunt}
        title="Nhấp vào máy bay để thực hiện lộn vòng 360°!"
      >
        <div className={`airplane-wrapper ${isStunt ? 'airplane-stunt' : ''}`}>
          {modelType === 'jet' ? (
            /* ================= MODEL 1: MODERN JET AIRLINER ================= */
            <svg
              className="airplane-graphic"
              viewBox="0 0 160 80"
              width="135"
              height="68"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="fuselageGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="60%" stopColor="#f0f5fa" />
                  <stop offset="100%" stopColor="#d1e0ec" />
                </linearGradient>

                <linearGradient id="jetEngineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2c3e50" />
                  <stop offset="70%" stopColor="#4a6572" />
                  <stop offset="100%" stopColor="#34495e" />
                </linearGradient>

                <linearGradient id="engineFlame" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#ff7675" stopOpacity="0" />
                  <stop offset="50%" stopColor="#ff9f43" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#00d2d3" stopOpacity="1" />
                </linearGradient>
              </defs>

              {/* Engine Thrust Jet Flame (active when boost) */}
              <ellipse
                cx="35"
                cy="51"
                rx={boost ? '18' : '6'}
                ry="3.5"
                fill="url(#engineFlame)"
                className="jet-thrust"
                opacity={boost ? '1' : '0.55'}
              />

              {/* Far Wing */}
              <polygon points="56,36 94,14 112,15 88,37" fill="#c3d5e4" stroke="#a6bdcf" strokeWidth="0.8" />

              {/* Main Fuselage */}
              <path
                d="M 18,36 C 18,33 26,30 38,29 L 132,32 C 146,33 156,38 156,41 C 156,44 144,48 130,49 L 36,48 C 24,47 18,43 18,36 Z"
                fill="url(#fuselageGrad)"
                stroke="#a0b8cc"
                strokeWidth="1.2"
              />

              {/* Aerodynamic Cockpit Windshield */}
              <path
                d="M 136,34 C 144,35 150,38 152,40 L 140,41 C 137,39 135,36 136,34 Z"
                fill="#2c3e50"
              />

              {/* VISTA Cyan/Navy Cheatline Along Fuselage */}
              <path
                d="M 28,40 L 144,42 C 146,43 145,44 142,44 L 28,43 Z"
                fill="#0984e3"
              />
              <path
                d="M 26,43 L 136,44.5 C 138,45.5 136,46 132,46 L 26,45 Z"
                fill="#00cec9"
              />

              {/* Cabin Windows */}
              {[46, 56, 66, 76, 86, 96, 106, 116, 126].map((wx) => (
                <ellipse key={wx} cx={wx} cy="38" rx="2" ry="2.5" fill="#2c3e50" />
              ))}

              {/* Tail Fin with VISTA Emblem */}
              <polygon points="20,35 14,8 32,8 48,34" fill="#0984e3" stroke="#0652dd" strokeWidth="0.8" />
              <polygon points="22,10 30,10 44,32 36,32" fill="#00cec9" />
              {/* Vietnam Red Star / VISTA Icon on Tail */}
              <circle cx="28" cy="18" r="4.5" fill="#e74c3c" />
              <polygon
                points="28,15 29,17.5 31.5,17.5 29.5,19 30.5,21.5 28,20 25.5,21.5 26.5,19 24.5,17.5 27,17.5"
                fill="#ffeb3b"
              />

              {/* Horizontal Stabilizer (Elevator) */}
              <polygon points="12,36 2,33 12,31 24,35" fill="#d1e0ec" stroke="#a0b8cc" strokeWidth="0.8" />

              {/* Near Wing */}
              <polygon
                points="68,44 98,68 116,68 96,44"
                fill="url(#fuselageGrad)"
                stroke="#a0b8cc"
                strokeWidth="1"
              />
              {/* Winglet tip */}
              <polygon points="112,68 117,62 119,62 116,68" fill="#0984e3" />

              {/* Turbofan Jet Engine Under Near Wing */}
              <rect x="52" y="47" width="28" height="9" rx="4.5" fill="url(#jetEngineGrad)" />
              <ellipse cx="80" cy="51.5" rx="3.5" ry="4.5" fill="#74b9ff" />
              <ellipse cx="52" cy="51.5" rx="2" ry="4.5" fill="#1e272e" />

              {/* Strobe Beacon Blinkers */}
              <circle cx="116" cy="68" r="2.2" fill="#2ed573" className="strobe-light" /> {/* Green on starboard */}
              <circle cx="112" cy="15" r="2.2" fill="#ff4757" className="strobe-light" /> {/* Red on port */}
              <circle cx="14" cy="8" r="2" fill="#ffffff" className="strobe-white" />
            </svg>
          ) : (
            /* ================= MODEL 2: DREAMY ORIGAMI PAPER AIRPLANE ================= */
            <svg
              className="airplane-graphic"
              viewBox="0 0 140 70"
              width="120"
              height="60"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Left wing fold */}
              <polygon points="10,35 125,12 85,35" fill="#ffffff" stroke="#b2bec3" strokeWidth="1" />
              {/* Center spine */}
              <polygon points="10,35 130,35 85,42" fill="#dfe6e9" stroke="#b2bec3" strokeWidth="1" />
              {/* Right wing fold */}
              <polygon points="10,35 125,58 85,35" fill="#ecf0f1" stroke="#b2bec3" strokeWidth="1" />
              {/* Under keel fold */}
              <polygon points="10,35 85,42 85,35" fill="#74b9ff" />
              {/* Heart watermark on wing */}
              <path
                d="M 68,26 C 65,22 60,24 60,28 C 60,32 68,36 68,36 C 68,36 76,32 76,28 C 76,24 71,22 68,26 Z"
                fill="#ff7675"
                opacity="0.85"
              />
            </svg>
          )}

          {/* Floating Sky Banner trailing behind the aircraft */}
          <div className="sky-banner">
            <span className="banner-string"></span>
            <div className="banner-badge">
              <span className="banner-flag">🇻🇳</span>
              <span className="banner-text">Explore Vietnam</span>
              <span className="banner-sparkle">✨</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Flight Control Pill */}
      <div className="flight-control-widget">
        <button
          type="button"
          onClick={triggerStunt}
          className="flight-action-btn stunt-btn"
          title="Thực hiện nhào lộn 360°"
        >
          <span>🎯</span>
          <span>Nhào lộn</span>
        </button>

        <button
          type="button"
          onClick={toggleModel}
          className="flight-action-btn model-btn"
          title="Đổi kiểu máy bay"
        >
          <span>{modelType === 'jet' ? '✈️ Máy bay Jet' : '🪁 Máy bay giấy'}</span>
        </button>
      </div>
    </div>
  );
}
