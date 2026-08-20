import { api } from '../../../shared/lib/api'
import {
  adminCreatorsSchema,
  adminDashboardSchema,
  adminLoginFormSchema,
  adminRevenueSchema,
  adminSessionSchema,
  adminSubscribersSchema,
  adminUserSchema,
  adminUsersSchema,
  issuedCreatorSchema,
  type AdminLoginFormValues,
  type CreateCreatorFormValues,
} from '../model/admin'

export async function loginAdmin(values: AdminLoginFormValues) {
  return adminSessionSchema.parse(await api.post<unknown>('admin/auth/login', adminLoginFormSchema.parse(values)))
}

export async function getAdminSession() {
  return adminUserSchema.parse(await api.get<unknown>('admin/auth/session'))
}

export async function logoutAdmin() {
  await api.post<void>('admin/auth/logout')
}

export async function getAdminDashboard() {
  return adminDashboardSchema.parse(await api.get<unknown>('admin/dashboard'))
}

export async function getAdminUsers() {
  return adminUsersSchema.parse(await api.get<unknown>('admin/users'))
}

export async function getAdminSubscribers() {
  return adminSubscribersSchema.parse(await api.get<unknown>('admin/subscribers'))
}

export async function getAdminRevenue() {
  return adminRevenueSchema.parse(await api.get<unknown>('admin/revenue'))
}

export async function getAdminCreators() {
  return adminCreatorsSchema.parse(await api.get<unknown>('admin/creators'))
}

export async function createAdminCreator(values: CreateCreatorFormValues) {
  return issuedCreatorSchema.parse(await api.post<unknown>('admin/creators', values))
}

export async function updateAdminCreatorStatus(id: string, status: 'active' | 'suspended') {
  return issuedCreatorSchema.shape.creator.parse(
    await api.patch<unknown>(`admin/creators/${id}/status`, { status }),
  )
}
