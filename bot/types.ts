import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  Client, 
  Collection,
  VoiceChannel,
  GuildMember 
} from 'discord.js';
import { AudioPlayer, AudioResource, VoiceConnection } from '@discordjs/voice';

export interface Command {
  data: SlashCommandBuilder | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
  musicQueues: Map<string, MusicQueue>;
  tempChannels: Map<string, TempChannelData>;
  userLevels: Map<string, UserLevel>;
  voiceTimers: Map<string, NodeJS.Timeout>;
  voteskips: Map<string, Set<string>>;
  permissions: Map<string, Set<string>>;
}

export interface Track {
  title: string;
  url: string;
  duration: string;
  thumbnail: string;
  requestedBy: string;
  source: 'youtube' | 'spotify' | 'soundcloud' | 'other';
}

export interface MusicQueue {
  guildId: string;
  textChannelId: string;
  voiceChannelId: string;
  connection: VoiceConnection | null;
  player: AudioPlayer | null;
  tracks: Track[];
  currentTrack: Track | null;
  volume: number;
  loop: boolean;
  shuffle: boolean;
  autoplay: boolean;
  history: Track[];
  isPlaying: boolean;
  isPaused: boolean;
}

export interface TempChannelData {
  channelId: string;
  ownerId: string;
  guildId: string;
  createdAt: Date;
  trusted: Set<string>;
  blocked: Set<string>;
  isLocked: boolean;
  userLimit: number;
  name: string;
}

export interface UserLevel {
  discordId: string;
  guildId: string;
  xp: number;
  level: number;
  totalVoiceTime: number;
  totalMusicTime: number;
  messagesCount: number;
  selectedRankcard: number;
  lastXpGain: number;
}

export interface RankcardStyle {
  id: number;
  name: string;
  unlockLevel: number;
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  progressBarColor: string;
  fontFamily: string;
  description: string;
}

export const RANKCARD_STYLES: RankcardStyle[] = [
  {
    id: 1,
    name: 'Lo-fi Night',
    unlockLevel: 0,
    backgroundColor: '#1a1625',
    primaryColor: '#9B59B6',
    secondaryColor: '#3498DB',
    accentColor: '#6B4C8A',
    textColor: '#E8E6F0',
    progressBarColor: '#9B59B6',
    fontFamily: 'Arial',
    description: 'Fondo oscuro con grano. Colores morado, azul, café.'
  },
  {
    id: 2,
    name: 'Lo-fi Minimal',
    unlockLevel: 25,
    backgroundColor: '#F5F5F0',
    primaryColor: '#4A4A4A',
    secondaryColor: '#888888',
    accentColor: '#D4D4C8',
    textColor: '#2D2D2D',
    progressBarColor: '#6B6B6B',
    fontFamily: 'Arial',
    description: 'Fondo beige o gris claro. Diseño minimalista y elegante.'
  },
  {
    id: 3,
    name: 'Lo-fi Anime Desk',
    unlockLevel: 50,
    backgroundColor: '#FFE4D6',
    primaryColor: '#7CB9A8',
    secondaryColor: '#F5B8AB',
    accentColor: '#A8D4C4',
    textColor: '#4A5568',
    progressBarColor: '#7CB9A8',
    fontFamily: 'Arial',
    description: 'Colores pastel y estilo tranquilo tipo escritorio anime.'
  }
];
