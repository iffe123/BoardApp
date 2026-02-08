'use client';

/**
 * Sidebar Navigation Component
 *
 * Main navigation sidebar for the GovernanceOS dashboard.
 */

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
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
  Bell,
  HelpCircle,
  Briefcase,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth, usePermissions } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import type { Tenant } from '@/types/schema';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// NAVIGATION ITEMS
// ============================================================================

const getNavItems = (tenantId: string): NavItem[] => [
  {
    label: 'Dashboard',
    href: `/dashboard/${tenantId}`,
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: 'Meetings',
    href: `/dashboard/${tenantId}/meetings`,
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    label: 'Documents',
    href: `/dashboard/${tenantId}/documents`,
    icon: <FileText className="h-5 w-5" />,
  },
  {
    label: 'Financials',
    href: `/dashboard/${tenantId}/financials`,
    icon: <BarChart3 className="h-5 w-5" />,
    requiredPermission: 'canViewFinancials',
  },
  {
    label: 'Decisions',
    href: `/dashboard/${tenantId}/decisions`,
    icon: <Shield className="h-5 w-5" />,
  },
  {
    label: 'Members',
    href: `/dashboard/${tenantId}/members`,
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: 'Settings',
    href: `/dashboard/${tenantId}/settings`,
    icon: <Settings className="h-5 w-5" />,
    requiredPermission: 'isAdmin',
  },
];

// ============================================================================
// NAV LINK COMPONENT
// ============================================================================

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
}

function NavLink({ item, isActive }: NavLinkProps) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

// ============================================================================
// ORGANIZATION SWITCHER
// ============================================================================

interface OrgSwitcherProps {
  currentTenant: Tenant | null;
  tenants: Array<{ id: string; name: string }>;
  onSwitch: (tenantId: string) => void;
  onCreate: () => void;
}

function OrgSwitcher({ currentTenant, tenants, onSwitch, onCreate }: OrgSwitcherProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-3 py-6 h-auto"
        >
          <div className="flex items-center gap-3">
            {currentTenant?.logoUrl ? (
              <Image
                src={currentTenant.logoUrl}
                alt={currentTenant.name}
                width={32}
                height={32}
                className="h-8 w-8 rounded object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
                <Building2 className="h-4 w-4" />
              </div>
            )}
            <div className="text-left">
              <p className="font-medium truncate max-w-[140px]">
                {currentTenant?.name || 'Select Organization'}
              </p>
              {currentTenant?.organizationNumber && (
                <p className="text-xs text-muted-foreground">
                  {currentTenant.organizationNumber}
                </p>
              )}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => onSwitch(tenant.id)}
            className={cn(
              'cursor-pointer',
              tenant.id === currentTenant?.id && 'bg-muted'
            )}
          >
            <Building2 className="h-4 w-4 mr-2" />
            {tenant.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// USER MENU
// ============================================================================

function UserMenu() {
  const { user, userProfile, signOut, currentTenantRole } = useAuth();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-6 h-auto">
          <UserAvatar
            name={userProfile?.displayName || user.displayName || 'User'}
            imageUrl={userProfile?.avatarUrl || user.photoURL || undefined}
            size="sm"
          />
          <div className="text-left flex-1 overflow-hidden">
            <p className="font-medium truncate">
              {userProfile?.displayName || user.displayName || 'User'}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {currentTenantRole || 'Member'}
            </p>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Settings className="h-4 w-4 mr-2" />
          Profile Settings
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Bell className="h-4 w-4 mr-2" />
          Notifications
        </DropdownMenuItem>
        <DropdownMenuItem>
          <HelpCircle className="h-4 w-4 mr-2" />
          Help & Support
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// THEME TOGGLE
// ============================================================================

function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className="border-t p-2">
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 px-3"
        onClick={toggleTheme}
      >
        {resolvedTheme === 'dark' ? (
          <>
            <Sun className="h-5 w-5" />
            <span>Light Mode</span>
          </>
        ) : (
          <>
            <Moon className="h-5 w-5" />
            <span>Dark Mode</span>
          </>
        )}
      </Button>
    </div>
  );
}

// ============================================================================
// MAIN SIDEBAR
// ============================================================================

export function Sidebar({ tenant, className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { tenantClaims, setCurrentTenant } = useAuth();
  const permissions = usePermissions();

  const tenantId = tenant?.id || '';
  const navItems = getNavItems(tenantId);

  // Fetch tenant names from Firestore
  const [tenantNames, setTenantNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchTenantNames = async () => {
      const { getDoc, collections } = await import('@/lib/firebase');
      const names: Record<string, string> = {};
      for (const id of Object.keys(tenantClaims)) {
        try {
          const doc = await getDoc(collections.tenant(id));
          if (doc.exists()) {
            const data = doc.data();
            names[id] = data.name || id;
          } else {
            names[id] = id;
          }
        } catch {
          names[id] = id;
        }
      }
      setTenantNames(names);
    };
    if (Object.keys(tenantClaims).length > 0) {
      fetchTenantNames();
    }
  }, [tenantClaims]);

  // Get list of accessible tenants with proper names
  const accessibleTenants = Object.entries(tenantClaims).map(([id, role]) => ({
    id,
    name: tenantNames[id] || (tenant?.id === id ? tenant.name : id),
    role,
  }));

  const handleCreateOrganization = () => {
    router.push('/onboarding');
  };

  const handleSwitchTenant = async (newTenantId: string) => {
    await setCurrentTenant(newTenantId);
    router.push(`/dashboard/${newTenantId}`);
  };

  const filteredNavItems = navItems.filter((item) => {
    if (!item.requiredPermission) return true;
    return permissions[item.requiredPermission as keyof typeof permissions];
  });

  return (
    <aside
      className={cn(
        'flex h-screen w-64 flex-col border-r bg-card',
        className
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <Briefcase className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">GovernanceOS</span>
      </div>

      {/* Organization Switcher */}
      <div className="border-b p-2">
        <OrgSwitcher
          currentTenant={tenant}
          tenants={accessibleTenants}
          onSwitch={handleSwitchTenant}
          onCreate={handleCreateOrganization}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
            Quick Actions
          </p>
          <div className="space-y-1">
            <Link
              href={`/dashboard/${tenantId}/meetings/new`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Plus className="h-5 w-5" />
              New Meeting
            </Link>
          </div>
        </div>
      </nav>

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* User Menu */}
      <div className="border-t p-2">
        <UserMenu />
      </div>
    </aside>
  );
}

export default Sidebar;
