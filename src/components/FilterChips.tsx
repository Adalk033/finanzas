import { ActionButton } from './ActionButton'
import './FilterChips.css'

export type FilterChip = {
  key: string
  label: string
  onRemove: () => void
}

type FilterChipsProps = {
  chips: FilterChip[]
  disabled?: boolean
}

export function FilterChips({ chips, disabled }: FilterChipsProps) {
  if (chips.length === 0) return null

  return (
    <ul className="filter-chips" aria-label="Filtros activos">
      {chips.map((chip) => (
        <li className="filter-chips__item" key={chip.key}>
          <span className="filter-chips__label">{chip.label}</span>
          <ActionButton
            className="filter-chips__remove"
            icon="close"
            iconOnly
            label={`Quitar filtro: ${chip.label}`}
            disabled={disabled}
            onClick={chip.onRemove}
          />
        </li>
      ))}
    </ul>
  )
}
