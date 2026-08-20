import { useQuery } from '@tanstack/react-query'
import { myProfileQueryOptions } from '../features/profile/api/profile-api'
import { ProfileScreen } from '../features/profile/components/profile-screen'

export function MyProfilePage() {
  const profileQuery = useQuery(myProfileQueryOptions)

  if (profileQuery.isPending) {
    return <ProfileLoadingScreen />
  }

  if (profileQuery.isError) {
    return (
      <ProfileErrorScreen onRetry={() => void profileQuery.refetch()} />
    )
  }

  return <ProfileScreen profile={profileQuery.data} viewMode="self" />
}

function ProfileLoadingScreen() {
  return (
    <main className="mx-auto grid h-dvh max-w-[430px] place-items-center bg-slate-50 shadow-2xl">
      <div aria-label="プロフィールを読み込み中" className="size-8 animate-spin rounded-full border-3 border-slate-200 border-t-slate-700" role="status" />
    </main>
  )
}

function ProfileErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="mx-auto grid h-dvh max-w-[430px] place-items-center bg-slate-50 px-8 text-center shadow-2xl">
      <div>
        <p className="font-bold text-slate-800">プロフィールを読み込めませんでした</p>
        <button className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white" onClick={onRetry} type="button">
          もう一度試す
        </button>
      </div>
    </main>
  )
}
