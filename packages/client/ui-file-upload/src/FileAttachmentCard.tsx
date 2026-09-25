/** File attachment card rendered inside the upload rail. */
import { useCallback } from 'react'
import { IconPaperclipOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './FileUploadRail.module.css'
import type { ComposerFileAttachment } from './types.ts'

/** Size suffix for human-readable file sizes. */

/** One file card in the upload rail. */
export function FileAttachmentCard({
  attachment,
  onRemove,
}: {
  attachment: ComposerFileAttachment
  onRemove: () => void
}) {
  const truncateName = useCallback((name: string, maxLen: number) => {
    return name.length <= maxLen ? name : `${name.slice(0, maxLen - 3)}...`
  }, [])

  return (
    <div className={`${css.card} ${attachment.status === 'uploaded' ? css['card--uploaded'] : ''} ${attachment.status === 'error' ? css['card--error'] : ''}`}>
      <button
        type="button"
        className={css.remove}
        aria-label={`移除文件 ${attachment.file.name}`}
        onClick={onRemove}
      >
        <IconPaperclipOutline16 />
      </button>
      <IconPaperclipOutline16 className={css.cardIcon} />
      <div className={css.cardName} title={attachment.file.name}>
        {truncateName(attachment.file.name, 12)}
      </div>
      {attachment.status === 'uploading' && (
        <div className={css.cardProgress}>
          <div
            className={css.cardProgressBar}
            style={{ width: `${attachment.progress ?? 0}%` }}
          />
        </div>
      )}
      {attachment.status === 'error' && attachment.error && (
        <div className={css.cardError}>{attachment.error}</div>
      )}
    </div>
  )
}
