import type { Metadata } from 'next'
import Link from 'next/link'
import { CircleAlert, LogOut } from 'lucide-react'
import { signOutAction } from '@/app/auth-actions'
import { BottomNav, SideNav } from '@/components/app/app-nav'
import { Logo } from '@/components/brand/logo'
import { ProfileAvatar } from '@/components/shared/profile-avatar'
import { trackDailyVisit } from '@/lib/activity'
import { requireMember } from '@/lib/guards'
import { connectionRepo } from '@/lib/repositories'

export const metadata: Metadata = { title: { default: 'Inicio', template: '%s · Son.ar' }, robots: { index: false, follow: false } }

// Guard en el servidor antes de responder: sin sesión → /ingresar; sin perfil de músico o banda → /ingresar.
export const instant = false

export default async function UserAppLayout({ children }: LayoutProps<'/app'>) {
  const { profile: me } = await requireMember()
  const [connections] = await Promise.all([connectionRepo.forProfile(me.id), trackDailyVisit(me.id)])
  const pending = connections.filter((c) => c.status === 'pending' && c.toId === me.id).length

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur-lg lg:hidden">
        <Logo href="/app" />
        <Link href="/app/perfil" aria-label="Mi perfil">
          <ProfileAvatar profile={me} className="size-8" />
        </Link>
      </header>
      {me.status === 'paused' && (
        <div role="status" className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="mx-auto flex max-w-6xl items-start gap-2">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            Tu cuenta está pausada por el equipo de Son.ar: podés mirar la red, pero no publicar, conectar ni postularte. Escribinos para reactivarla.
          </p>
        </div>
      )}
      <div className="mx-auto flex max-w-6xl gap-8 px-4 lg:px-6">
        <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col py-6 lg:flex">
          <Logo href="/app" className="mb-8 px-3" />
          <SideNav pendingCount={pending} />
          <div className="mt-auto flex flex-col gap-1">
            <Link href="/app/perfil" className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-secondary">
              <ProfileAvatar profile={me} className="size-9" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{me.name}</span>
                <span className="block truncate text-xs text-muted-foreground">@{me.handle}</span>
              </span>
            </Link>
            <form action={signOutAction.bind(null, '/')}>
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
                <LogOut className="size-4" aria-hidden /> Cerrar sesión
              </button>
            </form>
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-28 pt-6 lg:pb-10">{children}</main>
      </div>
      <BottomNav pendingCount={pending} />
    </div>
  )
}
