/** Main file upload composer component: drag-drop target, upload logic, and rail. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileUploadRail } from './FileUploadRail.tsx'
import { FileDropOverlay } from './FileDropOverlay.tsx'
import type { ComposerFileAttachment } from './types.ts'

/** Labels for the drop overlay. */
interface DropLabels {
  title: string
  desc?: string
}

/**
 * The file upload composer component.
 * Handles drag-drop and renders the file rail.
 */
export function FileUploadComposer({
  files,
  canAcceptDrop,
  onAddFiles,
  onRemoveFile,
  onFilesChanged,
  maxSizeBytes,
  t,
}: {
  files: readonly ComposerFileAttachment[]
  canAcceptDrop: boolean
  onAddFiles: (files: readonly File[]) => void
  onRemoveFile: (id: string) => void
  /** Called when the set of successfully uploaded file paths changes. */
  onFilesChanged: (paths: string[]) => void
  maxSizeBytes: number
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const dragDepth = useRef(0)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Track which files have been uploaded for path resolution.
  const uploadedPaths = useMemo(() => {
    return files
      .filter(f => f.status === 'uploaded' && f.path !== undefined)
      .map(f => f.path as string)
  }, [files])

  useEffect(() => {
    onFilesChanged(uploadedPaths)
  }, [uploadedPaths, onFilesChanged])

  // Handle file input change (click to select).
  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files
    if (selected === null || selected.length === 0) return
    const validFiles = Array.from(selected).filter((f: File) => f.size <= maxSizeBytes)
    if (validFiles.length > 0) onAddFiles(validFiles)
    // Reset so the same file can be selected again.
    event.target.value = ''
  }, [maxSizeBytes, onAddFiles])

  // Document-level drag handlers.
  useEffect(() => {
    const fileTransfer = (event: globalThis.DragEvent): DataTransfer | null => {
      const dt = event.dataTransfer
      if (dt === null || !dt.types.includes('Files')) return null
      return dt
    }

    const onDragEnter = (event: globalThis.DragEvent): void => {
      if (fileTransfer(event) === null) return
      event.preventDefault()
      dragDepth.current += 1
      setDragActive(true)
    }

    const onDragOver = (event: globalThis.DragEvent): void => {
      const dt = fileTransfer(event)
      if (dt === null) return
      event.preventDefault()
      dt.dropEffect = canAcceptDrop ? 'copy' : 'none'
    }

    const onDragLeave = (event: globalThis.DragEvent): void => {
      if (fileTransfer(event) === null) return
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setDragActive(false)
      const leftViewport = event.clientX <= 0 || event.clientY <= 0
        || event.clientX >= window.innerWidth || event.clientY >= window.innerHeight
      if ((event.target === document.documentElement || event.target === document.body) && leftViewport) {
        dragDepth.current = 0
        setDragActive(false)
      }
    }

    const onDrop = (event: globalThis.DragEvent): void => {
      const dt = fileTransfer(event)
      if (dt === null) return
      event.preventDefault()
      dragDepth.current = 0
      setDragActive(false)
      if (canAcceptDrop) {
        const validFiles = Array.from(dt.files).filter((f: File) => f.size <= maxSizeBytes)
        onAddFiles(validFiles)
      }
    }

    document.addEventListener('dragenter', onDragEnter)
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('dragleave', onDragLeave)
    document.addEventListener('drop', onDrop)
    window.addEventListener('dragend', () => { dragDepth.current = 0; setDragActive(false) })
    return () => {
      document.removeEventListener('dragenter', onDragEnter)
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('dragleave', onDragLeave)
      document.removeEventListener('drop', onDrop)
      window.removeEventListener('dragend', () => { dragDepth.current = 0; setDragActive(false) })
    }
  }, [canAcceptDrop, maxSizeBytes, onAddFiles])

  const mb = maxSizeBytes / (1024 * 1024)
  const maxSizeLabel = `${Number.isInteger(mb) ? String(mb) : mb.toFixed(1)}MB`

  const dropLabels: DropLabels = useMemo(() => {
    if (!canAcceptDrop) return { title: t('file.dropBlocked') }
    return {
      title: t('file.dropTitle'),
      desc: t('file.dropDesc', { count: '∞', size: maxSizeLabel }),
    }
  }, [canAcceptDrop, maxSizeLabel, t])

  return (
    <div data-file-upload-root className="file-upload-composer">
      {dragActive && (
        <FileDropOverlay disabled={!canAcceptDrop} labels={dropLabels} />
      )}
      <FileUploadRail
        files={files}
        onRemoveFile={onRemoveFile}
        maxSizeLabel={maxSizeLabel}
      />
      {/* Hidden file input for click-to-select */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="*/*"
        style={{ display: 'none' }}
        onChange={handleFileInput}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  )
}
