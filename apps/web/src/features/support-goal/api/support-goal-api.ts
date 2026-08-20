import { queryOptions } from '@tanstack/react-query'
import { api } from '../../../shared/lib/api'
import {
  supportGoalSchema,
  type SupportGoalFormValues,
} from '../model/support-goal'

export async function getMySupportGoal() {
  const response = await api.get<unknown>('profiles/me/support-goal')

  if (response === null) return null

  return supportGoalSchema.parse(response)
}

export async function saveMySupportGoal(values: SupportGoalFormValues) {
  return supportGoalSchema.parse(
    await api.put<unknown>('profiles/me/support-goal', values),
  )
}

export async function deleteMySupportGoal() {
  await api.delete<void>('profiles/me/support-goal')
}

export const mySupportGoalQueryOptions = queryOptions({
  queryKey: ['profile', 'me', 'support-goal'],
  queryFn: getMySupportGoal,
})
