import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  FileSpreadsheet,
  CreditCard,
  FileText,
  Camera,
  Video,
  MessageCircle,
  Building2,
  LogOut,
  LogIn,
  User,
  Eye,
  ArrowLeft,
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
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const publicItems = [
  { title: "О компании", url: "/", icon: Building2 },
];

const cabinetItems = [
  { title: "Дашборд", url: "/cabinet", icon: LayoutDashboard },
  { title: "Сметы", url: "/cabinet/estimates", icon: FileSpreadsheet },
  { title: "Оплата", url: "/cabinet/payments", icon: CreditCard },
  { title: "Документы", url: "/cabinet/documents", icon: FileText },
  { title: "Фотоотчёт", url: "/cabinet/photos", icon: Camera },
  { title: "Видео", url: "/cabinet/videos", icon: Video },
  { title: "Чат", url: "/cabinet/chat", icon: MessageCircle },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const inCabinet = location.startsWith("/cabinet");

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
        {inCabinet && (
          <>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="На сайт" data-testid="link-nav-back">
                      <Link href="/">
                        <ArrowLeft />
                        <span>На сайт</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator />
          </>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>{inCabinet ? "Личный кабинет" : "Навигация"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {!inCabinet && publicItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      data-testid={`link-nav-about`}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {!inCabinet && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Личный кабинет"
                    data-testid="link-nav-cabinet"
                  >
                    <Link href="/cabinet">
                      <LayoutDashboard />
                      <span>{user ? "Личный кабинет" : "Личный кабинет (демо)"}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {inCabinet && cabinetItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      data-testid={`link-nav-${item.url.replace("/cabinet/", "").replace("/cabinet", "dashboard")}`}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.url === "/cabinet/chat" && unreadCount > 0 && (
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

        {inCabinet && !user && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Eye className="h-3.5 w-3.5" />
                    <span>Демо-режим</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Вы просматриваете демонстрационный кабинет. Войдите для доступа к своему проекту.
                  </p>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
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
