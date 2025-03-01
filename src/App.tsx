
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import ClientDetail from "./pages/ClientDetail";
import Messages from "./pages/Messages";
import Files from "./pages/Files";
import Kanban from "./pages/Kanban";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Navigation from "./components/Navigation";
import ClientDashboard from "./pages/ClientDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { useAuth } from "./context/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// RoleBasedRoute component to handle role-based access
const RoleBasedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Error fetching user role:", error);
          setLoading(false);
          return;
        }

        setUserRole(data.role);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Redirect clients to their dashboard
  if (userRole === 'Client') {
    return <Navigate to="/client-dashboard" />;
  }

  // Allow Admin and Collaborator to access the standard dashboard
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navigation />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute>
                    <Index />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/:id"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute>
                    <ClientDetail />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute>
                    <Messages />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/files"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute>
                    <Files />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/kanban"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute>
                    <Kanban />
                  </RoleBasedRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/client-dashboard"
              element={
                <ProtectedRoute>
                  <ClientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
