import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { AdaptiveMediaFrame } from '@/components/shared/AdaptiveMediaFrame'
import { useResolvedMediaUrl } from '@/hooks/useResolvedMediaUrl'
import { cn } from '@/utils/helpers'
import type { MediaDimensions } from '@/utils/mediaAspectRatio'

function fmtTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function PortalVideoPlayer({
  src,
  className,
  poster,
  eager = false,
}: {
  src: string
  className?: string
  poster?: string
  /** When true, buffer immediately for faster start (feed / visible slides). */
  eager?: boolean
}) {
  const { url: resolvedSrc, loading: urlLoading, ready: urlReady } = useResolvedMediaUrl(src)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [buffering, setBuffering] = useState(false)
  const [shouldBuffer, setShouldBuffer] = useState(eager)
  const [dimensions, setDimensions] = useState<MediaDimensions | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleHideControls = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setShowControls(true)
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 2800)
    }
  }, [playing])

  useEffect(() => {
    scheduleHideControls()
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [playing, scheduleHideControls])

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  useEffect(() => {
    if (eager) return
    const el = containerRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setShouldBuffer(true)
      },
      { rootMargin: '240px', threshold: 0.1 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [eager])

  useEffect(() => {
    setDimensions(null)
    setPlaying(false)
    setCurrent(0)
    setDuration(0)
  }, [resolvedSrc])

  useEffect(() => {
    const v = videoRef.current
    if (!v || !urlReady || !resolvedSrc) return
    if (shouldBuffer) {
      v.preload = 'auto'
      v.load()
    }
  }, [resolvedSrc, urlReady, shouldBuffer])

  const warmBuffer = useCallback(() => {
    setShouldBuffer(true)
    const v = videoRef.current
    if (v && urlReady) {
      v.preload = 'auto'
      if (v.readyState < HTMLMediaElement.HAVE_METADATA) v.load()
    }
  }, [urlReady])

  const captureDimensions = useCallback(() => {
    const v = videoRef.current
    if (!v?.videoWidth || !v?.videoHeight) return
    setDimensions({ width: v.videoWidth, height: v.videoHeight })
  }, [])

  const togglePlay = async () => {
    if (!urlReady) return
    warmBuffer()
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      setBuffering(true)
      try {
        if (v.readyState < HTMLMediaElement.HAVE_METADATA) {
          await new Promise<void>((resolve, reject) => {
            const onReady = () => {
              v.removeEventListener('loadedmetadata', onReady)
              v.removeEventListener('error', onError)
              resolve()
            }
            const onError = () => {
              v.removeEventListener('loadedmetadata', onReady)
              v.removeEventListener('error', onError)
              reject(new Error('Video failed to load'))
            }
            v.addEventListener('loadedmetadata', onReady)
            v.addEventListener('error', onError)
            v.load()
          })
        }
        await v.play()
        setPlaying(true)
      } catch {
        /* load or autoplay policy */
      } finally {
        setBuffering(false)
      }
    } else {
      v.pause()
      setPlaying(false)
    }
    scheduleHideControls()
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
    scheduleHideControls()
  }

  const toggleFullscreen = async () => {
    const el = stageRef.current ?? containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await el.requestFullscreen()
    }
    scheduleHideControls()
  }

  const onScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current
    if (!v) return
    const t = Number(e.target.value)
    v.currentTime = t
    setCurrent(t)
    scheduleHideControls()
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0
  const showLoading = urlLoading || (!dimensions && urlReady)

  return (
    <div ref={containerRef} className={cn('w-full', className)}>
      <AdaptiveMediaFrame
        dimensions={fullscreen ? null : dimensions}
        className={cn(fullscreen && 'flex h-full max-h-none w-full items-center justify-center')}
      >
        <div
          ref={stageRef}
          className={cn(
            'group relative h-full w-full',
            fullscreen && 'flex h-full w-full items-center justify-center bg-black',
          )}
          onMouseMove={scheduleHideControls}
          onTouchStart={scheduleHideControls}
          onPointerEnter={warmBuffer}
        >
          {urlReady ? (
            <video
              ref={videoRef}
              src={resolvedSrc}
              poster={poster}
              playsInline
              preload={shouldBuffer ? 'auto' : 'metadata'}
              className={cn(
                'h-full w-full touch-manipulation',
                fullscreen ? 'max-h-full max-w-full object-contain' : 'object-contain',
              )}
              onClick={() => void togglePlay()}
              onLoadedMetadata={() => {
                captureDimensions()
                const v = videoRef.current
                if (v) setDuration(v.duration)
              }}
              onTimeUpdate={() => {
                const v = videoRef.current
                if (v) setCurrent(v.currentTime)
              }}
              onWaiting={() => setBuffering(true)}
              onCanPlay={() => setBuffering(false)}
              onPlaying={() => {
                setPlaying(true)
                setBuffering(false)
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onError={() => setBuffering(false)}
            />
          ) : null}

          {showLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          ) : null}

          {!playing && urlReady && !showLoading ? (
            <button
              type="button"
              onClick={() => void togglePlay()}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerEnter={warmBuffer}
              className="absolute inset-0 z-10 flex touch-manipulation items-center justify-center bg-black/20 ring-focus"
              aria-label="Play video"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition active:scale-95 sm:h-16 sm:w-16">
                <Play className="ml-1 h-7 w-7 fill-current sm:h-8 sm:w-8" />
              </span>
            </button>
          ) : null}

          {buffering && playing ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          ) : null}

          <div
            className={cn(
              'absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-2 pb-2 pt-6 transition-opacity sm:px-3 sm:pb-3 sm:pt-8',
              showControls || !playing ? 'opacity-100' : 'opacity-0 pointer-events-none',
            )}
          >
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={current}
              onChange={onScrub}
              aria-label="Seek"
              className="mb-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/30 accent-white touch-manipulation sm:h-1"
              style={{
                background: `linear-gradient(to right, white ${progress}%, rgba(255,255,255,0.3) ${progress}%)`,
              }}
            />
            <div className="flex items-center justify-between gap-1 text-white sm:gap-2">
              <div className="flex min-w-0 items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => void togglePlay()}
                  className="rounded-md p-2 hover:bg-white/15 ring-focus touch-manipulation sm:p-1.5"
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="rounded-md p-2 hover:bg-white/15 ring-focus touch-manipulation sm:p-1.5"
                  aria-label={muted ? 'Unmute' : 'Mute'}
                >
                  {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <span className="truncate text-[11px] tabular-nums text-white/90 sm:text-xs">
                  {fmtTime(current)} / {fmtTime(duration)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                className="shrink-0 rounded-md p-2 hover:bg-white/15 ring-focus touch-manipulation sm:p-1.5"
                aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </AdaptiveMediaFrame>
    </div>
  )
}
