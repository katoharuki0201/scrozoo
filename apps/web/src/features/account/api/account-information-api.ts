import { queryOptions } from '@tanstack/react-query'
import { api } from '../../../shared/lib/api'
import {
  accountInformationSchema,
  type AccountInformationFormValues,
} from '../model/account-information'

export async function getAccountInformation() {
  return accountInformationSchema.parse(
    await api.get<unknown>('profiles/me/account'),
  )
}

export async function updateAccountInformation(values: AccountInformationFormValues) {
  return accountInformationSchema.parse(
    await api.patch<unknown>('profiles/me/account', values),
  )
}

export const accountInformationQueryOptions = queryOptions({
  queryKey: ['profile', 'me', 'account'],
  queryFn: getAccountInformation,
})
