import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import archieLogo from "@/assets/archie-logo.png";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ArchieFloatingButtonProps {
  onClick: () => void;
  isOpen: boolean;
  notificationCount?: number;
}

export const ArchieFloatingButton = ({ 
  onClick, 
  isOpen, 
  notificationCount = 0 
}: ArchieFloatingButtonProps) => {
  if (isOpen) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            size="lg"
            className="fixed bottom-6 right-6 h-14 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 z-50 bg-primary hover:bg-primary/90"
          >
            <div className="flex items-center gap-2">
              <img src={archieLogo} alt="Archie" className="h-6 w-6 rounded-full object-cover" />
              <span className="font-medium">AI Assistant</span>
            </div>
            {notificationCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
              >
                {notificationCount}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Ask Archie</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
