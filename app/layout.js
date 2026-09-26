import './globals.css';
import { Caveat, Inter, Playfair_Display } from 'next/font/google';
import Shell from '@/components/Shell';
import { site } from '@/data/site';

/**
 * Fonts are self-hosted by next/font: no request to Google at runtime, no
 * render-blocking stylesheet, and a size-matched fallback so text does not
 * jump when the real face arrives. globals.css reads the CSS variables.
 */
const serif = Playfair_Display({ subsets: ['latin'], weight: ['400', '500', '700', '900'], variable: '--font-serif', display: 'swap' });
const sans = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans', display: 'swap' });
const hand = Caveat({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-hand', display: 'swap' });

export const metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: 'website',
    siteName: site.name,
    title: site.title,
    description: site.description,
    images: [{ url: '/scenes/home.png', width: 760, height: 316, alt: 'The cat at a sunlit desk beside a laptop and a stack of books.' }],
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3eee1' },
    { media: '(prefers-color-scheme: dark)', color: '#131511' },
  ],
};

/**
 * Applied before first paint so the page never flashes the wrong theme.
 * Kept tiny and dependency-free on purpose.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('samuel-theme');
    var dark = stored ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${hand.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
