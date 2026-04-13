import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard        from './pages/Dashboard'
import DataAnalyzer     from './pages/DataAnalyzer'
import BiasDetection    from './pages/BiasDetection'
import Explainability   from './pages/Explainability'
import BiasCorrection   from './pages/BiasCorrection'
import ComplianceReport from './pages/ComplianceReport'
import LiveMonitor      from './pages/LiveMonitor'
import GeminiExplain    from './pages/GeminiExplain'

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
  const [page,        setPage]        = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const Page = PAGES[page]

  function navigate(p) {
    setPage(p)
    setSidebarOpen(false) // close sidebar on mobile after nav
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#020817' }}>
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent)' }} />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — hidden on mobile unless open */}
      <div className={`fixed md:relative z-30 h-full transition-transform duration-300 md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar active={page} onNavigate={navigate} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto cyber-grid relative w-full">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-6 py-3"
          style={{ background: 'rgba(2,8,23,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>

          {/* Hamburger — mobile only */}
          <button className="md:hidden flex flex-col gap-1 p-1 mr-3"
            onClick={() => setSidebarOpen(v => !v)}>
            <span className="w-5 h-0.5 rounded" style={{ background: '#6366f1' }} />
            <span className="w-5 h-0.5 rounded" style={{ background: '#6366f1' }} />
            <span className="w-5 h-0.5 rounded" style={{ background: '#6366f1' }} />
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span style={{ color: '#6366f1' }}>◈</span>
            <span className="hidden sm:inline">FAIRLENS</span>
            <span className="text-slate-700 hidden sm:inline">/</span>
            <span className="text-slate-300 capitalize">{page}</span>
            <span className="blink ml-1" style={{ color: '#6366f1' }}>_</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
            <span className="hidden md:inline">AI GOVERNANCE PLATFORM</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
              <span className="text-green-400">ONLINE</span>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {page === 'dashboard'
            ? <Dashboard onNavigate={navigate} />
            : <Page />}
        </div>
      </main>
    </div>
  )
}
