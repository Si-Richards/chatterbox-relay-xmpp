import { create } from 'zustand';
import { xml, jid } from '@xmpp/client';
import { Stanza } from '@xmpp/core';

interface Room {
  jid: string;
  name: string;
  description?: string;
  isPermanent: boolean;
  isOwner: boolean;
  isPrivate?: boolean;
  hasPassword?: boolean;
  avatar?: string;
  affiliations?: Array<{
    jid: string;
    name: string;
    affiliation: string;
    role: string;
  }>;
}

interface Message {
  from: string;
  body: string;
  time: Date;
  type: 'chat' | 'groupchat';
}

interface XMPPState {
  isConnected: boolean;
  client: any;
  userJid: string | null;
  messages: Message[];
  rooms: Room[];
  currentRoomJid: string | null;
  nickname: string | null;
}

interface XMPPStore extends XMPPState {
  connect: (jid: string, password: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (to: string, body: string, type?: 'chat' | 'groupchat') => void;
  joinRoom: (roomJid: string, nickname: string, password?: string) => void;
  leaveRoom: (roomJid: string) => void;
  createRoom: (roomName: string, description: string, options: {
    isPermanent: boolean;
    isPrivate: boolean;
    hasPassword: boolean;
    password?: string;
  }) => void;
  deleteRoom: (roomJid: string) => void;
  fetchRoomAffiliations: (roomJid: string) => void;
  setRoomAffiliation: (roomJid: string, userJid: string, affiliation: string) => void;
  updateRoomSettings: (roomJid: string, settings: Record<string, any>) => void;
}

export const useXMPPStore = create<XMPPStore>((set, get) => ({
  isConnected: false,
  client: null,
  userJid: null,
  messages: [],
  rooms: [],
  currentRoomJid: null,
  nickname: null,
  connect: async (jid: string, password: string) => {
    const { Client } = await import('@xmpp/client');
    const client = new Client();

    client.on('error', err => {
      console.error('XMPP error:', err);
    });

    client.on('offline', () => {
      set({ isConnected: false, client: null, userJid: null });
    });

    client.on('stanza', (stanza: Stanza) => {
      console.log('Incoming stanza:', stanza.toString());
      if (stanza.is('message')) {
        const from = stanza.attrs.from;
        const body = stanza.getChildText('body');
        const type = stanza.attrs.type === 'groupchat' ? 'groupchat' : 'chat';

        if (from && body) {
          set((state) => ({
            messages: [...state.messages, { from, body, time: new Date(), type }],
          }));
        }
      } else if (stanza.is('presence')) {
        // Handle presence stanzas for room join/leave events
        const from = stanza.attrs.from;
        const type = stanza.attrs.type; // "unavailable" indicates leave

        if (from && type === 'unavailable') {
          // User left the room, update the state
          const roomJid = from.split('/')[0];
          set((state) => ({
            rooms: state.rooms.filter(room => room.jid !== roomJid),
          }));
        }
      }
    });

    try {
      await client.start({
        service: 'xmpp://localhost:5280',
        domain: 'localhost',
        username: jid.split('@')[0],
        password: password
      });

      set({ isConnected: true, client: client, userJid: jid });

      client.send(xml('presence', {})); // Send initial presence
    } catch (err) {
      console.error('XMPP connection error:', err);
      set({ isConnected: false, client: null, userJid: null });
      throw err;
    }
  },
  disconnect: () => {
    const { client } = get();
    if (client) {
      client.stop().then(() => {
        set({ isConnected: false, client: null, userJid: null });
      });
    }
  },
  sendMessage: (to: string, body: string, type = 'chat') => {
    const { isConnected, client, userJid } = get();
    if (!isConnected || !client || !userJid) return;

    const message = xml('message', { to, type, from: userJid },
      xml('body', {}, body)
    );
    client.send(message);

    set((state) => ({
      messages: [...state.messages, { from: userJid, body, time: new Date(), type }],
    }));
  },
  joinRoom: (roomJid: string, nickname: string, password?: string) => {
    const { isConnected, client, userJid } = get();
    if (!isConnected || !client || !userJid) return;

    const presence = xml('presence', {
      to: `${roomJid}/${nickname}`,
    },
      xml('x', { xmlns: 'http://jabber.org/protocol/muc' },
        password ? xml('password', {}, password) : null
      )
    );

    client.send(presence);

    set({ currentRoomJid: roomJid, nickname: nickname });
  },
  leaveRoom: (roomJid: string) => {
    const { isConnected, client } = get();
    if (!isConnected || !client) return;

    const presence = xml('presence', {
      to: roomJid,
      type: 'unavailable'
    });

    client.send(presence);
    set({ currentRoomJid: null, nickname: null });
  },
  createRoom: (roomName: string, description: string, options) => {
    const { isConnected, client, userJid } = get();
    if (!isConnected || !client || !userJid) return;

    const domain = userJid.split('@')[1];
    const roomJid = `${roomName}@conference.${domain}`;
    const nickname = userJid.split('@')[0];

    // Join the room first
    const presence = xml('presence', {
      to: `${roomJid}/${nickname}`,
    }, xml('x', { xmlns: 'http://jabber.org/protocol/muc' }));

    client.send(presence);

    // Configure the room
    setTimeout(() => {
      const configForm = xml('iq', {
        type: 'set',
        to: roomJid,
      }, xml('query', { xmlns: 'http://jabber.org/protocol/muc#owner' },
        xml('x', { xmlns: 'jabber:x:data', type: 'submit' },
          xml('field', { var: 'FORM_TYPE' },
            xml('value', {}, 'http://jabber.org/protocol/muc#roomconfig')
          ),
          xml('field', { var: 'muc#roomconfig_roomname' },
            xml('value', {}, roomName)
          ),
          xml('field', { var: 'muc#roomconfig_roomdesc' },
            xml('value', {}, description)
          ),
          xml('field', { var: 'muc#roomconfig_persistentroom' },
            xml('value', {}, options.isPermanent ? '1' : '0')
          ),
          xml('field', { var: 'muc#roomconfig_membersonly' },
            xml('value', {}, options.isPrivate ? '1' : '0')
          ),
          xml('field', { var: 'muc#roomconfig_publicroom' },
            xml('value', {}, options.isPrivate ? '0' : '1')
          ),
          xml('field', { var: 'muc#roomconfig_passwordprotectedroom' },
            xml('value', {}, options.hasPassword ? '1' : '0')
          ),
          ...(options.hasPassword && options.password ? [
            xml('field', { var: 'muc#roomconfig_roomsecret' },
              xml('value', {}, options.password)
            )
          ] : [])
        )
      ));

      client.send(configForm);
    }, 1000);

    // Add to rooms list
    set((state) => ({
      rooms: [...state.rooms, {
        jid: roomJid,
        name: roomName,
        description,
        isPermanent: options.isPermanent,
        isOwner: true,
        isPrivate: options.isPrivate,
        hasPassword: options.hasPassword
      }]
    }));
  },
  deleteRoom: (roomJid: string) => {
    const { isConnected, client } = get();
    if (!isConnected || !client) return;

    // Send a destroy message to the room
    const destroyIQ = xml('iq', {
      type: 'set',
      to: roomJid,
    },
      xml('query', { xmlns: 'http://jabber.org/protocol/muc#owner' },
        xml('destroy', {})
      )
    );

    client.send(destroyIQ);

    // Remove the room from the local state
    set((state) => ({
      rooms: state.rooms.filter(room => room.jid !== roomJid),
    }));
  },
  fetchRoomAffiliations: async (roomJid: string) => {
    const { isConnected, client } = get();
    if (!isConnected || !client) return;

    // Fetch affiliations using disco#items
    const discoItemsIQ = xml('iq', {
      type: 'get',
      to: roomJid,
    },
      xml('query', { xmlns: 'http://jabber.org/protocol/disco#items' })
    );

    try {
      const result = await client.sendReceive<Stanza>(discoItemsIQ);

      if (result) {
        // Extract affiliations from the result
        const items = result.getChild('query', 'http://jabber.org/protocol/disco#items')?.getChildren('item');
        const affiliations = items?.map(item => ({
          jid: item.attrs.jid,
          name: item.attrs.name || item.attrs.jid,
          affiliation: 'none', // Default affiliation
          role: 'none' // Default role
        })) || [];

        // Fetch roles and affiliations using muc#admin
        const adminIQ = xml('iq', {
          type: 'get',
          to: roomJid,
        },
          xml('query', { xmlns: 'http://jabber.org/protocol/muc#admin' },
            xml('item', { affiliation: 'owner' }),
            xml('item', { affiliation: 'admin' }),
            xml('item', { affiliation: 'member' }),
            xml('item', { affiliation: 'outcast' })
          )
        );

        const adminResult = await client.sendReceive<Stanza>(adminIQ);

        if (adminResult) {
          const adminItems = adminResult.getChild('query', 'http://jabber.org/protocol/muc#admin')?.getChildren('item');

          const updatedAffiliations = affiliations.map(affiliation => {
            const adminItem = adminItems?.find(item => item.attrs.jid === affiliation.jid);
            if (adminItem) {
              return {
                ...affiliation,
                affiliation: adminItem.attrs.affiliation,
                role: adminItem.attrs.role || 'participant'
              };
            }
            return affiliation;
          });

          // Update the room state with affiliations
          set((state) => ({
            rooms: state.rooms.map(room =>
              room.jid === roomJid ? { ...room, affiliations: updatedAffiliations } : room
            )
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching room affiliations:', error);
    }
  },
  setRoomAffiliation: (roomJid: string, userJid: string, affiliation: string) => {
    const { isConnected, client } = get();
    if (!isConnected || !client) return;

    // Set affiliation using muc#admin
    const affiliationIQ = xml('iq', {
      type: 'set',
      to: roomJid,
    },
      xml('query', { xmlns: 'http://jabber.org/protocol/muc#admin' },
        xml('item', { jid: userJid, affiliation })
      )
    );

    client.send(affiliationIQ);

    // Update local state
    set((state) => ({
      rooms: state.rooms.map(room => {
        if (room.jid === roomJid) {
          const updatedAffiliations = room.affiliations?.map(aff =>
            aff.jid === userJid ? { ...aff, affiliation } : aff
          ) || [];
          return { ...room, affiliations: updatedAffiliations };
        }
        return room;
      })
    }));
  },
  updateRoomSettings: (roomJid: string, settings: Record<string, any>) => {
    const { isConnected, client } = get();
    if (!isConnected || !client) return;

    // Send room configuration update
    const configForm = xml('iq', {
      type: 'set',
      to: roomJid,
    }, xml('query', { xmlns: 'http://jabber.org/protocol/muc#owner' },
      xml('x', { xmlns: 'jabber:x:data', type: 'submit' },
        xml('field', { var: 'FORM_TYPE' },
          xml('value', {}, 'http://jabber.org/protocol/muc#roomconfig')
        ),
        ...Object.entries(settings).map(([key, value]) => {
          const fieldVar = key.startsWith('muc#roomconfig_') ? key : `muc#roomconfig_${key}`;
          return xml('field', { var: fieldVar },
            xml('value', {}, typeof value === 'boolean' ? (value ? '1' : '0') : String(value))
          );
        })
      )
    ));

    client.send(configForm);

    // Update local room state
    set((state) => ({
      rooms: state.rooms.map(room => 
        room.jid === roomJid 
          ? { 
              ...room, 
              isPrivate: settings.members_only || room.isPrivate,
              hasPassword: settings.password_protected || room.hasPassword
            }
          : room
      )
    }));
  },
}));
