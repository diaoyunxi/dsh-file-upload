/** Horizontal rail showing uploaded file cards with paging arrows. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import {
  IconChevronLeftOutline14, IconChevronRightOutline14,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { FileAttachmentCard } from './FileAttachmentCard.tsx'
import css from './FileUploadRail.module.css'
import type { ComposerFileAttachment } from './types.ts'

/** Approximate pixels per wheel step for LINE deltas. */
const WHEEL_LINE_PX = 16

/** Smooth paging unless the user asked for reduced motion. */
function pageBehavior(): ScrollBehavior {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

/**
 * Horizontal rail of uploaded file cards.
 *
 * @param props.files - ordered file attachments.
 * @param props.onRemoveFile - callback when one file is removed.
 * @param props.maxSizeLabel - display string for the size limit.
 */
export function FileUploadRail({
  files,
  onRemoveFile,
  maxSizeLabel,
}: {
  files: readonly ComposerFileAttachment[]
  onRemoveFile: (id: string) => void
  maxSizeLabel?: string
}) {
  const railRef = useRef<HTMLDivElement | null>(null)
  const countRef = useRef<number | null>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const updateEdges = useCallback(() => {
    const el = railRef.current
    if (el === null) return
    const left = el.scrollLeft > 1
    const right = el.scrollLeft < el.scrollWidth - el.clientWidth - 1
    setEdges(prev => prev.left === left && prev.right === right ? prev : { left, right })
  }, [])

  useLayoutEffect(() => {
    const grew = countRef.current !== null && files.length > countRef.current
    countRef.current = files.length
    const el = railRef.current
    if (el === null) return
    if (grew) el.scrollLeft = el.scrollWidth - el.clientWidth
    updateEdges()
  }, [files.length, updateEdges])

  useEffect(() => {
    const el = railRef.current
    if (el === null) return
    let disconnect = () => {}
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateEdges)
      observer.observe(el)
      disconnect = () => { observer.disconnect() }
    }
    const onWheel = (event: globalThis.WheelEvent): void => {
      if (event.deltaY === 0) return
      const scale = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? WHEEL_LINE_PX
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? el.clientWidth : 1
      event.preventDefault()
      el.scrollBy({
        left: event.deltaX !== 0
          ? event.deltaX * scale
          : Math.sign(event.deltaY) * Math.min(Math.abs(event.deltaY) * scale, 60),
        behavior: 'auto',
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      disconnect()
      el.removeEventListener('wheel', onWheel)
    }
  }, [updateEdges])

  const page = (direction: -1 | 1): void => {
    const el = railRef.current
    if (el === null) return
    el.scrollBy({
      left: direction * Math.max(el.clientWidth - 80, 200),
      behavior: pageBehavior(),
    })
  }

  if (files.length === 0) return null

  return (
    <div className={css.root}>
      {edges.left && (
        <button
          type="button"
          className={clsx(css.arrow, css.arrowLeft)}
          aria-label="向左滚动文件"
          onClick={() => { page(-1) }}
        >
          <IconChevronLeftOutline14 />
        </button>
      )}
      <div
        ref={railRef}
        className={css.rail}
        role="group"
        aria-label={`已上传文件${maxSizeLabel ? `（最大 ${maxSizeLabel}）` : ''}`}
        onScroll={updateEdges}
      >
        {files.map(attachment => (
          <FileAttachmentCard
            key={attachment.id}
            attachment={attachment}
            onRemove={() => { onRemoveFile(attachment.id) }}
          />
        ))}
      </div>
      {edges.right && (
        <button
          type="button"
          className={clsx(css.arrow, css.arrowRight)}
          aria-label="向右滚动文件"
          onClick={() => { page(1) }}
        >
          <IconChevronRightOutline14 />
        </button>
      )}
    </div>
  )
}
