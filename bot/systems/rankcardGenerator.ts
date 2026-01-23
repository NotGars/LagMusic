import { UserLevel, RankcardStyle, RANKCARD_STYLES } from '../types';
import { xpForLevel, levelFromXp } from '../config';

export function getAvailableRankcards(level: number): RankcardStyle[] {
  return RANKCARD_STYLES.filter(style => level >= style.unlockLevel);
}

export function getRankcardStyle(styleId: number): RankcardStyle {
  return RANKCARD_STYLES.find(style => style.id === styleId) || RANKCARD_STYLES[0];
}

export function calculateProgress(xp: number, level: number): { current: number; needed: number; percentage: number } {
  let totalXpForCurrentLevel = 0;
  for (let i = 1; i <= level; i++) {
    totalXpForCurrentLevel += xpForLevel(i);
  }
  
  const xpInCurrentLevel = xp - totalXpForCurrentLevel;
  const xpNeededForNextLevel = xpForLevel(level + 1);
  const percentage = Math.min(100, (xpInCurrentLevel / xpNeededForNextLevel) * 100);
  
  return {
    current: xpInCurrentLevel,
    needed: xpNeededForNextLevel,
    percentage: Math.floor(percentage),
  };
}

export function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) {
    return `${hours}h ${mins}m`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}

export function generateRankcardSVG(
  userLevel: UserLevel,
  username: string,
  avatarUrl: string,
  rank: number
): string {
  const style = getRankcardStyle(userLevel.selectedRankcard);
  const progress = calculateProgress(userLevel.xp, userLevel.level);
  
  const progressWidth = Math.max(10, (progress.percentage / 100) * 280);
  
  let backgroundPattern = '';
  if (style.id === 1) {
    backgroundPattern = `
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
        <feBlend in="SourceGraphic" mode="overlay" in2="noise"/>
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)" opacity="0.1"/>
    `;
  } else if (style.id === 3) {
    backgroundPattern = `
      <ellipse cx="320" cy="50" rx="60" ry="40" fill="${style.accentColor}" opacity="0.3"/>
      <rect x="20" y="130" width="40" height="60" rx="5" fill="${style.primaryColor}" opacity="0.2"/>
      <circle cx="50" cy="120" r="15" fill="${style.secondaryColor}" opacity="0.3"/>
    `;
  }
  
  return `
<svg width="400" height="180" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="avatarClip">
      <circle cx="60" cy="90" r="45"/>
    </clipPath>
    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${style.primaryColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${style.secondaryColor};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="100%" height="100%" rx="15" fill="${style.backgroundColor}"/>
  ${backgroundPattern}
  
  <circle cx="60" cy="90" r="48" fill="${style.primaryColor}" opacity="0.3"/>
  <circle cx="60" cy="90" r="45" fill="${style.backgroundColor}"/>
  <image href="${avatarUrl}" x="15" y="45" width="90" height="90" clip-path="url(#avatarClip)"/>
  
  <text x="120" y="55" font-family="${style.fontFamily}" font-size="20" font-weight="bold" fill="${style.textColor}">${escapeXml(username)}</text>
  
  <text x="120" y="80" font-family="${style.fontFamily}" font-size="14" fill="${style.secondaryColor}">Rank #${rank}</text>
  
  <text x="120" y="110" font-family="${style.fontFamily}" font-size="16" fill="${style.textColor}">
    <tspan font-weight="bold">Nivel ${userLevel.level}</tspan>
  </text>
  <text x="380" y="110" font-family="${style.fontFamily}" font-size="12" fill="${style.secondaryColor}" text-anchor="end">
    ${progress.current.toLocaleString()} / ${progress.needed.toLocaleString()} XP
  </text>
  
  <rect x="120" y="120" width="260" height="16" rx="8" fill="${style.accentColor}" opacity="0.3"/>
  <rect x="120" y="120" width="${progressWidth}" height="16" rx="8" fill="url(#progressGradient)"/>
  
  <text x="120" y="155" font-family="${style.fontFamily}" font-size="11" fill="${style.secondaryColor}">
    🎧 ${formatTime(userLevel.totalVoiceTime)} en voz  •  🎵 ${formatTime(userLevel.totalMusicTime)} escuchando
  </text>
  
  <text x="380" y="155" font-family="${style.fontFamily}" font-size="10" fill="${style.secondaryColor}" text-anchor="end">
    ${style.name}
  </text>
</svg>
  `.trim();
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
