import { LayoutDashboard, Upload, AlertTriangle, Brain, Wrench, FileText, Activity, Sparkles } from 'lucide-react'
import Logo from './Logo'

const NAV = [
  { id: 'dashboard', label: 'Dashboard',        icon: LayoutDashboard, color: '#6366f1' },
  { id: 'analyze',   label: 'Data Analyzer',    icon: Upload,          color: '#06b6d4' },
  { id: 'bias',      label: 'Bias Detection',   icon: AlertTriangle,   color: '#f59e0b' },
  { id: 'explain',   label: 'Explainable AI',   icon: Brain,           color: '#8b5cf6' },
  { id: 'fix',       label: 'Bias Correction',  icon: Wrench,          color: '#10b981' },
  { id: 'report',    label: 'Compliance Report', icon: FileText,        color: '#6366f1' },
  { id: 'monitor',   label: 'Live Monitor',     icon: Activity,        color: '#f43f5e' },
  { id: 'gemini',    label: 'Gemini AI',        icon: Sparkles,        color: '#f59e0b' },
]

export default function Sidebar({ active, onNavigate }) {
  return (
    <aside className="w-64 flex flex-col shrink-0 relative"
      style={{ background: 'linear-gradient(180deg, #0a0f1e 0%, #060d1a 100%)', borderRight: '1px solid rgba(99,102,241,0.2)' }}>

      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, #6366f1, #06b6d4, transparent)' }} />

      {/* Logo area */}
      <div className="p-5 relative" style={{ borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
        <div className="flex items-center gap-3">
          <div className="relative float-anim">
            <Logo size={38} />
            <div className="absolute inset-0 rounded-full blur-md opacity-40"
              style={{ background: 'radial-gradient(circle, #6366f1, #06b6d4)' }} />
          </div>
          <div>
            <div className="font-bold text-white text-sm tracking-wide font-space neon-text">FairLens AI</div>
            <div className="text-xs tracking-widest uppercase" style={{ color: '#06b6d4', fontSize: '9px' }}>
              Governance Platform
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
          <span className="text-xs" style={{ color: '#475569' }}>System Online</span>
          <span className="ml-auto text-xs font-mono" style={{ color: '#334155' }}>v2.0</span>
        </div>
      </div>

      {/* Nav label */}
      <div className="px-5 pt-4 pb-2">
        <span className="text-xs tracking-widest uppercase font-medium" style={{ color: '#334155' }}>
          Modules
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ id, label, icon: Icon, color }) => {
          const isActive = active === id
          // Divider before Gemini
          const showDivider = id === 'gemini'
          return (
            <div key={id}>
              {showDivider && (
                <div className="mx-2 my-2 h-px" style={{ background: 'rgba(99,102,241,0.1)' }} />
              )}
              <button onClick={() => onNavigate(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative group ${
                  isActive ? 'nav-active text-white font-medium' : 'text-slate-500 hover:text-slate-200'
                }`}>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                    style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                )}
                <div className={`transition-all ${isActive ? '' : 'group-hover:scale-110'}`}
                  style={{ color: isActive ? color : undefined }}>
                  <Icon size={15} />
                </div>
                <span className="tracking-wide">{label}</span>
                {isActive && (
                  <div className="ml-auto w-1 h-1 rounded-full pulse-dot" style={{ background: color }} />
                )}
              </button>
            </div>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4" style={{ borderTop: '1px solid rgba(99,102,241,0.1)' }}>
        <div className="futuristic-card rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-dot" />
            <span className="text-xs font-medium text-slate-300">AI Engine</span>
          </div>
          <div className="text-xs text-slate-500">SHAP · RandomForest · SMOTE · Gemini</div>
        </div>
      </div>

      {/* Bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, #6366f1, transparent)' }} />
    </aside>
  )
}
