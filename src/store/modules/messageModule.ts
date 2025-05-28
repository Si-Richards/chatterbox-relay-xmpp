import { xml } from '@xmpp/client';
import { Message, PollData } from '../types';
import { toast } from '@/hooks/use-toast';

export const createMessageModule = (set: any, get: any) => ({
  sendMessage: (to: string, body: string, type: 'chat' | 'groupchat') => {
    const { client, currentUser } = get();
    if (!client || !body.trim()) return;

    const messageId = `msg-${Date.now()}`;
    const message = xml(
      'message',
      { to, type, id: messageId },
      xml('body', {}, body.trim()),
      xml('request', { xmlns: 'urn:xmpp:receipts' }),
      xml('active', { xmlns: 'http://jabber.org/protocol/chatstates' })
    );

    client.send(message);

    const sendChatJid = type === 'groupchat' ? to : to.split('/')[0];
    get().setCurrentUserTyping(sendChatJid, false);

    const newMessage: Message = {
      id: messageId,
      from: currentUser,
      to,
      body: body.trim(),
      timestamp: new Date(),
      type,
      status: 'sent'
    };

    set((state: any) => ({
      messages: {
        ...state.messages,
        [sendChatJid]: [...(state.messages[sendChatJid] || []), newMessage]
      }
    }));
  },
  
  sendFileMessage: (to: string, fileData: any, type: 'chat' | 'groupchat') => {
    const { client, currentUser } = get();
    if (!client) return;

    const messageId = `msg-${Date.now()}`;
    
    const message = xml(
      'message',
      { to, type, id: messageId },
      xml('body', {}, `Shared ${fileData.type.startsWith('image/') ? 'an image' : 'a file'}: ${fileData.name}`),
      xml('file', { 
        xmlns: 'urn:xmpp:file-transfer',
        name: fileData.name,
        type: fileData.type,
        size: fileData.size.toString(),
        url: fileData.url
      })
    );

    client.send(message);

    const newMessage: Message = {
      id: messageId,
      from: currentUser,
      to,
      body: `Shared ${fileData.type.startsWith('image/') ? 'an image' : 'a file'}: ${fileData.name}`,
      timestamp: new Date(),
      type,
      status: 'sent',
      fileData
    };

    const fileChatJid = type === 'groupchat' ? to : to.split('/')[0];
    
    set((state: any) => ({
      messages: {
        ...state.messages,
        [fileChatJid]: [...(state.messages[fileChatJid] || []), newMessage]
      }
    }));
  },

  sendPoll: (to: string, pollData: Omit<PollData, 'id' | 'createdBy' | 'createdAt' | 'totalVotes'>, type: 'chat' | 'groupchat') => {
    const { client, currentUser } = get();
    if (!client) return;

    const messageId = `msg-${Date.now()}`;
    const pollId = `poll-${Date.now()}`;
    
    const fullPollData: PollData = {
      ...pollData,
      id: pollId,
      createdBy: currentUser,
      createdAt: new Date(),
      totalVotes: 0,
      options: pollData.options.map((opt, index) => ({
        id: `opt-${index}`,
        text: opt.text,
        votes: []
      }))
    };

    const message = xml(
      'message',
      { to, type, id: messageId },
      xml('body', {}, `📊 Poll: ${pollData.question}`),
      xml('poll', { 
        xmlns: 'urn:xmpp:poll',
        id: pollId,
        question: pollData.question,
        anonymous: pollData.isAnonymous.toString(),
        multiple: pollData.allowMultipleChoice.toString(),
        expires: pollData.expiresAt?.toISOString() || '',
        closed: 'false'
      }, ...fullPollData.options.map(opt => 
        xml('option', { id: opt.id }, opt.text)
      ))
    );

    client.send(message);

    const newMessage: Message = {
      id: messageId,
      from: currentUser,
      to,
      body: `📊 Poll: ${pollData.question}`,
      timestamp: new Date(),
      type,
      status: 'sent',
      pollData: fullPollData
    };

    const pollChatJid = type === 'groupchat' ? to : to.split('/')[0];
    
    set((state: any) => ({
      messages: {
        ...state.messages,
        [pollChatJid]: [...(state.messages[pollChatJid] || []), newMessage]
      }
    }));
  },

  votePoll: (chatJid: string, messageId: string, pollId: string, optionIds: string[]) => {
    const { client, currentUser } = get();
    if (!client) return;

    // Send vote message
    const voteMessage = xml(
      'message',
      { to: chatJid, type: get().activeChatType },
      xml('poll-vote', {
        xmlns: 'urn:xmpp:poll',
        messageId,
        pollId,
        voter: currentUser
      }, ...optionIds.map(id => xml('option', { id })))
    );

    client.send(voteMessage);

    // Update local state
    set((state: any) => {
      const chatMessages = state.messages[chatJid] || [];
      const updatedMessages = chatMessages.map((msg: Message) => {
        if (msg.id === messageId && msg.pollData) {
          const updatedPoll = { ...msg.pollData };
          
          // Remove user's previous votes
          updatedPoll.options = updatedPoll.options.map(opt => ({
            ...opt,
            votes: opt.votes.filter(voter => voter !== currentUser)
          }));
          
          // Add new votes
          updatedPoll.options = updatedPoll.options.map(opt => ({
            ...opt,
            votes: optionIds.includes(opt.id) 
              ? [...opt.votes, currentUser]
              : opt.votes
          }));
          
          // Recalculate total votes
          const allVoters = new Set();
          updatedPoll.options.forEach(opt => {
            opt.votes.forEach(voter => allVoters.add(voter));
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
  },

  closePoll: (chatJid: string, messageId: string, pollId: string) => {
    const { client } = get();
    if (!client) return;

    const closeMessage = xml(
      'message',
      { to: chatJid, type: get().activeChatType },
      xml('poll-close', {
        xmlns: 'urn:xmpp:poll',
        messageId,
        pollId
      })
    );

    client.send(closeMessage);

    // Update local state
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
  },
  
  deleteMessage: (chatJid: string, messageId: string) => {
    const { messages, currentUser, client, activeChatType } = get();
    const chatMessages = messages[chatJid] || [];
    const messageIndex = chatMessages.findIndex((msg: Message) => msg.id === messageId);
    
    if (messageIndex === -1) return;
    
    const message = chatMessages[messageIndex];
    
    if (message.from !== currentUser && !message.from.includes(currentUser.split('@')[0])) {
      console.log('Cannot delete messages from other users');
      return;
    }
    
    if (activeChatType === 'groupchat' && client) {
      const retraction = xml(
        'message',
        { to: chatJid, type: 'groupchat' },
        xml('apply-to', { xmlns: 'urn:xmpp:fasten:0', id: messageId },
          xml('retract', { xmlns: 'urn:xmpp:message-retract:0' })
        )
      );
      client.send(retraction);
    }
    
    set((state: any) => ({
      messages: {
        ...state.messages,
        [chatJid]: state.messages[chatJid].filter((msg: Message) => msg.id !== messageId)
      }
    }));
  },

  markMessageAsDelivered: (from: string, id: string) => {
    const { client } = get();
    if (!client || !id) return;
    
    const receipt = xml(
      'message',
      { to: from, id: `receipt-${id}` },
      xml('received', { xmlns: 'urn:xmpp:receipts', id })
    );
    
    client.send(receipt);
  },
  
  markMessageAsRead: (from: string, id: string) => {
    const { client } = get();
    if (!client || !id) return;
    
    const receipt = xml(
      'message',
      { to: from, id: `read-${id}` },
      xml('read', { xmlns: 'urn:xmpp:receipts', id })
    );
    
    client.send(receipt);
    
    const fromJid = from.split('/')[0];
    
    set((state: any) => ({
      messages: {
        ...state.messages,
        [fromJid]: (state.messages[fromJid] || []).map((msg: Message) => 
          msg.id === id ? { ...msg, status: 'read' } : msg
        )
      }
    }));
  },

  addReaction: (chatJid: string, messageId: string, emoji: string) => {
    const { currentUser } = get();
    
    set((state: any) => {
      const chatMessages = state.messages[chatJid] || [];
      const updatedMessages = chatMessages.map((msg: Message) => {
        if (msg.id === messageId) {
          const reactions = msg.reactions || [];
          const existingReaction = reactions.find(r => r.emoji === emoji);
          
          if (existingReaction) {
            if (existingReaction.users.includes(currentUser)) {
              existingReaction.users = existingReaction.users.filter(u => u !== currentUser);
              if (existingReaction.users.length === 0) {
                return {
                  ...msg,
                  reactions: reactions.filter(r => r.emoji !== emoji)
                };
              }
            } else {
              existingReaction.users.push(currentUser);
            }
            return { ...msg, reactions };
          } else {
            return {
              ...msg,
              reactions: [...reactions, { emoji, users: [currentUser] }]
            };
          }
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
  },

  setActiveChat: (jid: string, type: 'chat' | 'groupchat') => {
    set({ activeChat: jid, activeChatType: type });
    
    const { messages } = get();
    const chatMessages = messages[jid] || [];
    
    if (chatMessages.length > 0) {
      set((state: any) => ({
        messages: {
          ...state.messages,
          [jid]: state.messages[jid].map((msg: Message) => 
            msg.from !== state.currentUser ? { ...msg, status: 'read' } : msg
          )
        }
      }));
      
      const { client } = get();
      if (client && type === 'chat') {
        chatMessages.forEach((msg: Message) => {
          if (msg.from !== get().currentUser && msg.id) {
            const receipt = xml(
              'message',
              { to: msg.from, id: `read-${msg.id}` },
              xml('read', { xmlns: 'urn:xmpp:receipts', id: msg.id })
            );
            client.send(receipt);
          }
        });
      }
    }
  },

  setContactSortMethod: (method: 'newest' | 'alphabetical') => {
    set({ contactSortMethod: method });
  },

  setRoomSortMethod: (method: 'newest' | 'alphabetical') => {
    set({ roomSortMethod: method });
  }
});
