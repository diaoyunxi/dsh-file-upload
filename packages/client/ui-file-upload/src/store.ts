/** Store for the file upload UI plugin — simple state without immer. */
import { randomUUID } from 'node:crypto'
import type { ComposerFileAttachment, FileUploadStatus } from './types.ts'

/** Default max file size (100MB). */
export const DEFAULT_MAX_SIZE = 100 * 1024 * 1024

/** Size limit label for display. */
export function maxSizeLabel(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return `${Number.isInteger(mb) ? String(mb) : mb.toFixed(1)}MB`
}

/** Store state for file upload attachments. */
export interface FileUploadState {
  /** Ordered list of draft file attachments. */
  files: ComposerFileAttachment[]
  /** Maximum allowed file size in bytes. */
  maxSize: number
  /** Whether file drops are accepted. */
  canAcceptDrop: boolean
}

/** Store actions for file upload attachments. */
export interface FileUploadActions {
  /** Add files to the draft. */
  addFiles: (files: readonly File[]) => void
  /** Remove one file by ID. */
  removeFile: (id: string) => void
  /** Update upload status for one file. */
  updateFileStatus: (
    id: string,
    status: FileUploadStatus,
    extra?: Partial<Pick<ComposerFileAttachment, 'path' | 'serverId' | 'error' | 'progress'>>,
  ) => void
  /** Set whether drops are accepted. */
  setCanAcceptDrop: (value: boolean) => void
  /** Clear all uploaded files. */
  clearFiles: () => void
}

/** Create a new file upload store. */
export function createFileUploadStore(initialMaxSize: number = DEFAULT_MAX_SIZE) {
  let state: FileUploadState = {
    files: [],
    maxSize: initialMaxSize,
    canAcceptDrop: true,
  }

  const listeners = new Set<() => void>()

  function notify() {
    for (const listener of listeners) {
      listener()
    }
  }

  function getSnapshot(): FileUploadState {
    return state
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }

  function addFiles(newFiles: readonly File[]) {
    const before = state.files.length
    state.files = [
      ...state.files,
      ...newFiles
        .filter(file => file.size <= state.maxSize)
        .map(file => ({
          id: randomUUID(),
          file,
          status: 'pending' as FileUploadStatus,
          progress: 0,
        })),
    ]
    if (state.files.length !== before) notify()
  }

  function removeFile(id: string) {
    const before = state.files.length
    state.files = state.files.filter(f => f.id !== id)
    if (state.files.length !== before) notify()
  }

  function updateFileStatus(
    id: string,
    status: FileUploadStatus,
    extra: Partial<Pick<ComposerFileAttachment, 'path' | 'serverId' | 'error' | 'progress'>> = {},
  ) {
    state.files = state.files.map(f =>
      f.id === id ? { ...f, status, ...extra } : f,
    )
    notify()
  }

  function setCanAcceptDrop(value: boolean) {
    if (state.canAcceptDrop !== value) {
      state = { ...state, canAcceptDrop: value }
      notify()
    }
  }

  function clearFiles() {
    if (state.files.length > 0) {
      state = { ...state, files: [] }
      notify()
    }
  }

  return {
    getSnapshot,
    subscribe,
    actions: { addFiles, removeFile, updateFileStatus, setCanAcceptDrop, clearFiles },
  }
}
