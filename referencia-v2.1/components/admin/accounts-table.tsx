import { StatusToggle } from '@/components/admin/status-toggle'
import { KindBadge } from '@/components/shared/kind-badge'
import { ProfileAvatar } from '@/components/shared/profile-avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Profile } from '@/lib/domain/types'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

export function AccountsTable({ profiles }: { profiles: Profile[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5">Cuenta</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="hidden md:table-cell">Alta</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="pr-5 text-right">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="pl-5">
                <div className="flex items-center gap-3">
                  <ProfileAvatar profile={p} className="size-8" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">@{p.handle}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <KindBadge kind={p.kind} />
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {formatDate(p.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}
              </TableCell>
              <TableCell>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 text-xs font-medium',
                    p.status === 'active' ? 'text-success' : 'text-destructive',
                  )}
                >
                  <span aria-hidden className="size-1.5 rounded-full bg-current" />
                  {p.status === 'active' ? 'Activa' : 'Pausada'}
                </span>
              </TableCell>
              <TableCell className="pr-5 text-right">
                <StatusToggle profileId={p.id} status={p.status} name={p.name} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
