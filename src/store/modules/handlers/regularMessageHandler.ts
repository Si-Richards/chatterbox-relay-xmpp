
import { Message } from '../../types';

export const handleRegularMessage = (stanza: any, set: any, get: any) => {
  const from = stanza.attrs.from;
  const to = stanza.attrs.to;
  const body = stanza.getChildText('body');
  const type = stanza.attrs.type || 'chat';
  const id = stanza.attrs.id || `msg-${Date.now()}`;
  const currentUser = get().currentUser;

  // Skip if no body content
  if (!body) return;

  let chatJid: string;
  let fromJid: string;

  if (type === 'groupchat') {
    chatJid = from.split('/')[0];
    fromJid = from;
    
    // Skip messages from current user in group chats
    const nickname = from.split('/')[1];
    const currentUserNickname = currentUser.split('@')[0];
    if (nickname === currentUserNickname) {
      console.log(`Skipping message from current user: ${nickname}`);
      return;
    }
  } else {
    chatJid = from.split('/')[0];
    fromJid = from.split('/')[0];
    
    // Skip messages from current user in direct chats
    const currentUserBareJid = currentUser.split('/')[0];
    if (chatJid === currentUserBareJid) {
      console.log(`Skipping message from current user in direct chat: ${chatJid}`);
      return;
    }
  }

  // Check for OMEMO encryption
  const encrypted = stanza.getChild('encrypted', 'eu.siacs.conversations.axolotl');
  const isEncrypted = !!encrypted;
  
  // Check for file attachments with better error handling
  let fileData = null;
  const oobUrl = stanza.getChild('x', 'jabber:x:oob');
  if (oobUrl) {
    const url = oobUrl.getChildText('url');
    const desc = oobUrl.getChildText('desc') || 'File';
    
    console.log('Processing file attachment:', { url, desc });
    
    if (url) {
      // Determine file type from URL or description
      let fileType = 'application/octet-stream';
      let fileName = desc;
      
      if (url.includes('.gif') || desc.toLowerCase().includes('gif')) {
        fileType = 'image/gif';
        fileName = fileName || 'animated.gif';
        console.log('Detected GIF file:', url);
      } else if (url.match(/\.(jpg|jpeg|png|webp)$/i)) {
        fileType = `image/${url.split('.').pop()?.toLowerCase()}`;
        fileName = fileName || `image.${url.split('.').pop()}`;
      }
      
      fileData = {
        name: fileName,
        type: fileType,
        size: 0,
        url: url
      };
      
      // Add error handling for image loading
      if (fileType.startsWith('image/')) {
        // Test if the image URL is accessible
        const testImage = new Image();
        testImage.onload = () => {
          console.log('Image loaded successfully:', url);
        };
        testImage.onerror = () => {
          console.error('Failed to load image:', url);
          // Could update the message to show an error state
        };
        testImage.src = url;
      }
    }
  }

  const message: Message = {
    id,
    from: fromJid,
    to,
    body: isEncrypted ? 'This message was encrypted but could not be decrypted.' : body,
    timestamp: new Date(),
    type,
    fileData,
    isEncrypted,
    status: 'delivered'
  };

  console.log('Adding regular message:', {
    chatJid,
    messageId: id,
    hasFileData: !!fileData,
    fileType: fileData?.type,
    isEncrypted
  });

  set((state: any) => ({
    messages: {
      ...state.messages,
      [chatJid]: [...(state.messages[chatJid] || []), message]
    }
  }));

  // Send delivery receipt for incoming messages (but not for group chats from ourselves)
  const { client } = get();
  if (client && id && type !== 'groupchat') {
    const receipt = stanza.clone();
    receipt.attrs.to = receipt.attrs.from;
    receipt.attrs.from = receipt.attrs.to;
    receipt.attrs.id = `receipt-${Date.now()}`;
    receipt.children = [
      {
        name: 'received',
        attrs: { xmlns: 'urn:xmpp:receipts', id: id },
        children: []
      }
    ];
    
    console.log('Sending delivery receipt for message:', id);
    client.send(receipt);
  }

  // Trigger notifications for incoming messages
  const { triggerNotification } = get();
  if (triggerNotification) {
    const isDirectMessage = type === 'chat';
    triggerNotification(chatJid, message, isDirectMessage);
  }
};
