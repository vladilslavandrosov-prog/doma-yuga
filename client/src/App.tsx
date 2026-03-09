import { Switch, Route } from "wouter";
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
import Estimates from "@/pages/Estimates";
import Payments from "@/pages/Payments";
import Documents from "@/pages/Documents";
import Photos from "@/pages/Photos";
import Chat from "@/pages/Chat";
import About from "@/pages/About";
import Login from "@/pages/Login";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { Loader2 } from "lucide-react";

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

function Router() {
  return (
    <Switch>
      <Route path="/" component={About} />
      <Route path="/cabinet">{() => <CabinetLayout><Dashboard /></CabinetLayout>}</Route>
      <Route path="/cabinet/estimates">{() => <CabinetLayout><Estimates projectId={1} /></CabinetLayout>}</Route>
      <Route path="/cabinet/payments">{() => <CabinetLayout><Payments projectId={1} /></CabinetLayout>}</Route>
      <Route path="/cabinet/documents">{() => <CabinetLayout><Documents projectId={1} /></CabinetLayout>}</Route>
      <Route path="/cabinet/photos">{() => <CabinetLayout><Photos projectId={1} /></CabinetLayout>}</Route>
      <Route path="/cabinet/chat">{() => <CabinetLayout><Chat projectId={1} /></CabinetLayout>}</Route>
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
