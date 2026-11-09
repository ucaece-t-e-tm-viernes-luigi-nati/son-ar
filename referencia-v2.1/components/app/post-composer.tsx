'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createPost, type ActionState } from '@/app/actions/social'
import { ProfileAvatar } from '@/components/shared/profile-avatar'
import { Button } from '@/components/ui/button'
import { TAG_LABEL, type PostTag, type Profile } from '@/lib/domain/types'

const TAGS = Object.keys(TAG_LABEL) as PostTag[]

export function PostComposer({ me }: { me: Profile }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createPost, { ok: false })
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={action} className="rounded-2xl border border-border bg-card p-4">
      <div className="flex gap-3">
        <ProfileAvatar profile={me} />
        <label htmlFor="post-content" className="sr-only">
          Nueva publicación
        </label>
        <textarea
          id="post-content"
          name="content"
          rows={2}
          maxLength={500}
          required
          placeholder="¿Qué estás buscando o qué vas a tocar?"
          className="min-h-12 flex-1 resize-none bg-transparent py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <fieldset className="flex gap-1.5">
          <legend className="sr-only">Tipo de publicación</legend>
          {TAGS.map((tag, i) => (
            <label key={tag} className="cursor-pointer">
              <input type="radio" name="tag" value={tag} defaultChecked={i === 0} className="peer sr-only" />
              <span className="inline-block rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors peer-checked:border-primary peer-checked:bg-accent peer-checked:text-accent-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                {TAG_LABEL[tag]}
              </span>
            </label>
          ))}
        </fieldset>
        <div className="flex items-center gap-3">
          {state.message && (
            <p role="status" className={state.ok ? 'text-xs text-success' : 'text-xs text-destructive'}>
              {state.message}
            </p>
          )}
          <Button type="submit" disabled={pending} className="px-4">
            {pending ? 'Publicando…' : 'Publicar'}
          </Button>
        </div>
      </div>
    </form>
  )
}
