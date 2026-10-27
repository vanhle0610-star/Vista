import React from 'react';

export interface LuxeIconProps {
  size?: number;
  className?: string;
  active?: boolean;
  style?: React.CSSProperties;
}

// ─── 1. LUXE HEART ICON (Diamond Faceted Gem Heart) ──────────────────────────
export function LuxeHeartIcon({ size = 22, className, active = false }: LuxeIconProps) {
  const gradId = `luxeHeartGrad_${size}_${active ? 'act' : 'inact'}`;
  const glowId = `luxeHeartGlow_${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ overflow: 'visible', transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF4B72" />
          <stop offset="50%" stopColor="#FF7A59" />
          <stop offset="100%" stopColor="#FFB347" />
        </linearGradient>
        {active && (
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#FF4B72" floodOpacity="0.55" />
          </filter>
        )}
      </defs>
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={active ? `url(#${gradId})` : 'rgba(255, 255, 255, 0.08)'}
        stroke={active ? `url(#${gradId})` : 'rgba(156, 163, 175, 0.8)'}
        strokeWidth="1.6"
        strokeLinejoin="round"
        filter={active ? `url(#${glowId})` : undefined}
      />
      {/* Vết cắt kim cương tạo chiều sâu đá quý */}
      <path
        d="M12 6.5v10.5M8 9.5l4 4 4-4"
        stroke={active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.2)'}
        strokeOpacity={active ? '0.7' : '0.2'}
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── 2. AURA COMMENT ICON (Dialogue with Radiant Starlight) ─────────────────
export function AuraCommentIcon({ size = 22, className }: LuxeIconProps) {
  const gradId = `auraCommentGrad_${size}`;
  const strokeId = `auraCommentStroke_${size}`;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id={strokeId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="50%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      {/* Khung bong bóng hội thoại bo mềm */}
      <path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"
        fill={`url(#${gradId})`}
        stroke={`url(#${strokeId})`}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Tia sáng sao Aura Sparkle góc trên */}
      <circle cx="10" cy="11.5" r="1.2" fill="#22D3EE" />
      <circle cx="14" cy="11.5" r="1.2" fill="#38BDF8" />
      <circle cx="18" cy="11.5" r="1.2" fill="#818CF8" />
    </svg>
  );
}

// ─── 3. LUXE CAMERA / FILM REEL ICON (Mechanical Aperture Lens) ─────────────
export function LuxeCameraIcon({ size = 22, className }: LuxeIconProps) {
  const gradId = `luxeCamGrad_${size}`;
  const rimId = `luxeCamRim_${size}`;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id={rimId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      {/* Thân máy vát cạnh kim loại */}
      <path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        fill="rgba(15, 23, 42, 0.08)"
        stroke={`url(#${rimId})`}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Vòng lens quang học đôi */}
      <circle cx="12" cy="13" r="4.2" stroke={`url(#${gradId})`} strokeWidth="1.6" fill="rgba(245, 158, 11, 0.12)" />
      <circle cx="12" cy="13" r="1.8" fill={`url(#${gradId})`} />
      <circle cx="18.5" cy="9.5" r="0.9" fill="#F59E0B" />
    </svg>
  );
}

// ─── 4. COMPASS PIN ICON (Location Gem with Compass Needle) ─────────────────
export function CompassPinIcon({ size = 20, className }: LuxeIconProps) {
  const gradId = `compassPinGrad_${size}`;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="50%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      {/* Giọt ngọc định vị */}
      <path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
        fill="rgba(16, 185, 129, 0.14)"
        stroke={`url(#${gradId})`}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Kim la bàn định hướng vàng ngọc */}
      <polygon points="12 6.5 14.5 11 12 10 9.5 11 12 6.5" fill="#F59E0B" />
      <polygon points="12 13.5 14.5 11 12 12 9.5 11 12 13.5" fill="rgba(100, 116, 139, 0.6)" />
    </svg>
  );
}

