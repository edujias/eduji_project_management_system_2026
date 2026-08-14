export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: 'ADMIN' | 'EMPLOYEE';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  isOnline?: boolean;
  lastLoginAt?: string | null;
  lastLogoutAt?: string | null;
  totalPresenceTime?: number;
}

export type ProjectPermissionLevel = 'READ' | 'WRITE';

export interface ProjectPermission {
  id: string;
  userId: string;
  projectId: string;
  permission: ProjectPermissionLevel;
  user?: User;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
  channels?: Channel[];
  permissions?: ProjectPermission[];
  fileAssets?: FileAsset[];
  tasks?: Task[];
}

export interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user?: User;
}

export interface Channel {
  id: string;
  projectId?: string;
  name: string;
  description?: string;
  type: 'PROJECT_PUBLIC' | 'PROJECT_PRIVATE' | 'DIRECT_MESSAGE';
  createdById: string;
  createdAt: string;
  members?: ChannelMember[];
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  parentId?: string;
  content: string;
  createdAt: string;
  sender?: User;
  attachments?: FileAsset[];
  reactions?: MessageReaction[];
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  assignedToId?: string;
  assignedTo?: { id: string; fullName: string; avatarUrl?: string; email?: string };
  assignedById?: string;
  assignedBy?: { id: string; fullName: string; avatarUrl?: string; role?: string };
  createdById: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FileAsset {
  id: string;
  projectId: string;
  uploadedById: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  publicUrl?: string;
  createdAt: string;
  uploadedBy?: { id: string; fullName: string; avatarUrl?: string; email?: string };
}
