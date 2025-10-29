"use client"
import React, { useState } from 'react'
import { toast } from 'sonner'
import apiClient from '@/lib/api'

const STYLES = ['Fantasy','Realistic','Anime','Cyberpunk','Watercolor','Oil Painting']
const MOODS = ['Epic','Calm','Dark','Bright','Mystical','Dramatic']
const MOVEMENTS = ['Impressionism','Surrealism','Pop Art','Art Nouveau']
const QUALITIES = ['4K','8K','High Detail','Ultra Realistic','Artstation Trending']

export default function PromptGeneratorClient() {
  const [input, setInput] = useState('')
  const [style, setStyle] = useState(STYLES[0])
  const [mood, setMood] = useState(MOODS[0])
  const [movement, setMovement] = useState(MOVEMENTS[0])
  const [quality, setQuality] = useState(QUALITIES[1])
  const [detail, setDetail] = useState(2)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [advanced, setAdvanced] = useState({ lighting: '', camera: '', palette: '', keywords: '' })
  const [tagsInput, setTagsInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [cameraLens, setCameraLens] = useState('50mm')
  const [negativeKeywords, setNegativeKeywords] = useState('')
  const [includeAspect, setIncludeAspect] = useState(true)
  const [loading, setLoading] = useState(false)
  const [variations, setVariations] = useState<string[]>([])
  const [structured, setStructured] = useState<any[] | null>(null)
  const [editablePrompts, setEditablePrompts] = useState<string[]>([])
  const [metadata, setMetadata] = useState<any>(null)

  const charCount = input.length

  async function generate(random=false) {
    if (!input && !random) {
      toast.error('Please enter a description or use Surprise Me')
      return
    }
    setLoading(true)
    setVariations([])
    try {
      const body = {
        userInput: random ? 'Surprise me' : input,
        style,
        mood,
        artMovement: movement,
        aspectRatio,
        cameraLens,
        negativeKeywords,
        quality,
        detailLevel: detail,
        advancedOptions: advanced,
        includeAspect,
      }
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
  const res = await fetch(`${API_BASE}/prompts/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Generation failed')
      }
  const j = await res.json()
  setVariations(j.variations || [])
  setStructured(j.structured_variations || null)
  // initialize editable prompts from structured or variations
  const initial = (j.structured_variations && j.structured_variations.length)
    ? j.structured_variations.map((s: any) => s.prompt || '')
    : (j.variations || [])
  setEditablePrompts(initial)
  setMetadata(j.metadata || null)
    } catch (e: any) {
      console.error('generate failed', e)
      toast.error(e?.message || 'Failed to generate')
    } finally {
      setLoading(false)
    }
  }

  function surpriseMe() {
    // randomize simple selections and call generate
    setStyle(STYLES[Math.floor(Math.random()*STYLES.length)])
    setMood(MOODS[Math.floor(Math.random()*MOODS.length)])
    setMovement(MOVEMENTS[Math.floor(Math.random()*MOVEMENTS.length)])
    setQuality(QUALITIES[Math.floor(Math.random()*QUALITIES.length)])
    setDetail(Math.floor(Math.random()*3)+1)
    generate(true)
  }

  async function handleSave(text: string) {
    if (!apiClient.isAuthenticated()) { window.location.href = '/login'; return }
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
      // derive a short title from the text
      const title = text.split('\n')[0].split(' ').slice(0,8).join(' ').slice(0,80) || 'Generated Prompt'
      // parse tags input (comma separated) as a fallback to explicit tags state
      const finalTags = tags.length ? tags : (tagsInput || '').split(',').map(t => t.trim()).filter(Boolean)
      const res = await fetch(`${API_BASE}/prompt-templates/from-generated/`, {
        method: 'POST',
        headers: apiClient.headers(),
        body: JSON.stringify({ prompt_text: text, title, tag_names: finalTags, description: '' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || err?.detail || 'Failed to save generated prompt')
      }
      const j = await res.json()
      toast.success('Saved to your library')
      // navigate to the new prompt detail
      if (j?.id) window.location.href = `/prompts/${j.id}`
    } catch (e: any) {
      console.error('save failed', e)
      toast.error(e?.message || 'Failed to save')
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto backdrop-blur-sm">
      <div className="mb-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">🎨 AI Prompt Generator</h2>
        <p className="text-sm text-slate-300 mt-1">Let AI help you craft rich, production-ready prompts</p>
      </div>
      <div className="glass-card p-6 mb-6 border border-white/6 shadow-xl">
        <label className="block text-sm font-medium mb-2">What do you want to create?</label>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Example: A magical cat in an enchanted forest" className="w-full p-4 rounded-lg bg-slate-900/50 placeholder-slate-400 text-white border border-white/6 min-h-[96px] resize-none focus:outline-none focus:ring-2 focus:ring-purple-500" />
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <div>Style:</div>
          <div>Characters: {charCount}</div>
        </div>

        <div className="flex gap-3 mt-3">
          <select value={style} onChange={(e) => setStyle(e.target.value)} className="flex-1 p-2 rounded-md bg-slate-800/40 text-white border border-white/6">
            {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={mood} onChange={(e) => setMood(e.target.value)} className="flex-1 p-2 rounded-md bg-slate-800/40 text-white border border-white/6">
            {MOODS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex gap-3 mt-3">
          <select value={movement} onChange={(e) => setMovement(e.target.value)} className="flex-1 p-2 rounded-md bg-slate-800/40 text-white border border-white/6">
            {MOVEMENTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={quality} onChange={(e) => setQuality(e.target.value)} className="flex-1 p-2 rounded-md bg-slate-800/40 text-white border border-white/6">
            {QUALITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="mt-4">
          <label className="text-sm mb-2 block">Detail Level</label>
          <input type="range" min={1} max={5} value={detail} onChange={(e) => setDetail(parseInt(e.target.value))} className="w-full" />
          <div className="text-xs text-muted-foreground flex justify-between"><span>Low</span><span>High</span></div>
        </div>

        <div className="mt-4">
          <button className="inline-flex items-center gap-2 mr-3 px-4 py-2 rounded-lg text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow hover:scale-[1.02] transition-transform" onClick={() => generate(false)} disabled={loading}>{loading ? 'Generating…' : '✨ Generate with AI'}</button>
          <button className="px-3 py-2 rounded-lg border border-white/10 text-white/90 bg-slate-800/40 hover:bg-slate-800/50" onClick={surpriseMe} disabled={loading}>🎲 Surprise Me</button>
          <button className="ml-3 text-sm text-slate-300" onClick={() => setAdvancedOpen(s => !s)}>{advancedOpen ? 'Hide Advanced' : 'Advanced Options ▼'}</button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="p-2 rounded-md bg-slate-800/40 text-white border border-white/6">
            <option>16:9</option>
            <option>4:5</option>
            <option>1:1</option>
            <option>9:16</option>
          </select>
          <input value={cameraLens} onChange={(e) => setCameraLens(e.target.value)} placeholder="Camera / Lens (e.g. 50mm)" className="p-2 rounded-md bg-slate-800/40 text-white border border-white/6" />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <input id="includeAspect" type="checkbox" checked={includeAspect} onChange={(e) => setIncludeAspect(e.target.checked)} />
          <label htmlFor="includeAspect" className="text-sm text-muted-foreground">Include aspect ratio hint in prompts</label>
        </div>

        {advancedOpen && (
          <div className="mt-4 border-t pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input value={advanced.lighting} onChange={(e) => setAdvanced({...advanced, lighting: e.target.value})} placeholder="Lighting (Golden Hour, Studio...)" className="p-2 rounded-md bg-transparent border border-white/6" />
              <input value={advanced.camera} onChange={(e) => setAdvanced({...advanced, camera: e.target.value})} placeholder="Camera angle (Close-up, Aerial...)" className="p-2 rounded-md bg-transparent border border-white/6" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input value={advanced.palette} onChange={(e) => setAdvanced({...advanced, palette: e.target.value})} placeholder="Color palette (Vibrant, Muted...)" className="p-2 rounded-md bg-transparent border border-white/6" />
              <input value={advanced.keywords} onChange={(e) => setAdvanced({...advanced, keywords: e.target.value})} placeholder="Additional keywords" className="p-2 rounded-md bg-transparent border border-white/6" />
            </div>
              <div className="mt-3">
                <label className="text-sm mb-2 block text-slate-300">Tags (press Enter or comma to add)</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {tags.map(t => (
                    <div key={t} className="flex items-center gap-2 px-3 py-1 rounded-full bg-violet-700/30 text-violet-100 text-xs">
                      <span>#{t}</span>
                      <button onClick={() => { setTags(tags.filter(x => x !== t)) }} className="text-xs text-violet-200/80">✕</button>
                    </div>
                  ))}
                  <input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        const parts = tagsInput.split(',').map(s => s.trim()).filter(Boolean)
                        if (parts.length) {
                          const merged = Array.from(new Set([...tags, ...parts]))
                          setTags(merged)
                          setTagsInput('')
                        }
                      }
                    }}
                    placeholder="e.g. fantasy, forest, magical"
                    className="p-2 rounded-md bg-slate-800/40 text-white border border-white/6 flex-1 min-w-[120px]"
                  />
                </div>
              </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">🎯 Generated Prompts</h3>
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i=> (
              <div key={i} className="glass-card p-4">
                <div className="h-4 w-3/4 mb-2 skeleton"></div>
                <div className="h-3 w-full skeleton" style={{height:80}}></div>
              </div>
            ))}
          </div>
        )}

        {!loading && variations.length > 0 && (
          <div className="space-y-4">
            {(structured && structured.length ? structured : variations).map((item: any, idx: number) => {
                  const initialText = typeof item === 'string' ? item : (item.prompt || item.text || '')
                  const title = typeof item === 'string' ? null : (item.title || null)
                  const aspect = typeof item === 'string' ? null : (item.aspect || null)
                  const current = editablePrompts[idx] ?? initialText
                  return (
                  <div key={idx} className="glass-card p-4">
                    {title && <div className="font-semibold mb-2">{title}</div>}
                    <label className="text-xs text-muted-foreground">Prompt Text</label>
                    <textarea value={current} onChange={(e) => {
                      const copy = [...editablePrompts]
                      copy[idx] = e.target.value
                      setEditablePrompts(copy)
                    }} className="w-full p-2 rounded-md bg-transparent border border-white/6 mb-2 min-h-[96px]" />
                    {aspect && <div className="text-xs text-muted-foreground mb-2">Aspect hint: {aspect}</div>}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tags.length ? tags.map(t => <div key={t} className="px-2 py-1 rounded-md bg-white/6 text-xs">#{t}</div>) : null}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { navigator.clipboard.writeText(current); toast.success('Copied') }} className="px-3 py-1 rounded-md btn-gradient">📋 Copy</button>
                      <button onClick={() => handleSave(current)} className="px-3 py-1 rounded-md border border-white/8">💾 Save to Library</button>
                      <button onClick={() => { setInput(current); window.scrollTo({ top: 0, behavior: 'smooth' }); toast('Loaded into editor') }} className="px-3 py-1 rounded-md border border-white/8">🔄 Refine</button>
                    </div>
                  </div>
                  )
                })}
            <div>
              <button className="px-3 py-2 rounded-md border border-white/8" onClick={() => generate(false)}>🔄 Generate New Variations</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
