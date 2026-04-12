export default function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Outer hexagon ring */}
      <polygon
        points="18,2 32,10 32,26 18,34 4,26 4,10"
        fill="none"
        stroke="url(#logoGrad)"
        strokeWidth="1.5"
        opacity="0.6"
      />

      {/* Inner hexagon */}
      <polygon
        points="18,7 28,13 28,23 18,29 8,23 8,13"
        fill="rgba(99,102,241,0.1)"
        stroke="url(#logoGrad)"
        strokeWidth="1"
        filter="url(#glow)"
      />

      {/* Eye / lens shape */}
      <ellipse cx="18" cy="18" rx="6" ry="4" fill="none" stroke="url(#logoGrad)" strokeWidth="1.5" filter="url(#glow)" />

      {/* Pupil dot */}
      <circle cx="18" cy="18" r="2" fill="url(#logoGrad)" filter="url(#glow)" />

      {/* Scan lines */}
      <line x1="8" y1="18" x2="12" y2="18" stroke="#06b6d4" strokeWidth="1" opacity="0.7" />
      <line x1="24" y1="18" x2="28" y2="18" stroke="#06b6d4" strokeWidth="1" opacity="0.7" />

      {/* Top tick */}
      <line x1="18" y1="7" x2="18" y2="11" stroke="#6366f1" strokeWidth="1" opacity="0.5" />
      <line x1="18" y1="25" x2="18" y2="29" stroke="#6366f1" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}
