import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { publicUserProfileQueryOptions } from '../features/profile/api/profile-api'
import { ProfileScreen } from '../features/profile/components/profile-screen'

export function PublicUserProfilePage() {
  const { userId = '' } = useParams()
  const query = useQuery(publicUserProfileQueryOptions(userId))
  if (query.isPending) return <main className="mx-auto grid h-dvh max-w-[430px] place-items-center bg-slate-50"><div className="size-8 animate-spin rounded-full border-3 border-slate-200 border-t-slate-700" /></main>
  if (query.isError) return <main className="mx-auto grid h-dvh max-w-[430px] place-items-center bg-slate-50 px-8 text-center font-bold">プロフィールを表示できませんでした。</main>
  return <ProfileScreen profile={query.data} viewMode="public" />
}
