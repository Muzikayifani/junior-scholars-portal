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
  GraduationCap
} from 'lucide-react';

const getLearnerMenuItems = () => [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "My Classes", url: "/my-classes", icon: BookOpen },
  { title: "Assignments", url: "/assignments", icon: ClipboardList },
  { title: "Results", url: "/results", icon: Award },
  { title: "Schedule", url: "/schedule", icon: Calendar },
];

const getParentMenuItems = () => [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "My Children", url: "/children", icon: Users },
  { title: "Progress Reports", url: "/reports", icon: BarChart3 },
  { title: "Assignments", url: "/assignments", icon: ClipboardList },
  { title: "Results", url: "/results", icon: Award },
  { title: "Communication", url: "/communication", icon: FileText },
];

const getTeacherMenuItems = () => [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "My Classes", url: "/classes", icon: Users },
  { title: "Create Assessment", url: "/create-assessment", icon: ClipboardList },
  { title: "Grade Assessments", url: "/grade-assessments", icon: Award },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Subjects", url: "/subjects", icon: BookOpen },
  { title: "Schedule", url: "/schedule", icon: Calendar },
];

export function AppSidebar() {
  const { profile } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

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
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
      : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground";

  return (
    <Sidebar>
      <SidebarContent>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-sidebar-primary" />
            <span className="font-semibold text-sidebar-foreground">
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
                      <span>{item.title}</span>
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