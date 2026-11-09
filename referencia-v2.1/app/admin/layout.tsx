import type { Metadata } from 'next'
import { PanelShell } from '@/components/panel/panel-shell'
import { requireRole } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Super admin', robots: { index: false } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole('superadmin')
  return (
    <PanelShell label="Super admin" user="Equipo SonAR">
      {children}
    </PanelShell>
  )
}
