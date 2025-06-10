
import { handleMessageStanza } from './handlers/messageHandler';
import { handlePresenceStanza } from './handlers/presenceHandler';
import { handleIqStanza } from './handlers/iqHandler';

interface StanzaQueue {
  high: any[];
  normal: any[];
  low: any[];
  isProcessing: boolean;
}

export const createStanzaHandler = (set: any, get: any) => ({
  stanzaQueue: {
    high: [],
    normal: [],
    low: [],
    isProcessing: false,
  } as StanzaQueue,

  handleStanza: (stanza: any) => {
    const { prioritizeStanza, processStanzaQueue } = get();
    const priority = prioritizeStanza(stanza);
    
    const { stanzaQueue } = get();
    stanzaQueue[priority].push(stanza);
    
    // Process immediately for high priority or if queue is getting large
    if (priority === 'high' || getTotalQueueSize(stanzaQueue) >= 20) {
      processStanzaQueue();
    } else {
      // Batch process low priority stanzas
      setTimeout(() => processStanzaQueue(), 50);
    }
  },

  prioritizeStanza: (stanza: any): 'high' | 'normal' | 'low' => {
    // High priority: ping responses, direct messages, presence updates
    if (stanza.is('iq')) {
      if (stanza.attrs.id?.startsWith('ping-') || 
          stanza.attrs.type === 'result' || 
          stanza.attrs.type === 'error') {
        return 'high';
      }
      return 'normal';
    }

    if (stanza.is('message')) {
      const type = stanza.attrs.type;
      const body = stanza.getChildText('body');
      
      // Direct messages and important system messages
      if (type === 'chat' && body) {
        return 'high';
      }
      
      // Group messages with body
      if (type === 'groupchat' && body) {
        return 'normal';
      }
      
      // MAM results and other message types
      return 'normal';
    }

    if (stanza.is('presence')) {
      // Important presence updates (online/offline)
      if (stanza.attrs.type === 'unavailable' || !stanza.attrs.type) {
        return 'normal';
      }
      return 'low';
    }

    return 'low';
  },

  processStanzaQueue: () => {
    const { stanzaQueue } = get();
    
    if (stanzaQueue.isProcessing) {
      return;
    }

    set((state: any) => ({
      stanzaQueue: {
        ...state.stanzaQueue,
        isProcessing: true,
      }
    }));

    // Process in priority order: high -> normal -> low
    const allStanzas = [
      ...stanzaQueue.high.splice(0),
      ...stanzaQueue.normal.splice(0, 10), // Limit normal processing
      ...stanzaQueue.low.splice(0, 5)      // Limit low priority processing
    ];

    allStanzas.forEach(stanza => {
      try {
        processStanzaImmediate(stanza, get);
      } catch (error) {
        console.error('Error processing stanza:', error, stanza);
      }
    });

    set((state: any) => ({
      stanzaQueue: {
        ...state.stanzaQueue,
        isProcessing: false,
      }
    }));

    // Schedule next batch if there are remaining stanzas
    const remainingStanzas = getTotalQueueSize(get().stanzaQueue);
    if (remainingStanzas > 0) {
      setTimeout(() => get().processStanzaQueue(), 100);
    }
  },
});

const processStanzaImmediate = (stanza: any, get: any) => {
  if (stanza.is('message')) {
    handleMessageStanza(stanza, get().set, get);
  } else if (stanza.is('presence')) {
    handlePresenceStanza(stanza, get().set, get);
  } else if (stanza.is('iq')) {
    handleIqStanza(stanza, get().set, get);
  }
};

const getTotalQueueSize = (queue: StanzaQueue): number => {
  return queue.high.length + queue.normal.length + queue.low.length;
};
