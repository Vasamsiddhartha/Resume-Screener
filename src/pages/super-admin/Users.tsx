import { useState } from 'react'
import { Search, User } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, Input, Select, Badge } from '@/components/ui'
import { MOCK_USERS } from '@/mock/data'
import { formatDate } from '@/lib/utils'

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'org_admin', label: 'Org Admin' },
  { value: 'recruiter', label: 'Recruiter' },
]

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  org_admin: 'Org Admin',
  recruiter: 'Recruiter',
}

export function UsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const filtered = MOCK_USERS.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div>
      <PageHeader title="Users" description="All users across all organizations" />

      <Card padding="none">
        <div className="p-4 border-b border-slate-100 dark:border-white/[0.06] flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search users…"
            leftIcon={<Search className="w-4 h-4" />}
            className="max-w-xs"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Select
            options={ROLE_OPTIONS}
            className="w-44"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          />
        </div>

        <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">No users found</div>
          ) : (
            filtered.map(user => (
              <div key={user.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</p>
                    <Badge
                      variant={user.role === 'super_admin' ? 'purple' : user.role === 'org_admin' ? 'info' : 'default'}
                    >
                      {ROLE_LABEL[user.role]}
                    </Badge>
                    <Badge variant={user.isActive ? 'success' : 'default'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  {user.organizationName && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">{user.organizationName}</p>
                  )}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 shrink-0 hidden sm:block">
                  Joined {formatDate(user.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
