import { useLocation } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import {
  Home,
  BookOpen,
  ClipboardList,
  Users,
  Award,
  FileText,
  Calendar,
  BarChart3,
  Settings,
  GraduationCap,
  MessageSquare,
  DollarSign,
  CalendarClock,
  Activity
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

const getLearnerMenuItems = () => [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "My Classes", url: "/my-classes", icon: BookOpen },
  { title: "Assignments", url: "/assignments", icon: ClipboardList },
  { title: "Results", url: "/results", icon: Award },
  { title: "Schedule", url: "/schedule", icon: Calendar },
  { title: "Messages", url: "/communication", icon: MessageSquare },
];

const getParentMenuItems = () => [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "My Children", url: "/children", icon: Users },
  { title: "Activity Feed", url: "/activity", icon: Activity },
  { title: "Progress Reports", url: "/reports", icon: BarChart3 },
  { title: "Assignments", url: "/assignments", icon: ClipboardList },
  { title: "Results", url: "/results", icon: Award },
  { title: "Meetings", url: "/meetings", icon: CalendarClock },
  { title: "Fees", url: "/fees", icon: DollarSign },
  { title: "Communication", url: "/communication", icon: FileText },
];

const getTeacherMenuItems = () => [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Teacher Portal", url: "/teacher-portal", icon: BookOpen },
  { title: "My Classes", url: "/classes", icon: Users },
  { title: "Assessments", url: "/assessments", icon: ClipboardList },
  { title: "Results", url: "/results", icon: Award },
  { title: "Schedule", url: "/schedule", icon: Calendar },
  { title: "Meetings", url: "/meetings", icon: CalendarClock },
  { title: "Fees", url: "/fees", icon: DollarSign },
  { title: "Communication", url: "/communication", icon: FileText },
];

export function AppSidebar() {
  const { profile } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const { unreadCount } = useUnreadMessages();

  const getMenuItems = () => {
    switch (profile?.role) {
      case 'parent':
        return getParentMenuItems();
      case 'teacher':
        return getTeacherMenuItems();
      default:
        return getLearnerMenuItems();
    }
  };

  const menuItems = getMenuItems();
  const isActive = (path: string) => currentPath === path;

  const getNavClassName = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium transform scale-105 shadow-sm" 
      : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:transform hover:scale-105 hover:shadow-sm transition-all duration-200";

  return (
    <Sidebar>
      <SidebarContent className="animate-fade-in">
        <div className="p-4 border-b hover-lift">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-sidebar-primary transition-all duration-300 hover:scale-110 hover:text-primary" />
            <span className="font-semibold text-sidebar-foreground bg-gradient-primary bg-clip-text text-transparent">
              Junior Scholars
            </span>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavClassName}>
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      {(item.url === '/communication') && unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1.5 text-xs">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/settings" className={getNavClassName}>
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}