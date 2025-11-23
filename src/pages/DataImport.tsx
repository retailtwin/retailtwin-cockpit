import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Download, MapPin, Package, TrendingUp, Archive, Info, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDataset } from "@/contexts/DatasetContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ImportType = 'locations' | 'products' | 'sales' | 'inventory';

interface Dataset {
  id: string;
  dataset_name: string;
  description: string | null;
  created_at: string;
  status: string;
  locations_filename: string | null;
  products_filename: string | null;
  sales_filename: string | null;
  inventory_filename: string | null;
}

export default function DataImport() {
  const [datasetName, setDatasetName] = useState("");
  const [description, setDescription] = useState("");
  const [currentDatasetId, setCurrentDatasetId] = useState<string | null>(null);
  const [existingDatasets, setExistingDatasets] = useState<Dataset[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(true);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Record<ImportType, File | null>>({
    locations: null,
    products: null,
    sales: null,
    inventory: null,
  });
  const [uploadedFiles, setUploadedFiles] = useState<Record<ImportType, boolean>>({
    locations: false,
    products: false,
    sales: false,
    inventory: false,
  });
  const [processingStatus, setProcessingStatus] = useState<Record<ImportType, 'idle' | 'uploading' | 'processing' | 'complete'>>({
    locations: 'idle',
    products: 'idle',
    sales: 'idle',
    inventory: 'idle',
  });
  const [existingFilenames, setExistingFilenames] = useState<Record<ImportType, string | null>>({
    locations: null,
    products: null,
    sales: null,
    inventory: null,
  });
  const [showInstructions, setShowInstructions] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { refreshDatasets } = useDataset();

  useEffect(() => {
    fetchExistingDatasets();
  }, []);

  const updateExistingFilenames = (dataset: Dataset) => {
    setExistingFilenames({
      locations: dataset.locations_filename,
      products: dataset.products_filename,
      sales: dataset.sales_filename,
      inventory: dataset.inventory_filename,
    });
  };

  const fetchExistingDatasets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoadingDatasets(false);
        return;
      }

      const { data, error } = await supabase
        .from('datasets')
        .select('id, dataset_name, description, created_at, status, locations_filename, products_filename, sales_filename, inventory_filename')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setExistingDatasets(data || []);
      
      // Auto-select the most recent pending dataset if available
      if (data && data.length > 0) {
        setCurrentDatasetId(data[0].id);
        updateExistingFilenames(data[0]);
      }
    } catch (error: any) {
      console.error("Error fetching datasets:", error);
      toast({
        title: "Error",
        description: "Failed to load existing datasets",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDatasets(false);
    }
  };

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
="2023-01-01",STORE001,SKU001,5
="2023-01-02",STORE001,SKU001,3
="2023-01-01",STORE002,SKU002,10`;
      case 'inventory':
        return `day,store,product,units_on_hand,units_on_order,units_in_transit
="2023-01-01",STORE001,SKU001,25,10,5
="2023-01-05",STORE001,SKU001,18,15,0
="2023-01-03",STORE002,SKU002,50,0,10`;
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

  const handleCreateDataset = async () => {
    if (!datasetName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a dataset name",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const datasetSlug = datasetName.toLowerCase().replace(/\s+/g, '-');
      
      const { data, error } = await supabase
        .from('datasets')
        .insert({
          dataset_name: datasetName,
          dataset_slug: datasetSlug,
          description: description || null,
          user_id: user.id,
          status: 'pending',
          is_active: false,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentDatasetId(data.id);
      setShowCreateNew(false);
      await fetchExistingDatasets(); // Refresh the list
      toast({
        title: "Dataset Created",
        description: "You can now upload your CSV files",
      });
    } catch (error: any) {
      console.error("Error creating dataset:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create dataset",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (type: ImportType, file: File | null) => {
    setSelectedFiles(prev => ({ ...prev, [type]: file }));
  };

  const handleUploadAndProcess = async (type: ImportType) => {
    const file = selectedFiles[type];
    if (!file || !currentDatasetId) return;

    setProcessingStatus(prev => ({ ...prev, [type]: 'uploading' }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload file to storage
      const filePath = `${user.id}/${currentDatasetId}/${type}_${Date.now()}.csv`;
      const { error: uploadError } = await supabase.storage
        .from('dataset-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Update dataset with filename
      const updateField = `${type}_filename`;
      const { error: updateError } = await supabase
        .from('datasets')
        .update({ [updateField]: filePath })
        .eq('id', currentDatasetId);

      if (updateError) throw updateError;

      setUploadedFiles(prev => ({ ...prev, [type]: true }));
      setProcessingStatus(prev => ({ ...prev, [type]: 'processing' }));

      // Process the uploaded file
      const { data, error: processError } = await supabase.functions.invoke('process-dataset-upload', {
        body: { datasetId: currentDatasetId, fileType: type }
      });

      if (processError) throw processError;

      setProcessingStatus(prev => ({ ...prev, [type]: 'complete' }));
      toast({
        title: "Success",
        description: data.message || `${type} file processed successfully`,
      });

      // Refresh datasets and existing filenames
      await fetchExistingDatasets();
      await refreshDatasets();
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error);
      setProcessingStatus(prev => ({ ...prev, [type]: 'idle' }));
      toast({
        title: "Error",
        description: error.message || `Failed to upload ${type} file`,
        variant: "destructive",
      });
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
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Data Import</h1>
            <p className="text-muted-foreground">
              Create a dataset and upload your retail data files
            </p>
          </div>

          {/* Detailed Instructions Collapsible */}
          <Collapsible open={showInstructions} onOpenChange={setShowInstructions}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Info className="h-4 w-4" />
                {showInstructions ? "Hide" : "Show"} Detailed Instructions
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Import Guidelines & Format Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">General Rules</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>All CSV files must include the header row as shown in templates</li>
                      <li>Date format must be <strong>YYYY-MM-DD</strong> (e.g., 2024-01-15)</li>
                      <li>Use commas as separators, quotes for text containing commas</li>
                      <li>Ensure no empty rows or extra whitespace</li>
                      <li>Character encoding should be UTF-8</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Locations
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li><strong>store_code:</strong> Unique identifier for each location</li>
                      <li><strong>name:</strong> Display name of the store</li>
                      <li><strong>production_lead_time:</strong> Days needed for production (number)</li>
                      <li><strong>shipping_lead_time:</strong> Days needed for shipping (number)</li>
                      <li><strong>order_days:</strong> Comma-separated days of week in quotes (e.g., "mon,wed,fri")</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4" /> Products
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li><strong>product_code:</strong> Unique SKU identifier</li>
                      <li><strong>name:</strong> Product display name</li>
                      <li><strong>cost_price:</strong> Cost price (decimal, e.g., 16.00)</li>
                      <li><strong>sales_price:</strong> Selling price (decimal, e.g., 35.00)</li>
                      <li><strong>pack_size:</strong> Units per pack (integer)</li>
                      <li><strong>minimum_order_quantity:</strong> Minimum order quantity (integer)</li>
                      <li><strong>group_1, group_2, group_3:</strong> Product categorization (text)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Sales
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li><strong>day:</strong> Transaction date in YYYY-MM-DD format</li>
                      <li><strong>store:</strong> Store code matching locations</li>
                      <li><strong>product:</strong> Product code matching products</li>
                      <li><strong>units:</strong> Number of units sold (integer)</li>
                      <li>Import daily sales data for accurate trend analysis</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Archive className="h-4 w-4" /> Inventory
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li><strong>day:</strong> Inventory snapshot date in YYYY-MM-DD format</li>
                      <li><strong>store:</strong> Store code matching locations</li>
                      <li><strong>product:</strong> Product code matching products</li>
                      <li><strong>units_on_hand:</strong> Current stock level (integer)</li>
                      <li><strong>units_on_order:</strong> Quantity ordered but not received (integer)</li>
                      <li><strong>units_in_transit:</strong> Quantity in transit (integer)</li>
                      <li><strong>Important:</strong> Only upload inventory records when values change from previous day</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Best Practices</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Import master data (Locations, Products) before transactional data (Sales, Inventory)</li>
                      <li>Validate your CSV in a spreadsheet application before uploading</li>
                      <li>Start with a small test batch to verify format correctness</li>
                      <li>Keep backup copies of your source data</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {isLoadingDatasets ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !currentDatasetId ? (
          <Card>
            <CardHeader>
              <CardTitle>Select or Create Dataset</CardTitle>
              <CardDescription>
                Choose an existing pending dataset or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {existingDatasets.length > 0 && !showCreateNew && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="dataset-select">Select Existing Dataset</Label>
                    <Select 
                      value={currentDatasetId || undefined} 
                      onValueChange={(value) => {
                        setCurrentDatasetId(value);
                        const selectedDataset = existingDatasets.find(d => d.id === value);
                        if (selectedDataset) {
                          updateExistingFilenames(selectedDataset);
                        }
                      }}
                    >
                      <SelectTrigger id="dataset-select">
                        <SelectValue placeholder="Choose a dataset..." />
                      </SelectTrigger>
                      <SelectContent>
                        {existingDatasets.map((dataset) => (
                          <SelectItem key={dataset.id} value={dataset.id}>
                            {dataset.dataset_name} 
                            {dataset.description && ` - ${dataset.description}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border-t" />
                    <span className="text-sm text-muted-foreground">or</span>
                    <div className="flex-1 border-t" />
                  </div>
                  <Button variant="outline" onClick={() => setShowCreateNew(true)} className="w-full">
                    Create New Dataset
                  </Button>
                </>
              )}

              {(showCreateNew || existingDatasets.length === 0) && (
                <>
                  {showCreateNew && (
                    <Button variant="ghost" onClick={() => setShowCreateNew(false)} className="w-full">
                      ← Back to Selection
                    </Button>
                  )}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dataset-name">Dataset Name *</Label>
                      <Input
                        id="dataset-name"
                        placeholder="e.g., Q1 2024 Sales Data"
                        value={datasetName}
                        onChange={(e) => setDatasetName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe this dataset..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleCreateDataset}>
                      Create Dataset
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Dataset selected: <strong>{existingDatasets.find(d => d.id === currentDatasetId)?.dataset_name || "Dataset"}</strong>. Upload your CSV files below in any order.
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setCurrentDatasetId(null);
                    setShowCreateNew(false);
                  }}
                >
                  Switch Dataset
                </Button>
              </AlertDescription>
            </Alert>

            <div className="grid gap-6 md:grid-cols-2">
              {(Object.keys(importConfigs) as ImportType[]).map((type) => {
                const config = importConfigs[type];
                const Icon = config.icon;
                const file = selectedFiles[type];
                const status = processingStatus[type];

                return (
                  <Card key={type}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5" />
                          <CardTitle className="text-lg">{config.title}</CardTitle>
                        </div>
                        {status === 'complete' && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      <CardDescription>{config.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadTemplate(type)}
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Template
                      </Button>

                      {existingFilenames[type] && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Currently uploaded:</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {existingFilenames[type]?.split('/').pop()}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept=".csv"
                          onChange={(e) => handleFileSelect(type, e.target.files?.[0] || null)}
                          disabled={status === 'uploading' || status === 'processing'}
                          className="cursor-pointer"
                        />
                        {file && (
                          <p className="text-sm text-muted-foreground">
                            Selected: {file.name}
                            {existingFilenames[type] && <span className="text-yellow-600"> (will replace current file)</span>}
                          </p>
                        )}
                      </div>

                      <Button
                        onClick={() => handleUploadAndProcess(type)}
                        disabled={!file || status === 'uploading' || status === 'processing' || status === 'complete'}
                        className="w-full"
                      >
                        {status === 'uploading' && (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        )}
                        {status === 'processing' && (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        )}
                        {status === 'complete' && (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Completed
                          </>
                        )}
                        {status === 'idle' && (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            {existingFilenames[type] ? 'Replace & Process' : 'Upload & Process'}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Skip for Now
              </Button>
              <Button onClick={() => {
                refreshDatasets();
                navigate('/dashboard');
              }}>
                Done - Go to Dashboard
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
