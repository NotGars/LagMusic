import { createCanvas, loadImage, registerFont, Canvas, CanvasRenderingContext2D } from 'canvas';
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
    current: Math.max(0, xpInCurrentLevel),
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

function addGrainEffect(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number = 15) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * intensity;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  
  ctx.putImageData(imageData, 0, 0);
}

function drawLofiNightBackground(ctx: CanvasRenderingContext2D, width: number, height: number, style: RankcardStyle) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1a1625');
  gradient.addColorStop(0.5, '#2d1f3d');
  gradient.addColorStop(1, '#1a1625');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  ctx.fillStyle = 'rgba(139, 69, 139, 0.1)';
  ctx.beginPath();
  ctx.arc(width - 60, 40, 80, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(52, 73, 94, 0.15)';
  ctx.beginPath();
  ctx.arc(80, height - 30, 60, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(107, 76, 138, 0.08)';
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 100, 0, Math.PI * 2);
  ctx.fill();
}

function drawLofiMinimalBackground(ctx: CanvasRenderingContext2D, width: number, height: number, style: RankcardStyle) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#F8F7F4');
  gradient.addColorStop(1, '#E8E6E1');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  ctx.strokeStyle = 'rgba(180, 180, 170, 0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 25 * i + 20);
    ctx.lineTo(width, 25 * i + 20);
    ctx.stroke();
  }
  
  ctx.fillStyle = 'rgba(200, 195, 185, 0.2)';
  ctx.fillRect(width - 80, 15, 60, 60);
  ctx.fillRect(width - 90, 100, 40, 40);
}

