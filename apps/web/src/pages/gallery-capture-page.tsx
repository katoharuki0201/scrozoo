import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  createGalleryPost,
  qrVisitSessionQueryOptions,
} from '../features/qr/api/qr-api'
import { captureVideoFrame, optimizeImage } from '../features/qr/lib/image'
import { CameraIcon, ChevronLeftIcon, ImageIcon, XIcon } from '../shared/ui/icons'

const MAX_FILE_BYTES = 10 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function GalleryCapturePage() {
  const cameraSupported = Boolean(navigator.mediaDevices?.getUserMedia)
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(() =>
    cameraSupported
      ? null
      : 'この端末ではカメラを利用できません。ライブラリから写真を選択できます。',
  )
  const [imageError, setImageError] = useState<string | null>(null)
  const [isPreparingImage, setIsPreparingImage] = useState(false)
  const sessionQuery = useQuery(qrVisitSessionQueryOptions(sessionId))
  const postMutation = useMutation({
    mutationFn: createGalleryPost,
    onSuccess: async () => {
      const zooId = sessionQuery.data?.zoo.id
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['profile', 'zoo', zooId] }),
      ])

      if (zooId) {
        void navigate(`/zoos/${zooId}?tab=gallery&posted=1`, { replace: true })
      }
    },
  })

  useEffect(() => {
    if (!sessionQuery.data || imageDataUrl) return

    if (!cameraSupported) return

    let stream: MediaStream | null = null
    let cancelled = false

    void navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      })
      .then((cameraStream) => {
        if (cancelled) {
          cameraStream.getTracks().forEach((track) => track.stop())
          return
        }

        stream = cameraStream
        if (videoRef.current) {
          videoRef.current.srcObject = cameraStream
          void videoRef.current.play()
        }
      })
      .catch(() => {
        setCameraError('カメラを起動できません。ライブラリから写真を選択できます。')
      })

    return () => {
      cancelled = true
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [cameraSupported, imageDataUrl, sessionQuery.data])

  function capturePhoto() {
    try {
      if (!videoRef.current) return
      setImageDataUrl(captureVideoFrame(videoRef.current))
      setImageError(null)
    } catch (error) {
      setImageError(error instanceof Error ? error.message : '写真を撮影できませんでした。')
    }
  }

  async function selectImage(file: File | undefined) {
    if (!file) return
    setImageError(null)

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError('JPEG・PNG・WebPの画像を選択してください。')
      return
    }

    if (file.size > MAX_FILE_BYTES) {
      setImageError('画像は10MB以下のファイルを選択してください。')
      return
    }

    setIsPreparingImage(true)
    try {
      setImageDataUrl(await optimizeImage(file))
    } catch (error) {
      setImageError(error instanceof Error ? error.message : '画像を読み込めませんでした。')
    } finally {
      setIsPreparingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (sessionQuery.isPending) {
    return (
      <main className="mx-auto grid h-dvh max-w-[430px] place-items-center bg-slate-950 text-white shadow-2xl">
        <div aria-label="訪問情報を確認中" className="size-8 animate-spin rounded-full border-3 border-white/25 border-t-white" role="status" />
      </main>
    )
  }

  if (sessionQuery.isError) {
    return (
      <main className="mx-auto grid h-dvh max-w-[430px] place-items-center bg-slate-50 px-8 text-center shadow-2xl">
        <div>
          <p className="text-lg font-black text-slate-800">訪問情報を確認できませんでした</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">QRコードの有効期限が切れた可能性があります。</p>
          <Link className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white" to="/scan">QRコードを読み直す</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="relative mx-auto h-dvh max-w-[430px] overflow-hidden bg-slate-950 text-white shadow-2xl">
      {imageDataUrl ? (
        <img alt="投稿する写真のプレビュー" className="absolute inset-0 size-full object-contain" src={imageDataUrl} />
      ) : (
        <video className="absolute inset-0 size-full object-cover" muted playsInline ref={videoRef} />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/75" />

      <header className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Link aria-label="QR読み取りに戻る" className="grid size-11 place-items-center rounded-full bg-black/35 backdrop-blur-sm" to="/scan">
          <ChevronLeftIcon className="size-8" />
        </Link>
        <div>
          <p className="text-xs font-bold text-orange-300">{sessionQuery.data.zoo.name}</p>
          <h1 className="text-lg font-black">{imageDataUrl ? '投稿する写真を確認' : '写真を撮影・選択'}</h1>
        </div>
      </header>

      {!imageDataUrl && cameraError && (
        <div className="absolute inset-x-6 top-1/2 z-10 -translate-y-1/2 rounded-2xl bg-white/95 p-5 text-center text-slate-900 shadow-xl">
          <CameraIcon className="mx-auto size-8 text-slate-500" />
          <p className="mt-3 text-sm font-bold leading-6">{cameraError}</p>
        </div>
      )}

      <div className="absolute inset-x-5 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-20">
        {imageError && <p className="mb-3 rounded-xl bg-red-600/90 px-4 py-3 text-center text-sm font-bold" role="alert">{imageError}</p>}
        {postMutation.isError && <p className="mb-3 rounded-xl bg-red-600/90 px-4 py-3 text-center text-sm font-bold" role="alert">投稿できませんでした。もう一度お試しください。</p>}

        {imageDataUrl ? (
          <div className="grid grid-cols-[1fr_2fr] gap-3">
            <button className="h-13 rounded-xl border border-white/35 bg-black/40 text-sm font-bold backdrop-blur-sm" disabled={postMutation.isPending} onClick={() => setImageDataUrl(null)} type="button">選び直す</button>
            <button className="h-13 rounded-xl bg-gradient-to-r from-orange-400 via-rose-500 to-sky-400 text-sm font-black shadow-lg disabled:opacity-60" disabled={postMutation.isPending} onClick={() => postMutation.mutate({ sessionId, imageDataUrl })} type="button">
              {postMutation.isPending ? '投稿中...' : 'ギャラリーに投稿'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <button className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/15 text-xs font-bold backdrop-blur-sm" disabled={isPreparingImage} onClick={() => fileInputRef.current?.click()} type="button">
              <ImageIcon className="size-5" />
              ライブラリ
            </button>
            <button aria-label="写真を撮影" className="grid size-18 place-items-center rounded-full border-4 border-white bg-white/25 shadow-lg disabled:opacity-40" disabled={Boolean(cameraError)} onClick={capturePhoto} type="button">
              <span className="size-13 rounded-full bg-white" />
            </button>
            <button className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/15 text-xs font-bold backdrop-blur-sm" onClick={() => void navigate('/scan')} type="button">
              <XIcon className="size-5" />
              キャンセル
            </button>
          </div>
        )}
      </div>

      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => void selectImage(event.target.files?.[0])}
        ref={fileInputRef}
        type="file"
      />
    </main>
  )
}
