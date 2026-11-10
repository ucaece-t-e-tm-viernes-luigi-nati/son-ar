import Link from 'next/link'
import { Logo } from '@/components/brand/logo'
import { buttonVariants } from '@/components/ui/button'
import { site } from '@/lib/site'
import { cn } from '@/lib/utils'

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="flex flex-col items-start justify-between gap-8 rounded-2xl bg-accent p-8 md:flex-row md:items-center md:p-12">
          <div>
            <h2 className="text-2xl font-semibold text-foreground md:text-3xl">Tu próxima fecha empieza acá.</h2>
            <p className="mt-2 text-accent-foreground/80">Sumate a la comunidad musical de la costa.</p>
          </div>
          <Link href="/ingresar?modo=registro" className={cn(buttonVariants({ size: 'lg' }), 'h-11 px-6 text-base')}>
            Crear mi perfil
          </Link>
        </div>
        <div className="mt-12 flex flex-col justify-between gap-4 text-sm text-muted-foreground md:flex-row md:items-center">
          <Logo />
          <p>© 2026 Son.ar · Mar del Plata, Argentina · {site.course}</p>
        </div>
      </div>
    </footer>
  )
}
