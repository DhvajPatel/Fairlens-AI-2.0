import { useState, useEffect, useRef } from 'react'
import api from '../api'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts'
import { Activity, AlertTriangle, CheckCircle, RefreshCw, Radio } from 'lucide-react'
import Card from '../components/Card'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs font-mono"
      style={{ background: '#0a0f1e', border: '1px solid rgba(99,102,241,0.4)', color: '#e2e8f0' }}>
      <div style={{ color: '#475569' }}>Step {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  )
}

export default function LiveMonitor() {
  const [data,    setData]    = useState(null)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef(null)

  async function fetchSnapshot() {
    try {
      const { data: d } = await api.get('/api/monitor/stream')
      setData(d)
    } catch (_) {}
  }

  function toggleMonitor() {
    if (running) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      setRunning(false)
    } else {
      fetchSnapshot()
      intervalRef.current = setInterval(fetchSnapshot, 3000)
      setRunning(true)
    }
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: '#f43f5e' }}>Module 06</span>
            <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, #f43f5e, transparent)' }} />
          </div>
          <h1 className="text-2xl font-bold text-white font-space">Real-Time AI Monitor</h1>
          <p className="text-slate-500 text-sm mt-1">Track bias drift and model fairness over live decisions</p>
        </div>
        <button onClick={toggleMonitor}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all font-mono"
          style={running
            ? { background: 'rgba(244,63,94,0.15)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.4)', boxShadow: '0 0 15px rgba(244,63,94,0.2)' }
            : { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
          {running
            ? <><RefreshCw size={14} className="animate-spin" /> STOP MONITOR</>
            : <><Radio size={14} /> START MONITOR</>}
        </button>
      </div>

      {data && (
        <>
          {/* Alert banner */}
          <div className="flex items-center gap-3 p-4 rounded-xl font-mono text-sm"
            style={data.alert
              ? { background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.4)', color: '#fca5a5', boxShadow: '0 0 20px rgba(244,63,94,0.1)' }
              : { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7', boxShadow: '0 0 20px rgba(16,185,129,0.1)' }}>
            {data.alert ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            <span className="font-medium">{data.alert_message}</span>
            {running && <span className="ml-auto flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-current pulse-dot" /> LIVE</span>}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Current DI',       value: data.current_di,                    color: data.current_di < 0.65 ? '#f43f5e' : '#10b981' },
              { label: 'Total Decisions',  value: data.total_decisions.toLocaleString(), color: '#06b6d4' },
              { label: 'Flagged',          value: data.flagged_decisions,             color: '#f59e0b' },
            ].map(({ label, value, color }) => (
              <Card key={label}>
                <div className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: '#475569' }}>{label}</div>
                <div className="text-3xl font-bold font-space" style={{ color, textShadow: `0 0 15px ${color}60` }}>{value}</div>
              </Card>
            ))}
          </div>

          {/* DI chart */}
          <Card>
            <div className="text-sm font-semibold text-white font-space mb-4">Disparate Impact Over Time</div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.snapshots}>
                <defs>
                  <linearGradient id="diGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" stroke="#1e293b" tick={{ fontSize: 11, fill: '#475569', fontFamily: 'monospace' }} />
                <YAxis domain={[0.3, 1.0]} stroke="#1e293b" tick={{ fontSize: 11, fill: '#475569', fontFamily: 'monospace' }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0.8} stroke="#f59e0b" strokeDasharray="4 4"
                  label={{ value: 'Fair (0.8)', fill: '#f59e0b', fontSize: 10, fontFamily: 'monospace' }} />
                <ReferenceLine y={0.65} stroke="#f43f5e" strokeDasharray="4 4"
                  label={{ value: 'Critical (0.65)', fill: '#f43f5e', fontSize: 10, fontFamily: 'monospace' }} />
                <Area type="monotone" dataKey="disparate_impact" name="DI"
                  stroke="#6366f1" strokeWidth={2} fill="url(#diGrad)"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(99,102,241,0.8))' }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Approval rate chart */}
          <Card>
            <div className="text-sm font-semibold text-white font-space mb-4">Approval Rate Over Time</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.snapshots}>
                <defs>
                  <linearGradient id="arGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" stroke="#1e293b" tick={{ fontSize: 11, fill: '#475569', fontFamily: 'monospace' }} />
                <YAxis stroke="#1e293b" tick={{ fontSize: 11, fill: '#475569', fontFamily: 'monospace' }} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="approval_rate" name="Approval %"
                  stroke="#10b981" strokeWidth={2} fill="url(#arGrad)"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.8))' }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {!data && !running && (
        <div className="text-center py-20">
          <div className="float-anim inline-block mb-4">
            <Activity size={48} style={{ color: '#1e293b' }} />
          </div>
          <p className="font-mono text-sm" style={{ color: '#334155' }}>
            [ AWAITING SIGNAL ] — Click START MONITOR to begin<span className="blink">_</span>
          </p>
        </div>
      )}
    </div>
  )
}
