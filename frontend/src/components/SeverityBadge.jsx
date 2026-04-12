const CONFIG = {
  critical: { label: '🔴 Critical', cls: 'text-red-400',    bg: 'rgba(239,68,68,0.15)',    border: 'rgba(239,68,68,0.4)',    glow: '0 0 12px rgba(239,68,68,0.4)' },
  moderate: { label: '🟡 Moderate', cls: 'text-yellow-400', bg: 'rgba(245,158,11,0.15)',   border: 'rgba(245,158,11,0.4)',   glow: '0 0 12px rgba(245,158,11,0.4)' },
  low:      { label: '🟢 Low',      cls: 'text-green-400',  bg: 'rgba(16,185,129,0.15)',   border: 'rgba(16,185,129,0.4)',   glow: '0 0 12px rgba(16,185,129,0.4)' },
}

export default function SeverityBadge({ level }) {
  const c = CONFIG[level] || CONFIG.low
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${c.cls}`}
      style={{ background: c.bg, border: `1px solid ${c.border}`, boxShadow: c.glow }}>
      {c.label}
    </span>
  )
}
