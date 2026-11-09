import Link from 'next/link'
import { Logo } from '@/components/brand/logo'
import { BottomNav, SideNav } from '@/components/app/app-nav'
import { ProfileAvatar } from '@/components/shared/profile-avatar'
import { getSession } from '@/lib/auth/session'
import { connectionRepo, profileRepo } from '@/lib/repositories'

export default async function UserAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession('user')
  const [me, connections] = await Promise.all([
    profileRepo.byId(session.profileId),
    connectionRepo.forProfile(session.profileId),
  ])
  const pending = connections.filter((c) => c.status === 'pending' && c.toId === session.profileId).length

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur-lg lg:hidden">
        <Logo href="/app" />
        {me && (
          <Link href="/app/perfil" aria-label="Mi perfil">
            <ProfileAvatar profile={me} className="size-8" />
          </Link>
        )}
      </header>
      <div className="mx-auto flex max-w-6xl gap-8 px-4 lg:px-6">
        <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col py-6 lg:flex">
          <Logo href="/app" className="mb-8 px-3" />
          <SideNav pendingCount={pending} />
          {me && (
            <Link
              href="/app/perfil"
              className="mt-auto flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-secondary"
            >
              <ProfileAvatar profile={me} className="size-9" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{me.name}</span>
                <span className="block truncate text-xs text-muted-foreground">@{me.handle}</span>
              </span>
            </Link>
          )}
        </aside>
        <main className="min-w-0 flex-1 pb-28 pt-6 lg:pb-10">{children}</main>
      </div>
      <BottomNav pendingCount={pending} />
    </div>
  )
}
