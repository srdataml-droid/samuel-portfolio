'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import ProjectCard from './ProjectCard';
import EmptyState, { SlotGrid } from './EmptyState';
import { categories } from '@/data/content';
import { Arrow } from './Icons';

/**
 * The filter controls are built and wired now. With no projects yet they are
 * rendered disabled — visible as part of the layout, honest about having
 * nothing to filter. They start working the moment `projects` has entries.
 */
export default function ProjectFilters({ projects = [] }) {
  const [active, setActive] = useState('All');
  const empty = projects.length === 0;

  const shown = useMemo(
    () => (active === 'All' ? projects : projects.filter((p) => p.category === active)),
    [projects, active],
  );

  return (
    <>
      <div className="filter-bar" role="group" aria-label="Filter projects by category">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={active === category}
            disabled={empty}
            onClick={() => setActive(category)}
            title={empty ? 'Nothing to filter yet' : undefined}
          >
            {category}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 30 }}>
        {empty ? (
          <>
            <EmptyState
              icon="Grid"
              title="Nothing pinned here yet. I’m building."
              note="This grid is ready for the real thing: each card will carry the problem, what I built, the outcome, the stack, and a link. Nothing goes up here until it is actually true."
              hand="Small projects. Bigger tomorrows."
            >
              <Link className="button primary" href="/services">
                What I can help with <Arrow className="arrow" width={15} height={15} />
              </Link>
              <Link className="button ghost" href="/lab">Visit the lab</Link>
            </EmptyState>
            <SlotGrid count={6} label="Project slot" />
          </>
        ) : (
          <div className="cols-3">
            {shown.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
