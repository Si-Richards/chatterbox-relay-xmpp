
export const detectMessageOwnership = (from: string, to: string, currentUser: string, type: 'chat' | 'groupchat') => {
  const currentUserBareJid = currentUser.split('/')[0]; // Remove resource
  const currentUserNickname = currentUser.split('@')[0]; // Username part only
  
  let isSentByCurrentUser = false;
  let chatJid = '';
  
  if (type === 'groupchat') {
    // For group chats - extract room and nickname
    const roomJid = from.split('/')[0];
    const fromNickname = from.split('/')[1];
    
    // Multiple methods to detect ownership
    isSentByCurrentUser = (
      fromNickname === currentUserNickname || // Nickname match
      fromNickname === currentUserBareJid || // JID as nickname
      from === `${roomJid}/${currentUserNickname}` || // Full from match
      from === `${roomJid}/${currentUserBareJid}` // Full JID match
    );
    
    chatJid = roomJid;
    
    console.log('Groupchat Ownership Detection:', {
      from,
      roomJid,
      fromNickname,
      currentUserNickname,
      currentUserBareJid,
      isSentByCurrentUser,
      method: isSentByCurrentUser ? 'nickname/jid match' : 'no match'
    });
  } else {
    // For direct chats - exact JID matching with fallbacks
    const fromBareJid = from.split('/')[0];
    const toBareJid = to.split('/')[0];
    
    // Multiple methods to detect ownership
    isSentByCurrentUser = (
      fromBareJid === currentUserBareJid || // Primary method
      from === currentUser || // Exact match
      from.startsWith(currentUserBareJid) // Starts with bare JID
    );
    
    chatJid = isSentByCurrentUser ? toBareJid : fromBareJid;
    
    console.log('Direct Chat Ownership Detection:', {
      from,
      to,
      fromBareJid,
      toBareJid,
      currentUserBareJid,
      currentUser,
      isSentByCurrentUser,
      chatJid,
      method: isSentByCurrentUser ? 'jid match' : 'other sender'
    });
  }
  
  return { isSentByCurrentUser, chatJid };
};
