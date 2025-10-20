import { AlertCircle, Info, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NotificationBannerProps {
  message: string;
  type?: "info" | "warning" | "success";
}

export const NotificationBanner = ({
  message,
  type = "info",
}: NotificationBannerProps) => {
  const iconMap = {
    info: Info,
    warning: AlertCircle,
    success: CheckCircle,
  };

  const Icon = iconMap[type];

  const variantClasses = {
    info: "border-blue-500/50 bg-blue-50 dark:bg-blue-950/30",
    warning: "border-warning/50 bg-warning/10 dark:bg-warning/10",
    success: "border-success/50 bg-success/10 dark:bg-success/10",
  };

  return (
    <Alert className={`${variantClasses[type]} border-l-4`}>
      <Icon className="h-5 w-5" />
      <AlertDescription className="ml-2 font-medium">
        {message}
      </AlertDescription>
    </Alert>
  );
};
