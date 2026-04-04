import './Loader.css'

export function Loader() {
  return (
    <div className="loader">
      <div className="loader__spinner" />
      <p className="loader__text">Cargando datos...</p>
    </div>
  )
}
