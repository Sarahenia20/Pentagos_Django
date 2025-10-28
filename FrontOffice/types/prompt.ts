export type Prompt = {
  id: string
  title: string
  prompt_text: string
  description?: string
  category?: { id: number; name: string; slug: string }
  tags?: { id: number; name: string }[]
  variables?: string[]
  author?: string | null
  author_id?: number | null
  created_at?: string
  likes_count?: number
  is_public?: boolean
}
