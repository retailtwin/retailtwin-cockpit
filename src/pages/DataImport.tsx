import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Download, MapPin, Package, TrendingUp, Archive, Info, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDataset } from "@/contexts/DatasetContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ImportType = 'locations' | 'products' | 'sales' | 'inventory';

interface CSVPreview {
  headers: string[];
  rows: string[][];
  isValid: boolean;
  error?: string;
}

interface Dataset {
  id: string;
  dataset_name: string;
  description: string | null;
  created_at: string;
  status: string;
  is_template: boolean | null;
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
  const [csvPreviews, setCsvPreviews] = useState<Record<ImportType, CSVPreview | null>>({
    locations: null,
    products: null,
    sales: null,
    inventory: null,
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { refreshDatasets } = useDataset();

  useEffect(() => {
    fetchExistingDatasets();
  }, []);

  // Update existing filenames when currentDatasetId changes
  useEffect(() => {
    if (currentDatasetId) {
      const selectedDataset = existingDatasets.find(d => d.id === currentDatasetId);
      if (selectedDataset) {
        updateExistingFilenames(selectedDataset);
      }
    }
  }, [currentDatasetId, existingDatasets]);

  const updateExistingFilenames = (dataset: Dataset) => {
    setExistingFilenames({
      locations: dataset.locations_filename,
      products: dataset.products_filename,
      sales: dataset.sales_filename,
      inventory: dataset.inventory_filename,
    });
  };

  const handleExportAndDownload = async (type: ImportType) => {
    try {
      const selectedDataset = existingDatasets.find(d => d.id === currentDatasetId);
      if (!selectedDataset) return;

      // If file already exists, just download it
      const filePath = existingFilenames[type];
      if (filePath) {
        await downloadFile(filePath, type);
        return;
      }

      // Otherwise, export from database first (for template datasets)
      toast({
        title: "Exporting data",
        description: `Generating ${type} CSV from database...`,
      });

      const { data, error } = await supabase.functions.invoke('export-dataset-csv', {
        body: { datasetId: currentDatasetId, fileType: type }
      });

      if (error) throw error;

      // Update local state with new filename
      setExistingFilenames(prev => ({
        ...prev,
        [type]: data.filePath
      }));

      // Refresh datasets to get updated filenames
      await fetchExistingDatasets();

      // Now download the exported file
      await downloadFile(data.filePath, type);

      toast({
        title: "Export complete",
        description: `${type} file is ready for download`,
      });
    } catch (error: any) {
      console.error(`Error exporting ${type} file:`, error);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error.message || "Failed to export file",
      });
    }
  };

  const downloadFile = async (filePath: string, type: ImportType) => {
    // Download file from Supabase Storage
    const { data, error } = await supabase.storage
      .from('dataset-files')
      .download(filePath);

    if (error) throw error;

    // Extract filename from path
    const filename = filePath.split('/').pop() || `${type}.csv`;

    // Create blob URL and trigger download
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: `Downloading ${filename}`,
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
        .select('id, dataset_name, description, created_at, status, is_template, locations_filename, products_filename, sales_filename, inventory_filename')
        .or(`user_id.eq.${user.id},is_template.eq.true`)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      setExistingDatasets(data || []);
      
      // Auto-select the most recent dataset if available
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

  const getExpectedHeaders = (type: ImportType): string[] => {
    switch (type) {
      case 'locations':
        return ['store_code', 'name', 'production_lead_time', 'shipping_lead_time', 'order_days'];
      case 'products':
        return ['product_code', 'name', 'cost_price', 'sales_price', 'pack_size', 'minimum_order_quantity', 'group_1', 'group_2', 'group_3'];
      case 'sales':
        return ['day', 'store', 'product', 'units'];
      case 'inventory':
        return ['day', 'store', 'product', 'units_on_hand', 'units_on_order', 'units_in_transit'];
      default:
        return [];
    }
  };

  const validateCSVHeaders = (headers: string[], expectedHeaders: string[]): boolean => {
    // Normalize headers (trim, lowercase)
    const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
    const normalizedExpected = expectedHeaders.map(h => h.toLowerCase());
    
    // Check if all expected headers are present
    return normalizedExpected.every(expected => normalizedHeaders.includes(expected));
  };

  const parseCSVPreview = async (file: File, type: ImportType): Promise<CSVPreview> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          resolve({
            headers: [],
            rows: [],
            isValid: false,
            error: 'CSV file is empty'
          });
          return;
        }

