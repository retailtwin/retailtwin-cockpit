import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileText, AlertCircle, CheckCircle, Info, AlertTriangle, Loader2, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import * as XLSX from 'xlsx';

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
  const [isExcelUpload, setIsExcelUpload] = useState(false);

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

  const parseExcelWorkbook = async (file: File): Promise<Record<ImportType, File>> => {
    return new Promise((resolve, reject) => {
      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        reject(new Error(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum of 50MB`));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Map worksheet names to import types (case-insensitive)
          const worksheetMap: Record<string, ImportType> = {
            'stores': 'locations',
            'products': 'products',
            'inventory': 'inventory',
            'sales': 'sales'
          };
          
          const csvFiles: Partial<Record<ImportType, File>> = {};
          const missingSheets: string[] = [];
          const emptySheets: string[] = [];
          
          // Get actual sheet names (case-insensitive comparison)
          const availableSheets = workbook.SheetNames.map(name => name.toLowerCase());
          
          // Extract each worksheet and convert to CSV
          for (const [sheetName, importType] of Object.entries(worksheetMap)) {
            const actualSheetName = workbook.SheetNames.find(
              name => name.toLowerCase() === sheetName.toLowerCase()
            );
            
            if (!actualSheetName) {
              missingSheets.push(sheetName.charAt(0).toUpperCase() + sheetName.slice(1));
              continue;
            }
            
            const worksheet = workbook.Sheets[actualSheetName];
            
            // Check if worksheet is empty
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            const lines = csv.trim().split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
              emptySheets.push(actualSheetName);
              continue;
            }
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const csvFile = new File([blob], `${importType}.csv`, { type: 'text/csv' });
            csvFiles[importType] = csvFile;
          }
          
          // Provide helpful error messages
          if (missingSheets.length > 0) {
            reject(new Error(`Missing worksheet(s): ${missingSheets.join(', ')}. Found sheets: ${workbook.SheetNames.join(', ')}`));
            return;
          }
          
          if (emptySheets.length > 0) {
            reject(new Error(`Empty worksheet(s): ${emptySheets.join(', ')}. Each worksheet must have at least a header row and one data row.`));
            return;
          }
          
          // Verify all 4 worksheets were found
          const allTypesPresent = (['locations', 'products', 'sales', 'inventory'] as ImportType[])
            .every(type => csvFiles[type] !== undefined);
          
          if (!allTypesPresent) {
            reject(new Error('Excel workbook must contain all 4 worksheets: Stores, Products, Inventory, Sales'));
            return;
          }
          
          resolve(csvFiles as Record<ImportType, File>);
        } catch (error: any) {
          reject(new Error(`Failed to parse Excel file: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read Excel file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
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

  const handleExcelFileSelect = async (file: File | null) => {
    if (!file) {
      setSelectedFiles({
        locations: null,
        products: null,
        sales: null,
        inventory: null,
      });
      setCsvPreviews({
        locations: null,
        products: null,
        sales: null,
        inventory: null,
      });
      setIsExcelUpload(false);
      return;
    }
    
    setIsExcelUpload(true);
    
    try {
      const extractedFiles = await parseExcelWorkbook(file);
      
      // Set all extracted CSV files
      setSelectedFiles(extractedFiles);
      
      // Generate previews for each
      for (const type of ['locations', 'products', 'sales', 'inventory'] as ImportType[]) {
        const csvFile = extractedFiles[type];
        const preview = await parseCSVPreview(csvFile, type);
        setCsvPreviews(prev => ({ ...prev, [type]: preview }));
        
        if (!preview.isValid) {
          toast({
            variant: "destructive",
            title: `Invalid ${type} data`,
            description: preview.error || "The worksheet doesn't match the expected format",
          });
        }
      }
      
      toast({
        title: "Excel Workbook Loaded",
        description: "All 4 worksheets extracted successfully. Review the previews below.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Excel Parsing Failed",
        description: error.message || "Failed to parse Excel workbook",
      });
      setIsExcelUpload(false);
    }
  };

  const handleFileSelect = async (type: ImportType, file: File | null) => {
    setIsExcelUpload(false);
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

  const applyPreset = (preset: string) => {
    const today = new Date();
    let startDate = '';
    let endDate = format(today, 'yyyy-MM-dd');

    switch (preset) {
      case 'quick':
        startDate = format(new Date(today.getFullYear(), today.getMonth() - 1, 1), 'yyyy-MM-dd');
        break;
      case 'standard':
        startDate = format(new Date(today.getFullYear(), today.getMonth() - 3, 1), 'yyyy-MM-dd');
        break;
      case 'year':
        startDate = format(new Date(today.getFullYear(), 0, 1), 'yyyy-MM-dd');
        break;
      case 'all':
        startDate = '';
        endDate = '';
        break;
    }

    setScopeConfig({ startDate, endDate, locations: 'ALL', products: 'ALL' });
  };

  const estimateRecordCount = (): string => {
    if (!scopeConfig.startDate || !scopeConfig.endDate) {
      return "All available data";
    }
    
    const start = new Date(scopeConfig.startDate);
    const end = new Date(scopeConfig.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Rough estimate: assume 10 locations, 50 SKUs per location
    const estimated = days * 10 * 50;
    return `~${estimated.toLocaleString()} records (${days} days)`;
  };

  const handleBatchUploadAndProcess = async () => {
    // Pre-upload validation
    const allFiles = Object.values(selectedFiles).every(f => f !== null);
    if (!allFiles) {
      toast({
        title: "Missing files",
        description: "Please select all 4 files before processing",
        variant: "destructive",
      });
      return;
    }

    // Validate CSV previews
    const invalidPreviews = (Object.keys(csvPreviews) as ImportType[])
      .filter(type => csvPreviews[type] && !csvPreviews[type]!.isValid);
    
    if (invalidPreviews.length > 0) {
      toast({
        title: "Invalid file format",
        description: `Please fix errors in: ${invalidPreviews.join(', ')}`,
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
    const failedTypes: string[] = [];
    
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

        if (uploadError) {
          failedTypes.push(fileType);
          throw new Error(`Failed to upload ${fileType}: ${uploadError.message}`);
        }
        
        uploadedPaths[fileType] = filePath;
        toast({ 
          description: `${fileType.charAt(0).toUpperCase() + fileType.slice(1)} uploaded successfully` 
        });
      }

      // Step 2: Update dataset record with all file paths and scope
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
          failedTypes.push(fileType);
          toast({
            title: "Processing failed",
            description: `Failed to process ${fileType}: ${functionError.message}`,
            variant: "destructive",
          });
        }
      }

      if (failedTypes.length === 0) {
        toast({
          title: "Processing started",
          description: "All files uploaded and processing started successfully",
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
      } else {
        toast({
          title: "Partial failure",
          description: `Failed files: ${failedTypes.join(', ')}. Please retry.`,
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error("Batch upload error:", error);
      
      // Show specific error with failed worksheet if available
      const errorMessage = failedTypes.length > 0
        ? `Failed on ${failedTypes[failedTypes.length - 1]}: ${error.message}`
        : error.message;
      
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Mark failed types as error
      if (failedTypes.length > 0) {
        const newProgress = { ...uploadProgress };
        failedTypes.forEach(type => {
          newProgress[type as ImportType] = 'error';
        });
        setUploadProgress(newProgress);
      }
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
                <h3 className="font-semibold mb-2">Excel Workbook Format</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Upload a single .xlsx file with 4 worksheets</li>
                  <li>Worksheet names must be exactly: <strong>Stores</strong>, <strong>Products</strong>, <strong>Inventory</strong>, <strong>Sales</strong></li>
                  <li>Each worksheet should contain the required columns for that data type</li>
                  <li>All worksheets are extracted and validated automatically</li>
                </ul>
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">CSV Upload Alternative</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Upload 4 separate CSV files</li>
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
                    <strong>Locations (Stores):</strong> Store master data (store_code, name)
                  </div>
                  <div>
                    <strong>Products:</strong> Product master data (product_code, name)
                  </div>
                  <div>
                    <strong>Sales:</strong> Daily sales transactions (day, store, product, units)
                  </div>
                  <div>
                    <strong>Inventory:</strong> Inventory snapshots (day, store, product)
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

        {/* Data Scope Configuration */}
        <Collapsible open={showScopeConfig} onOpenChange={setShowScopeConfig}>
          <Card className="border-primary/20">
            <CardHeader>
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Configure Data Scope (Recommended)</CardTitle>
                </div>
                <Button variant="ghost" size="sm">
                  {showScopeConfig ? 'Hide' : 'Show'}
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Process Only What You Need</AlertTitle>
                  <AlertDescription>
                    Define a scope to process only relevant data. This dramatically reduces processing time and is perfect for testing. You can always expand the scope later.
                  </AlertDescription>
                </Alert>

                {/* Preset Buttons */}
                <div className="space-y-2">
                  <Label>Quick Presets</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset('quick')}
                      className="justify-start"
                    >
                      1 Month Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset('standard')}
                      className="justify-start"
                    >
                      3 Months
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset('year')}
                      className="justify-start"
                    >
                      Full Year
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset('all')}
                      className="justify-start"
                    >
                      All Data
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Date Range */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date (Optional)</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={scopeConfig.startDate}
                      onChange={(e) => setScopeConfig(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date (Optional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={scopeConfig.endDate}
                      onChange={(e) => setScopeConfig(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Scope Preview</span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Date Range: {scopeConfig.startDate && scopeConfig.endDate 
                      ? `${format(new Date(scopeConfig.startDate), 'MMM d, yyyy')} - ${format(new Date(scopeConfig.endDate), 'MMM d, yyyy')}`
                      : 'All dates'
                    }</p>
                    <p>• Locations: {scopeConfig.locations === 'ALL' ? 'All' : `${scopeConfig.locations.length} selected`}</p>
                    <p>• Products: {scopeConfig.products === 'ALL' ? 'All' : `${scopeConfig.products.length} selected`}</p>
                    <p className="font-medium text-foreground">• Estimated: {estimateRecordCount()}</p>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* File Selection Section */}
        <Card>
          <CardHeader>
            <CardTitle>Select Files to Upload</CardTitle>
            <CardDescription>
              Upload an Excel workbook with 4 worksheets (Stores, Products, Inventory, Sales) or select individual CSV files.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Excel Upload Option */}
            <div className="border-2 border-dashed rounded-lg p-6 bg-muted/50">
              <div className="flex items-center gap-3 mb-3">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="font-semibold">Upload Excel Workbook</h3>
                  <p className="text-sm text-muted-foreground">
                    One file with all 4 worksheets: Stores, Products, Inventory, Sales
                  </p>
                </div>
              </div>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleExcelFileSelect(e.target.files?.[0] || null)}
                disabled={batchUploading}
              />
              {isExcelUpload && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ Excel workbook loaded - all 4 worksheets extracted
                </p>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or upload individual CSV files
                </span>
              </div>
            </div>

            {/* Individual CSV Upload Options */}
            <div className="space-y-4">
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
                      {isExcelUpload && selectedFiles[fileType] && (
                        <Badge variant="secondary" className="text-xs">From Excel</Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={(e) => handleFileSelect(fileType, e.target.files?.[0] || null)}
                        className="flex-1"
                        disabled={batchUploading || isExcelUpload}
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
            </div>

            {/* Batch Upload Button */}
            <div className="pt-4 space-y-2">
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
              
              {/* File size info */}
              {Object.values(selectedFiles).some(f => f !== null) && (
                <p className="text-sm text-muted-foreground text-center">
                  Total size: {(Object.values(selectedFiles)
                    .filter(f => f !== null)
                    .reduce((sum, f) => sum + (f?.size || 0), 0) / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
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
              <CardDescription>
                Uploading and processing your data files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(['locations', 'products', 'sales', 'inventory'] as ImportType[]).map(
                  (fileType) => {
                    const file = selectedFiles[fileType];
                    const recordCount = file ? (
                      csvPreviews[fileType]?.rows.length ? 
                      `~${csvPreviews[fileType]!.rows.length * 100} records` : 
                      ''
                    ) : '';
                    
                    return (
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
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="capitalize font-medium">{fileType}</span>
                            {recordCount && (
                              <span className="text-xs text-muted-foreground">
                                {recordCount}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {uploadProgress[fileType] === 'pending' && 'Waiting...'}
                            {uploadProgress[fileType] === 'uploading' && 'Uploading to storage...'}
                            {uploadProgress[fileType] === 'processing' && 'Processing data...'}
                            {uploadProgress[fileType] === 'complete' && '✓ Complete'}
                            {uploadProgress[fileType] === 'error' && 'Failed - please retry'}
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
              
              {Object.values(uploadProgress).some(status => status === 'error') && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Some files failed to process</AlertTitle>
                  <AlertDescription>
                    Check the error messages above and try uploading again. Make sure your files match the template format.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}