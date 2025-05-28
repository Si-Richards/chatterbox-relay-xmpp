
import { handleMessageStanza } from './handlers/messageHandler';
import { handlePresenceStanza } from './handlers/presenceHandler';
import { handleIqStanza } from './handlers/iqHandler';

export const createStanzaHandler = (set: any, get: any) => ({
  handleStanza: (stanza: any) => {
    if (stanza.is('message')) {
      handleMessageStanza(stanza, set, get);
    } else if (stanza.is('presence')) {
      handlePresenceStanza(stanza, set, get);
    } else if (stanza.is('iq')) {
      handleIqStanza(stanza, set, get);
    }
  }
});
