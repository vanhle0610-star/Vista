'use client';

import React from 'react';

interface VietnamesePagodaIllustrationProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  color?: string;
  accentColor?: string;
}

/**
 * Exquisite Vietnamese Cultural Landmark Illustration (Tháp Cổ Linh Ứng & Non Nước)
 * Rendered in subtle duotone ink style for premium travel editorial aesthetics.
 */
export function VietnamesePagodaIllustration({
  className,
  width = 280,
  height = 220,
  color = '#0284c7',
  accentColor = '#bae6fd',
}: VietnamesePagodaIllustrationProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 260"
      width={width}
      height={height}
      className={className}
      fill="none"
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <defs>
        {/* Soft atmospheric gradient */}
        <linearGradient id="mistGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="pagodaFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0f9ff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.4" />
        </linearGradient>

        <linearGradient id="mountainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* ─── 1. BACKGROUND ROLLING MOUNTAINS (DÃY NÚI NON NƯỚC) ─── */}
      <path
        d="M-20 220 C 30 160, 70 170, 110 190 C 150 140, 190 145, 230 175 C 270 130, 310 135, 340 180 L 340 260 L -20 260 Z"
        fill="url(#mountainGradient)"
      />
      <path
        d="M60 210 C 100 165, 140 170, 180 195 C 210 155, 250 150, 280 180 C 310 160, 330 170, 350 200 L 350 260 L 60 260 Z"
        fill="url(#mistGradient)"
        opacity="0.6"
      />

      {/* Subtle distant mountain ridgeline */}
      <path
        d="M20 195 Q 60 165 105 185 T 195 160 T 285 140 T 340 175"
        stroke={color}
        strokeWidth="0.8"
        strokeDasharray="2 2"
        opacity="0.35"
      />

      {/* ─── 2. STYLIZED CLOUD WISPS (MÂY LƯỢN CÁCH ĐIỆU) ─── */}
      <g stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.4">
        <path d="M40 90 Q 55 82 70 90 Q 85 85 95 92" />
        <path d="M210 70 Q 225 62 240 70 Q 255 64 270 72" />
        <path d="M250 115 Q 265 108 280 115" />
      </g>

      {/* Birds flock in distance */}
      <g stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.45">
        <path d="M70 65 Q 74 61 78 65 Q 82 61 86 65" />
        <path d="M88 56 Q 91 53 94 56 Q 97 53 100 56" />
        <path d="M60 74 Q 63 71 66 74 Q 69 71 72 74" />
      </g>

      {/* ─── 3. VIETNAMESE MULTI-TIERED PAGODA TOWER (BẢO THÁP CỔ) ─── */}
      {/* Pagoda Center Base is at X = 195, Base Y = 230 */}
      <g stroke={color} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round">
        {/* Foundation & Steps */}
        <rect x="145" y="222" width="100" height="8" rx="2" fill="url(#pagodaFill)" />
        <rect x="152" y="215" width="86" height="7" rx="1.5" fill="url(#pagodaFill)" />
        <line x1="140" y1="230" x2="250" y2="230" strokeWidth="1.5" opacity="0.6" />

        {/* ── TIER 1: GROUND PORTAL SANCTUARY ── */}
        {/* Main walls */}
        <path d="M158 215 L 160 175 L 230 175 L 232 215 Z" fill="url(#pagodaFill)" />
        {/* Arched main entrance door */}
        <path
          d="M185 215 L 185 190 Q 195 180 205 190 L 205 215 Z"
          fill="#ffffff"
          strokeWidth="1.2"
        />
        <line x1="195" y1="184" x2="195" y2="215" strokeWidth="0.8" opacity="0.5" />
        {/* Flanking arched windows */}
        <path d="M168 206 L 168 194 Q 172 190 176 194 L 176 206 Z" fill="#ffffff" strokeWidth="0.9" />
        <path d="M214 206 L 214 194 Q 218 190 222 194 L 222 206 Z" fill="#ffffff" strokeWidth="0.9" />

        {/* Tier 1 Roof Eaves (Mái cong tầng 1) */}
        <path
          d="M142 180 C 150 175, 160 172, 195 172 C 230 172, 240 175, 248 180 C 242 171, 225 167, 195 167 C 165 167, 148 171, 142 180 Z"
          fill="url(#pagodaFill)"
        />
        {/* Upswept curved roof corners */}
        <path d="M142 180 Q 137 175 140 170" />
        <path d="M248 180 Q 253 175 250 170" />

        {/* ── TIER 2: MIDDLE BELL TOWER ── */}
        <path d="M166 167 L 168 135 L 222 135 L 224 167 Z" fill="url(#pagodaFill)" />
        {/* Tier 2 windows */}
        <path d="M178 158 L 178 145 Q 182 141 186 145 L 186 158 Z" fill="#ffffff" strokeWidth="0.9" />
        <path d="M204 158 L 204 145 Q 208 141 212 145 L 212 158 Z" fill="#ffffff" strokeWidth="0.9" />

        {/* Tier 2 Roof Eaves (Mái cong tầng 2) */}
        <path
          d="M152 140 C 160 136, 172 133, 195 133 C 218 133, 230 136, 238 140 C 232 132, 218 128, 195 128 C 172 128, 158 132, 152 140 Z"
          fill="url(#pagodaFill)"
        />
        <path d="M152 140 Q 148 136 150 132" />
        <path d="M238 140 Q 242 136 240 132" />

        {/* ── TIER 3: UPPER TOWER CHAMBER ── */}
        <path d="M173 128 L 175 105 L 215 105 L 217 128 Z" fill="url(#pagodaFill)" />
        <circle cx="195" cy="116" r="4.5" fill="#ffffff" strokeWidth="0.9" />

        {/* Tier 3 Roof Eaves (Mái cong tầng 3) */}
        <path
          d="M162 108 C 170 105, 180 102, 195 102 C 210 102, 220 105, 228 108 C 223 101, 212 98, 195 98 C 178 98, 167 101, 162 108 Z"
          fill="url(#pagodaFill)"
        />
        <path d="M162 108 Q 159 104 161 101" />
        <path d="M228 108 Q 231 104 229 101" />

        {/* ── TIER 4: TOP LANTERN & SPIRE (ĐỈNH THÁP HỒ LÔ / BỒ ĐỀ) ── */}
        <path d="M182 98 L 183 82 L 207 82 L 208 98 Z" fill="url(#pagodaFill)" />
        {/* Top small curved roof */}
        <path
          d="M174 84 C 180 81, 188 79, 195 79 C 202 79, 210 81, 216 84 C 212 78, 204 76, 195 76 C 186 76, 178 78, 174 84 Z"
          fill="url(#pagodaFill)"
        />
        {/* Lotus Spire (Đỉnh hồ lô đồng) */}
        <line x1="195" y1="76" x2="195" y2="52" strokeWidth="1.4" />
        <circle cx="195" cy="68" r="2.5" fill={color} />
        <circle cx="195" cy="58" r="2" fill={color} />
        <circle cx="195" cy="51" r="1.5" fill={color} />
      </g>

      {/* ─── 4. TRADITIONAL BONSAI & BAMBOO SILHOUETTE (RẶNG TRÚC NON) ─── */}
      <g stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.5">
        {/* Bamboo stems on left */}
        <path d="M130 230 Q 128 200 120 185" />
        <path d="M136 230 Q 134 205 128 190" />
        {/* Bamboo leaves */}
        <path d="M120 185 Q 112 180 106 186" />
        <path d="M120 185 Q 115 174 110 178" />
        <path d="M128 190 Q 122 184 118 190" />
        <path d="M124 200 Q 116 198 114 205" />

        {/* Subtle pine on right */}
        <path d="M260 230 Q 262 210 268 200" />
        <path d="M268 200 Q 276 195 282 201" />
        <path d="M266 210 Q 274 207 278 213" />
      </g>
    </svg>
  );
}

