import {
  Building2,
  FileText,
  Users,
  Settings,
  Shield,
  Activity,
  GraduationCap,
  LayoutDashboard,
  Network,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useLocation } from "wouter";
import { useSettings } from "@/contexts/SettingsContext";

const menuItems = [
  {
    title: "Главная",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Объекты",
    url: "/objects",
    icon: Building2,
  },
  {
    title: "Документы",
    url: "/documents",
    icon: FileText,
  },
  {
    title: "Пользователи",
    url: "/users",
    icon: Users,
  },
  {
    title: "Оргструктура",
    url: "/orgstructure",
    icon: Network,
  },
  {
    title: "Права и роли",
    url: "/roles",
    icon: Shield,
  },
  {
    title: "Обучение",
    url: "/training",
    icon: GraduationCap,
  },
  {
    title: "Аудит",
    url: "/audit",
    icon: Activity,
  },
  {
    title: "Настройки",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { settings } = useSettings();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">{settings.systemName}</h2>
            <p className="text-xs text-muted-foreground">Газопроводы</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Навигация</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.url.slice(1) || "home"}`}
                  >
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
