import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'

type NumberInputProps<T extends number | null> = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'type' | 'value'
> & {
  value: T
  emptyValue: T
  onValueChange: (value: T) => void
}

function formatValue(value: number | null): string {
  return value === null ? '' : String(value)
}

export function NumberInput<T extends number | null>({
  value,
  emptyValue,
  onValueChange,
  onBlur,
  onFocus,
  ...inputProps
}: NumberInputProps<T>) {
  const [draft, setDraft] = useState(() => formatValue(value))
  const isFocused = useRef(false)
  const lastEmittedValue = useRef<number | null>(value)

  useEffect(() => {
    if (!isFocused.current || !Object.is(value, lastEmittedValue.current)) {
      setDraft(formatValue(value))
      lastEmittedValue.current = value
    }
  }, [value])

  return (
    <input
      {...inputProps}
      type="number"
      value={draft}
      onFocus={(event) => {
        isFocused.current = true
        onFocus?.(event)
      }}
      onChange={(event) => {
        const nextDraft = event.target.value
        setDraft(nextDraft)

        if (nextDraft === '') {
          lastEmittedValue.current = emptyValue
          onValueChange(emptyValue)
          return
        }

        const nextValue = event.target.valueAsNumber
        if (Number.isFinite(nextValue)) {
          lastEmittedValue.current = nextValue
          onValueChange(nextValue as T)
        }
      }}
      onBlur={(event) => {
        isFocused.current = false
        if (draft !== '' && Number.isFinite(event.currentTarget.valueAsNumber)) {
          setDraft(String(event.currentTarget.valueAsNumber))
        }
        onBlur?.(event)
      }}
    />
  )
}
