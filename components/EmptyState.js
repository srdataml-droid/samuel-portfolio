import * as Icons from './Icons';

/**
 * An empty state that looks intentional rather than broken: it says what will
 * live here, in Samuel's voice, and offers somewhere else to go.
 */
export default function EmptyState({ icon = 'Sparkle', title, note, hand, children, level = 3 }) {
  const Icon = Icons[icon];
  const Heading = `h${level}`;
  return (
    <div className="empty">
      <span className="empty-mark"><Icon width={24} height={24} /></span>
      <Heading>{title}</Heading>
      {note && <p>{note}</p>}
      {hand && <p className="hand">{hand}</p>}
      {children && <div className="empty-actions">{children}</div>}
    </div>
  );
}
