import React from 'react';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';
import { tokens } from '../../../theme/tokens';

interface IconProps {
  size?: number;
  color?: string;
}

export function DiningIcon({ size = 20, color = tokens.colors.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Fork & Knife clean luxury outline */}
      <Path
        d="M18 2V8C18 9.66 16.66 11 15 11M15 11V22M15 11C13.34 11 12 9.66 12 8V2M15 2V8"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6 2V6C6 8.21 7.79 10 10 10V22M6 2H10"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TransitIcon({ size = 20, color = tokens.colors.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Sleek luxury car profile / vehicle */}
      <Path
        d="M5 11L7.2 4.4C7.5 3.5 8.3 3 9.3 3H14.7C15.7 3 16.5 3.5 16.8 4.4L19 11M5 11H19M5 11C3.9 11 3 11.9 3 13V17C3 17.6 3.4 18 4 18H5M19 11C20.1 11 21 11.9 21 13V17C21 17.6 20.6 18 20 18H19M7 18V20M17 18V20"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="7.5" cy="14.5" r="1.5" fill={color} />
      <Circle cx="16.5" cy="14.5" r="1.5" fill={color} />
    </Svg>
  );
}

export function ExperienceIcon({ size = 20, color = tokens.colors.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Ticket / Cable car pass */}
      <Path
        d="M3 8C4.66 8 6 6.66 6 5V4C6 3.45 6.45 3 7 3H17C17.55 3 18 3.45 18 4V5C18 6.66 19.34 8 21 8V16C19.34 16 18 17.34 18 19V20C18 20.55 17.55 21 17 21H7C6.45 21 6 20.55 6 20V19C6 17.34 4.66 16 3 16V8Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1="10"
        y1="8"
        x2="14"
        y2="8"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Line
        x1="10"
        y1="12"
        x2="14"
        y2="12"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Line
        x1="10"
        y1="16"
        x2="14"
        y2="16"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function LodgingIcon({ size = 20, color = tokens.colors.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Minimal luxury bed */}
      <Path
        d="M3 7V20M3 15H21M21 11V20M3 11C3 9.34 4.34 8 6 8H18C19.66 8 21 9.34 21 11"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="8" cy="11.5" r="1.5" fill={color} />
    </Svg>
  );
}

export function OtherIcon({ size = 20, color = tokens.colors.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Ledger receipt */}
      <Path
        d="M4 3V21L7 19.5L10 21L13 19.5L16 21L19 19.5L20 20V3H4Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="8" y1="8" x2="16" y2="8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = 22, color = tokens.colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18L9 12L15 6"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ShareIcon({ size = 20, color = tokens.colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12V19C4 19.55 4.45 20 5 20H19C19.55 20 20 19.55 20 19V12M16 6L12 2M12 2L8 6M12 2V15"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function DotsIcon({ size = 20, color = tokens.colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="5" cy="12" r="1.5" fill={color} />
      <Circle cx="12" cy="12" r="1.5" fill={color} />
      <Circle cx="19" cy="12" r="1.5" fill={color} />
    </Svg>
  );
}

export function PlusIcon({ size = 20, color = tokens.colors.surface }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5V19M5 12H19"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CheckIcon({ size = 16, color = tokens.colors.surface }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17L4 12"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CloseIcon({ size = 20, color = tokens.colors.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6L18 18"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
