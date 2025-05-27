
// Proper TypeScript interfaces for XMPP types
export interface XMPPStanza {
  name: string;
  attrs: Record<string, string>;
  children: (XMPPStanza | string)[];
  getChild: (name: string, xmlns?: string) => XMPPStanza | null;
  getChildren: (name: string, xmlns?: string) => XMPPStanza[];
  getChildText: (name: string, xmlns?: string) => string | null;
  is: (name: string, xmlns?: string) => boolean;
}

export interface XMPPClient {
  send: (stanza: XMPPStanza) => void;
  on: (event: string, handler: Function) => void;
  off: (event: string, handler: Function) => void;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export interface XMPPMessage extends XMPPStanza {
  attrs: {
    from: string;
    to: string;
    type?: 'chat' | 'groupchat' | 'normal';
    id?: string;
  };
}

export interface XMPPPresence extends XMPPStanza {
  attrs: {
    from: string;
    to?: string;
    type?: 'available' | 'unavailable' | 'subscribe' | 'unsubscribe';
  };
}

export interface XMPPIQ extends XMPPStanza {
  attrs: {
    from?: string;
    to?: string;
    type: 'get' | 'set' | 'result' | 'error';
    id: string;
  };
}
