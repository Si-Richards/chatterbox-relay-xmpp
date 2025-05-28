
export interface MessageReaction {
  emoji: string;
  users: string[];
}

export interface Message {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  type: 'chat' | 'groupchat';
  status?: 'sent' | 'delivered' | 'read';
  reactions?: MessageReaction[];
  fileData?: {
    name: string;
    type: string;
    size: number;
    url: string;
  };
}

export interface Contact {
  jid: string;
  name: string;
  presence: 'online' | 'offline' | 'away' | 'dnd' | 'xa';
  avatar?: string;
  lastSeen?: Date;
}

export interface RoomAffiliation {
  jid: string;
  name: string;
  affiliation: 'owner' | 'admin' | 'member' | 'none';
  role: 'moderator' | 'participant' | 'visitor' | 'none';
}

export interface Room {
  jid: string;
  name: string;
  description?: string;
  participants: string[];
  isOwner?: boolean;
  isPermanent?: boolean;
  affiliations?: RoomAffiliation[];
  avatar?: string;
}

export interface TypingState {
  user: string;
  chatJid: string;
  timestamp: Date;
  state: 'composing' | 'paused';
}

export interface XMPPState {
  client: any;
  isConnected: boolean;
  currentUser: string;
  contacts: Contact[];
  rooms: Room[];
  messages: Record<string, Message[]>;
  activeChat: string | null;
  activeChatType: 'chat' | 'groupchat' | null;
  userStatus: 'online' | 'away' | 'dnd' | 'xa';
  userAvatar: string | null;
  contactSortMethod: 'newest' | 'alphabetical';
  roomSortMethod: 'newest' | 'alphabetical';
  typingStates: Record<string, TypingState[]>;
  currentUserTyping: Record<string, boolean>;
}
