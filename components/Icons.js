/**
 * Inline stroke icons. Kept local so the site ships no icon dependency and
 * every glyph inherits `currentColor` in both themes.
 */

const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

const svg = (props, children) => <svg {...base} {...props}>{children}</svg>;

export const Home = (p) => svg(p, <><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V20h13V9.5" /><path d="M10 20v-5h4v5" /></>);
export const Grid = (p) => svg(p, <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 9v12" /></>);
export const Play = (p) => svg(p, <><circle cx="12" cy="12" r="9" /><path d="M10.5 8.8 15.5 12l-5 3.2V8.8Z" /></>);
export const Box = (p) => svg(p, <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>);
export const User = (p) => svg(p, <><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6" /></>);
export const Calendar = (p) => svg(p, <><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>);
export const Chat = (p) => svg(p, <><path d="M20.5 12.5c0 4-3.8 7-8.5 7-1 0-2-.1-2.9-.4L4 21l1.4-3.6C4.2 16.1 3.5 14.4 3.5 12.5c0-4 3.8-7 8.5-7s8.5 3 8.5 7Z" /></>);
export const Menu = (p) => svg(p, <><path d="M4 7h16M4 12h16M4 17h16" /></>);
export const Close = (p) => svg(p, <><path d="M6 6l12 12M18 6 6 18" /></>);
export const Sun = (p) => svg(p, <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" /></>);
export const Moon = (p) => svg(p, <><path d="M20 14.5A8.2 8.2 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" /></>);
export const Arrow = (p) => svg(p, <><path d="M4 12h15M13.5 6.5 20 12l-6.5 5.5" /></>);
export const Leaf = (p) => svg(p, <><path d="M4 20c0-8 5-14 16-15 .6 7.5-3.5 14-11 14H4Z" /><path d="M4 20c3-5.5 6.8-8.4 11.5-10" /></>);
export const Coffee = (p) => svg(p, <><path d="M4 9h13v5.5A4.5 4.5 0 0 1 12.5 19h-4A4.5 4.5 0 0 1 4 14.5V9Z" /><path d="M17 10.5h1.8a2.2 2.2 0 1 1 0 4.4H17M4 21.5h13" /><path d="M8 6c0-1 1-1.4 1-2.5M12 6c0-1 1-1.4 1-2.5" /></>);
export const Mountain = (p) => svg(p, <><path d="m2.5 19 6-11 4.5 7.5M9.5 19h12l-6-10-3 5" /></>);
export const Flask = (p) => svg(p, <><path d="M10 3h4M10.8 3v6.2L5.3 18a2 2 0 0 0 1.7 3h10a2 2 0 0 0 1.7-3l-5.5-8.8V3" /><path d="M7.6 14.5h8.8" /></>);
export const Book = (p) => svg(p, <><path d="M4 4.5h6a2.5 2.5 0 0 1 2 1 2.5 2.5 0 0 1 2-1h6v14h-6a2.5 2.5 0 0 0-2 1 2.5 2.5 0 0 0-2-1H4v-14Z" /><path d="M12 5.5v14" /></>);
export const Brain = (p) => svg(p, <><path d="M9.5 4.5A2.7 2.7 0 0 0 7 7a2.6 2.6 0 0 0-2 4.3A2.7 2.7 0 0 0 6 16c0 2 1.5 3.5 3.5 3.5V4.5Z" /><path d="M14.5 4.5A2.7 2.7 0 0 1 17 7a2.6 2.6 0 0 1 2 4.3A2.7 2.7 0 0 1 18 16c0 2-1.5 3.5-3.5 3.5V4.5Z" /></>);
export const Code = (p) => svg(p, <><path d="m8.5 7.5-5 4.5 5 4.5M15.5 7.5l5 4.5-5 4.5M13.5 4.5l-3 15" /></>);
export const Gear = (p) => svg(p, <><circle cx="12" cy="12" r="3.2" /><path d="M12 2.8v2.6M12 18.6v2.6M4.5 12H2M22 12h-2.5M6.3 6.3 4.5 4.5M19.5 19.5l-1.8-1.8M17.7 6.3l1.8-1.8M4.5 19.5l1.8-1.8" /></>);
export const Laptop = (p) => svg(p, <><rect x="4" y="5.5" width="16" height="10" rx="1.6" /><path d="M2.5 19h19" /></>);
export const Heart = (p) => svg(p, <><path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 7.8a4.1 4.1 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" /></>);
export const Star = (p) => svg(p, <><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8L12 3.5Z" /></>);
export const People = (p) => svg(p, <><circle cx="9" cy="8" r="3.2" /><path d="M2.8 19.5c.7-3.5 3.2-5.3 6.2-5.3s5.5 1.8 6.2 5.3" /><path d="M16 5.2a3.2 3.2 0 0 1 0 6M18 14.6c2.1.6 3.4 2.3 3.9 4.9" /></>);
export const Pin = (p) => svg(p, <><path d="M12 21s6.5-6.2 6.5-11a6.5 6.5 0 1 0-13 0C5.5 14.8 12 21 12 21Z" /><circle cx="12" cy="10" r="2.4" /></>);
export const Cap = (p) => svg(p, <><path d="m2.5 9 9.5-4.5L21.5 9 12 13.5 2.5 9Z" /><path d="M6.5 11v5c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8v-5" /></>);
export const Camera = (p) => svg(p, <><rect x="2.5" y="7" width="14" height="11" rx="2" /><path d="m16.5 11.5 5-2.8v8.6l-5-2.8v-3Z" /></>);
export const Sparkle = (p) => svg(p, <><path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z" /><path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" /></>);
export const Tree = (p) => svg(p, <><path d="M12 3 6.5 11h3L5 17.5h14L14.5 11h3L12 3Z" /><path d="M12 17.5V21" /></>);
export const Check = (p) => svg(p, <><path d="m5 12.5 4.5 4.5L19 7.5" /></>);
export const Mail = (p) => svg(p, <><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="m3.8 7 8.2 6 8.2-6" /></>);
export const External = (p) => svg(p, <><path d="M14 4h6v6M20 4l-8.5 8.5" /><path d="M18 14.5V20H4V6h5.5" /></>);
export const Send = (p) => svg(p, <><path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 10l18-7Z" /></>);

export const GitHub = (p) => (
  <svg {...base} {...p} fill="currentColor" stroke="none">
    <path d="M12 2.2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48l-.01-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03a9.5 9.5 0 0 1 5 0c1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85l-.01 2.75c0 .26.18.58.69.48A10 10 0 0 0 12 2.2Z" />
  </svg>
);

export const LinkedIn = (p) => (
  <svg {...base} {...p} fill="currentColor" stroke="none">
    <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9.75h4v11.25H3V9.75Zm6.5 0h3.83v1.54h.05a4.2 4.2 0 0 1 3.78-2.08C21.1 9.21 22 11.4 22 14.26V21h-4v-5.98c0-1.43-.03-3.26-1.99-3.26-1.99 0-2.3 1.55-2.3 3.15V21h-4V9.75Z" />
  </svg>
);

export const YouTube = (p) => (
  <svg {...base} {...p} fill="currentColor" stroke="none">
    <path d="M22.1 7.4a2.6 2.6 0 0 0-1.83-1.84C18.65 5.12 12 5.12 12 5.12s-6.65 0-8.27.44A2.6 2.6 0 0 0 1.9 7.4 27.2 27.2 0 0 0 1.46 12a27.2 27.2 0 0 0 .44 4.6 2.6 2.6 0 0 0 1.83 1.84c1.62.44 8.27.44 8.27.44s6.65 0 8.27-.44a2.6 2.6 0 0 0 1.83-1.83c.3-1.51.45-3.05.44-4.6a27.2 27.2 0 0 0-.44-4.61ZM9.88 15.1V8.9L15.5 12l-5.62 3.1Z" />
  </svg>
);

export const XLogo = (p) => (
  <svg {...base} {...p} fill="currentColor" stroke="none">
    <path d="M17.3 3h3.3l-7.2 8.2L22 21h-6.6l-5.2-6.7L4.2 21H.9l7.7-8.8L.6 3h6.8l4.7 6.2L17.3 3Zm-1.2 16h1.8L7.9 4.8H6l10.1 14.2Z" />
  </svg>
);
