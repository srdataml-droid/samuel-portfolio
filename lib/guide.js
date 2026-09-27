import { services, site, socials } from '@/data/site';
import { experiments, projects, videos } from '@/data/content';

// Filler words that say nothing about the topic; they never count as a match.
const FILLER = new Set(['what', 'does', 'do', 'is', 'are', 'the', 'a', 'an', 'me', 'about', 'tell', 'his', 'he', 'him', 'you', 'your', 'can', 'i', 'how', 'to', 'of', 'on', 'with', 'we']);

/**
 * The site guide behind the chat panel. It is not a language model: it matches a
 * question to a topic and answers from the same data the pages render, so it can
 * never say anything the site does not. Each topic lists the words that point to it;
 * the topic with the most matching words wins, and anything unmatched gets an honest
 * "I don't know that one" with a way to reach Samuel.
 */

const live = socials.filter(({ href }) => href && href !== '#');
const mail = { label: 'Email Samuel', href: `mailto:${site.email}` };
const book = { label: 'Book a call', href: '/#book' };

const topics = [
  {
    words: ['hi', 'hello', 'hey', 'morning', 'afternoon', 'evening', 'yo', 'sup'],
    answer: () => ({ text: 'Hello! I can tell you what Samuel builds, what he can help with, what is in the lab, and how to reach him. What would you like to know?' }),
  },
  {
    words: ['who', 'samuel', 'himself', 'background', 'story', 'engineer', 'job', 'role', 'bio'],
    answer: () => ({
      text: 'Samuel is an AI/ML engineer and full-stack developer. He builds AI/ML systems, experiments and useful software, and cares about technology that makes life simpler and kinder.',
      links: [{ label: 'Read his story', href: '/about' }],
    }),
  },
  {
    words: ['project', 'projects', 'portfolio', 'built', 'shipped', 'examples', 'case'],
    answer: () => projects.length
      ? {
        text: `There ${projects.length === 1 ? 'is one project' : `are ${projects.length} projects`} up so far: ${projects.map(p => p.title).join(', ')}.`,
        links: [{ label: 'See the projects', href: '/projects' }],
      }
      : {
        text: 'The projects page is still empty on purpose: nothing goes up until it is finished and the results are real. The page will show the problem, what he built and what came of it.',
        links: [{ label: 'Projects page', href: '/projects' }, { label: 'What he can help with', href: '/services' }],
      },
  },
  {
    words: ['experiment', 'experimenting', 'experiments', 'lab', 'video', 'videos', 'youtube', 'learning', 'exploring', 'testing'],
    answer: () => {
      const now = experiments.filter(e => !e.done).map(e => e.title);
      const parts = [];
      parts.push(videos.length ? `The lab has ${videos.length} video${videos.length === 1 ? '' : 's'}, latest: "${videos[0].title}".` : 'No lab videos are recorded yet; the setup is still being built.');
      parts.push(now.length ? `Currently exploring: ${now.join(', ')}.` : 'His current focus is AI agents, creative tools, and learning in public.');
      return { text: parts.join(' '), links: [{ label: 'Visit the lab', href: '/lab' }] };
    },
  },
  {
    words: ['service', 'services', 'help', 'hire', 'offer', 'together', 'collaborate', 'freelance', 'contract', 'client', 'ai', 'ml', 'agent', 'agents', 'automation', 'llm', 'app', 'website'],
    answer: () => ({
      text: `He helps with three things: ${services.map(s => `${s.title} (${s.blurb.replace(/\.$/, '').replace(/^\w/, c => c.toLowerCase())})`).join('; ')}. The usual way in: talk the problem through, build a small real version, then ship and refine.`,
      links: [{ label: 'All services', href: '/services' }, book],
    }),
  },
  {
    words: ['price', 'pricing', 'cost', 'rate', 'rates', 'budget', 'charge', 'quote', 'much'],
    answer: () => ({
      text: 'There are no fixed prices on the site: it depends on the problem. The quickest way to a real answer is a short email describing what you need.',
      links: [mail],
    }),
  },
  {
    words: ['stack', 'tech', 'technology', 'technologies', 'tools', 'language', 'languages', 'framework', 'python', 'react', 'next', 'skills'],
    answer: () => ({
      text: `From the services page: ${services.flatMap(s => s.detail).join('; ')}.`,
      links: [{ label: 'Services in detail', href: '/services' }],
    }),
  },
  {
    words: ['contact', 'email', 'mail', 'reach', 'call', 'book', 'meet', 'meeting', 'talk', 'schedule', 'chat'],
    answer: () => ({
      text: `The best way to reach Samuel is email: ${site.email}. Say a little about what you have in mind and suggest a couple of times if you would like a call.`,
      links: [mail, book],
    }),
  },
  {
    words: ['github', 'linkedin', 'twitter', 'x', 'social', 'socials', 'follow', 'online', 'code', 'repo', 'repos'],
    answer: () => ({
      text: live.length ? `You can find him on ${live.map(s => s.label).join(', ')}.` : 'His social links are not published yet.',
      links: live.map(({ label, href }) => ({ label, href })),
    }),
  },
  {
    words: ['cat', 'cats', 'kitty', 'meow', 'mascot', 'sleeping', 'meadow'],
    answer: () => ({ text: 'That is the site cat. It naps, stretches and wanders the meadow at the bottom of every page on its own schedule. Tap it and it will say hello.' }),
  },
  {
    words: ['thanks', 'thank', 'cheers', 'great', 'cool', 'nice', 'awesome'],
    answer: () => ({ text: 'You are welcome. If there is anything else, just ask.' }),
  },
];

const fallback = () => ({
  text: 'I only know what is on this site, and that is not something it covers. Samuel can answer it himself by email.',
  links: [mail],
});

export function answer(question) {
  const words = (question.toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => !FILLER.has(w));
  let best = null, bestScore = 0;
  for (const topic of topics) {
    const score = words.filter(w => topic.words.includes(w)).length;
    if (score > bestScore) { best = topic; bestScore = score; }
  }
  return (best ? best.answer : fallback)();
}

export const starters = [
  'What does Samuel build?',
  'Show me his projects',
  'What is he experimenting with?',
  'Can we work together?',
];
