import { useState } from 'react'
import { X, Send, FileText, Bot, Scale, UploadCloud, MessageSquare } from 'lucide-react'
import { apiClient } from '../api/client'

export default function LegalAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your Legal AI Assistant. I have been trained on official land acquisition laws and guidelines. Ask me any question regarding compensation, timelines, or administrative bottlenecks.'
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    try {
      const res = await apiClient.post('/projects/legal/chat', { question: userMessage.content })
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.answer, context: res.data.context_used }])
    } catch (err) {
      console.error(err)
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error connecting to the AI service. Please ensure the backend is running and the API key is configured.' }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setUploading(true)
    try {
      const fastApiUrl = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000'
      const res = await fetch(`${fastApiUrl}/legal/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      
      if (res.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: `Successfully ingested ${data.filename}! Added ${data.chunks_indexed} new legal chunks to my memory. You can now ask questions about this document.` }])
      } else {
        alert(data.detail || 'Upload failed.')
      }
    } catch (err) {
      console.error(err)
      alert('Failed to connect to AI Service for upload.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      {/* Expanded Chat Window */}
      {isOpen && (
        <div className="mb-4 flex h-[550px] w-[400px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-300 ease-out origin-bottom-right dark:border-ink-800 dark:bg-ink-900">
          
          {/* Header */}
          <div className="flex items-center justify-between bg-ink-900 px-5 py-4 shadow-md dark:bg-ink-950 border-b border-ink-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
                <Scale size={18} />
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-amber-500">
                  Legal Dispute RAG
                </div>
                <div className="font-display text-[16px] font-semibold text-white tracking-tight leading-tight mt-0.5">
                  AI Assistant
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Upload Banner */}
          <div className="flex items-center justify-between bg-slate-50 px-4 py-3 border-b border-slate-200 dark:bg-ink-800/50 dark:border-ink-800">
            <span className="text-[12px] text-slate-600 font-medium dark:text-slate-300">Ingest new legal laws (PDF):</span>
            <label className="cursor-pointer bg-ink-800 hover:bg-ink-900 text-white text-[10px] uppercase font-mono tracking-wider px-3.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5 shadow-sm dark:bg-ink-700 dark:hover:bg-ink-600">
              <UploadCloud size={13} />
              {uploading ? 'Uploading...' : 'Upload PDF'}
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50/50 dark:bg-ink-900/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-amber-500 text-white rounded-tr-sm font-medium' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm dark:bg-ink-800 dark:border-ink-700 dark:text-slate-200'
                }`}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-2 text-amber-600 dark:text-amber-400">
                      <Bot size={14} />
                      <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">PrediXa AI</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  
                  {/* Render context sources if they exist */}
                  {msg.context && msg.context.length > 0 && (
                    <div className="mt-3.5 border-t border-slate-100 pt-3 dark:border-ink-700">
                      <div className="text-[10px] font-mono uppercase text-slate-400 mb-2 flex items-center gap-1.5 font-semibold">
                        <FileText size={12} /> Sources referenced:
                      </div>
                      <ul className="text-[11px] text-slate-500 list-disc pl-4 space-y-1.5 dark:text-slate-400">
                        {msg.context.map((ctx, idx) => (
                          <li key={idx} className="line-clamp-2 italic leading-snug">"...{ctx.substring(0, 80)}..."</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5 dark:bg-ink-800 dark:border-ink-700">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-200 bg-white p-4 shadow-sm z-10 dark:border-ink-800 dark:bg-ink-900">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a legal question..."
                className="w-full rounded-full border border-slate-300 bg-slate-50 py-3 pl-4 pr-12 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all shadow-inner dark:bg-ink-950 dark:border-ink-700 dark:text-white dark:focus:border-amber-500 dark:focus:bg-ink-950"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-2 rounded-full p-2 text-amber-500 hover:bg-amber-500/10 disabled:opacity-40 transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-16 w-16 items-center justify-center rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border border-transparent ${
          isOpen 
            ? 'bg-ink-800 text-white dark:bg-ink-700' 
            : 'bg-amber-500 text-white shadow-amber-500/20 hover:bg-amber-400'
        }`}
      >
        {isOpen ? <X size={26} /> : <MessageSquare size={26} className="fill-current" />}
      </button>
    </div>
  )
}
