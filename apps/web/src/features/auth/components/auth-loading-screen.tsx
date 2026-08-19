export function AuthLoadingScreen() {
  return (
    <main className="grid min-h-svh place-items-center bg-slate-50">
      <div
        aria-label="読み込み中"
        className="size-8 animate-spin rounded-full border-3 border-slate-200 border-t-sky-600"
        role="status"
      />
    </main>
  )
}
