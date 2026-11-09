import { ActionButton } from './ActionButton'
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './FormModal.css'

type FormModalProps = {
  title: string
  children: ReactNode
  onClose: () => void
  error?: string
  message?: string
}

export function FormModal({ title, children, onClose, error, message }: FormModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>): void => {
    if (event.key !== 'Tab') return

    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, [tabindex], summary',
    )).filter((element) => (
      element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0
    ))
    const firstControl = controls[0]
    const lastControl = controls.at(-1)
    // Wrap before the browser moves focus from the dialog into its own chrome.
    if (event.shiftKey && document.activeElement === firstControl) {
      event.preventDefault()
      lastControl?.focus()
    } else if (!event.shiftKey && document.activeElement === lastControl) {
      event.preventDefault()
      firstControl?.focus()
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // The native modal keeps keyboard focus inside and makes the background inert.
    dialog.showModal()
    dialog.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')?.focus()

    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus()
      }
    }
  }, [])

  return createPortal(
    <dialog
      ref={dialogRef}
      className="form-modal"
      aria-labelledby={titleId}
      onKeyDown={handleKeyDown}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <header className="form-modal__header">
        <h2 className="form-modal__title" id={titleId}>{title}</h2>
        <ActionButton iconOnly className="button button--secondary" type="button" onClick={onClose} icon="close" label={`Cerrar: ${title}`} />
      </header>
      <div className="form-modal__body">
        {error ? <p className="message message--error" role="alert">{error}</p> : null}
        {message ? <p className="message message--success" role="status">{message}</p> : null}
        {children}
      </div>
    </dialog>,
    document.body,
  )
}
