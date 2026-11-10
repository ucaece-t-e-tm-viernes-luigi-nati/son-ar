import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { contactHref } from '@/lib/site'
import { cn } from '@/lib/utils'

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[92svh] items-end overflow-hidden">
      <Image
        src="/images/hero.png"
        alt="Banda tocando en vivo en un club con luces cálidas"
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/70 to-background/10" />
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-6 md:pb-24">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden />
          Hecho en Mar del Plata
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] md:text-6xl lg:text-7xl">
          Conectando músicos <span className="text-primary">y sueños.</span>
        </h1>
        <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          La red social de la música en vivo. Encontrá banda, sumá integrantes y conseguí fechas en bares,
          restaurantes y teatros, sin perder tiempo.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/ingresar?modo=registro" className={cn(buttonVariants({ size: 'lg' }), 'h-11 px-5 text-base')}>
            Soy músico o banda
            <ArrowRight data-icon="inline-end" />
          </Link>
          {/* Los venues no se registran solos: escriben al equipo y reciben un link de alta por mail. */}
          <a href={contactHref()} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 px-5 text-base')}>
            Tengo un venue
          </a>
        </div>
      </div>
    </section>
  )
}
