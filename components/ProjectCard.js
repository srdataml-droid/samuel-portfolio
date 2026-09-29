import Image from 'next/image';
import { External } from './Icons';

/**
 * One project from `data/content.js`. Images under /public go through next/image;
 * a full URL (such as a YouTube thumbnail) is used as is.
 */
export default function ProjectCard({ project }) {
  const { title, problem, built, outcome, tags = [], image, href } = project;

  return (
    <article className="card project-card">
      <div className="project-art">
        {image && (image.startsWith('http')
          ? <img src={image} alt="" width={640} height={360} loading="lazy" decoding="async" />
          : <Image src={image} alt="" width={640} height={360} />)}
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
