import { useState } from 'react'
import api from '../api'
import { Download, AlertCircle, FileText, Shield } from 'lucide-react'
import Card from '../components/Card'

const REGS = [
  { name: 'EU AI Act',             desc: 'High-risk AI systems must meet strict fairness and transparency requirements.', color: '#6366f1', icon: '🇪🇺' },
  { name: 'GDPR Article 22',       desc: 'Individuals have rights regarding automated decision-making.',                  color: '#06b6d4', icon: '🔒' },
  { name: 'Google Responsible AI', desc: 'AI must be socially beneficial and avoid creating unfair bias.',               color: '#8b5cf6', icon: '🌐' },
  { name: 'IBM AI Fairness 360',   desc: 'Disparate impact ratio should be ≥ 0.8 (80% rule).',                          color: '#10b981', icon: '⚖️' },
]

export default function ComplianceReport() {
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [downloaded, setDownloaded] = useState(false)

  async function download() {
    setLoading(true); setError(null)
    try {
      const res = await api.get('/api/report/generate', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a   = document.createElement('a')
      a.href = url; a.download = 'fairlens_compliance_report.pdf'; a.click()
      URL.revokeObjectURL(url)
      setDownloaded(true)
    } catch (e) {
      setError(e.response?.data?.detail || 'Run bias detection first to generate a report.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: '#6366f1' }}>Module 05</span>
            <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, #6366f1, transparent)' }} />
          </div>
          <h1 className="text-2xl font-bold text-white font-space">AI Compliance Report</h1>
          <p className="text-slate-500 text-sm mt-1">Generate a downloadable PDF aligned with global AI regulations</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono"
          style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
          <Shield size={12} /> COMPLIANCE ENGINE
        </div>
      </div>

      {/* Regulation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REGS.map(r => (
          <Card key={r.name}>
            <div className="flex items-start gap-3">
              <span className="text-xl">{r.icon}</span>
              <div>
                <div className="font-semibold text-white text-sm font-space mb-1">{r.name}</div>
                <div className="text-xs font-mono" style={{ color: '#475569' }}>{r.desc}</div>
              </div>
              <div className="ml-auto w-1.5 h-1.5 rounded-full mt-1 pulse-dot" style={{ background: r.color }} />
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <FileText size={14} style={{ color: '#6366f1' }} />
          <span className="font-semibold text-white font-space text-sm">Report Contents</span>
        </div>
        <ul className="space-y-2 mb-5">
          {[
            'Dataset overview and sensitive attribute summary',
            'Bias detection results with risk level classification',
            'Regulatory compliance check (EU AI Act, GDPR, Google, IBM)',
            'Bias correction before/after comparison',
            'Actionable recommendations for responsible deployment',
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm font-mono" style={{ color: '#64748b' }}>
              <span style={{ color: '#6366f1' }}>◈</span> {item}
            </li>
          ))}
        </ul>

        <button onClick={download} disabled={loading}
          className="btn-primary px-6 py-2.5 text-white rounded-lg font-medium text-sm flex items-center gap-2 disabled:opacity-50">
          <Download size={14} />
          {loading ? <><span>GENERATING PDF</span><span className="blink">_</span></> : 'DOWNLOAD COMPLIANCE REPORT'}
        </button>

        {error && (
          <div className="flex items-center gap-2 rounded-lg p-3 text-sm font-mono mt-3"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {downloaded && (
          <div className="mt-3 p-3 rounded-lg text-sm font-mono"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7' }}>
            ✓ Downloaded — fairlens_compliance_report.pdf
          </div>
        )}
      </Card>
    </div>
  )
}
