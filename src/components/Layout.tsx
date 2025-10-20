import { Link, useLocation } from "react-router-dom";
import { Activity } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Activity className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold tracking-tight">
                <span className="text-primary">AIFO</span>
                <span className="text-foreground ml-1">— AI Flow Optimiser</span>
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
                to="/about"
                className={`font-semibold transition-colors ${
                  isActive("/about")
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                About
              </Link>
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
