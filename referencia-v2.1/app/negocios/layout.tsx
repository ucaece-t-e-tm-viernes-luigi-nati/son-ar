import type { Metadata } from 'next'
import { PanelShell } from '@/components/panel/panel-shell'
import { getSession } from '@/lib/auth/session'
import { profileRepo } from '@/lib/repositories'

export const metadata: Metadata = { title: 'Panel de negocios' }

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession('business')
  const venue = await profileRepo.byId(session.profileId)
  return (
    <PanelShell label="Negocios" user={venue?.name ?? 'Venue'}>
      {children}
    </PanelShell>
  )
}
