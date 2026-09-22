import Image from 'next/image';
import { External } from './Icons';

/**
 * Renders one entry from `data/content.js`. Unused while the list is empty —
 * it exists so adding a project object is the only work required later.
 */
export default function ProjectCard({ project }) {
  const { title, problem, built, outcome, tags = [], image, href } = project;

  return (
    <article className="card project-card">
      <div className="project-art">
        {image && <Image src={image} alt="" width={640} height={360} />}
      </div>

      <div className="project-body">
        <h3>
          {title}
          {href && (
            <a href={href} target="_blank" rel="noreferrer" aria-label={`Open ${title}`}>
              <External />
            </a>
          )}
        </h3>
        {problem && <p><b>Problem:</b> {problem}</p>}
        {built && <p><b>Built:</b> {built}</p>}
        {outcome && <p><b>Outcome:</b> {outcome}</p>}

        {tags.length > 0 && (
          <div className="project-tags">
            {tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
          </div>
        )}
      </div>
    </article>
  );
}
