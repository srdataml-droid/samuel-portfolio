import * as Icons from './Icons';

/**
 * An empty state that looks intentional rather than broken: it says what will
 * live here, in Samuel's voice, and offers somewhere else to go.
 */
export default function EmptyState({ icon = 'Sparkle', title, note, hand, children }) {
  const Icon = Icons[icon];
  return (
    <div className="empty">
      <span className="empty-mark"><Icon width={24} height={24} /></span>
      <h3>{title}</h3>
      {note && <p>{note}</p>}
      {hand && <p className="hand">{hand}</p>}
      {children && <div className="empty-actions">{children}</div>}
    </div>
  );
}

/**
 * Ghost cards showing the shape real entries will take. Nothing here claims to
 * be a project or a video — it is visibly a placeholder.
 */
export function SlotGrid({ count = 3, label = 'Reserved for what comes next' }) {
  return (
    <div className="slot-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="slot" key={i}>
          <div className="slot-art" />
          <span className="slot-label">{label}</span>
          <span className="slot-line w70" />
          <span className="slot-line w45" />
          <div className="slot-tags">
            <span className="slot-tag" />
            <span className="slot-tag" />
          </div>
        </div>
      ))}
    </div>
  );
}
