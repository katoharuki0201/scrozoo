import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '../../../shared/lib/api'

const healthSchema = z.object({
  status: z.literal('ok'),
  mode: z.string(),
})

export type Health = z.infer<typeof healthSchema>

export async function getHealth() {
  const response = await api.get<unknown>('health')

  return healthSchema.parse(response)
}

export const healthQueryOptions = queryOptions({
  queryKey: ['system', 'health'],
  queryFn: getHealth,
})
