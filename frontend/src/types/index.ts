export interface User {
  id: number
  username: string
  email: string
  display_name: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  last_login_at: string | null
}

export interface Tag {
  id: number
  name: string
  created_at: string
}

export interface Folder {
  id: number
  name: string
  parent_id: number | null
  created_at: string
  updated_at: string
  children?: Folder[]
}

export interface NoteSummary {
  id: number
  title: string
  slug: string
  excerpt: string | null
  folder_id: number | null
  is_favorite: boolean
  is_archived: boolean
  is_deleted: boolean
  tags: Tag[]
  created_at: string
  updated_at: string
}

export interface NoteDetail extends NoteSummary {
  content: string
  deleted_at: string | null
}

export interface NoteListResponse {
  items: NoteSummary[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export interface NoteCreateInput {
  title: string
  content: string
  folder_id?: number | null
  tag_ids?: number[]
}

export interface NoteUpdateInput {
  title?: string
  content?: string
  folder_id?: number | null
  is_favorite?: boolean
  is_archived?: boolean
  tag_ids?: number[]
}

export interface BacklinkNote {
  id: number
  title: string
  slug: string
  excerpt: string | null
}

export interface NoteRevisionSummary {
  id: number
  note_id: number
  created_at: string
  created_by: number
}

export interface NoteRevisionDetail extends NoteRevisionSummary {
  content: string
}

export interface GraphNode {
  id: number
  title: string
  slug: string
  tag_names: string[]
  // D3 simulation fields
  x?: number
  y?: number
  vx?: number
  vy?: number
}

export interface GraphEdge {
  source: number | GraphNode
  target: number | GraphNode
}

export interface GraphResponse {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface SearchResult {
  id: number
  title: string
  slug: string
  excerpt: string | null
  title_highlight?: string | null
  content_highlight?: string | null
  tags: Tag[]
  is_favorite: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface SearchResponse {
  query: string
  results: SearchResult[]
  total: number
  took_ms: number
}

export interface Attachment {
  id: number
  note_id: number | null
  original_filename: string
  content_type: string
  file_size: number
  width: number | null
  height: number | null
  created_at: string
  url?: string | null
}

export interface AuthTokens {
  access_token: string
  token_type: string
  expires_in: number
}
