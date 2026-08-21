import { useMutation } from '@tanstack/react-query'
import QrScanner from 'qr-scanner'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { verifyQrCode } from '../features/qr/api/qr-api'
import { BottomNavigation } from '../shared/ui/bottom-navigation'

export function QrScanPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const payloadFromUrl = searchParams.get('payload')
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)
  const handledRef = useRef(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  async function startScanner(scanner: QrScanner, errorMessage: string) {
    try {
      await scanner.start()
      if (scannerRef.current !== scanner) return

      const video = videoRef.current
      if (video?.srcObject) await video.play()
      setCameraError(null)
    } catch {
      if (scannerRef.current === scanner) setCameraError(errorMessage)
    }
  }

  const verification = useMutation({
    mutationFn: verifyQrCode,
    onSuccess: (session) => {
      void navigate(`/scan/capture/${session.sessionId}`)
    },
    onError: () => {
      handledRef.current = false
      setCameraError('このQRコードはScrozooで使用できません。')
      const scanner = scannerRef.current
      if (scanner) {
        void scanner.start().catch(() => {
          if (scannerRef.current === scanner) setCameraError('カメラを起動できません。端末の設定を確認してください。')
        })
      }
    },
  })
  const verifyQrRef = useRef(verification.mutate)

  useEffect(() => {
    verifyQrRef.current = verification.mutate
  }, [verification.mutate])

  useEffect(() => {
    if (payloadFromUrl) {
      handledRef.current = true
      verifyQrRef.current(payloadFromUrl)
      return
    }

    const video = videoRef.current
    if (!video) return

    const scanner = new QrScanner(
      video,
      (result) => {
        if (handledRef.current) return
        handledRef.current = true
        scanner.stop()
        verifyQrRef.current(result.data)
      },
      {
        preferredCamera: 'environment',
        highlightScanRegion: false,
        highlightCodeOutline: false,
        returnDetailedScanResult: true,
        maxScansPerSecond: 10,
      },
    )
    scannerRef.current = scanner

    const startTimer = window.setTimeout(() => {
      void startScanner(scanner, 'カメラを起動できません。カメラの使用を許可してください。')
    }, 0)

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        scanner.stop()
      } else if (!handledRef.current) {
        void startScanner(scanner, 'カメラを再開できません。端末の設定を確認してください。')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearTimeout(startTimer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (scannerRef.current === scanner) scannerRef.current = null
      scanner.destroy()
    }
  }, [payloadFromUrl])

  function retryCamera() {
    handledRef.current = false
    setCameraError(null)
    const scanner = scannerRef.current
    if (scanner) void startScanner(scanner, 'カメラを起動できません。端末の設定を確認してください。')
  }

  return (
    <main className="relative mx-auto h-dvh max-w-[430px] overflow-hidden bg-slate-950 text-white shadow-2xl">
      <video className="absolute inset-0 size-full object-cover" muted playsInline ref={videoRef} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

      <header className="absolute inset-x-0 top-0 z-10 px-5 pt-[max(1.5rem,env(safe-area-inset-top))] text-center">
        <h1 className="text-xl font-black">QRコードを読み取る</h1>
        <p className="mt-2 text-sm text-white/75">QRコードを枠内に合わせてください</p>
      </header>

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 size-64 -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.18)]">
        <span className="absolute -left-1 -top-1 size-12 rounded-tl-[2rem] border-l-5 border-t-5 border-orange-400" />
        <span className="absolute -right-1 -top-1 size-12 rounded-tr-[2rem] border-r-5 border-t-5 border-orange-400" />
        <span className="absolute -bottom-1 -left-1 size-12 rounded-bl-[2rem] border-b-5 border-l-5 border-orange-400" />
        <span className="absolute -bottom-1 -right-1 size-12 rounded-br-[2rem] border-b-5 border-r-5 border-orange-400" />
      </div>

      <div className="absolute inset-x-5 bottom-25 z-20">
        {cameraError && (
          <div className="rounded-2xl bg-white/95 p-4 text-center text-slate-900 shadow-xl">
            <p className="text-sm font-bold leading-6">{cameraError}</p>
            <button className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white" onClick={retryCamera} type="button">カメラを再試行</button>
          </div>
        )}

        {verification.isPending && (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-black/60 px-4 py-3 text-sm font-bold backdrop-blur-sm" role="status">
            <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            QRコードを確認中...
          </div>
        )}

      </div>

      <BottomNavigation />
    </main>
  )
}
