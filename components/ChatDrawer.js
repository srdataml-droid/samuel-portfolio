'use client';

import { useEffect, useRef } from 'react';
import { useChat } from './ChatProvider';
import { Chat, Close, Send } from './Icons';

const STARTERS = [
  'What does Samuel build?',
  'Show me his projects',
  'What is he experimenting with?',
  'Can we work together?',
];

/**
 * Frontend shell only. There is no backend behind this yet, so the composer
 * stays disabled and the panel says so plainly rather than inventing replies.
 * Wiring it up later means replacing the body of `send` and enabling the input.
 */
export default function ChatDrawer() {
  const { open, openChat, closeChat } = useChat();
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') closeChat();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeChat]);

  return (
    <>
      <button type="button" className="chat-fab" onClick={openChat} aria-expanded={open}>
        <Chat />
        Talk to Samuel&rsquo;s AI
      </button>

      <div
        className={`drawer-scrim ${open ? 'open' : ''}`}
        onClick={closeChat}
        aria-hidden="true"
      />

      <aside
        ref={panelRef}
        className={`chat-panel ${open ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Talk to Samuel's AI"
        inert={open ? undefined : true}
      >
        <header className="chat-head">
          <div>
            <h2>Samuel&rsquo;s AI</h2>
            <small>Portfolio guide &middot; interface preview</small>
          </div>
          <button ref={closeRef} type="button" className="icon-button" onClick={closeChat}>
            <Close />
            <span className="sr-only">Close chat</span>
          </button>
        </header>

        <div className="chat-body">
          <p className="chat-msg">
            Hi. This is the chat panel for Samuel&rsquo;s site — the look and the flow are
            finished, the brain is not connected yet.
          </p>

          <p className="chat-note">
            No assistant is running behind this panel right now, so it will not answer.
            The starter questions below are the ones it will handle first once a backend
            is wired in.
          </p>

          <div className="chat-chips">
            <span className="chip-label">Starter questions</span>
            {STARTERS.map((q) => (
              <button key={q} type="button" disabled title="Available once the assistant is connected">
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="chat-foot">
          <form className="chat-input-row" onSubmit={(e) => e.preventDefault()}>
            <input
              type="text"
              placeholder="Ask anything…"
              aria-label="Message Samuel's AI"
              disabled
            />
            <button type="submit" disabled>
              <Send />
              <span className="sr-only">Send</span>
            </button>
          </form>
          <small>Disabled until the assistant is connected.</small>
        </div>
      </aside>
    </>
  );
}
