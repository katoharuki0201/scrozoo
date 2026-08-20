import { z } from 'zod'

export const adminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
})

export const adminSessionSchema = z.object({
  token: z.string(),
  admin: adminUserSchema,
})

export const adminLoginFormSchema = z.object({
  email: z.email('有効なメールアドレスを入力してください。'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください。'),
})

const monthlyRevenueSchema = z.object({
  month: z.string(),
  subscription: z.number(),
  tips: z.number(),
  gross: z.number(),
  platformFee: z.number(),
  creatorPayout: z.number(),
})

export const adminDashboardSchema = z.object({
  metrics: z.object({
    totalUsers: z.number(),
    creators: z.number(),
    activeSubscribers: z.number(),
    monthlyGross: z.number(),
    monthlyFee: z.number(),
    userGrowthRate: z.number(),
    revenueGrowthRate: z.number(),
  }),
  monthlyRevenue: z.array(monthlyRevenueSchema),
  recentActivities: z.array(z.object({
    id: z.string(),
    title: z.string(),
    detail: z.string(),
    occurredAt: z.string(),
    type: z.enum(['user', 'support', 'creator']),
  })),
})

export const managedUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: z.enum(['viewer', 'creator']),
  planStatus: z.enum(['free', 'active', 'cancel_scheduled', 'not_applicable']),
  status: z.enum(['active', 'suspended']),
  registeredAt: z.string(),
})

export const adminUsersSchema = z.object({ users: z.array(managedUserSchema) })

export const adminSubscriberSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  email: z.email(),
  creatorId: z.string(),
  creatorName: z.string(),
  joinedAt: z.string(),
  nextRenewalDate: z.string(),
  status: z.enum(['active', 'cancel_scheduled']),
  supportedMonths: z.number(),
})

export const adminSubscribersSchema = z.object({
  subscribers: z.array(adminSubscriberSchema),
})

export const adminRevenueSchema = z.object({
  feeRate: z.number(),
  months: z.array(monthlyRevenueSchema),
})

export const adminCreatorSchema = z.object({
  id: z.string(),
  zooName: z.string(),
  managerName: z.string(),
  email: z.email(),
  issuedAt: z.string(),
  status: z.enum(['active', 'suspended']),
  supporterCount: z.number(),
})

export const adminCreatorsSchema = z.object({ creators: z.array(adminCreatorSchema) })

export const createCreatorFormSchema = z.object({
  zooName: z.string().trim().min(1, '動物園名を入力してください。').max(50),
  managerName: z.string().trim().min(1, '担当者名を入力してください。').max(30),
  email: z.email('有効なメールアドレスを入力してください。'),
  password: z.string().min(8, '初期パスワードは8文字以上で入力してください。'),
})

export const issuedCreatorSchema = z.object({
  creator: adminCreatorSchema,
  temporaryPassword: z.string(),
})

export type AdminUser = z.infer<typeof adminUserSchema>
export type AdminSession = z.infer<typeof adminSessionSchema>
export type AdminLoginFormValues = z.infer<typeof adminLoginFormSchema>
export type AdminDashboard = z.infer<typeof adminDashboardSchema>
export type ManagedUser = z.infer<typeof managedUserSchema>
export type AdminSubscriber = z.infer<typeof adminSubscriberSchema>
export type AdminRevenue = z.infer<typeof adminRevenueSchema>
export type AdminCreator = z.infer<typeof adminCreatorSchema>
export type CreateCreatorFormValues = z.infer<typeof createCreatorFormSchema>
export type IssuedCreator = z.infer<typeof issuedCreatorSchema>
