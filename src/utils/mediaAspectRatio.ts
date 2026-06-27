import type { CSSProperties } from 'react'

/** Max display height for feed / lightbox media (matches dvh for mobile browser chrome). */
export const MEDIA_MAX_HEIGHT = 'min(85dvh, 720px)'

export type MediaDimensions = {
  width: number
  height: number
}

export function mediaAspectRatio({ width, height }: MediaDimensions): number {
  if (!width || !height) return 16 / 9
  return width / height
}

/** Container styles that respect portrait, landscape, square, etc. within viewport caps. */
export function adaptiveMediaContainerStyle(
  dimensions: MediaDimensions | null,
): CSSProperties {
  if (!dimensions?.width || !dimensions?.height) {
    return {
      width: '100%',
      minHeight: '12rem',
      maxHeight: MEDIA_MAX_HEIGHT,
    }
  }

  const { width, height } = dimensions
  const isPortrait = height > width

  return {
    aspectRatio: `${width} / ${height}`,
    width: isPortrait ? `min(100%, calc(${MEDIA_MAX_HEIGHT} * ${width} / ${height}))` : '100%',
    maxHeight: MEDIA_MAX_HEIGHT,
    marginInline: 'auto',
  }
}
