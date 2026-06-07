import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";
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
  FolderKanban,
  Shield,
  HardHat,
  Users,
  Settings,
  ImageIcon,
  ClipboardList,
  Inbox,
  Map,
  Leaf,
} from "lucide-react";
import {
  useSidebar,
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
  { title: "Почему выбирают нас", url: "/advantages", icon: Shield },
  { title: "Фото наших работ", url: "/gallery", icon: ImageIcon },
  { title: "Оставить заявку", url: "/contact", icon: ClipboardList },
];

function getProjectItems(basePath: string) {
  return [
    { title: "Дашборд", url: basePath, icon: LayoutDashboard },
    { title: "Плановая смета", url: `${basePath}/estimates`, icon: FileSpreadsheet },
    { title: "Выполнение работ", url: `${basePath}/execution`, icon: HardHat },
    { title: "Оплата", url: `${basePath}/payments`, icon: CreditCard },
    { title: "Документы", url: `${basePath}/documents`, icon: FileText },
    { title: "Фотоотчёт", url: `${basePath}/photos`, icon: Camera },
    { title: "Видео", url: `${basePath}/videos`, icon: Video },
    { title: "Карта объекта", url: `${basePath}/map`, icon: Map },
    { title: "Ландшафтный дизайн", url: `${basePath}/landscape`, icon: Leaf },
    { title: "Чат", url: `${basePath}/chat`, icon: MessageCircle },
  ];
}

function extractProjectId(location: string): number | null {
  const match = location.match(/^\/cabinet\/project\/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeMobile = () => { if (isMobile) setOpenMobile(false); };

  const inCabinet = location.startsWith("/cabinet");
  const projectIdFromUrl = extractProjectId(location);
  const inProject = projectIdFromUrl !== null;
  const adminPages = ["/cabinet", "/cabinet/clients", "/cabinet/leads", "/cabinet/settings"];
  const inAdminPanel = isAdmin && inCabinet && !inProject && adminPages.includes(location);

  const isClient = !!user && user.role === "client";
  const { data: clientProjects } = useQuery<{ id: number }[]>({
    queryKey: ["/api/client-projects"],
    enabled: isClient && inCabinet,
  });
  const hasMultipleProjects = isClient && clientProjects && clientProjects.length > 1;
  const singleClientProjectId = isClient
    ? (clientProjects && clientProjects.length === 1 ? clientProjects[0].id : null)
    : 1;
  const activeProjectId = inProject
    ? projectIdFromUrl
    : (!isAdmin && inCabinet && !hasMultipleProjects ? singleClientProjectId : null);
  const basePath = inProject ? `/cabinet/project/${projectIdFromUrl}` : "/cabinet";
  const projectItems = activeProjectId !== null ? getProjectItems(basePath) : [];
  const clientOnProjectsList = isClient && hasMultipleProjects && !inProject && location === "/cabinet";

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/project", activeProjectId],
    enabled: activeProjectId !== null && inProject,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/project", activeProjectId, "unread"],
    refetchInterval: 30000,
    enabled: activeProjectId !== null,
  });

  const { data: leadsData } = useQuery<{ id: number; status: string }[]>({
    queryKey: ["/api/admin/leads"],
    refetchInterval: 60000,
    enabled: isAdmin && inCabinet,
  });
  const newLeadsCount = (leadsData ?? []).filter((l) => l.status === "new").length;

  const unreadCount = unreadData?.count ?? 0;

  const showProjectNav = inCabinet && activeProjectId !== null && !inAdminPanel;

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
                  {inProject && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="К списку объектов" data-testid="link-nav-back-projects">
                        <Link href="/cabinet" onClick={closeMobile}>
                          <ArrowLeft />
                          <span>{isAdmin ? "К объектам" : hasMultipleProjects ? "К моим объектам" : "Назад"}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {!inProject && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="На сайт" data-testid="link-nav-back">
                        <Link href="/" onClick={closeMobile}>
                          <ArrowLeft />
                          <span>На сайт</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator />
          </>
        )}

        {clientOnProjectsList && (
          <SidebarGroup>
            <SidebarGroupLabel>Мои объекты</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive
                    tooltip="Мои объекты"
                    data-testid="link-nav-my-projects"
                  >
                    <Link href="/cabinet" onClick={closeMobile}>
                      <FolderKanban />
                      <span>Список объектов</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {inAdminPanel && (
          <SidebarGroup>
            <SidebarGroupLabel>Панель администратора</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/cabinet"}
                    tooltip="Объекты"
                    data-testid="link-nav-projects"
                  >
                    <Link href="/cabinet" onClick={closeMobile}>
                      <FolderKanban />
                      <span>Объекты</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/cabinet/clients"}
                    tooltip="Клиенты"
                    data-testid="link-nav-clients"
                  >
                    <Link href="/cabinet/clients" onClick={closeMobile}>
                      <Users />
                      <span>Клиенты</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/cabinet/leads"}
                    tooltip="Заявки"
                    data-testid="link-nav-leads"
                  >
                    <Link href="/cabinet/leads" onClick={closeMobile}>
                      <Inbox />
                      <span>Заявки</span>
                    </Link>
                  </SidebarMenuButton>
                  {newLeadsCount > 0 && (
                    <SidebarMenuBadge data-testid="badge-new-leads">
                      {newLeadsCount}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/cabinet/settings"}
                    tooltip="Настройки"
                    data-testid="link-nav-settings"
                  >
                    <Link href="/cabinet/settings" onClick={closeMobile}>
                      <Settings />
                      <span>Настройки</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {showProjectNav && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {inProject && project ? project.name : (isAdmin ? "Панель администратора" : "Личный кабинет")}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projectItems.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <Link href={item.url} onClick={closeMobile}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.url.endsWith("/chat") && unreadCount > 0 && (
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
        )}

        {!inCabinet && (
          <SidebarGroup>
            <SidebarGroupLabel>Навигация</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {publicItems.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        data-testid="link-nav-about"
                      >
                        <Link href={item.url} onClick={closeMobile}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Личный кабинет"
                    data-testid="link-nav-cabinet"
                  >
                    <Link href="/cabinet" onClick={closeMobile}>
                      <LayoutDashboard />
                      <span>{user ? (isAdmin ? "Панель управления" : "Личный кабинет") : "Личный кабинет (демо)"}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

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
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                asChild
                data-testid="button-settings"
              >
                <Link href="/cabinet/settings" onClick={closeMobile}>
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={async () => { await logout(); window.location.href = "/"; }}
                data-testid="button-logout"
              >
                <LogOut />
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full" asChild data-testid="button-login-link">
            <Link href="/login" onClick={closeMobile}>
              <LogIn className="h-4 w-4 mr-2" />
              Войти
            </Link>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