// ─── 5. AEGIS SHIELD ICON (Royal Aegis Shield with Radar Scan for Reports) ────
export function AegisShieldIcon({ size = 22, className, style }: LuxeIconProps) {
  const gradId = `aegisGrad_${size}`;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ overflow: 'visible', ...style }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#FB7185" />
        </linearGradient>
      </defs>
      {/* Khiên bảo vệ phong cách hoàng gia */}
      <path
        d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4z"
        fill="rgba(244, 63, 94, 0.12)"
        stroke={`url(#${gradId})`}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Vạch cảnh báo / cờ an toàn */}
      <path d="M12 8v5M12 16h.01" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ─── 6. PRISM SHARE ICON (Multidimensional Node Refraction) ─────────────────
export function PrismShareIcon({ size = 20, className }: LuxeIconProps) {
  const gradId = `prismShareGrad_${size}`;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="5" r="3.2" fill="rgba(236, 72, 153, 0.16)" stroke={`url(#${gradId})`} strokeWidth="1.6" />
      <circle cx="6" cy="12" r="3.2" fill="rgba(139, 92, 246, 0.16)" stroke={`url(#${gradId})`} strokeWidth="1.6" />
      <circle cx="18" cy="19" r="3.2" fill="rgba(236, 72, 153, 0.16)" stroke={`url(#${gradId})`} strokeWidth="1.6" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke={`url(#${gradId})`} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke={`url(#${gradId})`} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── 7. CROWN MODERATOR ICON (Royal Authority Crown for Moderation) ─────────
export function CrownModeratorIcon({ size = 22, className }: LuxeIconProps) {
  const gradId = `crownModGrad_${size}`;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F472B6" />
        </linearGradient>
      </defs>
      <path
        d="M2 19h20M4 16l2-9 4.5 4L12 4l1.5 7L18 7l2 9H4z"
        fill="rgba(245, 158, 11, 0.18)"
        stroke={`url(#${gradId})`}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="7" r="1" fill="#F59E0B" />
      <circle cx="12" cy="4" r="1.2" fill="#FBBF24" />
      <circle cx="18" cy="7" r="1" fill="#F59E0B" />
    </svg>
  );
}

// ─── 8. TRAVEL MOOD ICONS (Núi mây, Sóng biển, Lửa trại, Cà phê) ───────────
export function MountainMoodIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 3l4 8 5-5 5 10H2L8 3z" stroke="#10B981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="rgba(16, 185, 129, 0.15)" />
      <circle cx="18" cy="6" r="2" stroke="#F59E0B" strokeWidth="1.2" fill="#FEF3C7" />
    </svg>
  );
}

export function OceanMoodIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M2 12c2.5-3 5.5-3 8 0s5.5 3 8 0 4-2 4-2M2 17c2.5-3 5.5-3 8 0s5.5 3 8 0 4-2 4-2" stroke="#06B6D4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CampfireMoodIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2c1.5 3-1 5 1 8 1.5-3 3-3 3-5 3 3 2 7-1 9-3 2-6 1-7-2-1-3 1-6 4-10z" fill="rgba(249, 115, 22, 0.2)" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 21l16-4M20 21L4 17" stroke="#92400E" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CoffeeMoodIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke="#D97706" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="rgba(217, 119, 6, 0.12)" />
      <path d="M6 2v3M10 2v3M14 2v3" stroke="#F59E0B" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// ─── 9. LUXE CLOSE & UTILITY ICONS ──────────────────────────────────────────
export function LuxeCloseIcon({ size = 18, className }: LuxeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="rgba(255, 255, 255, 0.08)" />
      <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SparkleStarIcon({ size = 16, className, style }: LuxeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M12 2l2.4 6.8L21 11.2l-5.6 4.4L17.2 22 12 17.6 6.8 22l1.8-6.4L3 11.2l6.6-2.4L12 2z" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.2" />
    </svg>
  );
}
