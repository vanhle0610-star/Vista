import React from 'react';

interface CountryFlagProps {
  countryCode: string;
  width?: number;
  height?: number;
  className?: string;
  rounded?: boolean;
}

export function CountryFlag({
  countryCode,
  width = 20,
  height = 14,
  className = '',
  rounded = true,
}: CountryFlagProps) {
  const code = (countryCode || '').toUpperCase();
  const radius = rounded ? 3 : 0;

  const renderFlagSvg = () => {
    switch (code) {
      case 'VN':
        // Vietnam: Red flag with central gold 5-point star
        return (
          <svg viewBox="0 0 30 20" width={width} height={height} className={className} style={{ borderRadius: radius }}>
            <rect width="30" height="20" fill="#da251d" />
            <polygon
              points="15,4 16.5,8.8 21.6,8.8 17.5,11.8 19,16.5 15,13.6 11,16.5 12.5,11.8 8.4,8.8 13.5,8.8"
              fill="#ffff00"
            />
          </svg>
        );

      case 'KR':
        // South Korea: White, Taegeuk (Red/Blue), 4 Trigrams
        return (
          <svg viewBox="0 0 30 20" width={width} height={height} className={className} style={{ borderRadius: radius }}>
            <rect width="30" height="20" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.5" />
            {/* Trigrams simplified for crisp micro-rendering */}
            <g fill="#000000" stroke="#000000" strokeWidth="0.6">
              {/* Top-Left */}
              <line x1="5" y1="4" x2="8" y2="7" />
              <line x1="6" y1="3" x2="9" y2="6" />
              <line x1="4" y1="5" x2="7" y2="8" />
              {/* Bottom-Right */}
              <line x1="22" y1="13" x2="25" y2="16" />
              <line x1="23" y1="12" x2="26" y2="15" />
              <line x1="21" y1="14" x2="24" y2="17" />
              {/* Top-Right */}
              <line x1="22" y1="7" x2="25" y2="4" />
              <line x1="23" y1="8" x2="26" y2="5" />
              <line x1="21" y1="6" x2="24" y2="3" />
              {/* Bottom-Left */}
              <line x1="5" y1="16" x2="8" y2="13" />
              <line x1="6" y1="17" x2="9" y2="14" />
              <line x1="4" y1="15" x2="7" y2="12" />
            </g>
            {/* Taegeuk Circle */}
            <g transform="translate(15,10) rotate(-34)">
              <path d="M -5,0 A 5,5 0 0,1 5,0 A 2.5,2.5 0 0,1 0,0 A 2.5,2.5 0 0,0 -5,0" fill="#cd2e3a" />
              <path d="M 5,0 A 5,5 0 0,1 -5,0 A 2.5,2.5 0 0,1 0,0 A 2.5,2.5 0 0,0 5,0" fill="#0047a0" />
            </g>
          </svg>
        );

      case 'JP':
        // Japan: White background, red circle
        return (
          <svg viewBox="0 0 30 20" width={width} height={height} className={className} style={{ borderRadius: radius }}>
            <rect width="30" height="20" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.5" />
            <circle cx="15" cy="10" r="6" fill="#bc002d" />
          </svg>
        );

      case 'CN':
        // China: Red with 5 yellow stars
        return (
          <svg viewBox="0 0 30 20" width={width} height={height} className={className} style={{ borderRadius: radius }}>
            <rect width="30" height="20" fill="#de2910" />
            {/* Big star */}
            <polygon
              points="5,2 5.9,4.8 8.8,4.8 6.5,6.5 7.4,9.3 5,7.6 2.6,9.3 3.5,6.5 1.2,4.8 4.1,4.8"
              fill="#ffde00"
            />
            {/* 4 small stars */}
            <circle cx="10" cy="2.5" r="1.1" fill="#ffde00" />
            <circle cx="12" cy="4.5" r="1.1" fill="#ffde00" />
            <circle cx="12" cy="7.5" r="1.1" fill="#ffde00" />
            <circle cx="10" cy="9.5" r="1.1" fill="#ffde00" />
          </svg>
        );

      case 'GB':
      case 'EN':
      case 'UK':
        // United Kingdom: Union Jack
        return (
          <svg viewBox="0 0 30 20" width={width} height={height} className={className} style={{ borderRadius: radius }}>
            <rect width="30" height="20" fill="#012169" />
            {/* White diagonals */}
            <line x1="0" y1="0" x2="30" y2="20" stroke="#ffffff" strokeWidth="4" />
            <line x1="30" y1="0" x2="0" y2="20" stroke="#ffffff" strokeWidth="4" />
            {/* Red diagonals */}
            <line x1="0" y1="0" x2="30" y2="20" stroke="#c8102e" strokeWidth="2" />
            <line x1="30" y1="0" x2="0" y2="20" stroke="#c8102e" strokeWidth="2" />
            {/* White central cross */}
            <rect x="12" y="0" width="6" height="20" fill="#ffffff" />
            <rect x="0" y="7" width="30" height="6" fill="#ffffff" />
            {/* Red central cross */}
            <rect x="13" y="0" width="4" height="20" fill="#c8102e" />
            <rect x="0" y="8" width="30" height="4" fill="#c8102e" />
          </svg>
        );

      case 'US':
        // USA: Stripes and blue canton
        return (
          <svg viewBox="0 0 30 20" width={width} height={height} className={className} style={{ borderRadius: radius }}>
            <rect width="30" height="20" fill="#b22234" />
            <rect y="1.54" width="30" height="1.54" fill="#ffffff" />
            <rect y="4.62" width="30" height="1.54" fill="#ffffff" />
            <rect y="7.7" width="30" height="1.54" fill="#ffffff" />
            <rect y="10.78" width="30" height="1.54" fill="#ffffff" />
            <rect y="13.86" width="30" height="1.54" fill="#ffffff" />
            <rect y="16.94" width="30" height="1.54" fill="#ffffff" />
            <rect width="13" height="10.8" fill="#3c3b6e" />
            <circle cx="3" cy="2.5" r="0.8" fill="#ffffff" />
            <circle cx="7" cy="2.5" r="0.8" fill="#ffffff" />
            <circle cx="10" cy="2.5" r="0.8" fill="#ffffff" />
            <circle cx="5" cy="5.4" r="0.8" fill="#ffffff" />
            <circle cx="9" cy="5.4" r="0.8" fill="#ffffff" />
            <circle cx="3" cy="8.3" r="0.8" fill="#ffffff" />
            <circle cx="7" cy="8.3" r="0.8" fill="#ffffff" />
            <circle cx="10" cy="8.3" r="0.8" fill="#ffffff" />
          </svg>
        );

      case 'DE':
        // Germany: Black, Red, Gold
        return (
          <svg viewBox="0 0 30 20" width={width} height={height} className={className} style={{ borderRadius: radius }}>
            <rect width="30" height="6.67" fill="#000000" />
            <rect y="6.67" width="30" height="6.67" fill="#dd0000" />
            <rect y="13.34" width="30" height="6.67" fill="#ffce00" />
          </svg>
        );

      case 'FR':
        // France: Blue, White, Red
        return (
          <svg viewBox="0 0 30 20" width={width} height={height} className={className} style={{ borderRadius: radius }}>
            <rect width="10" height="20" fill="#002395" />
            <rect x="10" width="10" height="20" fill="#ffffff" />
            <rect x="20" width="10" height="20" fill="#ed2939" />
          </svg>
        );

      case 'LA':
      case 'LO':
        // Laos: Red, Blue (double width), Red with white central circle
        return (
          <svg viewBox="0 0 30 20" width={width} height={height} className={className} style={{ borderRadius: radius }}>
            <rect width="30" height="5" fill="#ce1126" />
            <rect y="5" width="30" height="10" fill="#002868" />
            <rect y="15" width="30" height="5" fill="#ce1126" />
            <circle cx="15" cy="10" r="4" fill="#ffffff" />
          </svg>
        );

      case 'TH':
        // Thailand: Red, White, Blue (double width), White, Red
        return (
          <svg viewBox="0 0 30 20" width={width} height={height} className={className} style={{ borderRadius: radius }}>
            <rect width="30" height="3.33" fill="#a51931" />
            <rect y="3.33" width="30" height="3.33" fill="#f4f5f8" />
            <rect y="6.66" width="30" height="6.68" fill="#2d2a4a" />
            <rect y="13.34" width="30" height="3.33" fill="#f4f5f8" />
            <rect y="16.67" width="30" height="3.33" fill="#a51931" />
          </svg>
        );

      case 'ES':
        // Spain: Red, Yellow (double width), Red
        return (
          <svg viewBox="0 0 30 20" width={width} height={height} className={className} style={{ borderRadius: radius }}>
            <rect width="30" height="5" fill="#aa151b" />
            <rect y="5" width="30" height="10" fill="#f1bf00" />
            <rect y="15" width="30" height="5" fill="#aa151b" />
            {/* Coat of arms simplified silhouette */}
            <circle cx="8" cy="10" r="2.2" fill="#aa151b" opacity="0.8" />
          </svg>
        );

      case 'SG':
        // Singapore: Red & White
        return (
          <svg viewBox="0 0 30 20" width={width} height={height} className={className} style={{ borderRadius: radius }}>
            <rect width="30" height="10" fill="#ed2939" />
            <rect y="10" width="30" height="10" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.5" />
            <circle cx="6" cy="5" r="2.8" fill="#ffffff" />
            <circle cx="7" cy="5" r="2.6" fill="#ed2939" />
          </svg>
        );

      case 'AU':
        // Australia
        return (
          <svg viewBox="0 0 30 20" width={width} height={height} className={className} style={{ borderRadius: radius }}>
            <rect width="30" height="20" fill="#00008b" />
            <rect width="13" height="9" fill="#012169" />
            <line x1="0" y1="0" x2="13" y2="9" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="13" y1="0" x2="0" y2="9" stroke="#ffffff" strokeWidth="1.5" />
            <rect x="5.5" y="0" width="2" height="9" fill="#ffffff" />
            <rect x="0" y="3.5" width="13" height="2" fill="#ffffff" />
            <circle cx="6.5" cy="14" r="1.6" fill="#ffffff" />
            <circle cx="22" cy="5" r="1" fill="#ffffff" />
            <circle cx="24" cy="9" r="1" fill="#ffffff" />
            <circle cx="20" cy="13" r="1" fill="#ffffff" />
          </svg>
        );

      default:
        return (
          <svg viewBox="0 0 30 20" width={width} height={height} className={className} style={{ borderRadius: radius }}>
            <rect width="30" height="20" fill="#0984e3" />
            <text x="15" y="14" fontSize="10" fill="#ffffff" textAnchor="middle" fontWeight="bold">
              {code.slice(0, 2)}
            </text>
          </svg>
        );
    }
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        verticalAlign: 'middle',
      }}
    >
      {renderFlagSvg()}
    </span>
  );
}
