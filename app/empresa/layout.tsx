import type { Metadata } from 'next'

// Superficie de VENUES (clientes B2B). No se linkea desde la parte pública; no se indexa.
export const metadata: Metadata = {
  title: { default: 'Panel del venue', template: '%s · Panel del venue | Son.ar' },
  robots: { index: false, follow: false, nocache: true },
}

export default function EmpresaLayout({ children }: LayoutProps<'/empresa'>) {
  return <div className="min-h-svh bg-background">{children}</div>
}
