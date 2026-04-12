export default function Card({ children, className = '', glow = false }) {
  return (
    <div className={`futuristic-card rounded-xl p-5 relative ${glow ? 'glow-primary' : ''} ${className}`}>
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l rounded-tl-xl"
        style={{ borderColor: 'rgba(99,102,241,0.5)' }} />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r rounded-br-xl"
        style={{ borderColor: 'rgba(99,102,241,0.5)' }} />
      {children}
    </div>
  )
}
