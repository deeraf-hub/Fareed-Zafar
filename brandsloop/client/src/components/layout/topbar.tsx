import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, LogOut, Menu, ScanBarcode, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from './notification-bell';
import { useAuth } from '@/hooks/use-auth';
import { humanize, initials } from '@/lib/utils';

interface TopbarProps {
  onOpenSidebar: () => void;
  onOpenSearch: () => void;
}

export function Topbar({ onOpenSidebar, onOpenSearch }: TopbarProps) {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const [isMac, setIsMac] = React.useState(false);

  React.useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-card/95 px-3 backdrop-blur sm:px-5">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenSidebar} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <button
        type="button"
        onClick={onOpenSearch}
        className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent sm:max-w-md"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">Search products, SKUs, orders…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          {isMac ? '⌘' : 'Ctrl'} K
        </kbd>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {can('inventory:view') ? (
          <Button variant="ghost" size="icon" asChild aria-label="Barcode lookup">
            <Link to="/scan">
              <ScanBarcode className="h-5 w-5" />
            </Link>
          </Button>
        ) : null}
        {can('notification:view') ? <NotificationBell /> : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Account menu"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {initials(user?.name ?? '?')}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block max-w-[9rem] truncate text-sm font-medium leading-tight">{user?.name}</span>
                <span className="block text-[11px] leading-tight text-muted-foreground">
                  {humanize(user?.role)}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block truncate text-sm font-medium text-foreground">{user?.name}</span>
              <span className="block truncate font-normal">{user?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/account">
                <KeyRound className="h-4 w-4" />
                Change password
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={handleLogout}>
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
