/** Full-viewport drop invitation overlay for file uploads. */
import { createPortal } from 'react-dom'
import css from './FileDropOverlay.module.css'

/** Drop-overlay strings the owner resolves from its own locale namespace. */
export interface FileDropOverlayLabels {
  /** Headline inviting the drop, or naming why it is unavailable. */
  title: string
  /** Limits line under the title; shown only while drops are accepted. */
  desc?: string | undefined
}

/**
 * Full-viewport invitation shown while a file drag is over the page.
 * Decoration only — `pointer-events: none` keeps drag targeting on the page below.
 *
 * @param props.disabled - drops are currently refused.
 * @param props.labels - resolved title and limits strings.
 */
export function FileDropOverlay({ disabled, labels }: {
  disabled: boolean
  labels: FileDropOverlayLabels
}) {
  return createPortal(
    <div className={css.mask} role="status">
      <div className={css.wrap}>
        <div className={css.illustration} aria-hidden="true">
          {disabled ? <BlockedIllustration /> : <UploadIllustration />}
        </div>
        <div className={css.title}>{labels.title}</div>
        {!disabled && labels.desc !== undefined && <div className={css.desc}>{labels.desc}</div>}
      </div>
    </div>,
    document.body,
  )
}

/** Upload illustration (file icon). */
const UploadIllustration = () => (
  <svg width="115" height="84" viewBox="0 0 115 84" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="4" width="40" height="52" rx="6" fill="#9CE5ED" opacity="0.8" />
    <rect x="55" y="16" width="40" height="52" rx="6" fill="#679EFE" opacity="0.9" />
    <path d="M52 38 L62 28 L72 38" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M62 28 L62 52" stroke="white" strokeWidth="3" strokeLinecap="round" />
    <rect x="10" y="44" width="95" height="36" rx="8" fill="#3964FE" opacity="0.7" />
  </svg>
)

/** Disabled illustration. */
const BlockedIllustration = () => (
  <svg width="115" height="84" viewBox="0 0 115 84" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="4" width="40" height="52" rx="6" fill="#979DA6" opacity="0.6" />
    <rect x="55" y="16" width="40" height="52" rx="6" fill="#979DA6" opacity="0.7" />
    <circle cx="57" cy="58" r="16" fill="#F59E0B" />
    <path d="M57 48 L57 68" stroke="white" strokeWidth="3" strokeLinecap="round" />
    <path d="M47 58 L67 58" stroke="white" strokeWidth="3" strokeLinecap="round" />
  </svg>
)
