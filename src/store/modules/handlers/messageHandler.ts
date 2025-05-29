
import { handleMAMMessage } from './mamHandler';
import { handlePollVote, handlePollClose } from './pollHandler';
import { handleChatState } from './chatStateHandler';
import { handleMessageReceipt } from './receiptHandler';
import { handleRegularMessage } from './regularMessageHandler';

export const handleMessageStanza = (stanza: any, set: any, get: any) => {
  // Handle MAM (Message Archive Management) results for message history
  if (handleMAMMessage(stanza, set, get)) return;

  // Handle poll votes
  if (handlePollVote(stanza, set, get)) return;

  // Handle poll close
  if (handlePollClose(stanza, set, get)) return;

  // Handle chat state notifications (typing indicators)
  const chatStateHandled = handleChatState(stanza, set, get);
  const body = stanza.getChildText('body');
  
  // If it's a pure chat state notification (no body), return after handling
  if (chatStateHandled && !body) return;

  // Handle message receipts
  if (handleMessageReceipt(stanza, set, get)) return;

  // Handle regular messages
  handleRegularMessage(stanza, set, get);
};
