
export interface Contact {
  jid: string;
  name: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  avatar?: string;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
  type: 'chat' | 'groupchat';
  fileData?: {
    name: string;
    type: string;
    size: number;
    url: string;
  };
  reactions?: Array<{
    emoji: string;
    from: string;
  }>;
}

export interface Room {
  jid: string;
  name: string;
  description?: string;
  participants?: Array<string | {
    jid: string;
    nick: string;
    affiliation: string;
    role: string;
  }>;
  isOwner?: boolean;
  avatar?: string;
  affiliations?: Array<{
    jid: string;
    affiliation: string;
    role: string;
    name: string;
  }>;
}

export interface TypingState {
  user: string;
  state: 'composing' | 'paused';
  timestamp: Date;
}
