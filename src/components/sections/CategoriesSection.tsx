import { useEffect, useState, type SyntheticEvent } from 'react'
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

  useEffect(() => {
    if (editingCategoryId !== null) {
      setIsCategoryFormOpen(true)
    }
  }, [editingCategoryId])

  useEffect(() => {
    if (editingSubcategoryId !== null) {
      setIsSubcategoryFormOpen(true)
    }
  }, [editingSubcategoryId])

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Categorias y Subcategorias</h2>
        <p className="card__subtitle">CRUD de categorias con subcategorias anidadas y control de eliminacion.</p>
      </header>

      <div className="category-layout">
        <section className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Categoria</h3>
            <p className="mini-card__subtitle">Define el grupo principal que se usara en gastos e ingresos.</p>
          </header>

          <div className="section-toolbar">
            <button className="button button--primary" type="button" onClick={() => setIsCategoryFormOpen((value) => !value)}>
              {isCategoryFormOpen ? 'Ocultar formulario' : editingCategoryId === null ? 'Nueva categoria' : 'Editar categoria'}
            </button>
            <div className="section-toolbar__spacer" />
            <button className="button button--secondary" type="button" disabled={!hasConfig} onClick={onReload}>
              Recargar
            </button>
          </div>

          {isCategoryFormOpen ? (
            <div className="section-panel">
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

                <label className="form-grid__field" htmlFor="categoryIcon">Icono (Lucide)</label>
                <input
                  id="categoryIcon"
                  className="form-grid__input"
                  type="text"
                  value={categoryForm.iconName}
                  onChange={(event) => onCategoryFormChange({ ...categoryForm, iconName: event.target.value })}
                  placeholder="UtensilsCrossed"
                />

                <label className="form-grid__field" htmlFor="categoryColor">Color</label>
                <input
                  id="categoryColor"
                  className="form-grid__input"
                  type="text"
                  value={categoryForm.color}
                  onChange={(event) => onCategoryFormChange({ ...categoryForm, color: event.target.value })}
                  placeholder="#2d8f85"
                />

                <div className="form-grid__actions">
                  <button className="button button--primary" type="submit" disabled={!hasConfig}>
                    {editingCategoryId === null ? 'Crear categoria' : 'Guardar cambios'}
                  </button>
                  <button className="button button--secondary" type="button" onClick={onCategoryReset}>
                    Limpiar
                  </button>
                </div>
              </form>
            </div>
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
            <button className="button button--primary" type="button" onClick={() => setIsSubcategoryFormOpen((value) => !value)}>
              {isSubcategoryFormOpen ? 'Ocultar formulario' : editingSubcategoryId === null ? 'Nueva subcategoria' : 'Editar subcategoria'}
            </button>
            <div className="section-toolbar__spacer" />
            <button className="button button--secondary" type="button" disabled={!hasConfig} onClick={onReload}>
              Recargar
            </button>
          </div>

          {isSubcategoryFormOpen ? (
            <div className="section-panel">
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
                  <button className="button button--primary" type="submit" disabled={!hasConfig || categories.length === 0}>
                    {editingSubcategoryId === null ? 'Crear subcategoria' : 'Guardar cambios'}
                  </button>
                  <button className="button button--secondary" type="button" onClick={onSubcategoryReset}>
                    Limpiar
                  </button>
                </div>
              </form>
            </div>
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
                            <button className="button button--secondary" type="button" onClick={() => onEditSubcategory(subcategory)}>
                              Editar
                            </button>
                            <button className="button button--danger" type="button" onClick={() => onDeleteSubcategory(subcategory.id)}>
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="category-card__actions">
                <button className="button button--secondary" type="button" onClick={() => onEditCategory(category)}>
                  Editar categoria
                </button>
                <button className="button button--danger" type="button" disabled={!category.canDelete} onClick={() => onDeleteCategory(category.id)}>
                  Eliminar categoria
                </button>
              </div>
            </article>
          ))
          : null}
      </div>
    </section>
  )
}
