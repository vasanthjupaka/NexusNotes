/// <reference types="vite/client" />
import axios, { AxiosError } from 'axios'
import type {
  User,
  NoteDetail,
  NoteListResponse,
  NoteCreateInput,
  NoteUpdateInput,
  Folder,
  Tag,
  BacklinkNote,
  NoteRevisionSummary,
  NoteRevisionDetail,
  GraphResponse,
  SearchResponse,
  Attachment,
  AuthTokens,
} from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexus_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token and redirect if on a protected route
      localStorage.removeItem('nexus_token')
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ==========================================
// API Services
// ==========================================

export const authApi = {
  register: async (data: { username: string; email: string; password: string; display_name?: string }) => {
    const res = await api.post<User>('/auth/register', data)
    return res.data
  },
  login: async (data: { email: string; password: string }) => {
    const res = await api.post<AuthTokens>('/auth/login', data)
    return res.data
  },
  logout: async () => {
    const res = await api.post<{ message: string }>('/auth/logout')
    return res.data
  },
  getMe: async () => {
    const res = await api.get<User>('/auth/me')
    return res.data
  },
}

export const notesApi = {
  list: async (params?: {
    folder_id?: number | null
    is_favorite?: boolean
    is_archived?: boolean
    is_deleted?: boolean
    tag_id?: number | null
    page?: number
    page_size?: number
  }) => {
    const res = await api.get<NoteListResponse>('/notes', { params })
    return res.data
  },
  get: async (id: number) => {
    const res = await api.get<NoteDetail>(`/notes/${id}`)
    return res.data
  },
  create: async (data: NoteCreateInput) => {
    const res = await api.post<NoteDetail>('/notes', data)
    return res.data
  },
  update: async (id: number, data: NoteUpdateInput) => {
    const res = await api.put<NoteDetail>(`/notes/${id}`, data)
    return res.data
  },
  delete: async (id: number) => {
    const res = await api.delete<{ message: string }>(`/notes/${id}`)
    return res.data
  },
  permanentDelete: async (id: number) => {
    const res = await api.delete<{ message: string }>(`/notes/${id}/permanent`)
    return res.data
  },
  restore: async (id: number) => {
    const res = await api.post<NoteDetail>(`/notes/${id}/restore`)
    return res.data
  },
  getBacklinks: async (id: number) => {
    const res = await api.get<BacklinkNote[]>(`/notes/${id}/backlinks`)
    return res.data
  },
  getRevisions: async (id: number) => {
    const res = await api.get<NoteRevisionSummary[]>(`/notes/${id}/revisions`)
    return res.data
  },
  getRevision: async (noteId: number, revisionId: number) => {
    const res = await api.get<NoteRevisionDetail>(`/notes/${noteId}/revisions/${revisionId}`)
    return res.data
  },
}

export const foldersApi = {
  list: async () => {
    const res = await api.get<Folder[]>('/folders')
    return res.data
  },
  create: async (data: { name: string; parent_id?: number | null }) => {
    const res = await api.post<Folder>('/folders', data)
    return res.data
  },
  update: async (id: number, data: { name?: string; parent_id?: number | null }) => {
    const res = await api.put<Folder>(`/folders/${id}`, data)
    return res.data
  },
  delete: async (id: number) => {
    const res = await api.delete<{ message: string }>(`/folders/${id}`)
    return res.data
  },
}

export const tagsApi = {
  list: async () => {
    const res = await api.get<Tag[]>('/tags')
    return res.data
  },
  create: async (data: { name: string }) => {
    const res = await api.post<Tag>('/tags', data)
    return res.data
  },
  delete: async (id: number) => {
    const res = await api.delete<{ message: string }>(`/tags/${id}`)
    return res.data
  },
}

export const searchApi = {
  search: async (q: string, page = 1, page_size = 20) => {
    const res = await api.get<SearchResponse>('/search', { params: { q, page, page_size } })
    return res.data
  },
}

export const graphApi = {
  getGraph: async () => {
    const res = await api.get<GraphResponse>('/graph')
    return res.data
  },
}

export const attachmentsApi = {
  upload: async (file: File, note_id?: number | null) => {
    const formData = new FormData()
    formData.append('file', file)
    if (note_id) {
      formData.append('note_id', note_id.toString())
    }
    const res = await api.post<Attachment>('/attachments/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },
  get: async (id: number) => {
    const res = await api.get<Attachment>(`/attachments/${id}`)
    return res.data
  },
  delete: async (id: number) => {
    const res = await api.delete<{ message: string }>(`/attachments/${id}`)
    return res.data
  },
}
