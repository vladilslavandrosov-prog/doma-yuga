import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  FileSpreadsheet,
  CreditCard,
  FileText,
  Camera,
  MessageCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Дашборд", url: "/", icon: LayoutDashboard },
  { title: "Сметы", url: "/estimates", icon: FileSpreadsheet },
  { title: "Оплата", url: "/payments", icon: CreditCard },
  { title: "Документы", url: "/documents", icon: FileText },
  { title: "Фотоотчёт", url: "/photos", icon: Camera },
  { title: "Чат", url: "/chat", icon: MessageCircle },
];

export function AppSidebar() {
  const [location] = useLocation();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/project", 1, "unread"],
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.count ?? 0;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm">
            ДЮ
          </div>
          <span className="text-base font-semibold text-sidebar-foreground" data-testid="text-brand-name">
            Дома Юга
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Навигация</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      data-testid={`link-nav-${item.url.replace("/", "") || "dashboard"}`}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.url === "/chat" && unreadCount > 0 && (
                      <SidebarMenuBadge data-testid="badge-unread-messages">
                        {unreadCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
