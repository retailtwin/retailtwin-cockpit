import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ParetoReport } from "./ParetoReport";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Bot, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ParetoReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: string;
  sku: string;
  endDate: string; // YYYY-MM-DD format
  onAskArchie: (prompt: string) => void;
  kpiData?: {
    tcm?: number;
    mtv?: number;
    riv?: number;
    service_level?: number;
    service_level_sim?: number;
    turns_current?: number;
    turns_sim?: number;
  };
}

export const ParetoReportModal = ({
  isOpen,
  onClose,
  location,
  sku,
  endDate,
  onAskArchie,
  kpiData,
}: ParetoReportModalProps) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [archieAnalysis, setArchieAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchParetoData();
    }
  }, [isOpen, location, sku, endDate]);

  // Trigger analysis only when data is ready
  useEffect(() => {
    if (isOpen && data.length > 0 && !isAnalyzing) {
      generateArchieAnalysis(data);
    }
  }, [data, isOpen]);

  const fetchParetoData = async () => {
    setIsLoading(true);
    try {
      const { data: paretoData, error } = await supabase.rpc('get_pareto_analysis', {
        p_location_code: location,
        p_sku: sku,
        p_date: endDate,
      });

      if (error) throw error;
      setData(paretoData || []);
    } catch (error: any) {
      console.error('Error fetching Pareto data:', error);
      toast.error('Failed to load Pareto analysis');
    } finally {
      setIsLoading(false);
    }
  };

  const generateArchieAnalysis = async (paretoData: any[]) => {
    setIsAnalyzing(true);
    setArchieAnalysis("");
    
    try {
      const prompt = `Analyze the Pareto distribution for this selection. What insights stand out? What should I focus on?`;
      
      // Calculate comprehensive Pareto summary from the passed data
      const top20Count = Math.ceil(paretoData.length * 0.2);
      const top20Data = paretoData.slice(0, top20Count);
      
      const paretoSummary = {
        totalSkus: paretoData.length,
        top20Count,
        top20Contribution: top20Data.length > 0 
          ? top20Data[top20Data.length - 1]?.cumulative_percent || 0
          : 0,
        topSkus: top20Data.slice(0, Math.min(10, top20Data.length)).map((item: any) => ({
          sku: item.sku,
          name: item.sku_name,
          sales: item.total_units_sold,
          cumulativePercent: item.cumulative_percent,
          availability: item.availability_percent,
        })),
      };
      
      // Get the current user's session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("You must be logged in to use Archie");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/archie-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            context: {
              location: location,
              product: sku,
              dateRange: `Analysis ending ${endDate}`,
              metrics: kpiData ? {
                tcm: kpiData.tcm,
                mtv: kpiData.mtv,
                riv: kpiData.riv,
                service_level: kpiData.service_level,
                service_level_sim: kpiData.service_level_sim,
                turns_current: kpiData.turns_current,
                turns_sim: kpiData.turns_sim,
              } : undefined,
              paretoSummary,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get Archie analysis');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                setArchieAnalysis(prev => prev + content);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error generating Archie analysis:', error);
      setArchieAnalysis("I'm having trouble analyzing this right now. Click 'Ask Archie' below to chat with me directly.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAskArchieMore = () => {
    onClose();
    onAskArchie("Tell me more about the Pareto distribution you just analyzed");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Pareto Analysis Report</DialogTitle>
          <DialogDescription>
            {location === 'ALL' ? 'All Locations' : `Location ${location}`} • {sku === 'ALL' ? 'All Products' : sku}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            <ParetoReport data={data} selectedSku={sku !== 'ALL' ? sku : undefined} isLoading={isLoading} />
            
            <Separator />
            
            {/* Archie's Analysis Section */}
            <Card className="p-6 bg-primary/5">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {isAnalyzing ? (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  ) : (
                    <Bot className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-3">Archie's Analysis</h3>
                  {isAnalyzing && !archieAnalysis && (
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted rounded w-full"></div>
                      <div className="h-4 bg-muted rounded w-5/6"></div>
                      <div className="h-4 bg-muted rounded w-4/6"></div>
                    </div>
                  )}
                  {archieAnalysis && (
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {archieAnalysis}
                      </p>
                    </div>
                  )}
                  {!isAnalyzing && !archieAnalysis && (
                    <p className="text-sm text-muted-foreground">
                      Analysis will appear here...
                    </p>
                  )}
                  {archieAnalysis && !isAnalyzing && (
                    <button
                      onClick={handleAskArchieMore}
                      className="mt-4 text-sm text-primary hover:underline flex items-center gap-2"
                    >
                      <Bot className="h-4 w-4" />
                      Ask Archie for more details
                    </button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
