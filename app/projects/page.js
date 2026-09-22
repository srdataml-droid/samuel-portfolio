import DeskScene from '@/components/DeskScene';
import ProjectFilters from '@/components/ProjectFilters';
import { projects } from '@/data/content';

export const metadata = {
  title: 'Projects',
  description: 'Real problems. Useful software. A collection of things Samuel has built.',
};

export default function ProjectsPage() {
  return (
    <>
      <section className="page-hero">
        <div className="page-hero-copy">
          <p className="hand">&ldquo;Ideas → Experiments → Useful Things&rdquo;</p>
          <h1>Projects</h1>
          <p className="page-sub">Real problems. Useful software.</p>
          <p className="lead">
            A collection of projects I&rsquo;ve built — from practical tools to research
            experiments. Each one is a little step toward a kinder, more creative, and
            more capable tomorrow.
          </p>
        </div>

        <DeskScene scene="projects" priority />
      </section>

      <section className="section">
        <ProjectFilters projects={projects} />
      </section>
    </>
  );
}
