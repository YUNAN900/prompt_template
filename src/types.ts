export type SceneType = 'SRT' | 'Custom' | 'Agent';

export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  content: string;
  authorName: string;
  authorId: string;
  scene: SceneType;
  usageCount: number;
  favoriteCount: number;
  isPublic: boolean;
  allowClone: boolean;
  isOfficial: boolean;
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  isAdmin?: boolean;
}

export interface Favorite {
  id: string;
  promptId: string;
  addedAt?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
