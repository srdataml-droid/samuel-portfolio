/**
 * Real content lives here. Both collections are intentionally empty — the
 * portfolio is new and nothing has been published yet. Add an object to a
 * list and the matching page switches from its empty state to a real grid
 * with no other change required.
 *
 * Project shape:
 *   {
 *     slug:     'ai-investigation-agent',   // unique, used as the React key
 *     title:    'AI Investigation Agent',
 *     category: 'AI/ML',                    // must match one of `categories`
 *     problem:  'Research is slow and fragmented.',
 *     built:    'An agent that investigates, connects dots, and reports.',
 *     outcome:  '10x faster insights.',
 *     tags:     ['Python', 'LLMs', 'LangChain'],
 *     image:    '/projects/investigation.png',  // file under /public
 *     href:     'https://…',                    // live link or repo
 *   }
 *
 * Video shape:
 *   {
 *     slug:     'building-my-ai-agent',
 *     title:    'Building My AI Agent (From Scratch)',
 *     date:     '2026-03-12',            // ISO, formatted at render time
 *     duration: '14 min',
 *     blurb:    'A behind-the-scenes look at the wins and the fails.',
 *     thumb:    '/videos/ai-agent.png',  // file under /public
 *     href:     'https://youtube.com/…',
 *     featured: true,                    // at most one
 *   }
 */

export const categories = ['All', 'AI/ML', 'Full Stack', 'Tools', 'Experiments'];

export const projects = [];

export const videos = [
  // Listed by hand so the Lab always shows it; later uploads arrive automatically from the channel.
  {
    slug: 'ai-front-desk',
    title: 'I Built an AI Front Desk That Answers Calls & Books Service Jobs 24/7',
    thumb: 'https://i.ytimg.com/vi/BN5SOfcj9Q4/hqdefault.jpg',
    href: 'https://www.youtube.com/watch?v=BN5SOfcj9Q4',
    featured: true,
  },
];

/**
 * Instagram and TikTok posts to show on the Lab page, newest first. Paste the
 * post's share link; the page embeds it with the platform's own player.
 * (YouTube needs nothing here: uploads appear on their own, see lib/youtube.js.)
 *
 *   { url: 'https://www.instagram.com/p/XXXXXXXXXXX/' }
 *   { url: 'https://www.instagram.com/reel/XXXXXXXXXXX/' }
 *   { url: 'https://www.tiktok.com/@handle/video/1234567890123456789' }
 */
export const posts = [];

/**
 * Things currently being explored. Empty until Samuel lists real ones.
 * Shape: { title: 'Multi-agent workflows', state: 'Testing', done: false }
 */
export const experiments = [];
