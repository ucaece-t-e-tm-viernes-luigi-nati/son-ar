import Link from 'next/link'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const KINDS = [
  { value: '', label: 'Todos' },
  { value: 'musician', label: 'Músicos' },
  { value: 'band', label: 'Bandas' },
  { value: 'venue', label: 'Venues' },
]

export function ExploreFilters({ q, kind, genre, genres }: { q?: string; kind?: string; genre?: string; genres: string[] }) {
  const href = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams()
    const merged = { q, kind, genre, ...next }
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v)
    const s = params.toString()
    return s ? `/app/explorar?${s}` : '/app/explorar'
  }

  return (
    <div className="flex flex-col gap-4">
      <form action="/app/explorar" role="search" className="relative">
        {kind && <input type="hidden" name="kind" value={kind} />}
        {genre && <input type="hidden" name="genre" value={genre} />}
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <label htmlFor="explore-q" className="sr-only">
          Buscar
        </label>
        <input
          id="explore-q"
          name="q"
          defaultValue={q}
          placeholder="Buscá por instrumento, género o nombre…"
          className="h-12 w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </form>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de cuenta">
        {KINDS.map((k) => {
          const active = (kind ?? '') === k.value
          return (
            <Link
              key={k.label}
              href={href({ kind: k.value || undefined })}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'rounded-full border border-border px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                active && 'border-primary bg-primary text-primary-foreground hover:text-primary-foreground',
              )}
            >
              {k.label}
            </Link>
          )
        })}
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label="Género">
        {genres.map((g) => {
          const active = genre === g
          return (
            <Link
              key={g}
              href={href({ genre: active ? undefined : g })}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'shrink-0 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground',
                active && 'bg-accent text-accent-foreground',
              )}
            >
              {g}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
