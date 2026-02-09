import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import {
  Home,
  BookOpen,
  ClipboardList,
  Users,
  Award,
  Calendar,
  MessageSquare,
  BarChart3,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

const getLearnerNavItems = (): NavItem[] => [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Classes", url: "/my-classes", icon: BookOpen },
  { title: "Tasks", url: "/assignments", icon: ClipboardList },
  { title: "Results", url: "/results", icon: Award },
  { title: "Schedule", url: "/schedule", icon: Calendar },
];

const getParentNavItems = (): NavItem[] => [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Children", url: "/children", icon: Users },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Tasks", url: "/assignments", icon: ClipboardList },
  { title: "Results", url: "/results", icon: Award },
];

const getTeacherNavItems = (): NavItem[] => [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Portal", url: "/teacher-portal", icon: BookOpen },
  { title: "Classes", url: "/classes", icon: Users },
  { title: "Tests", url: "/assessments", icon: ClipboardList },
  { title: "Schedule", url: "/schedule", icon: Calendar },
];

const getOverflowItems = (role: string | undefined): NavItem[] => {
  switch (role) {
    case 'parent':
      return [{ title: "Messages", url: "/communication", icon: MessageSquare }];
    case 'teacher':
      return [
        { title: "Results", url: "/results", icon: Award },
        { title: "Messages", url: "/communication", icon: MessageSquare },
      ];
    default:
      return [{ title: "Messages", url: "/communication", icon: MessageSquare }];
  }
};

export function MobileBottomNav() {
  const { profile } = useAuth();
  const location = useLocation();
  const { unreadCount } = useUnreadMessages();

  const getNavItems = () => {
    switch (profile?.role) {
      case 'parent':
        return getParentNavItems();
      case 'teacher':
        return getTeacherNavItems();
      default:
        return getLearnerNavItems();
    }
  };

  const navItems = getNavItems();
  const overflowItems = getOverflowItems(profile?.role);
  const isActive = (path: string) => location.pathname === path;
  const hasUnreadInOverflow = overflowItems.some(item => item.url === '/communication') && unreadCount > 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.slice(0, 4).map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-2 px-1 transition-all duration-200",
              isActive(item.url)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className={cn(
              "h-5 w-5 mb-1 transition-transform duration-200",
              isActive(item.url) && "scale-110"
            )} />
            <span className={cn(
              "text-[10px] font-medium truncate max-w-[56px]",
              isActive(item.url) && "font-semibold"
            )}>
              {item.title}
            </span>
          </NavLink>
        ))}

        {/* More menu for overflow items */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-2 px-1 transition-all duration-200 relative",
                overflowItems.some(item => isActive(item.url))
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <MoreHorizontal className="h-5 w-5 mb-1" />
                {hasUnreadInOverflow && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" />
                )}
              </div>
              <span className="text-[10px] font-medium">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="mb-2 w-48">
            {overflowItems.map((item) => (
              <DropdownMenuItem key={item.url} asChild>
                <NavLink
                  to={item.url}
                  className={cn(
                    "flex items-center gap-2 w-full",
                    isActive(item.url) && "bg-accent"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                  {item.url === '/communication' && unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1.5 text-xs">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </NavLink>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem asChild>
              <NavLink
                to="/settings"
                className={cn(
                  "flex items-center gap-2 w-full",
                  isActive('/settings') && "bg-accent"
                )}
              >
                <span className="h-4 w-4 flex items-center justify-center">⚙️</span>
                <span>Settings</span>
              </NavLink>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
