import { ActionButton } from '../ActionButton'
import { FormModal } from '../FormModal'
import { useState, type SyntheticEvent } from 'react'
import { getCategoryTypeLabel } from '../../app/appHelpers'
import type {
  Category,
  CategoryInput,
  CategoryType,
  Subcategory,
  SubcategoryInput,
} from '../../types/domain'

type CategoryOption = {
  id: number
  name: string
}

type CategoriesSectionProps = {
  hasConfig: boolean
  categories: Category[]
  isCategoriesLoading: boolean
  categoryForm: CategoryInput
  subcategoryForm: SubcategoryInput
  categoryOptions: CategoryOption[]
  selectedSubcategoryCategoryId: number
  editingCategoryId: number | null
  editingSubcategoryId: number | null
  categoryError: string
  categoryMessage: string
  subcategoryError: string
  subcategoryMessage: string
  onCategoryFormChange: (nextForm: CategoryInput) => void
  onSubcategoryFormChange: (nextForm: SubcategoryInput) => void
  onCategorySubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onSubcategorySubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onCategoryReset: () => void
  onSubcategoryReset: () => void
  onReload: () => void
  onEditCategory: (category: Category) => void
  onDeleteCategory: (categoryId: number) => void
  onEditSubcategory: (subcategory: Subcategory) => void
  onDeleteSubcategory: (subcategoryId: number) => void
}

