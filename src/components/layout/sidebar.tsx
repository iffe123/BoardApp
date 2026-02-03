'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  BarChart3,
  Users,
  Settings,
  Building2,
  ChevronDown,
  LogOut,
  Plus,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, usePermissions } from '@/contexts/auth-context';
import type { Tenant } from '@/types/schema';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  requiredPermission?: string;
}

interface SidebarProps {
  tenant: Tenant | null;
  className?: string;
}

const getNavItems = (tenantId: string): NavItem[] => [
  {
    label: 'Dashboard',
    href: `/dashboard/${tenantId}`,
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: 'Meetings',
    href: `/dashboard/${tenantId}/meetings`,
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    label: 'Documents',
    href: `/dashboard/${tenantId}/documents`,
    icon: <FileText className="h-4 w-4" />,
  },
  {
    label: 'Financials',
    href: `/dashboard/${tenantId}/financials`,
    icon: <BarChart3 className="h-4 w-4" />,
    requiredPermission: 'canViewFinancials',
  },
  {
    label: 'Decisions',
    href: `/dashboard/${tenantId}/decisions`,
    icon: <Shield className="h-4 w-4" />,
  },
  {
    label: 'Members',
    href: `/dashboard/${tenantId}/members`,
    icon: <Users className="h-4 w-4" />,
  },
  {
    label: 'Settings',
    href: `/dashboard/${tenantId}/settings`,
    icon: <Settings className="h-4 w-4" />,
    requiredPermission: 'isAdmin',
  },
];

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-lg',
        isActive
          ? 'bg-white/10 text-white'
          : 'text-white/50 hover:text-white hover:bg-white/5'
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

export function Sidebar({ tenant, className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, tenantClaims, setCurrentTenant, signOut, currentTenantRole } = useAuth();
  const permissions = usePermissions();

  const tenantId = tenant?.id || '';
  const navItems = getNavItems(tenantId);

  const accessibleTenants = Object.entries(tenantClaims).map(([id]) => ({
    id,
    name: id === tenant?.id ? tenant.name : id,
  }));

  const filteredNavItems = navItems.filter((item) => {
    if (!item.requiredPermission) return true;
    return permissions[item.requiredPermission as keyof typeof permissions];
  });

  const [orgMenuOpen, setOrgMenuOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <aside
      className={cn(
        'flex h-screen w-60 flex-col bg-[#0a0a0a] border-r border-white/5',
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        <Link href="/" className="text-lg font-semibold text-white tracking-tight">
          GovernanceOS
        </Link>
      </div>

      {/* Organization Switcher */}
      <div className="px-3 py-2">
        <div className="relative">
          <button
            onClick={() => setOrgMenuOpen(!orgMenuOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {tenant?.name || 'Select Organization'}
              </p>
              {tenant?.organizationNumber && (
                <p className="text-xs text-white/40 truncate">
                  {tenant.organizationNumber}
                </p>
              )}
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 text-white/40 transition-transform",
              orgMenuOpen && "rotate-180"
            )} />
          </button>

          {orgMenuOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-[#141414] border border-white/10 rounded-lg shadow-xl z-50">
              {accessibleTenants.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setCurrentTenant(t.id);
                    setOrgMenuOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors',
                    t.id === tenant?.id ? 'text-white' : 'text-white/60'
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  {t.name}
                </button>
              ))}
              <div className="border-t border-white/10 mt-1 pt-1">
                <Link
                  href="/onboarding"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create Organization
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={pathname === item.href || (item.href !== `/dashboard/${tenantId}` && pathname.startsWith(item.href + '/'))}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <p className="px-3 text-xs font-medium text-white/30 uppercase tracking-wider mb-2">
            Quick Actions
          </p>
          <Link
            href={`/dashboard/${tenantId}/meetings/new`}
            className="flex items-center gap-3 px-3 py-2 text-sm text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Meeting
          </Link>
        </div>
      </nav>

      {/* User Menu */}
      <div className="px-3 py-3 border-t border-white/5">
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white text-sm font-medium">
              {(userProfile?.displayName || user?.displayName || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {userProfile?.displayName || user?.displayName || 'User'}
              </p>
              <p className="text-xs text-white/40 capitalize">
                {currentTenantRole || 'Member'}
              </p>
            </div>
          </button>

          {userMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 py-1 bg-[#141414] border border-white/10 rounded-lg shadow-xl z-50">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
