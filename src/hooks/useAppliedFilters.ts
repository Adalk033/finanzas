import { useRef, useState } from 'react'
import type { ApiResponse } from '../types/config'

export function useAppliedFilters<Filters>(initialFilters: Filters) {
  const [appliedFilters, setAppliedFilters] = useState(initialFilters)
  const query = useRef({ applied: initialFilters, requested: initialFilters, id: 0 })

  const runFilterQuery = async <Data>(
    filters: Filters,
    load: (filters: Filters) => Promise<ApiResponse<Data>>,
  ): Promise<ApiResponse<Data> | undefined> => {
    const current = query.current
    const id = ++current.id
    current.requested = filters
    const result = await load(filters)

    // A late response must not restore filters or rows from an older query.
    if (id !== current.id) return
    if (result.success) {
      current.applied = filters
      setAppliedFilters(() => filters)
    } else {
      current.requested = current.applied
    }
    return result
  }

  return {
    appliedFilters,
    getRequestedFilters: () => query.current.requested,
    runFilterQuery,
  }
}
