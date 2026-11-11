import type { AppSection } from './appHelpers'
import type { SidebarGroupId } from '../types/navigation'

type NavItem = {
  key: AppSection
  label: string
  description: string
  keywords: string[]
  showPendingBadge?: boolean
}

type NavGroup = {
  id: SidebarGroupId
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'main',
    label: 'Principal',
    items: [
      {
        key: 'dashboard',
        label: 'Resumen',
        description: 'Vista general de saldos, deudas, ahorro, gráficas y próximos compromisos.',
        keywords: ['inicio', 'dashboard', 'panel', 'balance', 'disponible', 'patrimonio', 'estadísticas', 'gráficos', 'flujo de efectivo', 'ingresos', 'egresos', 'gastos por categoría', 'evolución de saldo', 'tendencias', 'ahorro mensual', 'próximos pagos', 'compromisos'],
      },
      {
        key: 'transactions',
        label: 'Movimientos',
        description: 'Registrar y consultar gastos, ingresos y compras a meses sin intereses.',
        keywords: ['transacciones', 'historial', 'operaciones', 'registro', 'registrar', 'agregar', 'editar', 'eliminar', 'gasto', 'ingreso', 'egreso', 'entrada', 'salida', 'compra', 'consumo', 'cargo', 'abono', 'msi', 'meses sin intereses', 'fecha', 'categoría', 'subcategoría', 'filtrar', 'buscar', 'descripción', 'notas'],
      },
    ],
  },
  {
    id: 'accounts',
    label: 'Cuentas y deudas',
    items: [
      {
        key: 'creditCards',
        label: 'Tarjetas de crédito',
        description: 'Consultar deuda, crédito disponible, estados de cuenta, cortes y pagos de tarjetas.',
        keywords: ['tdc', 'plástico', 'banco', 'límite', 'línea de crédito', 'utilización', 'porcentaje', 'saldo deudor', 'fecha de corte', 'vencimiento', 'fecha límite', 'pago mínimo', 'pago para no generar intereses', 'liquidar', 'abonar', 'compras', 'msi', 'meses sin intereses', 'mensualidades', 'conciliar', 'conciliación', 'ajustar', 'saldo real'],
      },
      {
        key: 'debitCards',
        label: 'Tarjetas de débito',
        description: 'Consultar saldo disponible, registrar movimientos y conciliar tarjetas de débito.',
        keywords: ['tdd', 'bancaria', 'cuenta', 'dinero', 'efectivo', 'fondos', 'nómina', 'ahorro', 'saldo real', 'conciliación', 'conciliar', 'ajustar', 'ingreso', 'gasto', 'depósito', 'retiro', 'cargo', 'abono', 'historial', 'transacciones', 'banco'],
      },
      {
        key: 'transfers',
        label: 'Transferencias',
        description: 'Mover dinero entre cuentas y registrar pagos de tarjetas de crédito.',
        keywords: ['transferir', 'traspaso', 'enviar', 'mover', 'dinero', 'origen', 'destino', 'cuenta', 'interbancaria', 'pago de tarjeta', 'pagar tarjeta', 'abonar tarjeta', 'liquidar tarjeta', 'crédito', 'débito', 'movimiento entre cuentas', 'ajuste'],
      },
      {
        key: 'loans',
        label: 'Préstamos',
        description: 'Administrar créditos, cuotas, amortización y pagos de préstamos.',
        keywords: ['préstamo', 'financiamiento', 'deuda', 'acreedor', 'prestamista', 'banco', 'capital', 'interés', 'intereses', 'tasa anual', 'plazo', 'abono', 'abonar', 'pagar', 'liquidar', 'mensualidad', 'semanal', 'quincenal', 'nómina', 'descuento', 'saldo pendiente', 'conciliar', 'conciliación', 'calendario', 'tabla de amortización'],
      },
      {
        key: 'instruments',
        label: 'Instrumentos',
        description: 'Crear y editar cuentas bancarias y tarjetas de crédito o débito.',
        keywords: ['instrumento financiero', 'cuenta', 'bancaria', 'banco', 'tarjeta', 'crédito', 'débito', 'crear', 'agregar', 'registrar', 'editar', 'administrar', 'activar', 'desactivar', 'saldo inicial', 'límite', 'últimos cuatro dígitos', 'vincular', 'moneda', 'efectivo'],
      },
    ],
  },
  {
    id: 'family',
    label: 'Familia',
    items: [
      {
        key: 'familyDashboard',
        label: 'Inicio',
        description: 'Resumen familiar de gastos del hogar, categorías y tendencia mensual.',
        keywords: ['resumen', 'panel', 'dashboard', 'familiar', 'familiares', 'hogar', 'casa', 'compartidos', 'estadísticas', 'gráficas', 'total', 'mes', 'mensual', 'distribución', 'comparación', 'categorías', 'tendencia'],
      },
      {
        key: 'familyExpenses',
        label: 'Gastos',
        description: 'Registrar y consultar gastos familiares por mes y categoría.',
        keywords: ['gasto familiar', 'familiares', 'hogar', 'casa', 'compartidos', 'compra', 'consumo', 'egreso', 'registrar', 'agregar', 'editar', 'eliminar', 'historial', 'mes', 'mensual', 'categorías', 'subcategorías', 'descripción', 'notas', 'filtrar'],
      },
    ],
  },
  {
    id: 'planning',
    label: 'Planificación',
    items: [
      {
        key: 'budgets',
        label: 'Presupuestos',
        description: 'Definir límites de gasto por categoría, revisar el mes y administrar metas de ahorro.',
        keywords: ['presupuesto', 'plan', 'planear', 'planificar', 'organizar', 'control', 'tope', 'límite', 'asignar', 'monto', 'mensual', 'mes', 'categorías', 'gasto', 'excedido', 'exceso', 'restante', 'disponible', 'consumido', 'porcentaje', 'alerta', 'meta', 'metas de ahorro', 'objetivo', 'ahorrar', 'alcancía', 'progreso', 'fecha objetivo', 'monto acumulado'],
      },
      {
        key: 'fixedExpenses',
        label: 'Gastos fijos',
        description: 'Organizar pagos recurrentes del hogar y registrar pagos parciales o completos.',
        keywords: ['gasto fijo', 'servicios', 'renta', 'alquiler', 'luz', 'agua', 'gas', 'internet', 'teléfono', 'colegiatura', 'seguro', 'mantenimiento', 'recibo', 'factura', 'obligación', 'recurrente', 'mensual', 'variable', 'estimado', 'pagar', 'abonar', 'parcial', 'pendiente', 'vencimiento'],
      },
      {
        key: 'subscriptions',
        label: 'Suscripciones',
        description: 'Administrar membresías, cobros periódicos, renovaciones e ingresos recurrentes.',
        keywords: ['suscripción', 'subscripción', 'membresía', 'servicio', 'streaming', 'netflix', 'spotify', 'disney', 'youtube', 'amazon', 'prime', 'icloud', 'nube', 'gimnasio', 'software', 'licencia', 'domiciliación', 'cargo automático', 'recurrente', 'mensual', 'anual', 'semanal', 'renovación', 'próximo cobro', 'cancelar', 'desactivar', 'ingreso', 'ingresos recurrentes', 'sueldo', 'salario', 'nómina', 'quincenal', 'quincena', 'depósito automático', 'próximo ingreso', 'frecuencia'],
      },
      {
        key: 'reminders',
        label: 'Recordatorios',
        description: 'Consultar avisos y fechas de pagos, cortes, préstamos y suscripciones pendientes.',
        keywords: ['recordatorio', 'recordar', 'aviso', 'alerta', 'notificación', 'calendario', 'agenda', 'fecha', 'vencimiento', 'próximo', 'pendiente', 'pagar', 'pago', 'corte', 'tarjeta', 'préstamo', 'suscripción', 'personalizado', 'leído', 'descartar'],
        showPendingBadge: true,
      },
      {
        key: 'simulator',
        label: 'Simulador',
        description: 'Comparar una compra directa, meses sin intereses o un préstamo antes de decidir.',
        keywords: ['simular', 'simulación', 'escenario', 'proyección', 'calcular', 'calculadora', 'comparar', 'comparación', 'compra', 'contado', 'msi', 'meses sin intereses', 'crédito', 'préstamo', 'financiamiento', 'tasa', 'interés', 'intereses', 'plazo', 'cuotas', 'mensualidades', 'capacidad de pago', 'impacto', 'utilización', 'qué pasa si'],
      },
    ],
  },
  {
    id: 'organization',
    label: 'Organización',
    items: [
      {
        key: 'banks',
        label: 'Bancos',
        description: 'Crear y editar el catálogo de instituciones bancarias.',
        keywords: ['banco', 'institución', 'entidad', 'financiera', 'catálogo', 'registrar', 'agregar', 'editar', 'activar', 'desactivar', 'nombre corto', 'abreviatura', 'bbva', 'banamex', 'banorte', 'santander', 'hsbc', 'scotiabank', 'bancoppel', 'azteca', 'nu', 'hey banco'],
      },
      {
        key: 'categories',
        label: 'Categorías',
        description: 'Organizar categorías y subcategorías de ingresos y gastos.',
        keywords: ['categoría', 'subcategoría', 'clasificación', 'clasificar', 'etiqueta', 'rubro', 'grupo', 'tipo', 'catálogo', 'ordenar', 'agregar', 'crear', 'editar', 'ingreso', 'gasto', 'alimentación', 'comida', 'transporte', 'salud', 'educación', 'entretenimiento', 'icono'],
      },
    ],
  },
  {
    id: 'tools',
    label: 'Herramientas',
    items: [
      {
        key: 'settings',
        label: 'Configuración',
        description: 'Consultar la base de datos local, respaldar, restaurar e importar o exportar CSV.',
        keywords: ['ajustes', 'preferencias', 'opciones', 'almacenamiento', 'sqlite', 'archivo', 'ruta', 'ubicación', 'estado', 'diagnóstico', 'seguridad', 'copia de seguridad', 'respaldo', 'backup', 'restauración', 'restaurar', 'recuperar', 'importar', 'importación', 'exportar', 'exportación', 'csv', 'movimientos', 'datos', 'local', 'sin conexión'],
      },
    ],
  },
]

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX')
    .replace(/[^a-z0-9]+/g, ' ').trim()
}

const SEARCH_STOP_WORDS = new Set([
  'a', 'al', 'con', 'cual', 'cuales', 'como', 'de', 'del', 'donde', 'el', 'en', 'es',
  'la', 'las', 'lo', 'los', 'me', 'mi', 'mis', 'necesito', 'o', 'para', 'por', 'puedo',
  'que', 'quiero', 'se', 'un', 'una', 'unos', 'unas', 'ver', 'y',
])

const SEARCH_INDEX = NAV_GROUPS.map((group) => ({
  group,
  items: group.items.map((item) => ({
    item,
    words: normalizeSearch([group.label, item.label, item.description, ...item.keywords].join(' ')).split(' '),
  })),
}))

export function filterNavigationGroups(query: string): NavGroup[] {
  const terms = normalizeSearch(query).split(' ').filter((term) => term && !SEARCH_STOP_WORDS.has(term))
  if (terms.length === 0) return NAV_GROUPS

  return SEARCH_INDEX.flatMap(({ group, items }) => {
    const matches = items.filter(({ words }) => terms.every((term) => words.some((word) => word.startsWith(term))))
    return matches.length > 0 ? [{ ...group, items: matches.map(({ item }) => item) }] : []
  })
}
