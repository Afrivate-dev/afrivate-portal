import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { cn } from '@/utils/helpers'

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
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [buffering, setBuffering] = useState(false)
  const [shouldBuffer, setShouldBuffer] = useState(eager)
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
    const v = videoRef.current
    if (!v || !shouldBuffer || !src) return
    v.preload = 'auto'
    v.load()
  }, [src, shouldBuffer])

  const warmBuffer = useCallback(() => {
    setShouldBuffer(true)
    const v = videoRef.current
    if (v && v.preload !== 'auto') {
      v.preload = 'auto'
      v.load()
    }
  }, [])

  const togglePlay = async () => {
    warmBuffer()
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      setBuffering(true)
      try {
        await v.play()
        setPlaying(true)
      } catch {
        /* autoplay policy or load error */
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
    const el = containerRef.current
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

  return (
    <div
      ref={containerRef}
      className={cn(
        'group relative overflow-hidden bg-black',
        fullscreen ? 'flex h-full w-full items-center justify-center' : 'w-full',
        className,
      )}
      onMouseMove={scheduleHideControls}
      onTouchStart={scheduleHideControls}
      onPointerEnter={warmBuffer}
    >
      <video
        ref={videoRef}
        src={shouldBuffer ? src : undefined}
        data-src={src}
        poster={poster}
        playsInline
        preload={shouldBuffer ? 'auto' : 'none'}
        className={cn(
          'w-full',
          fullscreen ? 'max-h-full object-contain' : 'max-h-[min(80vh,720px)] object-contain',
        )}
        onClick={() => void togglePlay()}
        onLoadedMetadata={() => {
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
      />

      {!playing ? (
        <button
          type="button"
          onClick={() => void togglePlay()}
          onPointerEnter={warmBuffer}
          className="absolute inset-0 flex items-center justify-center bg-black/25 ring-focus"
          aria-label="Play video"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition hover:scale-105">
            <Play className="ml-1 h-8 w-8 fill-current" />
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
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-8 transition-opacity',
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
          className="mb-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/30 accent-white"
          style={{
            background: `linear-gradient(to right, white ${progress}%, rgba(255,255,255,0.3) ${progress}%)`,
          }}
        />
        <div className="flex items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void togglePlay()}
              className="rounded-md p-1.5 hover:bg-white/15 ring-focus"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="rounded-md p-1.5 hover:bg-white/15 ring-focus"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <span className="text-xs tabular-nums text-white/90">
              {fmtTime(current)} / {fmtTime(duration)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="rounded-md p-1.5 hover:bg-white/15 ring-focus"
            aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
