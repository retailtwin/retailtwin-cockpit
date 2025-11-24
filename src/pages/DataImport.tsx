import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileText, AlertCircle, CheckCircle, Info, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  status: string;
  created_at: string;
  last_updated: string;
  locations_filename: string | null;
  products_filename: string | null;
  sales_filename: string | null;
  inventory_filename: string | null;
  total_locations: number | null;
  total_products: number | null;
  total_sales_records: number | null;
  total_inventory_records: number | null;
}

export default function DataImport() {
  const { toast } = useToast();
  
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<Record<ImportType, File | null>>({
    locations: null,
    products: null,
    sales: null,
    inventory: null,
  });

  const [batchUploading, setBatchUploading] = useState(false);

  const [uploadProgress, setUploadProgress] = useState<Record<ImportType, 'pending' | 'uploading' | 'processing' | 'complete' | 'error'>>({
    locations: 'pending',
    products: 'pending',
    sales: 'pending',
    inventory: 'pending',
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

  useEffect(() => {
    ensureUserHasDataset();
  }, []);

  const ensureUserHasDataset = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has a dataset
      let { data: datasets, error } = await supabase
        .from('datasets')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      if (error) throw error;

      if (!datasets || datasets.length === 0) {
        // Auto-create the user's single dataset
        const { data: newDataset, error: createError } = await supabase
          .from('datasets')
          .insert({
            dataset_name: 'Dataset',
            dataset_slug: 'dataset',
            user_id: user.id,
            status: 'pending',
          })
          .select()
          .single();

        if (createError) throw createError;
        datasets = [newDataset];
      }

      const userDataset = datasets[0];
      setDataset(userDataset);
      setDatasetId(userDataset.id);
      updateExistingFilenames(userDataset);
    } catch (error: any) {
      console.error('Error ensuring dataset:', error);
      toast({
        title: "Error",
        description: "Failed to load dataset",
        variant: "destructive",
      });
    }
  };

  const updateExistingFilenames = (dataset: Dataset) => {
    setExistingFilenames({
      locations: dataset.locations_filename,
      products: dataset.products_filename,
      sales: dataset.sales_filename,
      inventory: dataset.inventory_filename,
    });
  };

  const getExpectedHeaders = (type: ImportType): string[] => {
    switch (type) {
      case 'locations':
        return ['store_code', 'name'];
      case 'products':
        return ['product_code', 'name'];
      case 'sales':
        return ['day', 'store', 'product', 'units'];
      case 'inventory':
        return ['day', 'store', 'product'];
      default:
        return [];
    }
  };

  const validateCSVHeaders = (headers: string[], expectedHeaders: string[]): boolean => {
    const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
    const normalizedExpected = expectedHeaders.map(h => h.toLowerCase());
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

        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        const rows = lines.slice(1, 4).map(line => {
          return line.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''));
        });

        const expectedHeaders = getExpectedHeaders(type);
        const isValid = validateCSVHeaders(headers, expectedHeaders);
        
        let error: string | undefined;
        if (!isValid) {
          error = `Missing required columns: ${expectedHeaders.join(', ')}`;
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

  const pollDatasetUntilComplete = async (datasetId: string) => {
    const pollIntervalMs = 5000;
    const maxAttempts = 60;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { data, error } = await supabase
        .from("datasets")
        .select("status, error_message")
        .eq("id", datasetId)
        .single();

      if (error) {
        console.error("Error polling dataset status:", error);
      } else if (data) {
        if (data.status === "active") {
          toast({
            title: "Processing complete",
            description: "All files processed successfully.",
          });
          await ensureUserHasDataset();
          return;
        }

        if (data.status === "error") {
          toast({
            title: "Processing failed",
            description: data.error_message || "There was an error processing the files.",
            variant: "destructive",
          });
          return;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    toast({
      title: "Processing is taking longer than expected",
      description: "The files are still being processed. Please check back later.",
    });
  };

  const handleBatchUploadAndProcess = async () => {
    const allFiles = Object.values(selectedFiles).every(f => f !== null);
    if (!allFiles) {
      toast({
        title: "Missing files",
        description: "Please select all 4 files before processing",
        variant: "destructive",
      });
      return;
    }

    if (!datasetId) {
      toast({
        title: "No dataset available",
        description: "Please refresh the page and try again",
        variant: "destructive",
      });
      return;
    }

    setBatchUploading(true);
    const fileTypes: ImportType[] = ['locations', 'products', 'sales', 'inventory'];
    
    try {
      // Step 1: Upload all files to storage
      const uploadedPaths: Record<ImportType, string> = {} as any;
      
      for (const fileType of fileTypes) {
        const file = selectedFiles[fileType];
        if (!file) continue;

        setUploadProgress(prev => ({ ...prev, [fileType]: 'uploading' }));
        
        const fileName = `${fileType}_${Date.now()}.csv`;
        const filePath = `${datasetId}/${fileType}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('dataset-files')
          .upload(filePath, file, {
            upsert: true
          });

        if (uploadError) throw new Error(`Failed to upload ${fileType}: ${uploadError.message}`);
        
        uploadedPaths[fileType] = filePath;
        toast({ description: `${fileType} uploaded` });
      }

      // Step 2: Update dataset record with all file paths
      const { error: updateError } = await supabase
        .from('datasets')
        .update({
          locations_filename: uploadedPaths.locations,
          products_filename: uploadedPaths.products,
          sales_filename: uploadedPaths.sales,
          inventory_filename: uploadedPaths.inventory,
          status: 'processing',
          last_updated: new Date().toISOString(),
        })
        .eq('id', datasetId);

      if (updateError) throw updateError;

      // Step 3: Trigger processing for each file type
      for (const fileType of fileTypes) {
        setUploadProgress(prev => ({ ...prev, [fileType]: 'processing' }));
        
        const { error: functionError } = await supabase.functions.invoke(
          'process-dataset-upload',
          {
            body: {
              datasetId: datasetId,
              fileType: fileType,
            },
          }
        );

        if (functionError) {
          console.error(`Processing error for ${fileType}:`, functionError);
          setUploadProgress(prev => ({ ...prev, [fileType]: 'error' }));
          toast({
            description: `${fileType} processing failed`,
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Processing started",
        description: "All files uploaded and processing started",
      });

      // Step 4: Poll for completion
      await pollDatasetUntilComplete(datasetId);
      
      // Refresh dataset info
      await ensureUserHasDataset();
      
      // Mark all as complete
      setUploadProgress({
        locations: 'complete',
        products: 'complete',
        sales: 'complete',
        inventory: 'complete',
      });

    } catch (error: any) {
      console.error("Batch upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBatchUploading(false);
    }
  };

  const downloadFile = async (filePath: string, type: ImportType) => {
    try {
      const { data, error } = await supabase.storage
        .from('dataset-files')
        .download(filePath);

      if (error) throw error;

      const filename = filePath.split('/').pop() || `${type}.csv`;
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
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: error.message,
      });
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Data Import</h1>
          <p className="text-muted-foreground">Upload and manage your data files</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInstructions(!showInstructions)}
        >
          <Info className="mr-2 h-4 w-4" />
          {showInstructions ? 'Hide' : 'Show'} Instructions
        </Button>
      </div>

      <Collapsible open={showInstructions} onOpenChange={setShowInstructions}>
        <CollapsibleContent>
          <Card>
            <CardHeader>
              <CardTitle>Data Import Instructions</CardTitle>
              <CardDescription>Follow these guidelines for successful data import</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">General Guidelines</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>All CSV files must include the header row</li>
                  <li>Date format must be YYYY-MM-DD</li>
                  <li>Use commas as separators</li>
                  <li>Ensure no empty rows or extra whitespace</li>
                </ul>
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">File Types</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Locations:</strong> Store master data
                  </div>
                  <div>
                    <strong>Products:</strong> Product master data
                  </div>
                  <div>
                    <strong>Sales:</strong> Daily sales transactions
                  </div>
                  <div>
                    <strong>Inventory:</strong> Inventory snapshots
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <div className="space-y-8">
        {/* Dataset Information */}
        <Card>
          <CardHeader>
            <CardTitle>Dataset Information</CardTitle>
            <CardDescription>
              Your active dataset for all data imports
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dataset ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium capitalize">{dataset.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Records:</span>
                  <span className="font-medium">
                    {(dataset.total_locations || 0) + 
                     (dataset.total_products || 0) + 
                     (dataset.total_sales_records || 0) + 
                     (dataset.total_inventory_records || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="font-medium">
                    {dataset.last_updated 
                      ? format(new Date(dataset.last_updated), 'MMM d, yyyy') 
                      : 'Never'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading dataset...</p>
            )}
          </CardContent>
        </Card>

        {/* File Selection Section */}
        <Card>
          <CardHeader>
            <CardTitle>Select Files to Upload</CardTitle>
            <CardDescription>
              Select all 4 required CSV files, then process them together. This will replace all existing data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(['locations', 'products', 'sales', 'inventory'] as ImportType[]).map(
              (fileType) => (
                <div key={fileType} className="space-y-2">
                  <div className="flex items-center gap-2">
                    {selectedFiles[fileType] ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="font-medium capitalize">{fileType}</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileSelect(fileType, e.target.files?.[0] || null)}
                      className="flex-1"
                      disabled={batchUploading}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadTemplate(fileType)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Template
                    </Button>
                  </div>

                  {selectedFiles[fileType] && (
                    <p className="text-sm text-muted-foreground">
                      ✓ {selectedFiles[fileType]!.name} ready to upload
                    </p>
                  )}

                  {/* CSV Preview */}
                  {csvPreviews[fileType] && (
                    <div className="border rounded-md p-4">
                      <h4 className="text-sm font-medium mb-2">Preview</h4>
                      {!csvPreviews[fileType]?.isValid && (
                        <Alert variant="destructive" className="mb-2">
                          <AlertTitle>Invalid CSV Format</AlertTitle>
                          <AlertDescription>
                            {csvPreviews[fileType]?.error}
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="overflow-auto max-h-64">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              {csvPreviews[fileType]!.headers.map((header, i) => (
                                <th key={i} className="text-left p-2 font-medium">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {csvPreviews[fileType]!.rows.slice(0, 3).map((row, i) => (
                              <tr key={i} className="border-b">
                                {row.map((cell, j) => (
                                  <td key={j} className="p-2">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            {/* Batch Upload Button */}
            <div className="pt-4">
              <Button
                onClick={handleBatchUploadAndProcess}
                disabled={!Object.values(selectedFiles).every(f => f !== null) || batchUploading}
                className="w-full"
                size="lg"
              >
                {batchUploading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing All Files...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    Upload & Process All Data
                  </>
                )}
              </Button>
            </div>

            {/* Data Replacement Warning */}
            {Object.values(selectedFiles).some(f => f !== null) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Data Replacement Warning</AlertTitle>
                <AlertDescription>
                  Processing will completely replace all existing data in your dataset with the new files.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Processing Progress */}
        {batchUploading && (
          <Card>
            <CardHeader>
              <CardTitle>Processing Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(['locations', 'products', 'sales', 'inventory'] as ImportType[]).map(
                  (fileType) => (
                    <div key={fileType} className="flex items-center gap-3">
                      {uploadProgress[fileType] === 'pending' && (
                        <div className="h-4 w-4 rounded-full border-2 border-muted" />
                      )}
                      {uploadProgress[fileType] === 'uploading' && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      )}
                      {uploadProgress[fileType] === 'processing' && (
                        <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                      )}
                      {uploadProgress[fileType] === 'complete' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {uploadProgress[fileType] === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="capitalize font-medium">{fileType}</span>
                      <span className="text-sm text-muted-foreground">
                        {uploadProgress[fileType] === 'pending' && 'Waiting...'}
                        {uploadProgress[fileType] === 'uploading' && 'Uploading...'}
                        {uploadProgress[fileType] === 'processing' && 'Processing...'}
                        {uploadProgress[fileType] === 'complete' && 'Complete'}
                        {uploadProgress[fileType] === 'error' && 'Failed'}
                      </span>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}