        // Parse headers (first line)
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        
        // Parse first 3 data rows for preview
        const rows = lines.slice(1, 4).map(line => {
          // Simple CSV parsing (handles basic cases)
          return line.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''));
        });

        const expectedHeaders = getExpectedHeaders(type);
        const isValid = validateCSVHeaders(headers, expectedHeaders);
        
        let error: string | undefined;
        if (!isValid) {
          error = `Invalid headers. Expected: ${expectedHeaders.join(', ')}`;
        }

        resolve({
          headers,
          rows,
          isValid,
          error
        });
      };

      reader.onerror = () => {
        resolve({
          headers: [],
          rows: [],
          isValid: false,
          error: 'Failed to read file'
        });
      };

      reader.readAsText(file);
    });
  };

  const handleFileSelect = async (type: ImportType, file: File | null) => {
    setSelectedFiles(prev => ({ ...prev, [type]: file }));
    
    if (file) {
      // Parse and validate CSV
      const preview = await parseCSVPreview(file, type);
      setCsvPreviews(prev => ({ ...prev, [type]: preview }));
      
      if (!preview.isValid) {
        toast({
          variant: "destructive",
          title: "Invalid CSV Format",
          description: preview.error || "The selected file doesn't match the expected format",
        });
      }
    } else {
      setCsvPreviews(prev => ({ ...prev, [type]: null }));
    }
  };

  const pollDatasetUntilComplete = async (
    datasetId: string,
    type: ImportType
  ) => {
    const pollIntervalMs = 5000; // 5 seconds
    const maxAttempts = 60;      // ~5 minutes

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await supabase
      .from("datasets")
      .select("status, error_message, total_inventory_records, total_sales_records, total_locations, total_products")
      .eq("id", datasetId)
      .single();

      if (error) {
        console.error("Error polling dataset status:", error);
        // Non-fatal; wait and try again
      } else if (data) {
        if (data.status === "active") {
          setProcessingStatus(prev => ({ ...prev, [type]: "complete" }));
          toast({
            title: "Processing complete",
            description: `${type} file processed successfully.`,
          });

          // Refresh dataset lists & counts
          await fetchExistingDatasets();
          await refreshDatasets();
          return;
        }

      if (data.status === "error") {
        setProcessingStatus(prev => ({ ...prev, [type]: "idle" }));
        toast({
          title: "Processing failed",
          description: data.error_message
            || "There was an error while processing the file. Please check your CSV and try again.",
          variant: "destructive",
        });
        return;
      }
      }

      // Still processing or unknown; wait and retry
      await new Promise((resolve) =>
        setTimeout(resolve, pollIntervalMs)
      );
    }

    // Timed out
    setProcessingStatus(prev => ({ ...prev, [type]: "idle" }));
    toast({
      title: "Processing is taking longer than expected",
      description:
        "The file is still being processed in the background. Please check back later or reload the page.",
    });
  };

  const handleUploadAndProcess = async (type: ImportType) => {
    const file = selectedFiles[type];
    const preview = csvPreviews[type];
    
    if (!file || !currentDatasetId) return;

    // Prevent upload if validation failed
    if (!preview?.isValid) {
      toast({
        variant: "destructive",
        title: "Cannot Upload",
        description: preview?.error || "Please select a valid CSV file with correct headers",
      });
      return;
    }

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

      // Call edge function (now only starts background processing)
      const { data, error: processError } = await supabase.functions.invoke('process-dataset-upload', {
        body: { datasetId: currentDatasetId, fileType: type }
      });

      if (processError) throw processError;

      toast({
        title: "Processing started",
        description:
          data?.message ??
          `${type} file is now being processed. This may take a few minutes for large files.`,
      });

      // Start polling dataset status
      await pollDatasetUntilComplete(currentDatasetId, type);

    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error);
      setProcessingStatus(prev => ({ ...prev, [type]: 'idle' }));
      toast({
        title: "Error",
        description: error.message || `Failed to upload or process ${type} file`,
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
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Select or Create Dataset</CardTitle>
              <CardDescription>
                Choose an existing active or pending dataset, or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showCreateNew ? (
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
                            {dataset.dataset_name} {dataset.is_template ? "(Template)" : ""} - {dataset.status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateNew(true)}
                    className="w-full"
                  >
                    Create New Dataset
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="datasetName">Dataset Name *</Label>
                    <Input
                      id="datasetName"
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
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCreateDataset}>
                      Create Dataset
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowCreateNew(false);
                        setDatasetName("");
                        setDescription("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {currentDatasetId && (
          <>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {existingDatasets.find(d => d.id === currentDatasetId)?.status === 'active'
                  ? 'This dataset is already active. You can add or update files.'
                  : 'This dataset is pending. Upload all required files to activate it.'}
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

                      {existingFilenames[type] ? (
                        <Alert>
                          <CheckCircle2 className="h-4 w-4" />
                          <AlertDescription>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium mb-1">File already uploaded</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {existingFilenames[type]?.split('/').pop()}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportAndDownload(type)}
                                className="flex-shrink-0"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert variant="default">
                          <Info className="h-4 w-4" />
                          <AlertDescription className="flex items-center justify-between gap-2">
                            <span className="text-sm">
                              {existingDatasets.find(d => d.id === currentDatasetId)?.is_template 
                                ? 'Template dataset - export from database to download' 
                                : 'No file uploaded yet. Select a CSV file to upload.'}
                            </span>
                            {existingDatasets.find(d => d.id === currentDatasetId)?.is_template && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportAndDownload(type)}
                                className="flex-shrink-0"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Export
                              </Button>
                            )}
                          </AlertDescription>
                        </Alert>
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
                          </p>
                        )}
                        {file && existingFilenames[type] && (
                          <Alert variant="default" className="py-2">
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              This will replace the existing file
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      {/* CSV Preview */}
                      {csvPreviews[type] && (
                        <div className="space-y-2">
                          {csvPreviews[type]?.isValid ? (
                            <Alert className="border-green-600/20 bg-green-600/5">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <AlertDescription>
                                <p className="text-sm font-medium mb-2">Valid CSV Format ✓</p>
                                <div className="text-xs">
                                  <p className="mb-1">Headers: {csvPreviews[type]?.headers.join(', ')}</p>
                                  {csvPreviews[type]?.rows && csvPreviews[type]!.rows.length > 0 && (
                                    <div className="mt-2 border rounded-md overflow-hidden">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            {csvPreviews[type]?.headers.map((header, idx) => (
                                              <TableHead key={idx} className="text-xs py-1 px-2 h-auto">
                                                {header}
                                              </TableHead>
                                            ))}
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {csvPreviews[type]?.rows.slice(0, 3).map((row, rowIdx) => (
                                            <TableRow key={rowIdx}>
                                              {row.map((cell, cellIdx) => (
                                                <TableCell key={cellIdx} className="text-xs py-1 px-2 h-auto">
                                                  {cell.length > 20 ? cell.substring(0, 20) + '...' : cell}
                                                </TableCell>
                                              ))}
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                      <p className="text-xs text-muted-foreground p-2 bg-muted/50">
                                        Showing first {Math.min(3, csvPreviews[type]?.rows.length || 0)} rows
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                <p className="text-sm font-medium mb-1">Invalid CSV Format</p>
                                <p className="text-xs">{csvPreviews[type]?.error}</p>
                                {csvPreviews[type]?.headers && csvPreviews[type]!.headers.length > 0 && (
                                  <p className="text-xs mt-2">
                                    Found headers: {csvPreviews[type]?.headers.join(', ')}
                                  </p>
                                )}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}

                      <Button
                        onClick={() => handleUploadAndProcess(type)}
                        disabled={!file || !csvPreviews[type]?.isValid || status === 'uploading' || status === 'processing' || status === 'complete'}
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
