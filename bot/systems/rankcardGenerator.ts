import { createCanvas, loadImage, SKRSContext2D, Image } from '@napi-rs/canvas';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

type CanvasRenderingContext2D = SKRSContext2D;
import { UserLevel, RankcardStyle, RANKCARD_STYLES } from '../types';
import { xpForLevel } from '../config';

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  angle: number;
}

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

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawLofiNightBackground(ctx: CanvasRenderingContext2D, width: number, height: number, style: RankcardStyle) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, style.backgroundColor);
  gradient.addColorStop(0.5, '#2d1f3d');
  gradient.addColorStop(1, style.backgroundColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  ctx.fillStyle = hexToRgba(style.primaryColor, 0.1);
  ctx.beginPath();
  ctx.arc(width - 60, 40, 80, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = hexToRgba(style.secondaryColor, 0.15);
  ctx.beginPath();
  ctx.arc(80, height - 30, 60, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = hexToRgba(style.accentColor, 0.08);
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 100, 0, Math.PI * 2);
  ctx.fill();
}

function drawLofiMinimalBackground(ctx: CanvasRenderingContext2D, width: number, height: number, style: RankcardStyle) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, style.backgroundColor);
  gradient.addColorStop(1, hexToRgba(style.accentColor, 1));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  ctx.strokeStyle = hexToRgba(style.secondaryColor, 0.2);
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 25 * i + 20);
    ctx.lineTo(width, 25 * i + 20);
    ctx.stroke();
  }
  
  ctx.fillStyle = hexToRgba(style.secondaryColor, 0.15);
  ctx.fillRect(width - 80, 15, 60, 60);
  ctx.fillRect(width - 90, 100, 40, 40);
}

function drawLofiAnimeDeskBackground(ctx: CanvasRenderingContext2D, width: number, height: number, style: RankcardStyle) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, style.backgroundColor);
  gradient.addColorStop(0.3, style.backgroundColor);
  gradient.addColorStop(0.7, '#FFF0E8');
  gradient.addColorStop(1, style.backgroundColor);
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
  
  ctx.fillStyle = hexToRgba(style.primaryColor, 0.4);
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
  
  ctx.fillStyle = hexToRgba(style.secondaryColor, 0.35);
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

