import { Prompt } from '@/types/prompt'
import { apiClient } from '@/lib/api'

// Keep env var name consistent with `api.ts` (NEXT_PUBLIC_API_BASE)
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

async function handleRes(res: Response) {
  // Read response body as text first so we can handle both JSON and HTML error pages
  const contentType = res.headers.get('content-type') || ''
  const text = await res.text()

  if (!res.ok) {
    // Try to extract a useful message from JSON error bodies
    try {
      const json = JSON.parse(text)
      const msg = json.detail || json.error || json.message || JSON.stringify(json)
      throw new Error(String(msg).slice(0, 500))
    } catch (e) {
      // Not JSON — if it's HTML, avoid stuffing the whole page into the UI
      if (contentType.includes('text/html') || text.trim().startsWith('<')) {
        // Try to capture the <title> if present, otherwise a short excerpt
        const titleMatch = text.match(/<title>(.*?)<\/title>/i)
        const short = titleMatch ? titleMatch[1] : text.split('\n').map((l) => l.trim()).find(Boolean) || res.statusText
        throw new Error(`Server error: ${String(short).slice(0, 240)}`)
      }
      throw new Error(text || res.statusText)
    }
  }

  // Successful response: parse JSON when possible, otherwise return raw text
  if (contentType.includes('application/json')) {
    try { return JSON.parse(text) } catch (e) { return {} }
  }
  try { return JSON.parse(text) } catch (e) { return text }
}

export async function fetchPrompts(query = ''): Promise<Prompt[]> {
  // `query` may be either:
  // - a simple search string (e.g. "hello") -> mapped to ?search=hello
  // - a raw query string starting with ? (e.g. "?search=hi&tags__name=foo") -> appended directly
  let endpoint = `${API_BASE}/api/prompt-templates/`
  if (query) {
    if (query.startsWith('?') || query.includes('=')) endpoint += query
    else endpoint += `?search=${encodeURIComponent(query)}`
  }
  const res = await fetch(endpoint, { credentials: 'include', headers: apiClient.headers() })
  const data = await handleRes(res)
  return data.results || data
}

export async function fetchPromptsWithMeta(query = ''): Promise<{ results: Prompt[]; count?: number; next?: string | null; previous?: string | null }> {
  let endpoint = `${API_BASE}/api/prompt-templates/`
  if (query) {
    if (query.startsWith('?') || query.includes('=')) endpoint += query
    else endpoint += `?search=${encodeURIComponent(query)}`
  }
  const res = await fetch(endpoint, { credentials: 'include', headers: apiClient.headers() })
  const data = await handleRes(res)
  // normalize to { results, count, next, previous }
  if (Array.isArray(data)) return { results: data }
  return {
    results: data.results || [],
    count: data.count,
    next: data.next,
    previous: data.previous,
  }
}

export async function fetchPrompt(id: string): Promise<Prompt> {
  const res = await fetch(`${API_BASE}/api/prompt-templates/${id}/`, { credentials: 'include', headers: apiClient.headers() })
  return handleRes(res)
}

export async function createPrompt(payload: Partial<Prompt>): Promise<Prompt> {
  const res = await fetch(`${API_BASE}/api/prompt-templates/`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...apiClient.headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleRes(res)
}

export async function updatePrompt(id: string, payload: Partial<Prompt>): Promise<Prompt> {
  const res = await fetch(`${API_BASE}/api/prompt-templates/${id}/`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { ...apiClient.headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleRes(res)
}

export async function deletePrompt(id: string) {
  const res = await fetch(`${API_BASE}/api/prompt-templates/${id}/`, {
    method: 'DELETE',
    credentials: 'include',
    headers: apiClient.headers(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Failed to delete')
  }
  return true
}

export async function likePrompt(id: string) {
  const res = await fetch(`${API_BASE}/api/prompt-templates/${id}/like/`, {
    method: 'POST',
    credentials: 'include',
    headers: apiClient.headers(),
  })
  return handleRes(res)
}

export async function unlikePrompt(id: string) {
  const res = await fetch(`${API_BASE}/api/prompt-templates/${id}/unlike/`, {
    method: 'POST',
    credentials: 'include',
    headers: apiClient.headers(),
  })
  return handleRes(res)
}

export async function savePrompt(id: string) {
  const res = await fetch(`${API_BASE}/api/user-prompts/`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...apiClient.headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt_id: id }),
  })
  return handleRes(res)
}

export async function fetchMyPrompts() {
  const res = await fetch(`${API_BASE}/api/user-prompts/`, { credentials: 'include', headers: apiClient.headers() })
  return handleRes(res)
}

export async function deleteUserPrompt(id: string) {
  const res = await fetch(`${API_BASE}/api/user-prompts/${id}/`, {
    method: 'DELETE',
    credentials: 'include',
    headers: apiClient.headers(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Failed to delete saved prompt')
  }
  return true
}

export async function fetchMyTemplates() {
  const res = await fetch(`${API_BASE}/api/prompt-templates/my-templates/`, { credentials: 'include', headers: apiClient.headers() })
  return handleRes(res)
}

export async function fetchLikedPrompts() {
  const res = await fetch(`${API_BASE}/api/user-prompts/favorites/`, { credentials: 'include', headers: apiClient.headers() })
  return handleRes(res)
}

export async function fetchCategories() {
  const res = await fetch(`${API_BASE}/api/prompt-categories/`, { credentials: 'include' })
  const data = await handleRes(res)
  return Array.isArray(data) ? data : (data.results || [])
}

export async function fetchTags() {
  const res = await fetch(`${API_BASE}/api/prompt-tags/`, { credentials: 'include' })
  const data = await handleRes(res)
  return Array.isArray(data) ? data : (data.results || [])
}