export function CategoriesSection({
  hasConfig,
  categories,
  isCategoriesLoading,
  categoryForm,
  subcategoryForm,
  categoryOptions,
  selectedSubcategoryCategoryId,
  editingCategoryId,
  editingSubcategoryId,
  categoryError,
  categoryMessage,
  subcategoryError,
  subcategoryMessage,
  onCategoryFormChange,
  onSubcategoryFormChange,
  onCategorySubmit,
  onSubcategorySubmit,
  onCategoryReset,
  onSubcategoryReset,
  onReload,
  onEditCategory,
  onDeleteCategory,
  onEditSubcategory,
  onDeleteSubcategory,
}: CategoriesSectionProps) {
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(editingCategoryId !== null)
  const [isSubcategoryFormOpen, setIsSubcategoryFormOpen] = useState(editingSubcategoryId !== null)
  const isCategoryFormVisible = isCategoryFormOpen || editingCategoryId !== null
  const isSubcategoryFormVisible = isSubcategoryFormOpen || editingSubcategoryId !== null

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Categorias y Subcategorias</h2>
        <p className="card__subtitle">Crea, edita y elimina categorías con sus subcategorías.</p>
      </header>

      <div className="category-layout">
        <section className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Categoria</h3>
            <p className="mini-card__subtitle">Define el grupo principal que se usara en gastos e ingresos.</p>
          </header>

          <div className="section-toolbar">
            <ActionButton className="button button--primary" type="button" onClick={() => {
              if (editingCategoryId !== null) {
                onCategoryReset()
                setIsCategoryFormOpen(false)
                return
              }
              setIsCategoryFormOpen((value) => !value)
            }}
              icon={isCategoryFormVisible ? 'close' : 'plus'}
              label={isCategoryFormVisible ? 'Ocultar formulario' : 'Nueva categoria'}
            />
            <div className="section-toolbar__spacer" />
            <ActionButton iconOnly className="button button--secondary" type="button" disabled={!hasConfig} onClick={onReload}
              icon="refresh"
              label="Recargar"
            />
          </div>

          {isCategoryFormVisible ? (
            <FormModal title={editingCategoryId === null ? "Nueva categoría" : "Editar categoría"} onClose={() => { onCategoryReset(); setIsCategoryFormOpen(false) }} error={categoryError} message={categoryMessage}>
              <form className="form-grid" onSubmit={onCategorySubmit}>
                <label className="form-grid__field" htmlFor="categoryName">Nombre</label>
                <input
                  id="categoryName"
                  className="form-grid__input"
                  type="text"
                  value={categoryForm.name}
                  onChange={(event) => onCategoryFormChange({ ...categoryForm, name: event.target.value })}
                  placeholder="Alimentacion"
                  required
                />

                <label className="form-grid__field" htmlFor="categoryType">Tipo</label>
                <select
                  id="categoryType"
                  className="form-grid__input"
                  value={categoryForm.type}
                  onChange={(event) => onCategoryFormChange({ ...categoryForm, type: event.target.value as CategoryType })}
                >
                  <option value="expense">Gasto</option>
                  <option value="income">Ingreso</option>
                  <option value="both">Ambos</option>
                </select>

                <div className="form-grid__actions">
                  <ActionButton className="button button--primary" type="submit" disabled={!hasConfig}
                    icon="save"
                    label={editingCategoryId === null ? 'Crear categoria' : 'Guardar cambios'}
                  />
                  <ActionButton iconOnly className="button button--secondary" type="button" onClick={onCategoryReset} icon="reset" label="Limpiar" />
                </div>
              </form>
            </FormModal>
          ) : null}

          {categoryError ? <p className="message message--error">{categoryError}</p> : null}
          {categoryMessage ? <p className="message message--success">{categoryMessage}</p> : null}
        </section>

        <section className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Subcategoria</h3>
            <p className="mini-card__subtitle">Cada subcategoria vive dentro de una categoria existente.</p>
          </header>

          <div className="section-toolbar">
            <ActionButton className="button button--primary" type="button" onClick={() => {
              if (editingSubcategoryId !== null) {
                onSubcategoryReset()
                setIsSubcategoryFormOpen(false)
                return
              }
              setIsSubcategoryFormOpen((value) => !value)
            }}
              icon={isSubcategoryFormVisible ? 'close' : 'plus'}
              label={isSubcategoryFormVisible ? 'Ocultar formulario' : 'Nueva subcategoria'}
            />
            <div className="section-toolbar__spacer" />
            <ActionButton iconOnly className="button button--secondary" type="button" disabled={!hasConfig} onClick={onReload}
              icon="refresh"
              label="Recargar"
            />
          </div>

          {isSubcategoryFormVisible ? (
            <FormModal title={editingSubcategoryId === null ? "Nueva subcategoría" : "Editar subcategoría"} onClose={() => { onSubcategoryReset(); setIsSubcategoryFormOpen(false) }} error={subcategoryError} message={subcategoryMessage}>
              <form className="form-grid" onSubmit={onSubcategorySubmit}>
                <label className="form-grid__field" htmlFor="subcategoryCategory">Categoria</label>
                <select
                  id="subcategoryCategory"
                  className="form-grid__input"
                  value={selectedSubcategoryCategoryId}
                  onChange={(event) => onSubcategoryFormChange({ ...subcategoryForm, categoryId: Number(event.target.value) })}
                  required
                >
                  <option value={0}>Selecciona categoria</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>

                <label className="form-grid__field" htmlFor="subcategoryName">Nombre</label>
                <input
                  id="subcategoryName"
                  className="form-grid__input"
                  type="text"
                  value={subcategoryForm.name}
                  onChange={(event) => onSubcategoryFormChange({ ...subcategoryForm, name: event.target.value })}
                  placeholder="Despensa"
                  required
                />

                <label className="form-grid__field" htmlFor="subcategoryIcon">Icono (Lucide)</label>
                <input
                  id="subcategoryIcon"
                  className="form-grid__input"
                  type="text"
                  value={subcategoryForm.iconName}
                  onChange={(event) => onSubcategoryFormChange({ ...subcategoryForm, iconName: event.target.value })}
                  placeholder="ShoppingCart"
                />

                <div className="form-grid__actions">
                  <ActionButton className="button button--primary" type="submit" disabled={!hasConfig || categories.length === 0}
                    icon="save"
                    label={editingSubcategoryId === null ? 'Crear subcategoria' : 'Guardar cambios'}
                  />
                  <ActionButton iconOnly className="button button--secondary" type="button" onClick={onSubcategoryReset} icon="reset" label="Limpiar" />
                </div>
              </form>
            </FormModal>
          ) : null}

          {subcategoryError ? <p className="message message--error">{subcategoryError}</p> : null}
          {subcategoryMessage ? <p className="message message--success">{subcategoryMessage}</p> : null}
        </section>
      </div>

      <div className="category-list">
        {isCategoriesLoading ? <p className="card__subtitle">Cargando categorias...</p> : null}
        {!isCategoriesLoading && categories.length === 0 ? <p className="card__subtitle">No hay categorias registradas.</p> : null}

        {!isCategoriesLoading
          ? categories.map((category) => (
            <article key={category.id} className="category-card">
              <header className="category-card__header">
                <div>
                  <h3 className="category-card__title">{category.name}</h3>
                  <p className="category-card__meta">
                    {getCategoryTypeLabel(category.type)} · {category.subcategories.length} subcategorias
                  </p>
                </div>
                <div className="category-card__badges">
                  {category.isSystem ? <span className="badge badge--info">Sistema</span> : null}
                  {category.canDelete ? <span className="badge badge--success">Eliminable</span> : <span className="badge badge--warning">Protegida</span>}
                </div>
              </header>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Subcategoria</th>
                      <th>Icono</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.subcategories.length === 0 ? (
                      <tr>
                        <td colSpan={3}>No hay subcategorias en esta categoria.</td>
                      </tr>
                    ) : null}
                    {category.subcategories.map((subcategory) => (
                      <tr key={subcategory.id}>
                        <td>{subcategory.name}</td>
                        <td>{subcategory.iconName ?? '-'}</td>
                        <td>
                          <div className="table__actions">
                            <ActionButton iconOnly className="button button--secondary" type="button" onClick={() => onEditSubcategory(subcategory)}
                              icon="edit"
                              label="Editar"
                            />
                            <ActionButton iconOnly className="button button--danger" type="button" onClick={() => onDeleteSubcategory(subcategory.id)}
                              icon="trash"
                              label="Eliminar"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="category-card__actions">
                <ActionButton iconOnly className="button button--secondary" type="button" onClick={() => onEditCategory(category)}
                  icon="edit"
                  label="Editar categoria"
                />
                <ActionButton iconOnly className="button button--danger" type="button" disabled={!category.canDelete} onClick={() => onDeleteCategory(category.id)}
                  icon="trash"
                  label="Eliminar categoria"
                />
              </div>
            </article>
          ))
          : null}
      </div>
    </section>
  )
}
