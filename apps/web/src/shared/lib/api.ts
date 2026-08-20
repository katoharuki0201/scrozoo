import ky from 'ky'
import type { Options } from 'ky'

const apiBaseUrl = `${(import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '')}/`

export const apiClient = ky.create({
  baseUrl: apiBaseUrl,
  credentials: 'include',
  retry: 0,
  timeout: 15_000,
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const isAdminRequest = new URL(request.url).pathname.includes('/api/admin/')
        const token = isAdminRequest ? localStorage.getItem('admin-token') : null

        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`)
        }
      },
    ],
  },
})

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

async function request<T>(
  method: Method,
  path: string,
  options?: Options,
): Promise<T> {
  const response = await apiClient[method](path, options)

  if (response.status === 204) {
    return undefined as T
  }

  return response.json<T>()
}

const withJson = (json: unknown, options?: Options): Options =>
    json === undefined ? { ...options } : { json, ...options }

export const api = {
  get: <T>(path: string, options?: Options) =>
    request<T>('get', path, options),
  post: <T>(path: string, json?: unknown, options?: Options) =>
    request<T>('post', path, withJson(json, options)),
  put: <T>(path: string, json?: unknown, options?: Options) =>
    request<T>('put', path, withJson(json, options)),
  patch: <T>(path: string, json?: unknown, options?: Options) =>
    request<T>('patch', path, withJson(json, options)),
  delete: <T>(path: string, options?: Options) =>
    request<T>('delete', path, options),
}
