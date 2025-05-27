
// Input validation utilities for security
export const validateJID = (jid: string): boolean => {
  if (!jid || typeof jid !== 'string') return false;
  
  // Basic JID format validation: localpart@domainpart[/resourcepart]
  const jidRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/[a-zA-Z0-9._-]+)?$/;
  
  // Check length constraints
  if (jid.length > 3071) return false; // RFC 6122 limit
  
  // Check for dangerous characters
  const dangerousChars = ['<', '>', '"', "'", '&', '\0', '\n', '\r'];
  if (dangerousChars.some(char => jid.includes(char))) return false;
  
  return jidRegex.test(jid);
};

export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/['"]/g, '') // Remove quotes
    .slice(0, 1000); // Limit length
};

export const validateRoomName = (name: string): boolean => {
  if (!name || typeof name !== 'string') return false;
  
  // Room name constraints
  if (name.length < 1 || name.length > 100) return false;
  
  // Only allow alphanumeric, hyphens, underscores
  const roomNameRegex = /^[a-zA-Z0-9_-]+$/;
  return roomNameRegex.test(name);
};

export const validateAffiliation = (affiliation: string): boolean => {
  const validAffiliations = ['owner', 'admin', 'member', 'none'];
  return validAffiliations.includes(affiliation);
};
