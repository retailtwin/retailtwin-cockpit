import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function DataImport() {
  const [csvText, setCsvText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!csvText.trim()) {
      toast({
        title: "Error",
        description: "Please paste CSV data first",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-fact-daily', {
        body: { csvText }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || "Data imported successfully",
      });
      
      setCsvText("");
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import data",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Import Fact Daily Data</CardTitle>
          <CardDescription>
            Paste the contents of your fact_daily_1.csv file below to import the data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste CSV data here (including header row)..."
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="min-h-[400px] font-mono text-sm"
          />
          <Button 
            onClick={handleImport} 
            disabled={isImporting || !csvText.trim()}
            className="w-full"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}