import { useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { creatorVisitQrQueryOptions } from '../features/creator-visit-qr/api/creator-visit-qr-api'
import { BottomNavigation } from '../shared/ui/bottom-navigation'
import { ChevronLeftIcon, DownloadIcon, QrCodeIcon } from '../shared/ui/icons'

export function CreatorVisitQrPage() {
  const qrQuery = useQuery(creatorVisitQrQueryOptions)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (!qrQuery.data) return

    let active = true
    void QRCode.toDataURL(qrQuery.data.payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 1024,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).then((url) => {
      if (active) setImageUrl(url)
    }).catch(() => {
      if (active) setImageError(true)
    })

    return () => {
      active = false
    }
  }, [qrQuery.data])

  function downloadQr() {
    if (!imageUrl || !qrQuery.data) return
    const anchor = document.createElement('a')
    anchor.href = imageUrl
    anchor.download = `scrozoo-${qrQuery.data.zoo.id}-visit-qr.png`
    anchor.click()
  }

  function retry() {
    setImageUrl(null)
    setImageError(false)
    void qrQuery.refetch()
  }

  return (
    <main className="relative mx-auto h-dvh max-w-[430px] overflow-hidden bg-slate-50 shadow-2xl">
      <div className="h-full overflow-y-auto px-5 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <header className="flex items-center">
          <Link aria-label="マイページに戻る" className="grid size-11 place-items-center rounded-full text-slate-800 active:bg-slate-200" to="/mypage">
            <ChevronLeftIcon className="size-8" />
          </Link>
          <div className="ml-2">
            <p className="text-xs font-black tracking-[0.16em] text-orange-500 uppercase">Visit QR</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">来園QRコード</h1>
          </div>
        </header>

        <p className="mt-5 text-sm leading-6 text-slate-500">園内に掲示し、来園者のサポーターギャラリー投稿にご利用ください。</p>

        {qrQuery.isPending && (
          <div className="grid min-h-96 place-items-center">
            <div aria-label="QRコードを生成中" className="size-8 animate-spin rounded-full border-3 border-slate-200 border-t-slate-700" role="status" />
          </div>
        )}

        {(qrQuery.isError || imageError) && (
          <div className="mt-8 rounded-2xl bg-red-50 p-5 text-center">
            <p className="text-sm font-bold text-red-700">QRコードを生成できませんでした。</p>
            <button className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white" onClick={retry} type="button">もう一度試す</button>
          </div>
        )}

        {qrQuery.data && !qrQuery.isError && !imageError && (
          <>
            <section className="mt-7 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-orange-50 text-orange-500">
                  <QrCodeIcon className="size-6" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900">{qrQuery.data.zoo.name}</h2>
                  <p className="mt-0.5 text-xs font-bold text-emerald-600">有効期限なし</p>
                </div>
              </div>

              <div className="mt-5 aspect-square overflow-hidden rounded-2xl bg-white p-2 ring-1 ring-slate-200">
                {imageUrl ? (
                  <img alt={`${qrQuery.data.zoo.name}の来園QRコード`} className="size-full" src={imageUrl} />
                ) : (
                  <div className="grid size-full place-items-center">
                    <div aria-label="QR画像を作成中" className="size-7 animate-spin rounded-full border-3 border-slate-200 border-t-slate-700" role="status" />
                  </div>
                )}
              </div>
            </section>

            <button className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-sm font-black text-white shadow-lg disabled:opacity-40" disabled={!imageUrl} onClick={downloadQr} type="button">
              <DownloadIcon className="size-5" />
              PNGで保存
            </button>

            <section className="mt-5 rounded-2xl bg-sky-50 p-4 text-sm leading-6 text-sky-900">
              <p className="font-black">掲示時のご案内</p>
              <p className="mt-1">このQRコードに有効期限はありません。読み取った来園者の投稿権限は2時間有効です。</p>
            </section>
          </>
        )}
      </div>
      <BottomNavigation activePath="/mypage/visit-qr" />
    </main>
  )
}
