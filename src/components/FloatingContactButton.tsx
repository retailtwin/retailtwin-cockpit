import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const FloatingContactButton = () => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <a href="mailto:hello@retailtwin.com">
            <Button
              size="lg"
              className="fixed bottom-6 left-6 h-14 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 z-50 bg-primary hover:bg-primary/90"
            >
              <Mail className="h-5 w-5 mr-2" />
              Talk to Us
            </Button>
          </a>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Send us an email</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
