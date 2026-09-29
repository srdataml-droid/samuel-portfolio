'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import ProjectCard from './ProjectCard';
import EmptyState from './EmptyState';
import { categories } from '@/data/content';
import { Arrow } from './Icons';

/**
 * Category filters over the project grid. Categories with no projects yet are
 * left out, so every button a visitor sees leads somewhere.
 */
export default function ProjectFilters({ projects = [] }) {
  const [active, setActive] = useState('All');
  const empty = projects.length === 0;
  const used = categories.filter((c) => c !== 'All' && projects.some((p) => p.category === c));

  const shown = useMemo(
    () => (active === 'All' ? projects : projects.filter((p) => p.category === active)),
    [projects, active],
  );

  return (
    <>
      {used.length > 1 && (
        <div className="filter-bar" role="group" aria-label="Filter projects by category">
          {['All', ...used].map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={active === category}
              onClick={() => setActive(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginTop: 30 }}>
        {empty ? (
          <EmptyState
            icon="Grid"
            level={2}
            title="New builds are on the way."
            note="In the meantime, the lab has demos of what I am working on right now."
            hand="Small projects. Bigger tomorrows."
          >
            <Link className="button primary" href="/lab">
              Visit the lab <Arrow className="arrow" width={15} height={15} />
            </Link>
            <Link className="button ghost" href="/services">What I can help with</Link>
          </EmptyState>
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
