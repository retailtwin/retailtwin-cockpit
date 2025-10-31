import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import retailTwinLabsLogo from "@/assets/retail-twin-labs-logo.png";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!roles);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={retailTwinLabsLogo} alt="Retail Twin Labs" className="h-8" />
              <span className="text-lg font-semibold tracking-tight text-muted-foreground">
                — AI Flow Optimiser
              </span>
            </Link>

            <div className="flex items-center gap-6">
              <Link
                to="/dashboard"
                className={`font-semibold transition-colors ${
                  isActive("/dashboard")
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/report"
                className={`font-semibold transition-colors ${
                  isActive("/report")
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Reports
              </Link>
              <Link
                to="/import"
                className={`font-semibold transition-colors ${
                  isActive("/import")
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Data Import
              </Link>
              <Link
                to="/about"
                className={`font-semibold transition-colors ${
                  isActive("/about")
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                About
              </Link>
              {isAdmin && (
                <Link
                  to="/settings"
                  className={`font-semibold transition-colors ${
                    isActive("/settings")
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Settings
                </Link>
              )}
              <Link
                to="/login"
                className={`font-semibold transition-colors ${
                  isActive("/login")
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
};
