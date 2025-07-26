import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import Categories from "@/pages/categories";
import Borrowing from "@/pages/borrowing";
import Sales from "@/pages/sales";
import Users from "@/pages/users";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Login} />
          <Route path="/register" component={Register} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/inventory" component={Inventory} />
          <Route path="/categories" component={Categories} />
          <Route path="/borrowing" component={Borrowing} />
          <Route path="/sales" component={Sales} />
          <Route path="/users" component={Users} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
