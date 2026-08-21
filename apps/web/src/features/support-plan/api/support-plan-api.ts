import { queryOptions } from '@tanstack/react-query'
import { api } from '../../../shared/lib/api'
import { mockCheckoutSchema, supportPlanSchema, supportPlansSchema } from '../model/support-plan'

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
  const checkoutWindow = window.open('', '_blank')
  if (checkoutWindow) checkoutWindow.opener = null

  try {
    const checkout = mockCheckoutSchema.parse(
      await api.post<unknown>('support-plans', { zooId }),
    )
    if (checkoutWindow) checkoutWindow.location.href = checkout.checkoutUrl
    else window.open(checkout.checkoutUrl, '_blank', 'noopener,noreferrer')
    return checkout.plan
  } catch (error) {
    checkoutWindow?.close()
    throw error
  }
}

export const supportPlansQueryOptions = queryOptions({
  queryKey: ['profile', 'me', 'support-plans'],
  queryFn: getSupportPlans,
})
