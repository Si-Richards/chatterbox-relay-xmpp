
import { validateJID, sanitizeInput } from '../../../../utils/validation';

export interface ValidationResult {
  isValid: boolean;
  sanitizedData?: any;
  errors: string[];
}

export const validateMessageStanza = (stanza: any): ValidationResult => {
  const errors: string[] = [];
  const sanitizedData: any = {};

  // Validate from JID
  const from = stanza.attrs?.from;
  if (!from || !validateJID(from)) {
    errors.push('Invalid or missing from JID');
  } else {
    sanitizedData.from = sanitizeInput(from);
  }

  // Validate to JID
  const to = stanza.attrs?.to;
  if (!to || !validateJID(to)) {
    errors.push('Invalid or missing to JID');
  } else {
    sanitizedData.to = sanitizeInput(to);
  }

  // Validate message body
  const body = stanza.getChildText('body');
  if (body) {
    if (typeof body !== 'string') {
      errors.push('Message body must be a string');
    } else if (body.length > 10000) { // Reasonable message length limit
      errors.push('Message body too long');
    } else {
      sanitizedData.body = sanitizeInput(body);
    }
  }

  // Validate message type
  const type = stanza.attrs?.type;
  if (type && !['chat', 'groupchat', 'headline', 'normal'].includes(type)) {
    errors.push('Invalid message type');
  } else {
    sanitizedData.type = type || 'chat';
  }

  // Validate message ID
  const id = stanza.attrs?.id;
  if (id) {
    if (typeof id !== 'string' || id.length > 255) {
      errors.push('Invalid message ID');
    } else {
      sanitizedData.id = sanitizeInput(id);
    }
  }

  return {
    isValid: errors.length === 0,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined,
    errors
  };
};

export const validateFileData = (fileData: any): ValidationResult => {
  const errors: string[] = [];
  const sanitizedData: any = {};

  if (!fileData || typeof fileData !== 'object') {
    errors.push('Invalid file data');
    return { isValid: false, errors };
  }

  // Validate file name
  if (!fileData.name || typeof fileData.name !== 'string') {
    errors.push('Invalid or missing file name');
  } else if (fileData.name.length > 255) {
    errors.push('File name too long');
  } else {
    sanitizedData.name = sanitizeInput(fileData.name);
  }

  // Validate file type
  if (!fileData.type || typeof fileData.type !== 'string') {
    errors.push('Invalid or missing file type');
  } else {
    // Allow only safe MIME types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/json'
    ];
    if (!allowedTypes.includes(fileData.type)) {
      errors.push('File type not allowed');
    } else {
      sanitizedData.type = fileData.type;
    }
  }

  // Validate file size
  if (typeof fileData.size !== 'number' || fileData.size < 0) {
    errors.push('Invalid file size');
  } else if (fileData.size > 50 * 1024 * 1024) { // 50MB limit
    errors.push('File size too large');
  } else {
    sanitizedData.size = fileData.size;
  }

  // Validate URL (basic check)
  if (!fileData.url || typeof fileData.url !== 'string') {
    errors.push('Invalid or missing file URL');
  } else if (fileData.url.length > 2048) {
    errors.push('File URL too long');
  } else {
    sanitizedData.url = fileData.url;
  }

  return {
    isValid: errors.length === 0,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined,
    errors
  };
};

export const rateLimitCheck = (userId: string, action: string): boolean => {
  // Simple in-memory rate limiting (in production, use Redis or similar)
  const now = Date.now();
  const key = `${userId}-${action}`;
  
  // Get or create rate limit data
  if (!globalThis.rateLimitData) {
    globalThis.rateLimitData = new Map();
  }
  
  const rateLimitData = globalThis.rateLimitData;
  const userData = rateLimitData.get(key) || { count: 0, resetTime: now + 60000 }; // 1 minute window
  
  // Reset if time window passed
  if (now > userData.resetTime) {
    userData.count = 0;
    userData.resetTime = now + 60000;
  }
  
  // Check limits based on action
  const limits = {
    'send-message': 60, // 60 messages per minute
    'send-file': 10,    // 10 files per minute
    'create-poll': 5    // 5 polls per minute
  };
  
  const limit = limits[action as keyof typeof limits] || 30;
  
  if (userData.count >= limit) {
    return false; // Rate limited
  }
  
  userData.count++;
  rateLimitData.set(key, userData);
  return true;
};
