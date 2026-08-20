function waitForEvent(target: EventTarget, event: string, errorEvent = 'error') {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener(event, complete)
      target.removeEventListener(errorEvent, fail)
    }
    const complete = () => { cleanup(); resolve() }
    const fail = () => { cleanup(); reject(new Error('動画を読み込めませんでした。')) }
    target.addEventListener(event, complete, { once: true })
    target.addEventListener(errorEvent, fail, { once: true })
  })
}

export async function inspectVideo(file: File) {
  const video = document.createElement('video')
  const url = URL.createObjectURL(file)
  try {
    video.preload = 'metadata'
    video.src = url
    await waitForEvent(video, 'loadedmetadata')
    const durationMs = Math.round(video.duration * 1000)
    if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 60_000) {
      throw new Error('動画は60秒以内にしてください。')
    }
    return { durationMs, width: video.videoWidth, height: video.videoHeight }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function createVideoPreview(file: File) {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('このブラウザではプレビュー動画を作成できません。')
  }
  const video = document.createElement('video')
  const url = URL.createObjectURL(file)
  video.muted = true
  video.playsInline = true
  video.src = url
  try {
    await waitForEvent(video, 'loadedmetadata')
    const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(2, Math.round(video.videoWidth * scale))
    canvas.height = Math.max(2, Math.round(video.videoHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('プレビュー動画を作成できません。')

    const mimeType = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm']
      .find((type) => MediaRecorder.isTypeSupported(type))
    if (!mimeType) throw new Error('このブラウザではプレビュー動画を作成できません。')
    const stream = canvas.captureStream(24)
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1_500_000 })
    const chunks: Blob[] = []
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
    const stopped = waitForEvent(recorder, 'stop')
    recorder.start(250)
    await video.play()
    const endAt = Math.min(5, video.duration)

    await new Promise<void>((resolve) => {
      const draw = () => {
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        if (video.currentTime >= endAt || video.ended) resolve()
        else requestAnimationFrame(draw)
      }
      draw()
    })
    video.pause()
    recorder.stop()
    await stopped
    stream.getTracks().forEach((track) => track.stop())
    const normalizedType = mimeType.startsWith('video/mp4') ? 'video/mp4' : 'video/webm'
    const extension = normalizedType === 'video/mp4' ? 'mp4' : 'webm'
    return new File(chunks, `preview.${extension}`, { type: normalizedType })
  } finally {
    video.pause()
    URL.revokeObjectURL(url)
  }
}
