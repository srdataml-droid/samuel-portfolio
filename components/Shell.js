import ChatProvider from './ChatProvider';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import Footer from './Footer';

/** The frame every route renders inside. */
export default function Shell({ children }) {
  return (
    <ChatProvider>
      <a className="skip-link" href="#content">Skip to content</a>
      <div className="shell">
        <Sidebar />
        <div className="main">
          <MobileNav />
          <main id="content">{children}</main>
          <Footer />
        </div>
      </div>
    </ChatProvider>
  );
}
