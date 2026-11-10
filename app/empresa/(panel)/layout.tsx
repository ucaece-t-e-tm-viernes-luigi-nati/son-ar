import { CircleAlert } from 'lucide-react'
import { signOutAction } from '@/app/auth-actions'
import { Logo } from '@/components/brand/logo'
import { NavLinks } from '@/components/panel/nav-links'
import { PanelHeader, StatusBadge } from '@/components/panel/ui'
import { requireVenue } from '@/lib/guards'
import { venueCan } from '@/lib/permissions'
import { switchClient } from './actions'

// Guard en el servidor ANTES de responder: sin sesión o sin membresía → 404 (no revela que existe).
export const instant = false

export default async function VenuePanelLayout({ children }: LayoutProps<'/empresa'>) {
  const ctx = await requireVenue('dashboard.view')
  const links = [
    { href: '/empresa', label: 'Resumen' },
    { href: '/empresa/convocatorias', label: 'Convocatorias' },
    ...(venueCan(ctx.role, 'venue.edit') ? [{ href: '/empresa/local', label: 'Perfil del local' }] : []),
    { href: '/empresa/equipo', label: 'Equipo' },
    ...(venueCan(ctx.role, 'billing.view') ? [{ href: '/empresa/plan', label: 'Plan y pagos' }] : []),
    { href: '/empresa/cambiar-clave', label: 'Cambiar clave' },
  ]

  return (
    <>
      <PanelHeader
        brand={<Logo href="/empresa" suffix="venues" />}
        right={
          <>
            {ctx.memberships.length > 1 ? (
              <form action={switchClient} className="flex items-center gap-2">
                <label htmlFor="client-switch" className="sr-only">
                  Cambiar de venue
                </label>
                <select id="client-switch" name="clientId" defaultValue={ctx.clientId} className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm">
                  {ctx.memberships.map((m) => (
                    <option key={m.clientId} value={m.clientId}>
                      {m.clientName}
                    </option>
                  ))}
                </select>
                <button className="rounded-lg border border-border px-2 py-1.5 text-xs font-semibold">Cambiar</button>
              </form>
            ) : (
              <span className="font-semibold">{ctx.clientName}</span>
            )}
            <StatusBadge status={ctx.status} />
            <span className="hidden text-muted-foreground sm:inline">{ctx.user.email}</span>
            <form action={signOutAction.bind(null, '/empresa/ingresar')}>
              <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">Salir</button>
            </form>
          </>
        }
        nav={<NavLinks links={links} root="/empresa" />}
      />
      {ctx.readOnly && (
        <div role="status" className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <div className="mx-auto flex max-w-7xl items-start gap-2 lg:px-2">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              Tu cuenta está {ctx.status === 'paused' ? 'pausada' : 'dada de baja'}: el panel queda en modo solo lectura y tu venue y sus convocatorias no se
              muestran a músicos y bandas. Para reactivarla, respondé el último mail que te enviamos.
            </p>
          </div>
        </div>
      )}
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 lg:px-6">{children}</main>
    </>
  )
}
