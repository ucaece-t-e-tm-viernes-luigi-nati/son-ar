import Image from 'next/image'
import { BadgeCheck, Heart, MessageCircle, Share2 } from 'lucide-react'
import { KindBadge } from '@/components/shared/kind-badge'
import { ProfileAvatar } from '@/components/shared/profile-avatar'
import { TAG_LABEL, type Post, type Profile } from '@/lib/domain/types'
import { formatCompact, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

export function PostCard({ post, author }: { post: Post; author: Profile }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-start gap-3 p-4">
        <ProfileAvatar profile={author} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate font-sans text-sm font-semibold">{author.name}</h3>
            {author.verified && <BadgeCheck className="size-4 text-primary" aria-label="Verificado" />}
            <KindBadge kind={author.kind} />
          </div>
          <p className="text-xs text-muted-foreground">
            {author.neighborhood} · {timeAgo(post.createdAt)}
          </p>
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-xs font-medium',
            post.tag === 'busqueda' && 'bg-accent text-accent-foreground',
            post.tag === 'show' && 'bg-primary/15 text-primary',
            post.tag === 'novedad' && 'bg-secondary text-muted-foreground',
          )}
        >
          {TAG_LABEL[post.tag]}
        </span>
      </header>
      <p className="px-4 pb-4 text-sm leading-relaxed text-pretty">{post.content}</p>
      {post.image && (
        <div className="relative aspect-[16/9] border-y border-border">
          <Image src={post.image} alt={`Imagen publicada por ${author.name}`} fill className="object-cover" />
        </div>
      )}
      <footer className="flex items-center gap-1 px-2 py-1.5 text-muted-foreground">
        <button type="button" className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs hover:bg-secondary hover:text-foreground">
          <Heart className="size-4" aria-hidden />
          {formatCompact(post.likes)}
          <span className="sr-only">me gusta</span>
        </button>
        <button type="button" className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs hover:bg-secondary hover:text-foreground">
          <MessageCircle className="size-4" aria-hidden />
          {formatCompact(post.comments)}
          <span className="sr-only">comentarios</span>
        </button>
        <button type="button" className="ml-auto rounded-lg p-2 hover:bg-secondary hover:text-foreground">
          <Share2 className="size-4" aria-hidden />
          <span className="sr-only">Compartir</span>
        </button>
      </footer>
    </article>
  )
}
