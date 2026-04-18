import { useState } from 'react'
import { motion as Motion } from 'motion/react'
import { Bot, Cpu, Send, ShieldCheck, Sparkles, Terminal, Zap } from 'lucide-react'
import { queryVoiceAgent } from '../auth'

export default function AIAgent() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Operations analysis complete. Stock levels for SKU: STR-12MM-B are critical. Would you like me to draft a purchase order for the usual distributor?',
    },
  ])
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim()) return

    const submitted = input
    setMessages((prev) => [...prev, { role: 'user', content: submitted }])
    setInput('')

    queryVoiceAgent({ queryText: submitted })
      .then((data) => {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.answer || 'No matching inventory response was returned.' }])
      })
      .catch((error) => {
        setMessages((prev) => [...prev, { role: 'assistant', content: `Voice query failed: ${error.message || 'unknown error'}` }])
      })
  }

  return (
    <Motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-white shadow-2xl shadow-primary/40">
          <Bot size={40} />
          <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-secondary-container">
            <Sparkles size={12} />
          </div>
        </div>
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-on-surface">Industrial Agent.</h2>
          <p className="mx-auto mt-2 max-w-md text-on-surface-variant">Harnessing predictive models to optimize supply chain and billing efficiency.</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <AIFeature icon={<Zap size={20} />} title="Predictive Scaling" desc="Analyze demand patterns" />
        <AIFeature icon={<ShieldCheck size={20} />} title="Audit Guardian" desc="Monitor billing anomalies" />
        <AIFeature icon={<Cpu size={20} />} title="Auto-Onboarding" desc="Extract client data from files" />
      </div>

      <div className="flex h-[500px] flex-col overflow-hidden rounded-3xl border border-outline-variant/10 bg-white shadow-2xl shadow-blue-900/5">
        <div className="flex items-center justify-between border-b border-outline-variant/5 bg-surface-container/50 px-6 py-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
            <Terminal size={14} />
            Diagnostic Console
          </div>
          <div className="flex gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-400" />
            <div className="h-2 w-2 rounded-full bg-orange-400" />
            <div className="h-2 w-2 rounded-full bg-secondary" />
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm font-medium ${m.role === 'user' ? 'rounded-tr-none bg-primary text-white' : 'rounded-tl-none border border-outline-variant/5 bg-surface-container-low text-on-surface'}`}>
                {m.content}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-outline-variant/5 bg-surface-container-lowest p-4">
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask for stock forecasts, invoice audits or client summaries..."
              className="flex-1 rounded-2xl border-none bg-surface-container px-6 py-4 text-sm font-medium outline-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} className="rounded-xl bg-primary p-4 text-white shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-95">
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </Motion.div>
  )
}

function AIFeature({ icon, title, desc }) {
  return (
    <div className="rounded-2xl border border-outline-variant/10 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container text-primary">{icon}</div>
      <h4 className="mb-1 text-sm font-bold text-on-surface">{title}</h4>
      <p className="text-xs text-on-surface-variant/60">{desc}</p>
    </div>
  )
}
