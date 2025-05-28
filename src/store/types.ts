
export interface MessageReaction {
  emoji: string;
  users: string[];
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // JIDs of users who voted for this option
}

export interface PollData {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
  isAnonymous: boolean;
  allowMultipleChoice: boolean;
  isClosed: boolean;
  totalVotes: number;
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
  pollData?: PollData;
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

export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  showForDirectMessages: boolean;
  showForGroupMessages: boolean;
  doNotDisturb: boolean;
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
  notificationSettings: NotificationSettings;

  // Connection methods
  connect: (username: string, password: string) => Promise<void>;
  disconnect: () => void;
  setUserStatus: (status: 'online' | 'away' | 'dnd' | 'xa') => void;
  setUserAvatar: (avatarUrl: string) => void;
  fetchServerUsers: () => Promise<{ jid: string; name: string; }[]>;

  // Message methods
  sendMessage: (to: string, body: string, type: 'chat' | 'groupchat') => void;
  sendFileMessage: (to: string, fileData: any, type: 'chat' | 'groupchat') => void;
  sendPoll: (to: string, pollData: {
    question: string;
    options: { text: string }[];
    isAnonymous: boolean;
    allowMultipleChoice: boolean;
    expiresAt?: Date;
  }, type: 'chat' | 'groupchat') => void;
  votePoll: (chatJid: string, messageId: string, pollId: string, optionIds: string[]) => void;
  closePoll: (chatJid: string, messageId: string, pollId: string) => void;
  deleteMessage: (chatJid: string, messageId: string) => void;
  markMessageAsDelivered: (from: string, id: string) => void;
  markMessageAsRead: (from: string, id: string) => void;
  addReaction: (chatJid: string, messageId: string, emoji: string) => void;

  // Presence methods
  addContact: (jid: string) => void;

  // Room methods
  createRoom: (roomName: string, description?: string, isPermanent?: boolean, privacyOptions?: any) => void;
  joinRoom: (roomJid: string) => void;
  deleteRoom: (roomJid: string) => void;
  updateRoomDescription: (roomJid: string, description: string) => void;
  setRoomAvatar: (roomJid: string, avatarUrl: string) => void;
  fetchRoomAffiliations: (roomJid: string) => Promise<void>;
  setRoomAffiliation: (roomJid: string, userJid: string, affiliation: string, role: string) => void;

  // Typing methods
  sendChatState: (to: string, state: 'composing' | 'active' | 'paused' | 'inactive' | 'gone', type: 'chat' | 'groupchat') => void;
  setChatState: (chatJid: string, userJid: string, state: 'composing' | 'paused') => void;
  clearTypingState: (chatJid: string, userJid?: string) => void;
  setCurrentUserTyping: (chatJid: string, isTyping: boolean) => void;

  // UI methods
  setActiveChat: (chatJid: string, type: 'chat' | 'groupchat') => void;
  setContactSortMethod: (method: 'newest' | 'alphabetical') => void;
  setRoomSortMethod: (method: 'newest' | 'alphabetical') => void;

  // Stanza handler
  handleStanza: (stanza: any) => void;

  // Notification methods
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
}
