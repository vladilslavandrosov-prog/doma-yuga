import { Switch, Route, useParams, Link } from "wouter";
import { Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider, ThemeToggle } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Projects = lazy(() => import("@/pages/Projects"));
const Estimates = lazy(() => import("@/pages/Estimates"));
const WorkExecution = lazy(() => import("@/pages/WorkExecution"));
const Payments = lazy(() => import("@/pages/Payments"));
const Documents = lazy(() => import("@/pages/Documents"));
const Photos = lazy(() => import("@/pages/Photos"));
const Videos = lazy(() => import("@/pages/Videos"));
const Chat = lazy(() => import("@/pages/Chat"));
const Settings = lazy(() => import("@/pages/Settings"));
const Clients = lazy(() => import("@/pages/Clients"));
const Leads = lazy(() => import("@/pages/Leads"));
const About = lazy(() => import("@/pages/About"));
const Advantages = lazy(() => import("@/pages/Advantages"));
const PublicGallery = lazy(() => import("@/pages/PublicGallery"));
const Contact = lazy(() => import("@/pages/Contact"));
const Presentation = lazy(() => import("@/pages/Presentation"));
const Login = lazy(() => import("@/pages/Login"));
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Loader2 } from "lucide-react";
import type { Project } from "@shared/schema";

function CabinetLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <>
      {!user && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-center gap-2" data-testid="banner-demo">
          <Eye className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Демо-режим личного кабинета</span>
          <Badge variant="outline" className="text-xs">Демо</Badge>
        </div>
      )}
      {children}
    </>
  );
}

function ProjectPage({ section }: { section: "dashboard" | "estimates" | "execution" | "payments" | "documents" | "photos" | "videos" | "chat" }) {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id);
  const basePath = `/cabinet/project/${params.id}`;

  if (isNaN(projectId)) return <NotFound />;

  switch (section) {
    case "dashboard":
      return <Dashboard projectId={projectId} basePath={basePath} />;
    case "estimates":
      return <Estimates projectId={projectId} />;
    case "execution":
      return <WorkExecution projectId={projectId} />;
    case "payments":
      return <Payments projectId={projectId} />;
    case "documents":
      return <Documents projectId={projectId} />;
    case "photos":
      return <Photos projectId={projectId} />;
    case "videos":
      return <Videos projectId={projectId} />;
    case "chat":
      return <Chat projectId={projectId} />;
  }
}

function useClientProjects() {
  const { user } = useAuth();
  const isClient = !!user && user.role === "client";
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/client-projects"],
    enabled: isClient,
  });
  return { projects: isClient ? projects : undefined, isLoading: isLoading && isClient, isClient };
}

function ClientProjectLoader({ children }: { children: (projectId: number) => React.ReactNode }) {
  const { user } = useAuth();
  const { projects, isLoading, isClient } = useClientProjects();

  if (!isClient) {
    return <>{children(1)}</>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        {user ? "Проект не назначен. Обратитесь к администратору." : "Проект не найден."}
      </div>
    );
  }

  return <>{children(projects[0].id)}</>;
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Доступ запрещён
      </div>
    );
  }
  return <>{children}</>;
}

