import './globals.css';
import Shell from '@/components/Shell';

export const metadata = {
  title: {
    default: 'Samuel — AI/ML Engineer & Builder',
    template: '%s · Samuel',
  },
  description:
    'Samuel builds AI/ML systems, experiments, and useful software. A small, curious corner of the internet.',
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;700;900&family=Inter:wght@400;500;600;700&family=Caveat:wght@400;600&display=swap"
        />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
