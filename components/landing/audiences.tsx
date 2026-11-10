import Image from 'next/image'
import { CalendarCheck, Search, Sparkles } from 'lucide-react'

const AUDIENCES = [
  {
    title: 'Músicos solistas',
    body: 'Mostrá tu instrumento, tus géneros y qué buscás. Son.ar te sugiere bandas que necesitan exactamente tu perfil.',
    image: '/images/tomas.png',
    alt: 'Baterista en sala de ensayo',
  },
  {
    title: 'Bandas',
    body: 'Publicá búsquedas de integrantes, postulate a convocatorias y construí tu comunidad de seguidores.',
    image: '/images/band-faros.png',
    alt: 'Banda de rock posando en el muelle',
  },
  {
    title: 'Venues',
    body: 'Bares, restaurantes y teatros publican fechas y reciben propuestas filtradas por género.',
    image: '/images/venue-bar.png',
    alt: 'Bar con escenario para música en vivo',
  },
]

const STEPS = [
  { icon: Sparkles, title: 'Creá tu perfil', body: 'Instrumentos, géneros, barrio y lo que estás buscando.' },
  { icon: Search, title: 'Recibí matches', body: 'Te mostramos con quién tenés más afinidad musical.' },
  { icon: CalendarCheck, title: 'Tocá en vivo', body: 'Conectá, ensayá y postulate a fechas reales.' },
]

export function Audiences() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-semibold md:text-4xl">Un lugar para toda la escena</h2>
        <p className="mt-3 text-muted-foreground">
          Tres tipos de cuenta, una misma red. Cada uno con su experiencia pensada a medida.
        </p>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {AUDIENCES.map((a) => (
          <article key={a.title} className="group overflow-hidden rounded-2xl border border-border bg-card">
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image src={a.image} alt={a.alt} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div className="p-5">
              <h3 className="text-xl font-semibold">{a.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.body}</p>
            </div>
          </article>
        ))}
      </div>

      <ol className="mt-20 grid gap-8 border-t border-border pt-12 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <s.icon className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-medium text-primary">Paso {i + 1}</p>
              <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