function ClientProjectsList() {
  const { projects, isLoading } = useClientProjects();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Проект не назначен. Обратитесь к администратору.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-my-projects-title">
          Мои объекты
        </h1>
        <p className="text-sm text-muted-foreground">
          Выберите объект для просмотра
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Link key={project.id} href={`/cabinet/project/${project.id}`}>
            <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-client-project-${project.id}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-base font-medium truncate">{project.name}</CardTitle>
                <Badge variant="default" className="no-default-hover-elevate">
                  {project.status === "active" ? "Активен" : project.status === "completed" ? "Завершён" : "Приостановлен"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span>{project.address}</span>
                </div>
                <div className="flex items-center justify-end pt-1">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CabinetHome() {
  const { user, isAdmin } = useAuth();
  const { projects, isLoading, isClient } = useClientProjects();

  if (isAdmin) {
    return <Projects />;
  }

  if (isClient) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (projects && projects.length === 1) {
      return <Dashboard projectId={projects[0].id} basePath="/cabinet" />;
    }
    return <ClientProjectsList />;
  }

  return <Dashboard projectId={1} basePath="/cabinet" />;
}

function ClientPageInner({ section, projectId }: { section: string; projectId: number }) {
  switch (section) {
    case "estimates": return <Estimates projectId={projectId} />;
    case "execution": return <WorkExecution projectId={projectId} />;
    case "payments": return <Payments projectId={projectId} />;
    case "documents": return <Documents projectId={projectId} />;
    case "photos": return <Photos projectId={projectId} />;
    case "videos": return <Videos projectId={projectId} />;
    case "chat": return <Chat projectId={projectId} />;
    default: return null;
  }
}

function ClientPage({ section }: { section: "estimates" | "execution" | "payments" | "documents" | "photos" | "videos" | "chat" }) {
  return (
    <ClientProjectLoader>
      {(projectId) => <ClientPageInner section={section} projectId={projectId} />}
    </ClientProjectLoader>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={About} />
      <Route path="/advantages" component={Advantages} />
      <Route path="/gallery" component={PublicGallery} />
      <Route path="/contact" component={Contact} />
      <Route path="/presentation" component={Presentation} />

      <Route path="/cabinet">{() => <CabinetLayout><CabinetHome /></CabinetLayout>}</Route>

      <Route path="/cabinet/estimates">{() => <CabinetLayout><ClientPage section="estimates" /></CabinetLayout>}</Route>
      <Route path="/cabinet/execution">{() => <CabinetLayout><ClientPage section="execution" /></CabinetLayout>}</Route>
      <Route path="/cabinet/payments">{() => <CabinetLayout><ClientPage section="payments" /></CabinetLayout>}</Route>
      <Route path="/cabinet/documents">{() => <CabinetLayout><ClientPage section="documents" /></CabinetLayout>}</Route>
      <Route path="/cabinet/photos">{() => <CabinetLayout><ClientPage section="photos" /></CabinetLayout>}</Route>
      <Route path="/cabinet/videos">{() => <CabinetLayout><ClientPage section="videos" /></CabinetLayout>}</Route>
      <Route path="/cabinet/chat">{() => <CabinetLayout><ClientPage section="chat" /></CabinetLayout>}</Route>
      <Route path="/cabinet/settings">{() => <CabinetLayout><Settings /></CabinetLayout>}</Route>
      <Route path="/cabinet/clients">{() => <CabinetLayout><AdminOnly><Clients /></AdminOnly></CabinetLayout>}</Route>
      <Route path="/cabinet/leads">{() => <CabinetLayout><AdminOnly><Leads /></AdminOnly></CabinetLayout>}</Route>

      <Route path="/cabinet/project/:id">{() => <CabinetLayout><ProjectPage section="dashboard" /></CabinetLayout>}</Route>
      <Route path="/cabinet/project/:id/estimates">{() => <CabinetLayout><ProjectPage section="estimates" /></CabinetLayout>}</Route>
      <Route path="/cabinet/project/:id/execution">{() => <CabinetLayout><ProjectPage section="execution" /></CabinetLayout>}</Route>
      <Route path="/cabinet/project/:id/payments">{() => <CabinetLayout><ProjectPage section="payments" /></CabinetLayout>}</Route>
      <Route path="/cabinet/project/:id/documents">{() => <CabinetLayout><ProjectPage section="documents" /></CabinetLayout>}</Route>
      <Route path="/cabinet/project/:id/photos">{() => <CabinetLayout><ProjectPage section="photos" /></CabinetLayout>}</Route>
      <Route path="/cabinet/project/:id/videos">{() => <CabinetLayout><ProjectPage section="videos" /></CabinetLayout>}</Route>
      <Route path="/cabinet/project/:id/chat">{() => <CabinetLayout><ProjectPage section="chat" /></CabinetLayout>}</Route>

      <Route path="/login" component={Login} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <Router />
            </Suspense>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
