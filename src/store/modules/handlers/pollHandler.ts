
import { Message } from '../../types';

export const handlePollVote = (stanza: any, set: any, get: any) => {
  const pollVote = stanza.getChild('poll-vote', 'urn:xmpp:poll');
  if (!pollVote) return false;

  const messageId = pollVote.attrs.messageId;
  const pollId = pollVote.attrs.pollId;
  const voter = pollVote.attrs.voter;
  const optionIds = pollVote.getChildren('option').map((opt: any) => opt.attrs.id);
  const type = stanza.attrs.type || 'chat';
  const from = stanza.attrs.from;
  
  const chatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
  
  set((state: any) => {
    const chatMessages = state.messages[chatJid] || [];
    const updatedMessages = chatMessages.map((msg: Message) => {
      if (msg.id === messageId && msg.pollData) {
        const updatedPoll = { ...msg.pollData };
        
        // Remove voter's previous votes
        updatedPoll.options = updatedPoll.options.map(opt => ({
          ...opt,
          votes: opt.votes.filter(v => v !== voter)
        }));
        
        // Add new votes
        updatedPoll.options = updatedPoll.options.map(opt => ({
          ...opt,
          votes: optionIds.includes(opt.id) 
            ? [...opt.votes, voter]
            : opt.votes
        }));
        
        // Recalculate total votes
        const allVoters = new Set();
        updatedPoll.options.forEach(opt => {
          opt.votes.forEach(v => allVoters.add(v));
        });
        updatedPoll.totalVotes = allVoters.size;
        
        return { ...msg, pollData: updatedPoll };
      }
      return msg;
    });
    
    return {
      messages: {
        ...state.messages,
        [chatJid]: updatedMessages
      }
    };
  });

  return true;
};

export const handlePollClose = (stanza: any, set: any, get: any) => {
  const pollClose = stanza.getChild('poll-close', 'urn:xmpp:poll');
  if (!pollClose) return false;

  const messageId = pollClose.attrs.messageId;
  const type = stanza.attrs.type || 'chat';
  const from = stanza.attrs.from;
  const chatJid = type === 'groupchat' ? from.split('/')[0] : from.split('/')[0];
  
  set((state: any) => {
    const chatMessages = state.messages[chatJid] || [];
    const updatedMessages = chatMessages.map((msg: Message) => {
      if (msg.id === messageId && msg.pollData) {
        return {
          ...msg,
          pollData: { ...msg.pollData, isClosed: true }
        };
      }
      return msg;
    });
    
    return {
      messages: {
        ...state.messages,
        [chatJid]: updatedMessages
      }
    };
  });

  return true;
};
