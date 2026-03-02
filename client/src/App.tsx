import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider, ThemeToggle } from "@/components/ThemeProvider";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Estimates from "@/pages/Estimates";
import Payments from "@/pages/Payments";
import Documents from "@/pages/Documents";
import Photos from "@/pages/Photos";
import Chat from "@/pages/Chat";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/estimates">{() => <Estimates projectId={1} />}</Route>
      <Route path="/payments">{() => <Payments projectId={1} />}</Route>
      <Route path="/documents">{() => <Documents projectId={1} />}</Route>
      <Route path="/photos">{() => <Photos projectId={1} />}</Route>
      <Route path="/chat">{() => <Chat projectId={1} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
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
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
