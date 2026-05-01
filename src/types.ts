import { Timestamp } from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  bio: string | null;
  streak: number;
  totalMinutes: number;
  followersCount: number;
  followingCount: number;
  createdAt: Timestamp;
}

export interface Stack {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL: string | null;
  activity: string;
  durationMinutes: number;
  startTime: Timestamp;
  endTime: Timestamp;
  photoURL: string | null;
  note: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: Timestamp;
}

export interface Channel {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  userPhotoURL: string | null;
  content: string;
  createdAt: Timestamp;
}
