'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ActionForm, inputClass, labelClass } from '@/components/forms'
import { PasswordInput } from '@/components/password-input'
import { GENRES, INSTRUMENTS, NEIGHBORHOODS } from '@/lib/domain/types'
import { publicSignIn, publicSignUp } from './actions'

const submitClass = 'w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60'
const chip =
  'flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:text-accent-foreground'

/** Login / registro de músicos y bandas. Sin selector de rol: los paneles internos tienen su propio ingreso. */
export function PublicLoginForm() {
  const params = useSearchParams()
  const [register, setRegister] = useState(params.get('modo') === 'registro')
  const [kind, setKind] = useState<'musician' | 'band'>('musician')
  const next = params.get('next') ?? '/app'

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-6">
      <h1 className="text-2xl font-semibold">{register ? 'Creá tu perfil' : 'Ingresá'}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {register ? 'Músicos solistas y bandas. Es gratis.' : 'Entrá a tu red de músicos, bandas y venues.'}
      </p>
      {params.get('sin-perfil') && (
        <p role="status" className="mt-3 rounded-xl bg-warning/12 px-3 py-2 text-sm text-warning">
          Esta sección es para músicos y bandas. Ingresá con tu cuenta de artista.
        </p>
      )}

      {register ? (
        <ActionForm action={publicSignUp} submitLabel="Crear mi perfil" pendingLabel="Creando…" className="mt-5 flex flex-col gap-4" submitClassName={submitClass}>
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="mb-2 text-sm font-medium">Soy</legend>
            {(
              [
                ['musician', 'Músico/a solista'],
                ['band', 'Banda'],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-medium has-[:checked]:border-primary has-[:checked]:bg-accent">
                <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} className="sr-only" />
                {label}
              </label>
            ))}
          </fieldset>
          <label className={labelClass}>
            {kind === 'band' ? 'Nombre de la banda' : 'Nombre y apellido'}
            <input name="name" required maxLength={80} autoComplete={kind === 'band' ? 'organization' : 'name'} className={inputClass} />
          </label>
          <label className={labelClass}>
            Correo electrónico
            <input name="email" type="email" required autoComplete="email" className={inputClass} />
          </label>
          <label className={labelClass}>
            Contraseña
            <PasswordInput name="password" required minLength={8} autoComplete="new-password" className={inputClass} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Ciudad
              <input name="city" required maxLength={60} defaultValue="Mar del Plata" className={inputClass} />
            </label>
            <label className={labelClass}>
              Barrio (opcional)
              <input name="neighborhood" maxLength={60} list="barrios" className={inputClass} />
              <datalist id="barrios">
                {NEIGHBORHOODS.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </label>
          </div>
          {kind === 'band' && (
            <label className={labelClass}>
              Integrantes
              <input name="members" type="number" min={1} max={30} defaultValue={3} className={inputClass} />
            </label>
          )}
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Géneros (hasta 6)</legend>
            <div className="flex flex-wrap gap-1.5">
              {GENRES.map((g) => (
                <label key={g} className={chip}>
                  <input type="checkbox" name="genres" value={g} className="sr-only" /> {g}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{kind === 'band' ? 'Instrumentos de la formación' : 'Instrumentos que tocás'}</legend>
            <div className="flex flex-wrap gap-1.5">
              {INSTRUMENTS.map((i) => (
                <label key={i} className={chip}>
                  <input type="checkbox" name="instruments" value={i} className="sr-only" /> {i}
                </label>
              ))}
            </div>
          </fieldset>
        </ActionForm>
      ) : (
        <ActionForm action={publicSignIn} submitLabel="Ingresar" pendingLabel="Ingresando…" className="mt-5 flex flex-col gap-4" submitClassName={submitClass}>
          <input type="hidden" name="next" value={next} />
          <label className={labelClass}>
            Correo electrónico
            <input name="email" type="email" required autoComplete="email" className={inputClass} />
          </label>
          <label className={labelClass}>
            Contraseña
            <PasswordInput name="password" required autoComplete="current-password" className={inputClass} />
          </label>
        </ActionForm>
      )}

      <button type="button" onClick={() => setRegister(!register)} className="mt-4 w-full text-sm text-muted-foreground underline">
        {register ? 'Ya tengo cuenta' : 'No tengo cuenta, quiero crear mi perfil'}
      </button>
      <Link href="/" className="mt-3 block text-center text-xs text-muted-foreground hover:text-foreground">
        Volver al inicio
      </Link>
    </div>
  )
}
