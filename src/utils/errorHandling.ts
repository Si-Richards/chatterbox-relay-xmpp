
import { toast } from '@/hooks/use-toast';

export interface AppError {
  code: string;
  message: string;
  details?: string;
  retryable?: boolean;
}

export const createError = (code: string, message: string, details?: string, retryable = false): AppError => ({
  code,
  message,
  details,
  retryable
});

export const handleXMPPError = (error: unknown, context: string): void => {
  console.error(`XMPP Error in ${context}:`, error);
  
  let errorMessage = 'An unexpected error occurred';
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }
  
  toast({
    title: "Connection Error",
    description: `${context}: ${errorMessage}`,
    variant: "destructive"
  });
};

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
  
  throw lastError;
};
