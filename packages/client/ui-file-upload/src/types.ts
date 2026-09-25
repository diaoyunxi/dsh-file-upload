/** Type definitions for the file upload UI plugin. */

/** Status of a file upload operation. */
export type FileUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'error'

/** One file attachment managed by the composer. */
export interface ComposerFileAttachment {
  /** Unique identifier. */
  id: string
  /** Original browser file. */
  file: File
  /** Upload status. */
  status: FileUploadStatus
  /** Server-assigned path after upload. */
  path?: string
  /** Server-assigned ID after upload. */
  serverId?: string
  /** Error message when status is 'error'. */
  error?: string
  /** Upload progress 0-100. */
  progress?: number
}

/** Props for the file upload rail component. */
export interface FileUploadRailProps {
  /** Currently managed files. */
  files: readonly ComposerFileAttachment[]
  /** Whether the composer can accept drops. */
  canAcceptDrop: boolean
  /** Add files from drag-drop or file input. */
  onAddFiles: (files: readonly File[]) => void
  /** Remove one file from the draft. */
  onRemoveFile: (id: string) => void
  /** Maximum file size string for display (e.g. "100MB"). */
  maxSizeLabel?: string
}
