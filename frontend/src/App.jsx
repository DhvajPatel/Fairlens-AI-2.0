import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard       from './pages/Dashboard'
import DataAnalyzer    from './pages/DataAnalyzer'
import BiasDetection   from './pages/BiasDetection'
import Explainability  from './pages/Explainability'
import BiasCorrection  from './pages/BiasCorrection'
import ComplianceReport from './pages/ComplianceReport'
import LiveMonitor     from './pages/LiveMonitor'
import GeminiExplain   from './pages/GeminiExplain'

const PAGES = {
  dashboard: Dashboard,
  analyze:   DataAnalyzer,
  bias:      BiasDetection,
  explain:   Explainability,
  fix:       BiasCorrection,
  report:    ComplianceReport,
  monitor:   LiveMonitor,
  gemini:    GeminiExplain,
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const Page = PAGES[page]

  return (
    <div className="flex h-screen overflow-hidden scanline" style={{ background: '#020817' }}>
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
      </div>

      <Sidebar active={page} onNavigate={setPage} />

      <main className="flex-1 overflow-y-auto cyber-grid relative">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3"
          style={{ background: 'rgba(2,8,23,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span style={{ color: '#6366f1' }}>◈</span>
            <span>FAIRLENS</span>
            <span className="text-slate-700">/</span>
            <span className="text-slate-300 capitalize">{page}</span>
            <span className="blink ml-1" style={{ color: '#6366f1' }}>_</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
            <span>AI GOVERNANCE PLATFORM</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
              <span className="text-green-400">ONLINE</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {page === 'dashboard'
            ? <Dashboard onNavigate={setPage} />
            : <Page />}
        </div>
      </main>
    </div>
  )
}
