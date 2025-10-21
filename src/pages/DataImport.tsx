import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function DataImport() {
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    setImporting(true);
    
    try {
      // Fetch the CSV file
      const response = await fetch('/fact_daily_import.csv');
      const csvData = await response.text();
      
      // Call the edge function to import
      const { data, error } = await supabase.functions.invoke('import-fact-daily', {
        body: { csvData }
      });
      
      if (error) throw error;
      
      toast({
        title: "Import Complete!",
        description: `Successfully imported ${data.imported} records.`
      });
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Import Fact Daily Data</h1>
        <p className="text-muted-foreground mb-6">
          This will import 49,854 daily fact records into your database. 
          This operation may take a few minutes.
        </p>
        
        <Button 
          onClick={handleImport} 
          disabled={importing}
          className="w-full"
        >
          {importing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing... This may take several minutes
            </>
          ) : (
            "Start Import"
          )}
        </Button>
      </Card>
    </div>
  );
}
