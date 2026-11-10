import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ActionForm, inputClass, labelClass } from '@/components/forms'
import { Card, PageTitle } from '@/components/panel/ui'
import { getVenueProfile } from '@/lib/data/venue'
import { GENRES, NEIGHBORHOODS, VENUE_TYPES } from '@/lib/domain/types'
import { requireVenue } from '@/lib/guards'
import { updateVenueProfile } from '../actions'

export const metadata: Metadata = { title: 'Perfil del local' }

const chip =
  'flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:text-accent-foreground'

export default async function VenueProfilePage() {
  const ctx = await requireVenue('venue.edit')
  const p = await getVenueProfile(ctx.clientId)
  if (!p) notFound()
  const genres = p.data?.genres ?? []

  return (
    <>
      <PageTitle eyebrow={ctx.clientName} title="Perfil del local" description="Estos datos se muestran en Explorar y junto a tus convocatorias." />
      <Card className="max-w-[820px]">
        <ActionForm action={updateVenueProfile} disabled={ctx.readOnly}>
          <fieldset disabled={ctx.readOnly} className="grid gap-4 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>
              Nombre del local
              <input name="name" required maxLength={80} defaultValue={p.name} className={inputClass} />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Descripción corta (bio pública)
              <textarea name="description" rows={3} maxLength={500} defaultValue={p.description ?? ''} className={inputClass} />
            </label>
            <label className={labelClass}>
              Tipo de venue
              <select name="venueType" required defaultValue={p.venue_type ?? ''} className={inputClass}>
                <option value="" disabled>
                  Elegí uno
                </option>
                {VENUE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Capacidad (personas)
              <input name="capacity" type="number" min={1} max={100000} defaultValue={p.capacity ?? ''} className={inputClass} />
            </label>
            <label className={labelClass}>
              Ciudad
              <input name="city" required maxLength={60} defaultValue={p.city ?? 'Mar del Plata'} className={inputClass} />
            </label>
            <label className={labelClass}>
              Barrio
              <input name="neighborhood" maxLength={60} defaultValue={p.neighborhood ?? ''} list="barrios-local" className={inputClass} />
              <datalist id="barrios-local">
                {NEIGHBORHOODS.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </label>
            <label className={labelClass}>
              Dirección
              <input name="address" maxLength={120} defaultValue={p.address ?? ''} className={inputClass} />
            </label>
            <label className={labelClass}>
              Teléfono / WhatsApp
              <input name="phone" maxLength={40} defaultValue={p.phone ?? ''} className={inputClass} />
            </label>
            <label className={labelClass}>
              Instagram
              <input name="instagram" maxLength={60} defaultValue={p.instagram ?? ''} placeholder="@tulocal" className={inputClass} />
            </label>
            <label className={labelClass}>
              Web
              <input name="website" maxLength={200} defaultValue={p.website ?? ''} className={inputClass} />
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-sm font-medium">Géneros que programan</legend>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map((g) => (
                  <label key={g} className={chip}>
                    <input type="checkbox" name="genres" value={g} defaultChecked={genres.includes(g)} className="sr-only" /> {g}
                  </label>
                ))}
              </div>
            </fieldset>
          </fieldset>
        </ActionForm>
      </Card>
    </>
  )
}