function drawLofiQuietAfternoonBackground(ctx: CanvasRenderingContext2D, width: number, height: number, style: RankcardStyle) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#FFF5EB');
  gradient.addColorStop(0.4, '#FFECD9');
  gradient.addColorStop(0.7, '#FFD4B8');
  gradient.addColorStop(1, '#FFCBA4');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  ctx.fillStyle = 'rgba(255, 180, 100, 0.3)';
  ctx.beginPath();
  ctx.arc(width - 40, 60, 70, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(255, 200, 150, 0.25)';
  ctx.beginPath();
  ctx.arc(width - 60, 45, 50, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(200, 120, 80, 0.15)';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(60 + i * 25, height - 30, 8 + Math.random() * 5, 12 + Math.random() * 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.fillStyle = 'rgba(180, 100, 60, 0.12)';
  ctx.beginPath();
  ctx.moveTo(0, height - 15);
  ctx.quadraticCurveTo(width / 4, height - 35, width / 2, height - 20);
  ctx.quadraticCurveTo(width * 0.75, height - 5, width, height - 25);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
}

function drawLofiStudyNightBackground(ctx: CanvasRenderingContext2D, width: number, height: number, style: RankcardStyle) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1A1A2E');
  gradient.addColorStop(0.5, '#16213E');
  gradient.addColorStop(1, '#0F0F1A');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  ctx.fillStyle = 'rgba(255, 255, 200, 0.03)';
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.fillStyle = 'rgba(80, 80, 120, 0.4)';
  ctx.fillRect(width - 90, height - 60, 70, 50);
  
  ctx.fillStyle = 'rgba(60, 60, 100, 0.5)';
  ctx.fillRect(width - 85, height - 55, 60, 35);
  
  ctx.fillStyle = 'rgba(150, 180, 255, 0.15)';
  ctx.fillRect(width - 83, height - 53, 56, 31);
  
  ctx.fillStyle = 'rgba(255, 200, 100, 0.6)';
  ctx.beginPath();
  ctx.arc(width - 120, height - 40, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 200, 100, 0.2)';
  ctx.beginPath();
  ctx.arc(width - 120, height - 40, 15, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(100, 80, 60, 0.4)';
  ctx.fillRect(30, height - 35, 50, 8);
  ctx.fillRect(35, height - 50, 40, 15);
  ctx.fillRect(40, height - 65, 30, 15);
  
  ctx.fillStyle = 'rgba(200, 180, 150, 0.3)';
  ctx.fillRect(90, height - 40, 30, 4);
  ctx.fillRect(95, height - 35, 20, 4);
}

function drawLofiNostalgicMemoryBackground(ctx: CanvasRenderingContext2D, width: number, height: number, style: RankcardStyle) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#4A3C28');
  gradient.addColorStop(0.3, '#5C4A32');
  gradient.addColorStop(0.6, '#3D3225');
  gradient.addColorStop(1, '#2A2318');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  ctx.fillStyle = 'rgba(200, 170, 120, 0.12)';
  ctx.fillRect(0, 0, width, height);
  
  ctx.fillStyle = 'rgba(255, 200, 100, 0.25)';
  ctx.beginPath();
  ctx.arc(width - 60, 45, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 220, 150, 0.15)';
  ctx.beginPath();
  ctx.arc(width - 60, 45, 70, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(180, 140, 80, 0.2)';
  ctx.beginPath();
  ctx.arc(80, height - 35, 45, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(220, 180, 120, 0.08)';
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    ctx.beginPath();
    ctx.arc(x, y, 15 + Math.random() * 25, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.fillStyle = 'rgba(100, 80, 60, 0.4)';
  ctx.fillRect(width - 100, height - 55, 80, 45);
  ctx.fillStyle = 'rgba(60, 50, 40, 0.5)';
  ctx.fillRect(width - 95, height - 50, 70, 35);
  ctx.fillStyle = 'rgba(150, 120, 80, 0.3)';
  ctx.fillRect(width - 93, height - 48, 66, 31);
  
  ctx.fillStyle = 'rgba(200, 160, 100, 0.35)';
  ctx.fillRect(25, height - 50, 45, 6);
  ctx.fillRect(30, height - 60, 35, 10);
  ctx.fillRect(35, height - 72, 25, 12);
  
  ctx.fillStyle = 'rgba(180, 150, 100, 0.15)';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * 40);
    ctx.lineTo(width, i * 40 + 20);
    ctx.lineTo(width, i * 40 + 22);
    ctx.lineTo(0, i * 40 + 2);
    ctx.closePath();
    ctx.fill();
  }
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
    case 4:
      drawLofiQuietAfternoonBackground(ctx, width, height, style);
      break;
    case 5:
      drawLofiStudyNightBackground(ctx, width, height, style);
      addGrainEffect(ctx, width, height, 8);
      break;
    case 6:
      drawLofiNostalgicMemoryBackground(ctx, width, height, style);
      addGrainEffect(ctx, width, height, 10);
      break;
    default:
      drawLofiNightBackground(ctx, width, height, style);
      addGrainEffect(ctx, width, height, 12);
  }
  
  if (avatarUrl) {
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
    } catch {
      drawAvatarFallback(ctx, style, username);
    }
  } else {
    drawAvatarFallback(ctx, style, username);
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
  
  ctx.fillStyle = hexToRgba(style.accentColor, 0.4);
  roundRect(ctx, progressBarX, progressBarY, progressBarWidth, progressBarHeight, progressBarHeight / 2);
  ctx.fill();
  
  const progressGradient = ctx.createLinearGradient(progressBarX, 0, progressBarX + progressBarWidth, 0);
  progressGradient.addColorStop(0, style.primaryColor);
  progressGradient.addColorStop(1, style.progressBarColor);
  ctx.fillStyle = progressGradient;
  roundRect(ctx, progressBarX, progressBarY, progressWidth, progressBarHeight, progressBarHeight / 2);
  ctx.fill();
  
  const isLightStyle = style.id === 2 || style.id === 3 || style.id === 4;
  ctx.fillStyle = isLightStyle ? '#4A4A4A' : '#FFFFFF';
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

function createParticles(width: number, height: number, count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 1 + Math.random() * 3,
      speed: 0.3 + Math.random() * 0.7,
      opacity: 0.2 + Math.random() * 0.5,
      angle: Math.random() * Math.PI * 2,
    });
  }
  return particles;
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], frame: number, style: RankcardStyle) {
  const isLightStyle = style.id === 2 || style.id === 3 || style.id === 4;
  const particleColor = isLightStyle ? '80, 80, 80' : '255, 255, 255';
  
  for (const particle of particles) {
    const offsetY = Math.sin(frame * 0.1 + particle.angle) * 3;
    const offsetX = Math.cos(frame * 0.05 + particle.angle) * 2;
    const pulseOpacity = particle.opacity * (0.7 + Math.sin(frame * 0.15 + particle.angle) * 0.3);
    
    ctx.fillStyle = `rgba(${particleColor}, ${pulseOpacity})`;
    ctx.beginPath();
    ctx.arc(
      particle.x + offsetX,
      particle.y + offsetY,
      particle.size,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

function drawGlowEffect(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, frame: number, color: string) {
  const pulse = 0.6 + Math.sin(frame * 0.12) * 0.4;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  for (let i = 3; i > 0; i--) {
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${pulse * 0.1 * (4 - i)})`;
    ctx.beginPath();
    ctx.arc(x, y, radius + i * 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

export async function generateAnimatedRankcard(
  userLevel: UserLevel,
  username: string,
  avatarUrl: string,
  rank: number
): Promise<Buffer> {
  const width = 600;
  const height = 200;
  const frameCount = 20;
  const delay = 80;
  
  const style = getRankcardStyle(userLevel.selectedRankcard);
  const progress = calculateProgress(userLevel.xp, userLevel.level);
  const particles = createParticles(width, height, 15);
  
  let avatar: Image | null = null;
  if (avatarUrl) {
    try {
      avatar = await loadImage(avatarUrl);
    } catch {
      avatar = null;
    }
  }
  
  const gif = GIFEncoder();
  
  for (let frame = 0; frame < frameCount; frame++) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    switch (style.id) {
      case 1:
        drawLofiNightBackground(ctx, width, height, style);
        break;
      case 2:
        drawLofiMinimalBackground(ctx, width, height, style);
        break;
      case 3:
        drawLofiAnimeDeskBackground(ctx, width, height, style);
        break;
      case 4:
        drawLofiQuietAfternoonBackground(ctx, width, height, style);
        break;
      case 5:
        drawLofiStudyNightBackground(ctx, width, height, style);
        break;
      case 6:
        drawLofiNostalgicMemoryBackground(ctx, width, height, style);
        break;
      default:
        drawLofiNightBackground(ctx, width, height, style);
    }
    
    drawParticles(ctx, particles, frame, style);
    
    drawGlowEffect(ctx, 85, 100, 55, frame, style.primaryColor);
    
    if (avatar) {
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
    } else {
      drawAvatarFallback(ctx, style, username);
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
    
    const animatedProgress = progress.percentage * (0.95 + Math.sin(frame * 0.2) * 0.05);
    const progressWidth = Math.max(progressBarHeight, (animatedProgress / 100) * progressBarWidth);
    
    ctx.fillStyle = hexToRgba(style.accentColor, 0.4);
    roundRect(ctx, progressBarX, progressBarY, progressBarWidth, progressBarHeight, progressBarHeight / 2);
    ctx.fill();
    
    const progressGradient = ctx.createLinearGradient(progressBarX, 0, progressBarX + progressBarWidth, 0);
    progressGradient.addColorStop(0, style.primaryColor);
    progressGradient.addColorStop(1, style.progressBarColor);
    ctx.fillStyle = progressGradient;
    roundRect(ctx, progressBarX, progressBarY, progressWidth, progressBarHeight, progressBarHeight / 2);
    ctx.fill();
    
    const shimmerX = progressBarX + ((frame / frameCount) * progressBarWidth * 1.5) - 50;
    if (shimmerX < progressBarX + progressWidth && shimmerX > progressBarX - 30) {
      const shimmerGradient = ctx.createLinearGradient(shimmerX, 0, shimmerX + 60, 0);
      shimmerGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
      shimmerGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
      shimmerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = shimmerGradient;
      ctx.save();
      roundRect(ctx, progressBarX, progressBarY, progressWidth, progressBarHeight, progressBarHeight / 2);
      ctx.clip();
      ctx.fillRect(shimmerX, progressBarY, 60, progressBarHeight);
      ctx.restore();
    }
    
    const isLightStyle = style.id === 2 || style.id === 3 || style.id === 4;
    ctx.fillStyle = isLightStyle ? '#4A4A4A' : '#FFFFFF';
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
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const { data } = imageData;
    
    const rgbaData = new Uint8Array(width * height * 4);
    for (let i = 0; i < data.length; i++) {
      rgbaData[i] = data[i];
    }
    
    const palette = quantize(rgbaData, 256);
    const index = applyPalette(rgbaData, palette);
    
    gif.writeFrame(index, width, height, { palette, delay });
  }
  
  gif.finish();
  
  return Buffer.from(gif.bytes());
}

function drawAvatarFallback(ctx: CanvasRenderingContext2D, style: RankcardStyle, username: string) {
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
  
  const style = RANKCARD_STYLES[0];
  
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, style.backgroundColor);
  gradient.addColorStop(0.5, '#2d1f3d');
  gradient.addColorStop(1, style.backgroundColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  addGrainEffect(ctx, width, height, 8);
  
  ctx.fillStyle = hexToRgba(style.primaryColor, 0.1);
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
  
  ctx.fillStyle = style.textColor;
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Tabla de Clasificaciones', guildIconUrl ? 85 : 25, 35);
  
  ctx.fillStyle = style.primaryColor;
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
      
      ctx.fillStyle = style.backgroundColor;
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}`, 40, y + (userRowHeight - 5) / 2);
    } else {
      ctx.fillStyle = style.secondaryColor;
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}`, 40, y + (userRowHeight - 5) / 2);
    }
    
    if (user.avatarUrl) {
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
        drawLeaderboardAvatarFallback(ctx, style, user.username, 85, y + (userRowHeight - 5) / 2);
      }
    } else {
      drawLeaderboardAvatarFallback(ctx, style, user.username, 85, y + (userRowHeight - 5) / 2);
    }
    
    ctx.fillStyle = style.textColor;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const displayName = user.username.length > 16 ? user.username.substring(0, 13) + '...' : user.username;
    ctx.fillText(displayName, 115, y + (userRowHeight - 5) / 2 - 8);
    
    ctx.fillStyle = style.primaryColor;
    ctx.font = '12px Arial';
    ctx.fillText(`Nivel ${user.level}`, 115, y + (userRowHeight - 5) / 2 + 10);
    
    ctx.fillStyle = style.secondaryColor;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${user.xp.toLocaleString()} XP`, width - 30, y + (userRowHeight - 5) / 2);
  }
  
  return canvas.toBuffer('image/png');
}

function drawLeaderboardAvatarFallback(ctx: CanvasRenderingContext2D, style: RankcardStyle, username: string, x: number, y: number) {
  ctx.fillStyle = style.primaryColor;
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = style.textColor;
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(username.charAt(0).toUpperCase(), x, y);
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
