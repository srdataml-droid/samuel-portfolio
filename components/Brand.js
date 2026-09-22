import Link from 'next/link';

export default function Brand({ showNote = true }) {
  return (
    <Link href="/" className="brand">
      <span className="brand-name">
        Samuel
        <span className="sprig" aria-hidden="true">❦</span>
      </span>
      {showNote && (
        <p className="brand-note">
          Build · Experiment ·<br />A brighter tomorrow
        </p>
      )}
    </Link>
  );
}
