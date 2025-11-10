import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Download, MapPin, Package, TrendingUp, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";

type ImportType = 'locations' | 'products' | 'sales' | 'inventory';

export default function DataImport() {
  const [csvTexts, setCsvTexts] = useState<Record<ImportType, string>>({
    locations: '',
    products: '',
    sales: '',
    inventory: '',
  });
  const [isImporting, setIsImporting] = useState<Record<ImportType, boolean>>({
    locations: false,
    products: false,
    sales: false,
    inventory: false,
  });
  const { toast } = useToast();

  const getTemplateContent = (type: ImportType): string => {
    switch (type) {
      case 'locations':
        return `store_code,name,production_lead_time,shipping_lead_time,order_days
STORE001,Example Store 1,0,5,"mon,tue,wed,thu,fri,sat,sun"
STORE002,Example Store 2,2,3,"mon,wed,fri"`;
      case 'products':
        return `product_code,name,cost_price,sales_price,pack_size,minimum_order_quantity,group_1,group_2,group_3
SKU001,Example Product 1,16.00,35.00,3,3,CATEGORY1,SUBCATEGORY1,SEASON1
SKU002,Example Product 2,20.00,45.00,6,6,CATEGORY2,SUBCATEGORY2,SEASON2`;
      case 'sales':
        return `day,store,product,units
2023-01-01,STORE001,SKU001,5
2023-01-02,STORE001,SKU001,3
2023-01-01,STORE002,SKU002,10`;
      case 'inventory':
        return `day,store,product,units_on_hand,units_on_order,units_in_transit
2023-01-01,STORE001,SKU001,25,10,5
2023-01-05,STORE001,SKU001,18,15,0
2023-01-03,STORE002,SKU002,50,0,10`;
      default:
        return '';
    }
  };

  const downloadTemplate = (type: ImportType) => {
    const content = getTemplateContent(type);
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: `${type} template has been downloaded successfully`,
    });
  };

  const handleImport = async (type: ImportType) => {
    const csvText = csvTexts[type];
    
    if (!csvText.trim()) {
      toast({
        title: "Error",
        description: "Please paste CSV data first",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(prev => ({ ...prev, [type]: true }));
    
    try {
      const functionName = `import-${type}`;
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { csvText }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || `${type} data imported successfully`,
      });
      
      setCsvTexts(prev => ({ ...prev, [type]: '' }));
    } catch (error: any) {
      console.error(`Import ${type} error:`, error);
      toast({
        title: "Import Failed",
        description: error.message || `Failed to import ${type} data`,
        variant: "destructive",
      });
    } finally {
      setIsImporting(prev => ({ ...prev, [type]: false }));
    }
  };

  const importConfigs = {
    locations: {
      icon: MapPin,
      title: "Locations",
      description: "Upload store/location master data. Each store must have a unique code.",
      instruction: "Paste your locations CSV below (including header row: store_code, name, production_lead_time, shipping_lead_time, order_days)",
    },
    products: {
      icon: Package,
      title: "Products",
      description: "Upload product master data. Each product must have a unique SKU/product code.",
      instruction: "Paste your products CSV below (including header row: product_code, name, cost_price, sales_price, pack_size, minimum_order_quantity, group_1, group_2, group_3)",
    },
    sales: {
      icon: TrendingUp,
      title: "Sales",
      description: "Upload daily sales transactions. Date format: YYYY-MM-DD.",
      instruction: "Paste your sales CSV below (including header row: day, store, product, units)",
    },
    inventory: {
      icon: Archive,
      title: "Inventory",
      description: "Upload inventory changes only (when stock levels differ from previous day). Date format: YYYY-MM-DD.",
      instruction: "Paste your inventory CSV below (including header row: day, store, product, units_on_hand, units_on_order, units_in_transit)",
    },
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Data Import</h1>
          <p className="text-muted-foreground">
            Download CSV templates, populate them with your data, then upload them below.
          </p>
        </div>

        {/* Download Templates Section */}
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Download Templates</CardTitle>
            <CardDescription>
              Download the CSV templates below to see the required format for each data type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(Object.keys(importConfigs) as ImportType[]).map((type) => {
                const config = importConfigs[type];
                const Icon = config.icon;
                return (
                  <Button
                    key={type}
                    onClick={() => downloadTemplate(type)}
                    variant="outline"
                    className="h-auto flex-col gap-2 p-6"
                  >
                    <Icon className="h-8 w-8" />
                    <span className="font-semibold">{config.title}</span>
                    <Download className="h-4 w-4" />
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Upload Your Data</CardTitle>
            <CardDescription>
              Paste your populated CSV data in the appropriate tab below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="locations" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                {(Object.keys(importConfigs) as ImportType[]).map((type) => {
                  const Icon = importConfigs[type].icon;
                  return (
                    <TabsTrigger key={type} value={type} className="gap-2">
                      <Icon className="h-4 w-4" />
                      {importConfigs[type].title}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {(Object.keys(importConfigs) as ImportType[]).map((type) => {
                const config = importConfigs[type];
                return (
                  <TabsContent key={type} value={type} className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">{config.title}</h3>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">{config.instruction}</label>
                      <Textarea
                        placeholder={`Paste ${config.title.toLowerCase()} CSV data here...`}
                        value={csvTexts[type]}
                        onChange={(e) => setCsvTexts(prev => ({ ...prev, [type]: e.target.value }))}
                        className="min-h-[300px] font-mono text-sm"
                      />
                    </div>

                    <Button 
                      onClick={() => handleImport(type)} 
                      disabled={isImporting[type] || !csvTexts[type].trim()}
                      className="w-full"
                    >
                      {isImporting[type] ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Import {config.title}
                        </>
                      )}
                    </Button>
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
