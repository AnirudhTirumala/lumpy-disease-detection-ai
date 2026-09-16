import { ObjectId } from 'mongodb';

export type Role = 'user' | 'doctor' | 'admin';

// ─── Users ────────────────────────────────────────────────────────────────────
export interface UserDoc {
  _id?: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: 'pending_otp' | 'active' | 'pending_approval' | 'rejected' | 'removed' | 'deleted';
  otp?: string;
  otpExpiry?: Date;
  resetToken?: string;
  resetTokenExpiry?: Date;
  profileImageFileId?: string; // GridFS
  location?: string;
  specialization?: string;    // doctors only
  licenseNumber?: string;     // doctors only
  availabilityStatus?: 'available' | 'busy' | 'offline'; // doctors only
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: string;
  profileImageUrl?: string;
  location?: string;
  specialization?: string;
}

// ─── Cattle ───────────────────────────────────────────────────────────────────
// No breeds — just simple animal types
export type AnimalType = 'Cow' | 'Buffalo' | 'Bull' | 'Calf' | 'Heifer' | 'Ox';

export interface CattleDoc {
  _id?: ObjectId;
  ownerId: string;
  name: string;           // e.g. "My Cow 1"
  animalType: AnimalType;
  age: number;
  lastStatus: 'healthy' | 'lumpy' | 'unscanned';
  lastScanDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Scans ────────────────────────────────────────────────────────────────────
export interface ScanDoc {
  _id?: ObjectId;
  farmerId: string;
  cattleId: string;
  cattleName: string;
  animalType: string;
  imageFileId?: string;
  result: 'healthy' | 'lumpy';
  confidence: number;
  rawPredictions: Array<{ label: string; confidence: number }>;
  reviewedByDoctor: boolean;
  reviewedBy?: string;
  doctorNotes?: string;
  createdAt: Date;
}

// ─── Cases ────────────────────────────────────────────────────────────────────
export interface CaseDoc {
  _id?: ObjectId;
  scanId: string;
  farmerId: string;
  farmerName: string;
  cattleId: string;
  cattleName: string;
  animalType: string;
  confidence: number;
  severity: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'Under Review' | 'Reviewed' | 'Closed';
  assignedDoctorId?: string;
  doctorNotes?: string;
  followUpDate?: Date;       // follow-up scheduler
  followUpDone?: boolean;
  transferHistory?: Array<{ fromDoctorId: string; toDoctorId: string; note?: string; at: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Messages ─────────────────────────────────────────────────────────────────
export type MessageType = 'text' | 'image' | 'voice' | 'video' | 'document';

export interface MessageDoc {
  _id?: ObjectId;
  threadId: string;
  farmerId: string;
  doctorId: string;
  sender: 'farmer' | 'doctor';
  senderId: string;
  senderName: string;
  type: MessageType;
  text: string;
  fileId?: string;       // GridFS id for image/voice/video/document
  fileName?: string;
  fileMimeType?: string;
  duration?: number;     // seconds for voice/video
  readBy: string[];
  deliveredTo: string[];       // who has received it (double tick) vs read it (blue tick)
  reactions?: Record<string, string>; // userId -> emoji, e.g. { "64f...": "👍" }
  createdAt: Date;
}

// ─── Notifications ────────────────────────────────────────────────────────────
export interface NotificationDoc {
  _id?: ObjectId;
  userId: string;
  title: string;
  body: string;
  type: 'scan' | 'message' | 'case' | 'system' | 'outbreak';
  read: boolean;
  link?: string;
  createdAt: Date;
}
