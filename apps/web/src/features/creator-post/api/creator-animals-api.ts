import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '../../../shared/lib/api'

const schema = z.array(z.object({ id: z.string(), name: z.string(), species: z.string() }))
export const creatorAnimalsQueryOptions = queryOptions({ queryKey: ['publisher', 'animals'], queryFn: async () => schema.parse(await api.get<unknown>('publisher/animals')) })
