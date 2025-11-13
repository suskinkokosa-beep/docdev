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
import type { LucideIcon } from "lucide-react";

export interface MenuPermission {
  module: string;
  action: string;
}

export interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  permission: MenuPermission;
  adminOnly?: boolean;
}

export const menuItems: MenuItem[] = [
  {
    title: "Главная",
    url: "/",
    icon: LayoutDashboard,
    permission: {
      module: "dashboard",
      action: "view",
    },
  },
  {
    title: "Объекты",
    url: "/objects",
    icon: Building2,
    permission: {
      module: "objects",
      action: "view",
    },
  },
  {
    title: "Документы",
    url: "/documents",
    icon: FileText,
    permission: {
      module: "documents",
      action: "view",
    },
  },
  {
    title: "Пользователи",
    url: "/users",
    icon: Users,
    permission: {
      module: "users",
      action: "view",
    },
  },
  {
    title: "Оргструктура",
    url: "/orgstructure",
    icon: Network,
    permission: {
      module: "org_structure",
      action: "view",
    },
  },
  {
    title: "Права и роли",
    url: "/roles",
    icon: Shield,
    permission: {
      module: "roles",
      action: "view",
    },
  },
  {
    title: "Обучение",
    url: "/training",
    icon: GraduationCap,
    permission: {
      module: "training",
      action: "view",
    },
  },
  {
    title: "Аудит",
    url: "/audit",
    icon: Activity,
    permission: {
      module: "audit",
      action: "view",
    },
  },
  {
    title: "Настройки",
    url: "/settings",
    icon: Settings,
    permission: {
      module: "settings",
      action: "view",
    },
    adminOnly: true,
  },
];
