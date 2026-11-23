import { useState } from 'react'
import './FilterOptions.css'

type FilterOptionsProps<Value extends string | number> = {
  label: string
  options: ReadonlyArray<{ value: Value; label: string }>
  selected: readonly Value[]
  onChange: (selected: Value[]) => void
}

function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es-MX')
}

export function FilterOptions<Value extends string | number>({
  label,
  options,
  selected,
  onChange,
}: FilterOptionsProps<Value>) {
  const [search, setSearch] = useState('')
  const term = normalizeSearch(search.trim())
  const visibleOptions = options.filter((option) => normalizeSearch(option.label).includes(term))

  return (
    <fieldset className="filter-options">
      <legend className="form-grid__field">{label}</legend>
      <div className="filter-options__toolbar">
        <span>{selected.length ? `Seleccionadas: ${selected.length}` : 'Todas las opciones'}</span>
        {selected.length > 0 ? (
          <button className="filter-options__clear" type="button" aria-label={`Quitar selección de ${label}`} onClick={() => onChange([])}>
            Quitar selección
          </button>
        ) : null}
      </div>
      {options.length > 12 ? (
        <input
          className="form-grid__input"
          type="search"
          aria-label={`Buscar en ${label}`}
          placeholder="Buscar opciones"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      ) : null}
      {visibleOptions.length > 0 ? (
        <div className="filter-options__choices">
          {visibleOptions.map((option) => (
            <label className="filter-options__choice" key={option.value}>
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={(event) => {
                  onChange(event.target.checked
                    ? [...selected, option.value]
                    : selected.filter((value) => value !== option.value))
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="filter-options__empty" role="status">
          {term ? 'No hay coincidencias.' : 'No hay opciones disponibles.'}
        </p>
      )}
    </fieldset>
  )
}
