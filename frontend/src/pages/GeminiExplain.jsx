import { useState, useEffect } from 'react'
import api from '../api'
import { Sparkles, AlertCircle, Key, Copy, CheckCircle, ExternalLink, ChevronRight } from 'lucide-react'
import Card from '../components/Card'
import { getDatasetState, subscribeDatasetStore } from '../store/datasetStore'

function MarkdownText({ text }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1.5 text-sm font-mono leading-relaxed" style={{ color: '#94a3b8' }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />
        const isBullet = /^[-•*]\s/.test(line.trim()) || /^\d+\.\s/.test(line.trim())
        const formatted = line
          .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>')
          .replace(/`(.*?)`/g, '<code style="color:#06b6d4;background:rgba(6,182,212,0.1);padding:1px 4px;border-radius:3px">$1</code>')
        return (
          <div key={i} className={`flex gap-2 ${isBullet ? 'pl-2' : ''}`}>
            {isBullet && <span style={{ color: '#6366f1' }}>◈</span>}
            <span dangerouslySetInnerHTML={{ __html: isBullet ? formatted.replace(/^[-•*\d.]\s+/, '') : formatted }} />
          </div>
        )
      })}
    </div>
  )
}

export default function GeminiExplain() {
  const [apiKey,      setApiKey]      = useState(() => localStorage.getItem('gemini_key') || '')
  const [result,      setResult]      = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [status,      setStatus]      = useState(null)
  const [copied,      setCopied]      = useState(false)
  const [showKey,     setShowKey]     = useState(false)
  const [hasDataset,  setHasDataset]  = useState(!!getDatasetState().uploadResult)
  const [biasReady,   setBiasReady]   = useState(false)

  // Keep dataset state in sync
  useEffect(() => {
    return subscribeDatasetStore(s => setHasDataset(!!s.uploadResult))
  }, [])

  // Poll backend to know if bias detection has been run
  useEffect(() => {
    async function checkBias() {
      try {
        const { data } = await api.get('/api/gemini/status')
        setStatus(data)
        setBiasReady(data.bias_ready)
      } catch (_) {}
    }
    checkBias()
    // Only poll when dataset is loaded, use longer interval
    const id = hasDataset ? setInterval(checkBias, 8000) : null
    return () => { if (id) clearInterval(id) }
  }, [hasDataset])

  // Determine what's blocking the user
  const missingDataset = !hasDataset
  const missingBias    = hasDataset && !biasReady
  const missingKey     = !apiKey.trim()
  const canRun         = !missingDataset && !missingBias && !missingKey && !loading

  async function run() {
    setLoading(true); setError(null); setResult(null)
    localStorage.setItem('gemini_key', apiKey.trim())
    try {
      const { data } = await api.post('/api/gemini/explain', { api_key: apiKey.trim() })
      setResult(data)
    } catch (e) {
      const detail = e.response?.data?.detail || ''
      if (detail === 'NO_API_KEY')          setError('No API key provided.')
      else if (e.response?.status === 401)  setError('Invalid API key — check your Gemini key.')
      else if (e.response?.status === 429)  setError('Free tier quota exceeded. Wait ~1 minute and try again.')
      else if (e.response?.status === 503)  setError('Gemini is temporarily overloaded. Wait 30 seconds and try again.')
      else if (e.response?.status === 404)  setError('Model not available. The backend will auto-select another — try again.')
      else if (detail.includes('bias'))     setError('Run Bias Detection first, then come back.')
      else setError(detail || 'Gemini request failed.')
    } finally {
      setLoading(false)
    }
  }

  function copyText() {
    if (!result?.explanation) return
    navigator.clipboard.writeText(result.explanation)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function clearKey() {
    localStorage.removeItem('gemini_key')
    setApiKey('')
  }

  // Steps checklist
  const steps = [
    { done: hasDataset, label: 'Upload a dataset',      action: 'Go to Data Analyzer →' },
    { done: biasReady,  label: 'Run Bias Detection',    action: 'Go to Bias Detection →' },
    { done: !!apiKey.trim(), label: 'Enter Gemini API key', action: 'Enter key below →' },
  ]
  const allDone = steps.every(s => s.done)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: '#f59e0b' }}>Module 07</span>
            <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, #f59e0b, transparent)' }} />
          </div>
          <h1 className="text-2xl font-bold text-white font-space">Gemini AI Explainer</h1>
          <p className="text-slate-500 text-sm mt-1">Get a plain-English explanation of your bias results powered by Google Gemini</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24' }}>
          <Sparkles size={12} /> GEMINI AI
        </div>
      </div>

      {/* Package not installed */}
      {status && !status.available && (
        <div className="flex items-center gap-3 p-4 rounded-xl font-mono text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
          <AlertCircle size={16} />
          <span>google-genai not installed. Run: <code className="px-1 rounded" style={{ background: 'rgba(239,68,68,0.15)' }}>pip install google-genai</code></span>
        </div>
      )}

      {/* Prerequisites checklist */}
      {!allDone && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={14} style={{ color: '#f59e0b' }} />
            <span className="text-sm font-semibold text-white font-space">Complete these steps first</span>
          </div>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg"
                style={{
                  background: step.done ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.06)',
                  border: `1px solid ${step.done ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: step.done ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.15)' }}>
                  {step.done
                    ? <CheckCircle size={12} style={{ color: '#10b981' }} />
                    : <span className="text-xs font-bold" style={{ color: '#f59e0b' }}>{i + 1}</span>}
                </div>
                <span className="text-sm font-mono flex-1"
                  style={{ color: step.done ? '#6ee7b7' : '#94a3b8',
                    textDecoration: step.done ? 'line-through' : 'none' }}>
                  {step.label}
                </span>
                {!step.done && (
                  <span className="text-xs font-mono flex items-center gap-1" style={{ color: '#f59e0b' }}>
                    {step.action} <ChevronRight size={11} />
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* API Key input */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Key size={14} style={{ color: '#f59e0b' }} />
          <span className="text-sm font-semibold text-white font-space">Gemini API Key</span>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
            className="ml-auto flex items-center gap-1 text-xs font-mono"
            style={{ color: '#475569' }}
            onMouseEnter={e => e.currentTarget.style.color = '#06b6d4'}
            onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
            Get free key <ExternalLink size={10} />
          </a>
        </div>

        <div className="flex gap-2">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="AIza..."
            className="flex-1 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none"
            style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${missingKey ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.2)'}` }}
            onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
            onBlur={e => e.target.style.borderColor = missingKey ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.2)'}
            onKeyDown={e => e.key === 'Enter' && canRun && run()}
          />
          <button onClick={() => setShowKey(v => !v)}
            className="px-3 rounded-lg text-xs font-mono"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.2)' }}>
            {showKey ? 'hide' : 'show'}
          </button>
          {apiKey && (
            <button onClick={clearKey}
              className="px-3 rounded-lg text-xs font-mono"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              clear
            </button>
          )}
        </div>
        <p className="text-xs font-mono mt-2" style={{ color: '#334155' }}>
          Stored in localStorage only — never saved to any file or server.
        </p>

        <button onClick={run} disabled={!canRun}
          className="mt-4 btn-primary px-6 py-2.5 text-white rounded-lg font-medium text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          title={
            missingDataset ? 'Upload a dataset first' :
            missingBias    ? 'Run Bias Detection first' :
            missingKey     ? 'Enter your Gemini API key' : ''
          }>
          <Sparkles size={14} />
          {loading
            ? <><span>ASKING GEMINI</span><span className="blink">_</span></>
            : missingDataset ? 'Upload Dataset First'
            : missingBias   ? 'Run Bias Detection First'
            : missingKey    ? 'Enter API Key First'
            : 'GENERATE AI EXPLANATION'}
        </button>
      </Card>

      {error && (
        <div className="rounded-lg p-3 text-sm font-mono"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span className="flex-1">{error}</span>
            {(error.includes('overloaded') || error.includes('quota') || error.includes('try again')) && (
              <button onClick={run} disabled={!canRun}
                className="px-3 py-1 rounded text-xs font-mono flex-shrink-0"
                style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {result && (
        <Card glow>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { label: `target: ${result.context.target}`,     bg: 'rgba(99,102,241,0.15)',  color: '#a5b4fc',  border: 'rgba(99,102,241,0.3)' },
              { label: `sensitive: ${result.context.sensitive}`, bg: 'rgba(245,158,11,0.15)', color: '#fbbf24',  border: 'rgba(245,158,11,0.3)' },
              { label: `DI: ${result.context.disparate_impact}`, bg: 'rgba(6,182,212,0.15)',  color: '#06b6d4',  border: 'rgba(6,182,212,0.3)' },
              {
                label: `risk: ${result.context.risk}`,
                bg:     result.context.risk === 'HIGH' ? 'rgba(239,68,68,0.15)' : result.context.risk === 'MODERATE' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                color:  result.context.risk === 'HIGH' ? '#f87171' : result.context.risk === 'MODERATE' ? '#fbbf24' : '#6ee7b7',
                border: result.context.risk === 'HIGH' ? 'rgba(239,68,68,0.3)' : result.context.risk === 'MODERATE' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)',
              },
            ].map(p => (
              <span key={p.label} className="px-2 py-1 rounded text-xs font-mono"
                style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}` }}>
                {p.label}
              </span>
            ))}
            <span className="ml-auto px-2 py-1 rounded text-xs font-mono flex items-center gap-1"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24' }}>
              <Sparkles size={10} /> {result.model}
            </span>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white font-space">AI Analysis</span>
            <button onClick={copyText}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono"
              style={{ background: 'rgba(99,102,241,0.1)', color: copied ? '#10b981' : '#94a3b8', border: '1px solid rgba(99,102,241,0.2)' }}>
              {copied ? <><CheckCircle size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
            </button>
          </div>

          <div className="p-4 rounded-lg" style={{ background: 'rgba(2,8,23,0.6)', border: '1px solid rgba(99,102,241,0.1)' }}>
            <MarkdownText text={result.explanation} />
          </div>
        </Card>
      )}
    </div>
  )
}
