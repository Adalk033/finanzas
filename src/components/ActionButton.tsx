import type { ButtonHTMLAttributes } from 'react'
import './ActionButton.css'

/*
 * Lucide SVG geometry, kept locally to avoid adding a dependency.
 * ISC License — Copyright (c) 2022, Lucide Contributors
 * Copyright (c) 2013-2022 Cole Bemis (Feather)
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */
const ICON_PATHS = {
  plus: ['M12 5v14', 'M5 12h14'],
  edit: ['M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.5z'],
  trash: ['M3 6h18', 'M19 6v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6', 'M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2', 'M10 11v6', 'M14 11v6'],
  archive: ['M3 3h18v4H3z', 'M5 7v14h14V7', 'M10 12h4'],
  copy: ['M9 9h12v12H9z', 'M5 15H3V3h12v2'],
  refresh: ['M3 12a9 9 0 0 1 15-6.7L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-15 6.7L3 16', 'M3 21v-5h5'],
  filter: ['M4 7h16', 'M7 12h10', 'M10 17h4'],
  reset: ['m7 21-4.3-4.3a2.4 2.4 0 0 1 0-3.4l9.6-9.6a2.4 2.4 0 0 1 3.4 0l5.6 5.6a2.4 2.4 0 0 1 0 3.4L13 21', 'M22 21H7', 'm5 11 9 9'],
  close: ['M18 6 6 18', 'm6 6 12 12'],
  eye: ['M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
  undo: ['M3 7v6h6', 'M3 13a9 9 0 1 1 3 7'],
  dismiss: ['M18 6 7 17l-5-5', 'm22 10-7 7-4-4'],
  check: ['m20 6-11 11-5-5'],
  backup: ['M4 3h16v18H4z', 'M8 3v6h8V3', 'M8 21v-8h8v8'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'],
  upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm17 8-5-5-5 5', 'M12 3v12'],
  payment: ['M2 4h20v16H2z', 'M2 10h20', 'M7 15h2', 'M15 15h2'],
  minimum: ['M5 12h14'],
  shield: ['M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11', 'm9 12 2 2 4-4'],
  statement: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 13h8', 'M8 17h6'],
  wallet: ['M20 8V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v12H5a3 3 0 0 1-3-3V6', 'M20 12h-5v5h5'],
  save: ['M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2', 'M17 21v-8H7v8', 'M7 3v5h8'],
  balance: ['M12 3v18', 'M5 21h14', 'M3 7h18', 'm6 7-4 8h8z', 'm18 7-4 8h8z'],
  previous: ['m15 18-6-6 6-6'],
  next: ['m9 18 6-6-6-6'],
} as const

type ActionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'title' | 'aria-label'> & {
  icon: keyof typeof ICON_PATHS
  label: string
  iconOnly?: boolean
}

export function ActionButton({ icon, label, iconOnly = false, className = 'button button--secondary', type = 'button', ...props }: ActionButtonProps) {
  return (
    <button {...props} type={type} className={`${className} action-button${iconOnly ? ' action-button--icon-only' : ''}`} aria-label={label} title={label}>
      <svg className="action-button__icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {ICON_PATHS[icon].map((path) => <path key={path} d={path} />)}
      </svg>
      {!iconOnly ? <span className="action-button__label">{label}</span> : null}
    </button>
  )
}
