import { Component, type ErrorInfo, type ReactNode } from 'react'
import '../App.css'

type AppErrorBoundaryProps = {
  children: ReactNode
}

type AppErrorBoundaryState = {
  hasError: boolean
  errorId: string
}

function buildErrorId(): string {
  return `APP-${Date.now().toString(36).toUpperCase()}`
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public constructor(props: AppErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      errorId: '',
    }
  }

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return {
      hasError: true,
      errorId: buildErrorId(),
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[AppErrorBoundary] unexpected render error', {
      error,
      componentStack: errorInfo.componentStack,
    })
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  public render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="settings-screen settings-screen--centered">
        <section className="card error-boundary__card">
          <header className="card__header">
            <h1 className="card__title">Ocurrio un error inesperado</h1>
            <p className="card__subtitle">
              Puedes recargar la aplicacion para recuperar la sesion.
            </p>
          </header>
          <p className="message message--error">Error ID: {this.state.errorId}</p>
          <div className="form-grid__actions error-boundary__actions">
            <button type="button" className="button button--primary" onClick={this.handleReload}>
              Recargar aplicacion
            </button>
          </div>
        </section>
      </div>
    )
  }
}
