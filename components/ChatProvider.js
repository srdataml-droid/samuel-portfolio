'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import ChatDrawer from './ChatDrawer';

const ChatContext = createContext({ open: false, openChat: () => {}, closeChat: () => {} });

export const useChat = () => useContext(ChatContext);

export default function ChatProvider({ children }) {
  const [open, setOpen] = useState(false);

  const openChat = useCallback(() => setOpen(true), []);
  const closeChat = useCallback(() => setOpen(false), []);

  const value = useMemo(() => ({ open, openChat, closeChat }), [open, openChat, closeChat]);

  return (
    <ChatContext.Provider value={value}>
      {children}
      <ChatDrawer />
    </ChatContext.Provider>
  );
}
