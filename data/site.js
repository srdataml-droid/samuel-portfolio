/**
 * Single source of truth for site identity, navigation, social links and
 * service copy. Sidebar, mobile drawer, footer, metadata and sitemap all
 * read from here so none of them can drift apart.
 */

export const site = {
  name: 'Samuel',
  title: 'Samuel — AI/ML Engineer & Builder',
  description:
    'Samuel builds AI/ML systems, experiments, and useful software. A small, curious corner of the internet.',
  /**
   * Canonical origin, used for Open Graph URLs, robots.txt and the sitemap.
   * Set NEXT_PUBLIC_SITE_URL in the deployment environment; the fallback is
   * only so local builds succeed.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  /** Placeholder until a real inbox exists. Every mailto: on the site reads this. */
  email: 'hello@example.com',
};

export const nav = [
  { label: 'Home',            href: '/',          icon: 'Home' },
  { label: 'Projects',        href: '/projects',  icon: 'Grid' },
  { label: 'Lab / Videos',    href: '/lab',       icon: 'Play' },
  { label: 'Services',        href: '/services',  icon: 'Box' },
  { label: 'About',           href: '/about',     icon: 'User' },
  { label: 'Book a Call',     href: '/#book',     icon: 'Calendar' },
  { label: 'Talk to Samuel',  action: 'chat',     icon: 'Chat' },
];

/** Real routes only: what the footer and the sitemap list. */
export const pages = nav.filter((item) => item.href && !item.href.includes('#'));

/** Replace the `#` placeholders once the real accounts are ready. */
export const socials = [
  { label: 'GitHub',   href: '#', icon: 'GitHub' },
  { label: 'LinkedIn', href: '#', icon: 'LinkedIn' },
  { label: 'YouTube',  href: '#', icon: 'YouTube' },
  { label: 'X',        href: '#', icon: 'XLogo' },
];

export const services = [
  {
    icon: 'Brain',
    title: 'AI/ML Development',
    blurb: 'Custom AI solutions, model integration, LLM applications.',
    detail: [
      'LLM apps: retrieval, tools, evaluation',
      'Agents that do real work, not demos',
      'Model integration into existing products',
    ],
  },
  {
    icon: 'Code',
    title: 'Full-Stack Development',
    blurb: 'Modern, scalable web applications from idea to deployment.',
    detail: [
      'Next.js / React front ends',
      'APIs, databases, auth, deployment',
      'From first sketch to something people can use',
    ],
  },
  {
    icon: 'Gear',
    title: 'Automation / AI Agents',
    blurb: 'Intelligent automation to save time and unlock possibilities.',
    detail: [
      'Workflow automation across the tools you already pay for',
      'Chat assistants that handle the repetitive part',
      'Internal tools that quietly remove busywork',
    ],
  },
];

export const values = [
  { icon: 'Leaf',     title: 'Curiosity First',   text: 'Ask questions. Explore. Stay open.' },
  { icon: 'People',   title: 'People Matter',     text: 'Build for real humans, not just technology.' },
  { icon: 'Star',     title: 'Thoughtful Impact', text: 'Create value, leave things a little better.' },
  { icon: 'Heart',    title: 'Kindness Always',   text: 'Be kind. Online and offline.' },
];

export const focusAreas = [
  { icon: 'Brain',    title: 'AI Agents',          text: 'More useful, human-centered AI systems.' },
  { icon: 'Laptop',   title: 'Creative Tools',     text: 'Bring ideas to life with code and design.' },
  { icon: 'Book',     title: 'Learning & Sharing', text: 'Document, teach, and give back.' },
  { icon: 'Tree',     title: 'A Kinder Tomorrow',  text: 'Small steps. Bigger impact.' },
];

export const journey = [
  { icon: 'Book',     title: 'Early Curiosity',  text: 'Always asking "how does this work?"' },
  { icon: 'Code',     title: 'Learned to Build', text: 'Started coding, broke things, learned a lot.' },
  { icon: 'Brain',    title: 'AI / ML Focus',    text: 'Fell in love with AI and its potential to do good.' },
  { icon: 'Box',      title: 'Real Projects',    text: 'Built and shipped useful things.' },
  { icon: 'Mountain', title: 'Today',            text: 'Still learning. Still building. Excited for what is next.' },
];

