import type { Metadata } from 'next'
import { MatchList } from '@/components/app/match-list'
import { PostCard } from '@/components/app/post-card'
import { PostComposer } from '@/components/app/post-composer'
import { getSession } from '@/lib/auth/session'
import { postRepo, profileRepo } from '@/lib/repositories'
import { getMatchesFor } from '@/lib/services/matching'

export const metadata: Metadata = { title: 'Inicio' }

export default async function FeedPage() {
  const session = await getSession('user')
  const [me, posts, matches] = await Promise.all([
    profileRepo.byId(session.profileId),
    postRepo.feed(),
    getMatchesFor(session.profileId, 3),
  ])
  const authors = await profileRepo.byIds([...new Set(posts.map((p) => p.authorId))])
  const authorById = new Map(authors.map((a) => [a.id, a]))

  return (
    <div className="flex gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">Hola, {me?.name.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Esto está sonando hoy en la escena.</p>
        </div>
        {me && <PostComposer me={me} />}
        <div className="xl:hidden">
          <MatchList matches={matches} />
        </div>
        {posts.map((post) => {
          const author = authorById.get(post.authorId)
          return author ? <PostCard key={post.id} post={post} author={author} /> : null
        })}
      </div>
      <aside className="sticky top-6 hidden h-fit w-72 shrink-0 xl:block">
        <MatchList matches={matches} />
      </aside>
    </div>
  )
}
