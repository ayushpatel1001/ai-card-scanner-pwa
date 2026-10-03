export interface BoundingBox {
  ymin: number; // 0.0 to 1.0 (or normalized 0 to 1000)
  xmin: number;
  ymax: number;
  xmax: number;
}

export type PhoneType = 'CELL' | 'WORK' | 'HOME' | 'OTHER';
export type EmailType = 'INTERNET' | 'WORK' | 'HOME' | 'OTHER';

export interface PhoneEntry {
  id: string;
  number: string;
  type: PhoneType;
}

export interface EmailEntry {
  id: string;
  email: string;
  type: EmailType;
}

export interface ExtractedContact {
  id: string;
  batchId?: string;
  sourceImageId: string;
  sourceImageFileName: string;
  cardIndex: number;
  fullName: string;
  firstName: string;
  lastName: string;
  company: string;
  designation: string;
  phones: PhoneEntry[];
  emails: EmailEntry[];
  address: string;
  websites: string[];
  notes: string;
  box: BoundingBox;
  cropAvatarUri: string; // Base64 data URI of the cropped ~320x320 JPEG
  useAvatarInVcard: boolean; // default true
  status: 'pending' | 'duplicate_detected' | 'verified' | 'saved' | 'discarded';
  duplicateMatch?: DuplicateMatch;
  createdAt: number;
  updatedAt: number;
}

export interface StoredContact extends ExtractedContact {
  savedAt: number;
}

export type MatchReason = 'email' | 'phone' | 'name_company';

export interface DuplicateMatch {
  existingContact: StoredContact;
  reasons: MatchReason[];
  confidenceScore: number; // 0 to 1
  matchedValue?: string;
}

export type QueueItemStatus = 'compressing' | 'analyzing' | 'extracted' | 'error';

export interface ScanQueueItem {
  id: string;
  fileName: string;
  fileSizeOriginal: number;
  fileSizeCompressed?: number;
  previewUrl: string;
  compressedDataUri?: string;
  status: QueueItemStatus;
  progress: number;
  error?: string;
  cardsFound?: number;
}

export type NameDisplayFormat = 'parentheses' | 'dash' | 'bracket';

export interface AppSettings {
  openRouterApiKey: string;
  modelId: string;
  customModelId?: string;
  theme: 'dark' | 'light';
  autoCropAvatar: boolean;
  avatarSize: number; // e.g. 360
  targetCompressionKb: number; // e.g. 500
  appendCompanyToName: boolean; // Append company to Full Name for easy Caller ID
  appendDesignationToName: boolean; // Append job title/designation to Full Name
  nameDisplayFormat: NameDisplayFormat; // 'parentheses' | 'dash' | 'bracket'
}

/**
 * Strips previous suffix formatted with parentheses, brackets, or dashes
 */
export function stripFormattedSuffix(fullName: string): string {
  if (!fullName) return '';
  return fullName
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s*\[[^\]]*\]\s*$/, '')
    .replace(/\s*-\s*[^-\n]+$/, '')
    .trim();
}

/**
 * Formats full name with company and/or designation for phone Caller ID display
 */
export function formatContactFullName(
  rawName: string,
  company: string,
  designation: string,
  options: {
    appendCompanyToName?: boolean;
    appendDesignationToName?: boolean;
    nameDisplayFormat?: NameDisplayFormat;
  }
): string {
  const baseName = stripFormattedSuffix(rawName) || rawName.trim();
  if (!baseName) return '';

  const suffixes: string[] = [];
  if (options.appendCompanyToName && company && company.trim()) {
    suffixes.push(company.trim());
  }
  if (options.appendDesignationToName && designation && designation.trim()) {
    suffixes.push(designation.trim());
  }

  if (suffixes.length === 0) {
    return baseName;
  }

  const suffixText = suffixes.join(' • ');
  const format = options.nameDisplayFormat || 'parentheses';

  switch (format) {
    case 'dash':
      return `${baseName} - ${suffixText}`;
    case 'bracket':
      return `${baseName} [${suffixText}]`;
    case 'parentheses':
    default:
      return `${baseName} (${suffixText})`;
  }
}

export interface OpenRouterModelOption {
  id: string;
  name: string;
  tag: string;
  costPer1k: string;
  speed: string;
  recommended?: boolean;
}
