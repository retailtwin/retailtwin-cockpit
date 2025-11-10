import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import retailTwinLabsLogo from "@/assets/retail-twin-labs-logo.png";
import retailTwinIcon from "@/assets/retail-twin-icon.png";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    checkAuthStatus();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuthStatus();
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!roles);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsLoggedIn(false);
      setIsAdmin(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate("/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <img
                src={retailTwinIcon}
                alt="Retail Twin Labs Icon"
                className="h-10 w-10"
              />
              <img
                src={retailTwinLabsLogo}
                alt="Retail Twin Labs"
                className="h-8 w-auto"
              />
            </Link>
            
            <div className="flex items-center space-x-6">
              {isLoggedIn && (
                <>
                  <Link
                    to="/dashboard"
                    className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/report"
                    className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
                  >
                    Reports
                  </Link>
                  <Link
                    to="/import"
                    className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
                  >
                    Data Import
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/settings"
                      className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
                    >
                      Settings
                    </Link>
                  )}
                </>
              )}
              
              <Link
                to="/blogs"
                className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
              >
                Blog
              </Link>

              {isLoggedIn ? (
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                >
                  Logout
                </Button>
              ) : (
                <Link to="/login">
                  <Button variant="outline" size="sm">
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  );
};
