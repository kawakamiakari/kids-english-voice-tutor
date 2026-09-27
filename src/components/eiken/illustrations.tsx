/**
 * Small, self-authored flat-shape SVG scenes for the EIKEN picture-description
 * task (see lib/eikenContent.ts). Drawn from scratch with basic shapes rather
 * than generated or sourced from stock art, so there's nothing to license and
 * no image-generation tool needed anywhere in this app (see README's "no
 * tools attached to the model" design decision).
 */

function ReadingUnderTree() {
  return (
    <svg viewBox="0 0 300 200" width="100%" height="100%" role="img" aria-label="A boy reading under a tree with a dog">
      <rect width="300" height="200" fill="#cdeccb" />
      <rect y="150" width="300" height="50" fill="#a3d68f" />
      <circle cx="230" cy="150" r="40" fill="#5a8f3c" />
      <rect x="222" y="150" width="16" height="40" fill="#8b5a2b" />
      <circle cx="60" cy="150" r="20" fill="#8b5a2b" />
      <ellipse cx="60" cy="130" rx="35" ry="30" fill="#5a8f3c" />
      <circle cx="90" cy="160" r="16" fill="#f4c98d" />
      <rect x="80" y="165" width="20" height="25" rx="6" fill="#4a90d9" />
      <rect x="70" y="180" width="40" height="14" fill="#fff" />
      <ellipse cx="140" cy="185" rx="25" ry="10" fill="#e0a45c" />
      <ellipse cx="135" cy="180" rx="8" ry="5" fill="#3a2a1a" />
    </svg>
  );
}

function WateringGarden() {
  return (
    <svg viewBox="0 0 300 200" width="100%" height="100%" role="img" aria-label="A girl watering flowers in a garden">
      <rect width="300" height="200" fill="#bfe6f5" />
      <circle cx="250" cy="40" r="24" fill="#ffd452" />
      <rect y="150" width="300" height="50" fill="#a3d68f" />
      <circle cx="150" cy="160" r="14" fill="#f4c98d" />
      <rect x="140" y="165" width="20" height="26" rx="6" fill="#e9678c" />
      <rect x="160" y="175" width="18" height="10" rx="3" fill="#8b5a2b" />
      {[80, 110, 200, 225].map((x, i) => (
        <g key={i}>
          <rect x={x - 2} y={140} width="4" height="20" fill="#5a8f3c" />
          <circle cx={x} cy={135} r="9" fill={i % 2 === 0 ? "#e9678c" : "#f4c542"} />
        </g>
      ))}
    </svg>
  );
}

function PicnicFamily() {
  return (
    <svg viewBox="0 0 300 200" width="100%" height="100%" role="img" aria-label="A family having a picnic in the park">
      <rect width="300" height="200" fill="#cdeccb" />
      <rect y="150" width="300" height="50" fill="#a3d68f" />
      <rect x="110" y="140" width="80" height="45" fill="#e8e2d0" />
      <rect x="110" y="140" width="80" height="45" fill="none" stroke="#c0392b" strokeWidth="4" strokeDasharray="10 6" />
      {[130, 150, 170].map((x, i) => (
        <circle key={i} cx={x} cy={150} r="10" fill="#f4c98d" />
      ))}
      <circle cx="90" cy="120" r="30" fill="#5a8f3c" />
      <rect x="83" y="120" width="14" height="30" fill="#8b5a2b" />
      <circle cx="240" cy="30" r="18" fill="#ffd452" />
    </svg>
  );
}

function BikeInRain() {
  return (
    <svg viewBox="0 0 300 200" width="100%" height="100%" role="img" aria-label="A boy riding a bicycle in the rain">
      <rect width="300" height="200" fill="#9fb3c8" />
      <rect y="160" width="300" height="40" fill="#7a8fa6" />
      {[20, 60, 100, 140, 180, 220, 260].map((x, i) => (
        <line key={i} x1={x} y1="0" x2={x - 15} y2="60" stroke="#e6f0fa" strokeWidth="3" />
      ))}
      <circle cx="120" cy="165" r="20" fill="none" stroke="#3a3a3a" strokeWidth="5" />
      <circle cx="190" cy="165" r="20" fill="none" stroke="#3a3a3a" strokeWidth="5" />
      <path d="M120 165 L155 130 L190 165 M155 130 L145 165 M155 130 L165 110" stroke="#3a3a3a" strokeWidth="4" fill="none" />
      <circle cx="165" cy="95" r="14" fill="#f4c98d" />
      <path d="M151 90 Q165 65 179 90 Z" fill="#c0392b" />
      <rect x="152" y="105" width="26" height="30" rx="8" fill="#c0392b" />
    </svg>
  );
}

export const EIKEN_ILLUSTRATIONS: Record<string, React.ComponentType> = {
  readingUnderTree: ReadingUnderTree,
  wateringGarden: WateringGarden,
  picnicFamily: PicnicFamily,
  bikeInRain: BikeInRain,
};
