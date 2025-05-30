
import { Message } from '../../../types';

export const isMessageBlocked = (
  from: string,
  chatJid: string,
  blockedContacts: string[]
): boolean => {
  const senderBareJid = from.split('/')[0];
  return blockedContacts.includes(senderBareJid) || blockedContacts.includes(chatJid);
};

export const isDuplicateMessage = (
  message: Message,
  existingMessages: Message[]
): boolean => {
  return existingMessages.some((msg: Message) => 
    msg.id === message.id || 
    (msg.body === message.body && 
     msg.from === message.from && 
     Math.abs(new Date(msg.timestamp).getTime() - message.timestamp.getTime()) < 1000)
  );
};
