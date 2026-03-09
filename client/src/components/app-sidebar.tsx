import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  FileSpreadsheet,
  CreditCard,
  FileText,
  Camera,
  MessageCircle,
  Building2,
  LogOut,
  LogIn,
  User,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "О компании", url: "/", icon: Building2 },
  { title: "Дашборд", url: "/dashboard", icon: LayoutDashboard },
  { title: "Сметы", url: "/estimates", icon: FileSpreadsheet },
  { title: "Оплата", url: "/payments", icon: CreditCard },
  { title: "Документы", url: "/documents", icon: FileText },
  { title: "Фотоотчёт", url: "/photos", icon: Camera },
  { title: "Чат", url: "/chat", icon: MessageCircle },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isAdmin } = useAuth();

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
      <SidebarFooter className="p-4">
        {user ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-medium" data-testid="text-user-name">
                {user.username}
              </span>
              <Badge variant="secondary" data-testid="badge-user-role">
                {isAdmin ? "Администратор" : "Клиент"}
              </Badge>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => logout()}
              data-testid="button-logout"
            >
              <LogOut />
            </Button>
          </div>
        ) : (
          <Button variant="outline" className="w-full" asChild data-testid="button-login-link">
            <Link href="/login">
              <LogIn className="h-4 w-4 mr-2" />
              Войти
            </Link>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
