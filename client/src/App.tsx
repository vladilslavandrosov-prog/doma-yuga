import { Switch, Route, useParams } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider, ThemeToggle } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import Estimates from "@/pages/Estimates";
import Payments from "@/pages/Payments";
import Documents from "@/pages/Documents";
import Photos from "@/pages/Photos";
import Videos from "@/pages/Videos";
import Chat from "@/pages/Chat";
import About from "@/pages/About";
import Login from "@/pages/Login";
import { Badge } from "@/components/ui/badge";
import { Eye, Loader2 } from "lucide-react";

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

function ProjectPage({ section }: { section: "dashboard" | "estimates" | "payments" | "documents" | "photos" | "videos" | "chat" }) {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id);
  const basePath = `/cabinet/project/${params.id}`;

  if (isNaN(projectId)) return <NotFound />;

  switch (section) {
    case "dashboard":
      return <Dashboard projectId={projectId} basePath={basePath} />;
    case "estimates":
      return <Estimates projectId={projectId} />;
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

function CabinetHome() {
  const { user, isAdmin } = useAuth();

  if (isAdmin) {
    return <Projects />;
  }

  return <Dashboard projectId={1} basePath="/cabinet" />;
}

function ClientPage({ section }: { section: "estimates" | "payments" | "documents" | "photos" | "videos" | "chat" }) {
  switch (section) {
    case "estimates":
      return <Estimates projectId={1} />;
    case "payments":
      return <Payments projectId={1} />;
    case "documents":
      return <Documents projectId={1} />;
    case "photos":
      return <Photos projectId={1} />;
    case "videos":
      return <Videos projectId={1} />;
    case "chat":
      return <Chat projectId={1} />;
  }
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={About} />

      <Route path="/cabinet">{() => <CabinetLayout><CabinetHome /></CabinetLayout>}</Route>

      <Route path="/cabinet/estimates">{() => <CabinetLayout><ClientPage section="estimates" /></CabinetLayout>}</Route>
      <Route path="/cabinet/payments">{() => <CabinetLayout><ClientPage section="payments" /></CabinetLayout>}</Route>
      <Route path="/cabinet/documents">{() => <CabinetLayout><ClientPage section="documents" /></CabinetLayout>}</Route>
      <Route path="/cabinet/photos">{() => <CabinetLayout><ClientPage section="photos" /></CabinetLayout>}</Route>
      <Route path="/cabinet/videos">{() => <CabinetLayout><ClientPage section="videos" /></CabinetLayout>}</Route>
      <Route path="/cabinet/chat">{() => <CabinetLayout><ClientPage section="chat" /></CabinetLayout>}</Route>

      <Route path="/cabinet/project/:id">{() => <CabinetLayout><ProjectPage section="dashboard" /></CabinetLayout>}</Route>
      <Route path="/cabinet/project/:id/estimates">{() => <CabinetLayout><ProjectPage section="estimates" /></CabinetLayout>}</Route>
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
            <Router />
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
