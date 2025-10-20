import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, ChevronLeft, Send } from "lucide-react";

export const AgentPromptDock = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");

  const handleSubmit = () => {
    // Placeholder for agent interaction
    console.log("Prompt submitted:", prompt);
    setPrompt("");
  };

  return (
    <div
      className={`fixed right-0 top-0 h-full transition-all duration-300 z-40 ${
        isOpen ? "w-96" : "w-12"
      }`}
    >
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="secondary"
        size="icon"
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full rounded-r-none shadow-lg"
      >
        {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      {isOpen && (
        <Card className="h-full rounded-none border-l shadow-2xl">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Talk to Retail Twin</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ask questions about your supply chain
            </p>
          </CardHeader>
          <CardContent className="flex flex-col h-[calc(100%-8rem)] p-4">
            <div className="flex-1 overflow-y-auto mb-4 space-y-3">
              <div className="text-sm text-muted-foreground italic">
                Try asking:
              </div>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() =>
                    setPrompt("What products have the highest missed throughput?")
                  }
                >
                  What products have the highest missed throughput?
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() =>
                    setPrompt("Simulate increasing turns by 20% for Store A")
                  }
                >
                  Simulate increasing turns by 20% for Store A
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => setPrompt("Show stockout risk for next 7 days")}
                >
                  Show stockout risk for next 7 days
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Textarea
                placeholder="Type your question..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="resize-none"
                rows={4}
              />
              <Button
                onClick={handleSubmit}
                disabled={!prompt.trim()}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
