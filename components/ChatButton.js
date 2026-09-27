'use client';

import { useChat } from './ChatProvider';

/** Opens the site guide from anywhere on a page, not only from the nav or the floating button. */
export default function ChatButton({ className = 'button ghost', children }) {
  const { openChat } = useChat();
  return <button type="button" className={className} onClick={openChat}>{children}</button>;
}
