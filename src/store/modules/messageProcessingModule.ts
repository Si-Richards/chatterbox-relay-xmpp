interface MessageQueue {
  messages: any[];
  isProcessing: boolean;
  batchTimeout: NodeJS.Timeout | null;
}

interface MessageIndex {
  byId: Map<string, boolean>;
  bySignature: Map<string, boolean>;
}

export const createMessageProcessingModule = (set: any, get: any) => ({
  messageQueue: {
    messages: [],
    isProcessing: false,
    batchTimeout: null,
  } as MessageQueue,

  messageIndex: {
    byId: new Map(),
    bySignature: new Map(),
  } as MessageIndex,

  queueMessage: (stanza: any, type: 'mam' | 'live') => {
    const { messageQueue, processBatch } = get();
    
    messageQueue.messages.push({ stanza, type, timestamp: Date.now() });
    
    // Clear existing timeout
    if (messageQueue.batchTimeout) {
      clearTimeout(messageQueue.batchTimeout);
    }

    // Process immediately if queue is getting large or connection is good
    const { shouldReduceActivity } = get();
    const shouldProcessImmediately = messageQueue.messages.length >= 10 || !shouldReduceActivity();
    
    if (shouldProcessImmediately) {
      processBatch();
    } else {
      // Batch process after short delay for poor connections
      messageQueue.batchTimeout = setTimeout(() => {
        processBatch();
      }, 100);
    }
  },

  processBatch: () => {
    const { messageQueue, processQueuedMessage } = get();
    
    if (messageQueue.isProcessing || messageQueue.messages.length === 0) {
      return;
    }

    set((state: any) => ({
      messageQueue: {
        ...state.messageQueue,
        isProcessing: true,
      }
    }));

    const messagesToProcess = [...messageQueue.messages];
    messageQueue.messages = [];

    // Process messages in order
    messagesToProcess.forEach(queuedMessage => {
      try {
        processQueuedMessage(queuedMessage.stanza, queuedMessage.type);
      } catch (error) {
        console.error('Error processing queued message:', error);
      }
    });

    set((state: any) => ({
      messageQueue: {
        ...state.messageQueue,
        isProcessing: false,
        batchTimeout: null,
      }
    }));
  },

  processQueuedMessage: (stanza: any, type: 'mam' | 'live') => {
    const { messageIndex } = get();
    
    // Fast duplicate detection using message ID
    const messageId = stanza.attrs?.id;
    if (messageId && messageIndex.byId.has(messageId)) {
      return; // Skip duplicate
    }

    // Create message signature for additional duplicate detection
    const from = stanza.attrs?.from;
    const body = stanza.getChildText?.('body');
    const timestamp = type === 'mam' ? 
      stanza.getChild?.('result')?.getChild?.('forwarded')?.getChild?.('delay')?.attrs?.stamp :
      Date.now();
    
    const signature = `${from}:${body}:${timestamp}`;
    if (messageIndex.bySignature.has(signature)) {
      return; // Skip duplicate
    }

    // Add to index
    if (messageId) messageIndex.byId.set(messageId, true);
    messageIndex.bySignature.set(signature, true);

    // Clean up old entries periodically (keep last 1000)
    if (messageIndex.byId.size > 1000) {
      const entries = Array.from(messageIndex.byId.entries());
      const toKeep = entries.slice(-800); // Keep 800 most recent
      messageIndex.byId.clear();
      toKeep.forEach(([key, value]) => messageIndex.byId.set(key, value));
    }

    if (messageIndex.bySignature.size > 1000) {
      const entries = Array.from(messageIndex.bySignature.entries());
      const toKeep = entries.slice(-800);
      messageIndex.bySignature.clear();
      toKeep.forEach(([key, value]) => messageIndex.bySignature.set(key, value));
    }

    // Process the message based on type
    if (type === 'mam') {
      get().handleMAMMessage(stanza);
    } else {
      get().handleRegularMessage(stanza);
    }
  },

  clearMessageIndex: () => {
    const { messageIndex } = get();
    messageIndex.byId.clear();
    messageIndex.bySignature.clear();
  },
});
