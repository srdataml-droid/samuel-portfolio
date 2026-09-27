'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useChat } from './ChatProvider';
import { answer, starters } from '@/lib/guide';
import { site } from '@/data/site';
import useFocusTrap from '@/lib/useFocusTrap';
import { Chat, Close, Send } from './Icons';

const GREETING = {
  from: 'guide',
  text: 'Hi! I am the guide to Samuel’s site. Ask me what he builds, what he can help with, or how to reach him.',
};

/**
 * The chat panel. Replies come from lib/guide.js, which answers only from the
 * site's own content; it says so in the header rather than pretending to be
 * Samuel or a language model.
 */
export default function ChatDrawer() {
  const { open, openChat, closeChat } = useChat();
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const bodyRef = useRef(null);
  const [messages, setMessages] = useState([GREETING]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);

  useFocusTrap(panelRef, open, closeChat, inputRef);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  function ask(question) {
    const text = question.trim();
    if (!text || thinking) return;
    setMessages(list => [...list, { from: 'you', text }]);
    setDraft('');
    setThinking(true);
    // A short pause so the reply reads as a reply, not a flicker.
    window.setTimeout(() => {
      setMessages(list => [...list, { from: 'guide', ...answer(text) }]);
      setThinking(false);
    }, 450);
  }

  const asked = messages.some(m => m.from === 'you');

  return (
    <>
      <button type="button" className="chat-fab" onClick={openChat} aria-expanded={open}>
        <Chat />
        Ask about Samuel
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
        aria-label="Ask about Samuel"
        inert={open ? undefined : true}
      >
        <header className="chat-head">
          <div>
            <h2>Samuel&rsquo;s site guide</h2>
            <small>Answers from this site &middot; not a live chat with Samuel</small>
          </div>
          <button type="button" className="icon-button" onClick={closeChat}>
            <Close />
            <span className="sr-only">Close chat</span>
          </button>
        </header>

        <div className="chat-body" ref={bodyRef} aria-live="polite">
          {messages.map((message, i) => (
            <div key={i} className={`chat-msg ${message.from === 'you' ? 'chat-msg-you' : ''}`}>
              <span className="sr-only">{message.from === 'you' ? 'You: ' : 'Guide: '}</span>
              {message.text}
              {message.links?.length > 0 && (
                <span className="chat-links">
                  {message.links.map(({ label, href }) => href.startsWith('/')
                    ? <Link key={href} href={href} onClick={closeChat}>{label}</Link>
                    : <a key={href} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>{label}</a>)}
                </span>
              )}
            </div>
          ))}
          {thinking && <p className="chat-typing" aria-label="The guide is typing"><span /><span /><span /></p>}

          {!asked && (
            <div className="chat-chips">
              <span className="chip-label">Try asking</span>
              {starters.map((q) => (
                <button key={q} type="button" onClick={() => ask(q)}>{q}</button>
              ))}
            </div>
          )}
        </div>

        <div className="chat-foot">
          <form className="chat-input-row" onSubmit={(e) => { e.preventDefault(); ask(draft); }}>
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask anything about Samuel…"
              aria-label="Your question"
              maxLength={300}
            />
            <button type="submit" disabled={!draft.trim() || thinking}>
              <Send />
              <span className="sr-only">Send</span>
            </button>
          </form>
          <small>For anything the guide can&rsquo;t answer, email {' '}<a href={`mailto:${site.email}`}>Samuel</a>.</small>
        </div>
      </aside>
    </>
  );
}
