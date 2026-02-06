
export enum AgentId {
  WISE = 'wise',
  CODE = 'code_wise',
  CREATIVE = 'creative_wise',
  IMAGE = 'image_wise',
  VIDEO = 'video_wise',
  LIVE = 'live_wise',
  PRO = 'pro_wise'
}

export interface Agent {
  id: AgentId;
  name: string;
  description: string;
  icon: string;
  color: string;
  model: string;
  systemInstruction?: string;
  capabilities: string[];
}

export enum MessageType {
  USER = 'user',
  AGENT = 'agent',
  SYSTEM = 'system'
}

export interface Message {
  id: string;
  type: MessageType;
  content: string; 
  agentId?: AgentId;
  timestamp: number;
  attachments?: {
    type: 'image' | 'video' | 'audio';
    url: string;
    mimeType?: string;
  }[];
  isThinking?: boolean;
  thoughtProcess?: string;
}

export interface ImageConfig {
  size: '1K' | '2K' | '4K';
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
}

export interface VideoConfig {
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
}

// Infinite Canvas Types
export type NodeType = 'text' | 'code' | 'image' | 'video' | 'website';

export interface CanvasFile {
  name: string;
  content: string;
  language: string;
}

export interface CanvasNode {
    id: string;
    type: NodeType;
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    content: string; // Fallback or main content
    files?: Record<string, CanvasFile>; // Multi-file support
    activeFile?: string; // Currently selected file in editor
    language?: string; // Fallback language
    isSelected?: boolean;
    zIndex: number;
    // Cloud Sync
    cloudId?: number; // ID of the file entry in the cloud
    cloudUrl?: string; // Shareable link if generated
}

export interface CanvasState {
    scale: number;
    x: number;
    y: number;
}

export interface Artifact {
  id: string;
  type: 'code' | 'image' | 'video' | 'html';
  title: string;
  content: string;
  language?: string;
}

export interface CanvasItem {
  id: string;
  type: 'code' | 'image' | 'video' | 'text';
  title: string;
  content: string;
  language?: string;
}

// Graph Connections
export type HandleSide = 'top' | 'right' | 'bottom' | 'left';

export interface CanvasEdge {
    id: string;
    fromNode: string;
    fromSide: HandleSide;
    toNode: string;
    toSide: HandleSide;
}

export interface Workspace {
    id: string;
    name: string;
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    messages: Message[];
    lastModified: number;
    cloudId?: number; // Folder ID in cloud storage
}
