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
import { useVideoPlaybackUrl } from '@/hooks/useVideoPlaybackUrl'
import { cn } from '@/utils/helpers'
import type { MediaDimensions } from '@/utils/mediaAspectRatio'

function fmtTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function waitForVideoMetadata(video: HTMLVideoElement, timeoutMs = 20000): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error('Video metadata timeout'))
    }, timeoutMs)

    const onReady = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error('Video failed to load'))
    }
    const cleanup = () => {
      window.clearTimeout(timer)
      video.removeEventListener('loadedmetadata', onReady)
      video.removeEventListener('error', onError)
    }

    video.addEventListener('loadedmetadata', onReady)
    video.addEventListener('error', onError)
    video.load()
  })
}

function PortalVideoPlayerInner({
  playbackUrl,
  urlLoading,
  urlError,
  urlReady,
  usingBlob,
  retryWithBlob,
  retry,
  className,
  poster,
  eager,
}: {
  playbackUrl: string
  urlLoading: boolean
  urlError: string | null
  urlReady: boolean
  usingBlob: boolean
  retryWithBlob: () => void
  retry: () => void
  className?: string
  poster?: string
  eager?: boolean
}) {
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
  const [localPlaybackError, setLocalPlaybackError] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState<MediaDimensions | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const playbackError = localPlaybackError ?? urlError

  const scheduleHideControls = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setShowControls(true)
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 2800)
    }
  }, [playing])

  useEffect(() => {
    if (!playing) return
    hideTimer.current = setTimeout(() => setShowControls(false), 2800)
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [playing])

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  useEffect(() => {
    if (!eager) return
    const v = videoRef.current
    if (v && urlReady && playbackUrl) {
      v.preload = 'auto'
      v.load()
    }
  }, [eager, urlReady, playbackUrl])

  const captureDimensions = useCallback(() => {
    const v = videoRef.current
    if (!v?.videoWidth || !v?.videoHeight) return
    setDimensions({ width: v.videoWidth, height: v.videoHeight })
  }, [])

  const handleVideoError = useCallback(() => {
    setBuffering(false)
    setPlaying(false)
    if (!usingBlob) {
      retryWithBlob()
      return
    }
    setLocalPlaybackError('This video could not be played in your browser.')
  }, [retryWithBlob, usingBlob])

  const togglePlay = async () => {
    if (!urlReady || !playbackUrl) return
    const v = videoRef.current
    if (!v) return

    if (v.paused) {
      setLocalPlaybackError(null)
      setBuffering(true)
      try {
        v.preload = 'auto'
        await waitForVideoMetadata(v)
        await v.play()
        setPlaying(true)
      } catch {
        if (!usingBlob) {
          retryWithBlob()
        } else {
          setLocalPlaybackError('This video could not be played. Try tapping Retry.')
        }
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
  const showUrlSpinner = urlLoading
  const showPlayOverlay = urlReady && !playing && !showUrlSpinner && !playbackError
  const controlsVisible = !playing || showControls

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
        >
          {urlReady && playbackUrl ? (
            <video
              ref={videoRef}
              src={playbackUrl}
              poster={poster}
              playsInline
              preload={eager ? 'auto' : 'metadata'}
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
                setLocalPlaybackError(null)
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onError={handleVideoError}
            />
          ) : null}

          {showUrlSpinner ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          ) : null}

          {playbackError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-4 text-center">
              <p className="text-sm text-white/90">{playbackError}</p>
              <button
                type="button"
                onClick={() => {
                  setLocalPlaybackError(null)
                  retry()
                }}
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black ring-focus touch-manipulation"
              >
                Retry
              </button>
            </div>
          ) : null}

          {showPlayOverlay ? (
            <button
              type="button"
              onClick={() => void togglePlay()}
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute inset-0 z-10 flex touch-manipulation items-center justify-center bg-black/20 ring-focus"
              aria-label="Play video"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition active:scale-95 sm:h-16 sm:w-16">
                {buffering ? (
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-black/20 border-t-black sm:h-8 sm:w-8" />
                ) : (
                  <Play className="ml-1 h-7 w-7 fill-current sm:h-8 sm:w-8" />
                )}
              </span>
            </button>
          ) : null}

          {buffering && playing ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          ) : null}

          {urlReady && !playbackError ? (
            <div
              className={cn(
                'absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-2 pb-2 pt-6 transition-opacity sm:px-3 sm:pb-3 sm:pt-8',
                controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
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
          ) : null}
        </div>
      </AdaptiveMediaFrame>
    </div>
  )
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
  const playback = useVideoPlaybackUrl(src)

  return (
    <PortalVideoPlayerInner
      key={playback.url || src}
      playbackUrl={playback.url}
      urlLoading={playback.loading}
      urlError={playback.error}
      urlReady={playback.ready}
      usingBlob={playback.usingBlob}
      retryWithBlob={playback.retryWithBlob}
      retry={playback.retry}
      className={className}
      poster={poster}
      eager={eager}
    />
  )
}