function drawLofiAnimeDeskBackground(ctx: CanvasRenderingContext2D, width: number, height: number, style: RankcardStyle) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#FFE8DC');
  gradient.addColorStop(0.3, '#FFE4D6');
  gradient.addColorStop(0.7, '#FFF0E8');
  gradient.addColorStop(1, '#FFE4D6');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  ctx.fillStyle = 'rgba(135, 206, 235, 0.25)';
  ctx.beginPath();
  ctx.ellipse(width - 50, 50, 70, 50, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillRect(width - 100, 20, 15, 20);
  ctx.fillRect(width - 75, 15, 12, 30);
  ctx.fillRect(width - 55, 25, 10, 18);
  
  ctx.fillStyle = 'rgba(139, 195, 74, 0.4)';
  ctx.beginPath();
  ctx.ellipse(35, height - 40, 15, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.ellipse(55, height - 35, 12, 18, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.ellipse(25, height - 30, 10, 15, -0.2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(210, 180, 140, 0.35)';
  ctx.beginPath();
  ctx.ellipse(40, height - 15, 25, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(245, 184, 171, 0.35)';
  ctx.beginPath();
  ctx.moveTo(width - 45, height - 50);
  ctx.lineTo(width - 25, height - 50);
  ctx.lineTo(width - 25, height - 20);
  ctx.lineTo(width - 45, height - 20);
  ctx.lineTo(width - 50, height - 35);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = 'rgba(200, 160, 140, 0.25)';
  ctx.fillRect(width - 42, height - 48, 14, 5);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export async function generateRankcardImage(
  userLevel: UserLevel,
  username: string,
  avatarUrl: string,
  rank: number
): Promise<Buffer> {
  const width = 600;
  const height = 200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  const style = getRankcardStyle(userLevel.selectedRankcard);
  const progress = calculateProgress(userLevel.xp, userLevel.level);
  
  switch (style.id) {
    case 1:
      drawLofiNightBackground(ctx, width, height, style);
      addGrainEffect(ctx, width, height, 12);
      break;
    case 2:
      drawLofiMinimalBackground(ctx, width, height, style);
      break;
    case 3:
      drawLofiAnimeDeskBackground(ctx, width, height, style);
      break;
    default:
      drawLofiNightBackground(ctx, width, height, style);
      addGrainEffect(ctx, width, height, 12);
  }
  
  try {
    const avatar = await loadImage(avatarUrl);
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(85, 100, 55, 0, Math.PI * 2);
    ctx.closePath();
    
    const avatarGradient = ctx.createLinearGradient(30, 45, 140, 155);
    avatarGradient.addColorStop(0, style.primaryColor);
    avatarGradient.addColorStop(1, style.secondaryColor);
    ctx.strokeStyle = avatarGradient;
    ctx.lineWidth = 4;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(85, 100, 50, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 35, 50, 100, 100);
    ctx.restore();
  } catch (error) {
    ctx.fillStyle = style.primaryColor;
    ctx.beginPath();
    ctx.arc(85, 100, 50, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = style.textColor;
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(username.charAt(0).toUpperCase(), 85, 100);
  }
  
  ctx.fillStyle = style.textColor;
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  const displayName = username.length > 18 ? username.substring(0, 15) + '...' : username;
  ctx.fillText(displayName, 160, 30);
  
  ctx.fillStyle = style.secondaryColor;
  ctx.font = '16px Arial';
  ctx.fillText(`Rank #${rank}`, 160, 62);
  
  ctx.fillStyle = style.textColor;
  ctx.font = 'bold 20px Arial';
  ctx.fillText(`Nivel ${userLevel.level}`, 160, 95);
  
  ctx.fillStyle = style.secondaryColor;
  ctx.font = '14px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`${progress.current.toLocaleString()} / ${progress.needed.toLocaleString()} XP`, width - 30, 95);
  
  const progressBarX = 160;
  const progressBarY = 125;
  const progressBarWidth = width - 190;
  const progressBarHeight = 22;
  const progressWidth = Math.max(progressBarHeight, (progress.percentage / 100) * progressBarWidth);
  
  ctx.fillStyle = style.id === 2 ? 'rgba(200, 195, 185, 0.4)' : 'rgba(0, 0, 0, 0.25)';
  roundRect(ctx, progressBarX, progressBarY, progressBarWidth, progressBarHeight, progressBarHeight / 2);
  ctx.fill();
  
  const progressGradient = ctx.createLinearGradient(progressBarX, 0, progressBarX + progressBarWidth, 0);
  progressGradient.addColorStop(0, style.primaryColor);
  progressGradient.addColorStop(1, style.secondaryColor);
  ctx.fillStyle = progressGradient;
  roundRect(ctx, progressBarX, progressBarY, progressWidth, progressBarHeight, progressBarHeight / 2);
  ctx.fill();
  
  ctx.fillStyle = style.id === 2 ? '#4A4A4A' : '#FFFFFF';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${progress.percentage}%`, progressBarX + progressBarWidth / 2, progressBarY + progressBarHeight / 2);
  
  ctx.fillStyle = style.secondaryColor;
  ctx.font = '13px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`Voz: ${formatTime(userLevel.totalVoiceTime)}  |  Musica: ${formatTime(userLevel.totalMusicTime)}`, 160, 160);
  
  ctx.fillStyle = style.secondaryColor;
  ctx.font = '12px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(style.name, width - 30, 165);
  
  return canvas.toBuffer('image/png');
}

export async function generateLeaderboardImage(
  users: Array<{ username: string; avatarUrl: string; level: number; xp: number; rank: number }>,
  guildName: string,
  guildIconUrl: string | null
): Promise<Buffer> {
  const width = 600;
  const headerHeight = 80;
  const userRowHeight = 55;
  const padding = 15;
  const height = headerHeight + (users.length * userRowHeight) + padding * 2;
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1a1625');
  gradient.addColorStop(0.5, '#2d1f3d');
  gradient.addColorStop(1, '#1a1625');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  addGrainEffect(ctx, width, height, 8);
  
  ctx.fillStyle = 'rgba(155, 89, 182, 0.1)';
  ctx.beginPath();
  ctx.arc(width - 50, 40, 100, 0, Math.PI * 2);
  ctx.fill();
  
  if (guildIconUrl) {
    try {
      const guildIcon = await loadImage(guildIconUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(45, 40, 25, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(guildIcon, 20, 15, 50, 50);
      ctx.restore();
    } catch {}
  }
  
  ctx.fillStyle = '#E8E6F0';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Tabla de Clasificaciones', guildIconUrl ? 85 : 25, 35);
  
  ctx.fillStyle = '#9B59B6';
  ctx.font = '14px Arial';
  ctx.fillText(guildName, guildIconUrl ? 85 : 25, 58);
  
  const medals = ['#FFD700', '#C0C0C0', '#CD7F32'];
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const y = headerHeight + (i * userRowHeight) + padding;
    
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.1)';
    roundRect(ctx, 15, y, width - 30, userRowHeight - 5, 8);
    ctx.fill();
    
    if (i < 3) {
      ctx.fillStyle = medals[i];
      ctx.beginPath();
      ctx.arc(40, y + (userRowHeight - 5) / 2, 15, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#1a1625';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}`, 40, y + (userRowHeight - 5) / 2);
    } else {
      ctx.fillStyle = '#888888';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}`, 40, y + (userRowHeight - 5) / 2);
    }
    
    try {
      const avatar = await loadImage(user.avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(85, y + (userRowHeight - 5) / 2, 18, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, 67, y + (userRowHeight - 5) / 2 - 18, 36, 36);
      ctx.restore();
    } catch {
      ctx.fillStyle = '#9B59B6';
      ctx.beginPath();
      ctx.arc(85, y + (userRowHeight - 5) / 2, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.fillStyle = '#E8E6F0';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const displayName = user.username.length > 16 ? user.username.substring(0, 13) + '...' : user.username;
    ctx.fillText(displayName, 115, y + (userRowHeight - 5) / 2 - 8);
    
    ctx.fillStyle = '#9B59B6';
    ctx.font = '12px Arial';
    ctx.fillText(`Nivel ${user.level}`, 115, y + (userRowHeight - 5) / 2 + 10);
    
    ctx.fillStyle = '#3498DB';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${user.xp.toLocaleString()} XP`, width - 30, y + (userRowHeight - 5) / 2);
  }
  
  return canvas.toBuffer('image/png');
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
    ${formatTime(userLevel.totalVoiceTime)} en voz  |  ${formatTime(userLevel.totalMusicTime)} escuchando
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
