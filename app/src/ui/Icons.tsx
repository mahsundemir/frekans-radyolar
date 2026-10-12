import React from 'react';
import Svg, {Circle, Path, Rect} from 'react-native-svg';

type P = {size?: number; color: string};

const stroke = (color: string, w = 2) => ({
  fill: 'none',
  stroke: color,
  strokeWidth: w,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const PlayIcon = ({size = 24, color}: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M8 5.5v13l11-6.5z" fill={color} />
  </Svg>
);

export const PauseIcon = ({size = 24, color}: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="6.5" y="5" width="4" height="14" rx="1.2" fill={color} />
    <Rect x="13.5" y="5" width="4" height="14" rx="1.2" fill={color} />
  </Svg>
);

export const PrevIcon = ({size = 24, color}: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M18 6v12l-8.5-6z" fill={color} />
    <Rect x="5" y="6" width="2.5" height="12" rx="1" fill={color} />
  </Svg>
);

export const NextIcon = ({size = 24, color}: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6 6v12l8.5-6z" fill={color} />
    <Rect x="16.5" y="6" width="2.5" height="12" rx="1" fill={color} />
  </Svg>
);

export const VolumeIcon = ({size = 20, color}: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" {...stroke(color)} />
    <Path d="M15.5 9a4 4 0 0 1 0 6" {...stroke(color)} />
  </Svg>
);

export const ChevronDown = ({size = 22, color}: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6 9l6 6 6-6" {...stroke(color, 2.4)} />
  </Svg>
);

export const ChevronLeft = ({size = 20, color}: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M15 6l-6 6 6 6" {...stroke(color, 2.4)} />
  </Svg>
);

export const MenuIcon = ({size = 22, color}: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5 7h14M5 12h14M5 17h9" {...stroke(color, 2.4)} />
  </Svg>
);

export const HeartIcon = ({
  size = 24,
  color,
  filled = false,
}: P & {filled?: boolean}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
      {...stroke(color)}
      fill={filled ? color : 'none'}
    />
  </Svg>
);

export const MoonIcon = ({size = 24, color}: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" {...stroke(color)} />
  </Svg>
);

export const SlidersIcon = ({size = 18, color}: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 8h10M18 8h2M4 16h2M10 16h10" {...stroke(color)} />
    <Circle cx="16" cy="8" r="2" {...stroke(color)} />
    <Circle cx="8" cy="16" r="2" {...stroke(color)} />
  </Svg>
);

export const RefreshIcon = ({size = 18, color}: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4" {...stroke(color, 2.4)} />
  </Svg>
);

export const SearchIcon = ({size = 18, color}: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="11" cy="11" r="6.5" {...stroke(color, 2.2)} />
    <Path d="M16 16l4 4" {...stroke(color, 2.2)} />
  </Svg>
);

export const ShareIcon = ({size = 22, color}: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 15V4M8 8l4-4 4 4" {...stroke(color, 2.2)} />
    <Path d="M6 11H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1" {...stroke(color, 2.2)} />
  </Svg>
);
