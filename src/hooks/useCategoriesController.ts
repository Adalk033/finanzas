import { useMemo, useState, type SyntheticEvent } from 'react'
import { apiClient } from '../api/client'
import {
  EMPTY_CATEGORY_FORM,
  EMPTY_SUBCATEGORY_FORM,
  toEditableCategory,
  toEditableSubcategory,
} from '../app/appHelpers'
import type { Category, CategoryInput, Subcategory, SubcategoryInput } from '../types/domain'

export function useCategoriesController() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false)
  const [categoryMessage, setCategoryMessage] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [categoryForm, setCategoryForm] = useState<CategoryInput>(EMPTY_CATEGORY_FORM)
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)

  const [subcategoryMessage, setSubcategoryMessage] = useState('')
  const [subcategoryError, setSubcategoryError] = useState('')
  const [subcategoryForm, setSubcategoryForm] = useState<SubcategoryInput>(EMPTY_SUBCATEGORY_FORM)
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<number | null>(null)

  const loadCategoriesInternal = async (showError: boolean): Promise<boolean> => {
    setIsCategoriesLoading(true)

    if (showError) {
      setCategoryError('')
    }

    const result = await apiClient.getCategories()

    if (!result.success) {
      if (showError) {
        setCategoryError(result.error ?? 'No se pudieron cargar las categorias.')
      }
      setIsCategoriesLoading(false)
      return false
    }

    setCategories(result.data ?? [])
    setIsCategoriesLoading(false)
    return true
  }

  const loadCategories = async (): Promise<void> => {
    await loadCategoriesInternal(true)
  }

  const categoryOptions = useMemo(() => categories.map((category) => ({ id: category.id, name: category.name })), [categories])
  const selectedSubcategoryCategoryId = subcategoryForm.categoryId === 0 ? (categories[0]?.id ?? 0) : subcategoryForm.categoryId

  const resetCategoryEditor = (): void => {
    setCategoryForm(EMPTY_CATEGORY_FORM)
    setEditingCategoryId(null)
  }

  const resetSubcategoryEditor = (): void => {
    setSubcategoryForm({
      ...EMPTY_SUBCATEGORY_FORM,
      categoryId: categories[0]?.id ?? 0,
    })
    setEditingSubcategoryId(null)
  }

  const startCategoryEdit = (category: Category): void => {
    setEditingCategoryId(category.id)
    setCategoryForm(toEditableCategory(category))
  }

  const startSubcategoryEdit = (subcategory: Subcategory): void => {
    setEditingSubcategoryId(subcategory.id)
    setSubcategoryForm(toEditableSubcategory(subcategory))
  }

  const handleCategorySubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setCategoryError('')
    setCategoryMessage('')

    const payload = {
      ...categoryForm,
      name: categoryForm.name.trim(),
    }

    if (editingCategoryId === null) {
      const created = await apiClient.createCategory(payload)
      if (!created.success) {
        setCategoryError(created.error ?? 'No se pudo crear la categoria.')
        return
      }

      const reloaded = await loadCategoriesInternal(false)
      setCategoryMessage(
        reloaded
          ? 'Categoria creada correctamente.'
          : 'Categoria creada correctamente. No se pudo refrescar la lista, presiona Recargar.',
      )
    } else {
      const updated = await apiClient.updateCategory(editingCategoryId, payload)
      if (!updated.success) {
        setCategoryError(updated.error ?? 'No se pudo actualizar la categoria.')
        return
      }

      const reloaded = await loadCategoriesInternal(false)
      setCategoryMessage(
        reloaded
          ? 'Categoria actualizada correctamente.'
          : 'Categoria actualizada correctamente. No se pudo refrescar la lista, presiona Recargar.',
      )
    }

    resetCategoryEditor()
  }

  const handleCategoryDelete = async (id: number): Promise<void> => {
    setCategoryError('')
    setCategoryMessage('')

    const deleted = await apiClient.deleteCategory(id)

    if (!deleted.success) {
      setCategoryError(deleted.error ?? 'No se pudo eliminar la categoria.')
      return
    }

    const reloaded = await loadCategoriesInternal(false)
    setCategoryMessage(
      reloaded
        ? 'Categoria eliminada correctamente.'
        : 'Categoria eliminada correctamente. No se pudo refrescar la lista, presiona Recargar.',
    )
    if (editingCategoryId === id) {
      resetCategoryEditor()
    }
    if (subcategoryForm.categoryId === id) {
      resetSubcategoryEditor()
    }
  }

  const handleSubcategorySubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setSubcategoryError('')
    setSubcategoryMessage('')

    if (subcategoryForm.categoryId < 1) {
      setSubcategoryError('Selecciona una categoria valida.')
      return
    }

    const payload = {
      ...subcategoryForm,
      name: subcategoryForm.name.trim(),
    }

    if (editingSubcategoryId === null) {
      const created = await apiClient.createSubcategory(payload)
      if (!created.success) {
        setSubcategoryError(created.error ?? 'No se pudo crear la subcategoria.')
        return
      }

      const reloaded = await loadCategoriesInternal(false)
      setSubcategoryMessage(
        reloaded
          ? 'Subcategoria creada correctamente.'
          : 'Subcategoria creada correctamente. No se pudo refrescar la lista, presiona Recargar.',
      )
    } else {
      const updated = await apiClient.updateSubcategory(editingSubcategoryId, payload)
      if (!updated.success) {
        setSubcategoryError(updated.error ?? 'No se pudo actualizar la subcategoria.')
        return
      }

      const reloaded = await loadCategoriesInternal(false)
      setSubcategoryMessage(
        reloaded
          ? 'Subcategoria actualizada correctamente.'
          : 'Subcategoria actualizada correctamente. No se pudo refrescar la lista, presiona Recargar.',
      )
    }

    resetSubcategoryEditor()
  }

  const handleSubcategoryDelete = async (id: number): Promise<void> => {
    setSubcategoryError('')
    setSubcategoryMessage('')

    const deleted = await apiClient.deleteSubcategory(id)

    if (!deleted.success) {
      setSubcategoryError(deleted.error ?? 'No se pudo eliminar la subcategoria.')
      return
    }

    const reloaded = await loadCategoriesInternal(false)
    setSubcategoryMessage(
      reloaded
        ? 'Subcategoria eliminada correctamente.'
        : 'Subcategoria eliminada correctamente. No se pudo refrescar la lista, presiona Recargar.',
    )
    if (editingSubcategoryId === id) {
      resetSubcategoryEditor()
    }
  }

  return {
    categories,
    isCategoriesLoading,
    categoryMessage,
    categoryError,
    categoryForm,
    editingCategoryId,
    subcategoryMessage,
    subcategoryError,
    subcategoryForm,
    editingSubcategoryId,
    categoryOptions,
    selectedSubcategoryCategoryId,
    setCategoryForm,
    setSubcategoryForm,
    loadCategories,
    resetCategoryEditor,
    resetSubcategoryEditor,
    startCategoryEdit,
    startSubcategoryEdit,
    handleCategorySubmit,
    handleCategoryDelete,
    handleSubcategorySubmit,
    handleSubcategoryDelete,
  }
}
