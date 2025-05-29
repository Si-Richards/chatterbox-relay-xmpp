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
  isEncrypted?: boolean;
  encryptionType?: 'omemo' | 'pgp';
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

export interface ConnectionHealth {
  isHealthy: boolean;
  lastPing: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  pingInterval: NodeJS.Timeout | null;
  reconnectTimeout: NodeJS.Timeout | null;
  intentionalDisconnect: boolean;
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
  roomRefreshInterval: NodeJS.Timeout | null;
  notificationSettings: NotificationSettings;
  connectionHealth: ConnectionHealth;

  // Connection methods
  connect: (username: string, password: string) => Promise<void>;
  disconnect: () => void;
  setUserStatus: (status: 'online' | 'away' | 'dnd' | 'xa') => void;
  setUserAvatar: (avatarUrl: string) => void;
  fetchServerUsers: () => Promise<{ jid: string; name: string; }[]>;

  // Connection health methods
  startConnectionHealthCheck: () => void;
  stopConnectionHealthCheck: () => void;
  sendPing: () => void;
  handlePingResponse: () => void;
  handleConnectionUnhealthy: () => void;
  attemptReconnect: () => void;
  manualReconnect: () => void;

  // Room refresh methods
  refreshRooms: () => Promise<void>;
  removeDeletedRoomFromList: (roomJid: string) => void;
  syncRoomList: (serverRooms: any[]) => void;
  startPeriodicRoomRefresh: () => void;
  stopPeriodicRoomRefresh: () => void;

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

  // OMEMO methods
  detectOMEMOMessage: (stanza: any) => boolean;
  handleOMEMOMessage: (stanza: any) => { isEncrypted: boolean; fallbackBody?: string };
  encryptMessage: (body: string, recipientJid: string) => Promise<any>;
  isOMEMOSupported: (jid: string) => boolean;
  getOMEMODevices: (jid: string) => any[];
}
