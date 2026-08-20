import { queryOptions } from '@tanstack/react-query'
import { api } from '../../../shared/lib/api'
import { supportPlanSchema, supportPlansSchema } from '../model/support-plan'

export async function getSupportPlans() {
  return supportPlansSchema.parse(
    await api.get<unknown>('profiles/me/support-plans'),
  )
}

export async function cancelSupportPlan(planId: string) {
  return supportPlanSchema.parse(
    await api.post<unknown>(`support-plans/${planId}/cancel`),
  )
}

export async function createSupportPlan(zooId: string) {
  return supportPlanSchema.parse(
    await api.post<unknown>('support-plans', { zooId }),
  )
}

export const supportPlansQueryOptions = queryOptions({
  queryKey: ['profile', 'me', 'support-plans'],
  queryFn: getSupportPlans,
})
