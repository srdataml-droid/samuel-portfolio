import AnimatedCat from './AnimatedCat';
import Brand from './Brand';
import NavList from './NavList';
import Socials from './Socials';
import ThemeToggle from './ThemeToggle';

/** Persistent desktop rail. Identical on every route. */
export default function Sidebar() {
  return (
    <aside className="sidebar">
      <Brand />
      <NavList />

      <div className="sidebar-rest">
        <p className="sidebar-quote">&ldquo;Good software for a kinder world.&rdquo;</p>

        <figure className="sidebar-cat">
          <AnimatedCat />
          <figcaption>
            &uarr; Same cat.<br />Different ideas. &hearts;
          </figcaption>
        </figure>

        <Socials />
        <ThemeToggle />
      </div>
    </aside>
  );
}
