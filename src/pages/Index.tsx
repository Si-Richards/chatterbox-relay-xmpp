
import React, { useState, useEffect } from 'react';
import { LoginForm } from '@/components/LoginForm';
import { ChatInterface } from '@/components/ChatInterface';
import { useXMPPStore } from '@/store/xmppStore';

const Index = () => {
  const { isConnected } = useXMPPStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {!isConnected ? <LoginForm /> : <ChatInterface />}
    </div>
  );
};

export default Index;
