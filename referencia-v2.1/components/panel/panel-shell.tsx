import Link from 'next/link'
import { Logo } from '@/components/brand/logo'

export function PanelShell({
  label,
  user,
  children,
}: {
  label: string
  user: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 lg:px-6">
          <Logo href="/" />
          <span className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">{label}</span>
          <nav aria-label="Superficies" className="ml-auto hidden items-center gap-5 text-sm text-muted-foreground md:flex">
            <Link href="/app" className="hover:text-foreground">App</Link>
            <Link href="/negocios" className="hover:text-foreground">Negocios</Link>
            <Link href="/admin" className="hover:text-foreground">Admin</Link>
          </nav>
          <span className="ml-auto truncate text-sm font-medium md:ml-0">{user}</span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">{children}</main>
    </div>
  )
}

export function StatCard({ label, value, delta, hint }: { label: string; value: string | number; delta?: number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p>
      {delta !== undefined ? (
        <p className={delta >= 0 ? 'mt-1 text-xs text-success' : 'mt-1 text-xs text-destructive'}>
          {delta >= 0 ? '+' : ''}
          {delta}% {hint}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
