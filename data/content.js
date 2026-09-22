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

export const videos = [];

/**
 * Things currently being explored. Empty until Samuel lists real ones.
 * Shape: { title: 'Multi-agent workflows', state: 'Testing', done: false }
 */
export const experiments = [];
