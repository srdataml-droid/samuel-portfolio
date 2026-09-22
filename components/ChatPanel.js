'use client';
import { useState } from 'react';
export default function ChatPanel(){
 const [open,setOpen]=useState(false);
 return <>
  <button className="chat-fab" onClick={()=>setOpen(true)}>Talk to Samuel’s AI</button>
  <div className={`chat-panel ${open?'open':''}`} aria-hidden={!open}>
   <div className="chat-head"><div><strong>Samuel’s AI</strong><small>portfolio guide · prototype</small></div><button onClick={()=>setOpen(false)}>×</button></div>
   <div className="chat-body"><p className="assistant-msg">Ask about projects, the tech stack, videos, or how to get in touch.</p><div className="chat-chips"><button>Show me an AI project</button><button>What does Samuel build?</button><button>Can I work with him?</button></div></div>
   <div className="chat-input"><input placeholder="Ask anything…" disabled/><button disabled>→</button></div>
  </div>
 </>;
}
