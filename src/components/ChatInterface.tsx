
import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';

export const ChatInterface = () => {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <ChatArea />
    </div>
  );
};
