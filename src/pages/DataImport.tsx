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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import * as XLSX from 'xlsx';
import { useNavigate } from "react-router-dom";

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
  date_range_start: string | null;
  date_range_end: string | null;
}

export default function DataImport() {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<Record<ImportType, File | null>>({
    locations: null,
    products: null,
    sales: null,
    inventory: null,
  });

  const [batchUploading, setBatchUploading] = useState(false);
  const [processingStep, setProcessingStep] = useState<'uploading' | 'validating' | 'processing' | 'complete'>('uploading');
  const [uploadedFilesSummary, setUploadedFilesSummary] = useState<{
    filesProcessed: number;
    totalSize: number;
    records: { locations: number; products: number; sales: number; inventory: number };
    warnings: string[];
  } | null>(null);

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
  const [selectedExcelFile, setSelectedExcelFile] = useState<File | null>(null);

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
      setSelectedExcelFile(null);
      return;
    }
    
    setIsExcelUpload(true);
    setSelectedExcelFile(file);
    
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
      setSelectedExcelFile(null);
    }
  };

  const handleClearExcelFile = () => {
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
    setSelectedExcelFile(null);
    
    // Reset the file input
    const fileInput = document.querySelector('input[type="file"][accept=".xlsx,.xls"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
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
    setProcessingStep('uploading');
    setUploadedFilesSummary(null);
    
    const fileTypes: ImportType[] = ['locations', 'products', 'sales', 'inventory'];
    const failedTypes: string[] = [];
    
    try {
      // Step 1: Upload all files to storage
      const uploadedPaths: Record<ImportType, string> = {} as any;
      let totalSize = 0;
      
      for (const fileType of fileTypes) {
        const file = selectedFiles[fileType];
        if (!file) continue;

        setUploadProgress(prev => ({ ...prev, [fileType]: 'uploading' }));
        totalSize += file.size;
        
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
        setUploadProgress(prev => ({ ...prev, [fileType]: 'complete' }));
      }


      // Step 2: Update dataset record with all file paths
      setProcessingStep('validating');
      
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

      // Step 3: Call ETL-Enhanced function
      setProcessingStep('processing');
      
      const formData = new FormData();
      formData.append('datasetId', datasetId);
      formData.append('locationsPath', uploadedPaths.locations);
      formData.append('productsPath', uploadedPaths.products);
      formData.append('salesPath', uploadedPaths.sales);
      formData.append('inventoryPath', uploadedPaths.inventory);

      const { data: etlResult, error: etlError } = await supabase.functions.invoke(
        'etl-enhanced',
        {
          body: formData,
        }
      );

      if (etlError) {
        throw new Error(`ETL processing failed: ${etlError.message}`);
      }

      // Set summary
      if (etlResult?.summary) {
        setUploadedFilesSummary({
          filesProcessed: 4,
          totalSize,
          records: etlResult.summary,
          warnings: etlResult.summary.warnings || []
        });
      }

      // Step 4: Run DBM simulation
      toast({
        title: "Running DBM Simulation",
        description: "Calculating optimal buffer management targets...",
      });

      const { error: dbmError } = await supabase.functions.invoke('dbm-calculator', {
        body: { datasetId }
      });

      if (dbmError) {
        console.error('DBM calculation error:', dbmError);
        toast({
          title: "Simulation Warning",
          description: "Data imported but simulation had issues. You can run it manually later.",
          variant: "default",
        });
      }

      setProcessingStep('complete');
      
      // Refresh dataset info
      await ensureUserHasDataset();
      
      // Mark all as complete
      setUploadProgress({
        locations: 'complete',
        products: 'complete',
        sales: 'complete',
        inventory: 'complete',
      });

      toast({
        title: "Import Complete!",
        description: "All data has been processed successfully.",
      });

    } catch (error: any) {
      console.error("Batch upload error:", error);
      
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      
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

  const handleClearDataset = async () => {
    if (!datasetId) return;
    
    const confirmed = window.confirm(
      "This will delete all existing data in your dataset. This action cannot be undone. Continue?"
    );
    
    if (!confirmed) return;

    try {
      toast({
        title: "Clearing dataset...",
        description: "Please wait while we remove all data",
      });

      // Clear dataset via RPC or direct deletes to aifo schema
      // Since we don't have direct access to aifo schema, we'll update the dataset record
      const { error: updateError } = await supabase
        .from('datasets')
        .update({
          status: 'pending',
          total_locations: 0,
          total_products: 0,
          total_sales_records: 0,
          total_inventory_records: 0,
          date_range_start: null,
          date_range_end: null,
          locations_filename: null,
          products_filename: null,
          sales_filename: null,
          inventory_filename: null,
          processed_at: null,
        })
        .eq('id', datasetId);

      if (updateError) throw updateError;

      // Refresh dataset info
      await ensureUserHasDataset();

      // Clear selected files
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

      toast({
        title: "Dataset cleared",
        description: "All data has been removed successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Clear failed",
        description: error.message,
      });
    }
  };

  const handleIndividualUpload = async (type: ImportType) => {
    const file = selectedFiles[type];
    if (!file || !datasetId) return;

    try {
      setUploadProgress(prev => ({ ...prev, [type]: 'uploading' }));

      // Read file content
      const reader = new FileReader();
      const csvText = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      // Call appropriate edge function
      if (type === 'products') {
        const { data, error } = await supabase.functions.invoke('import-products', {
          body: { csvText }
        });

        if (error) throw error;

        toast({
          title: "Products imported",
          description: data.message || `Successfully imported ${data.count} products`,
        });
      } else {
        // For locations, sales, inventory - use import-fact-daily
        const { data, error } = await supabase.functions.invoke('import-fact-daily', {
          body: { csvText }
        });

        if (error) throw error;

        toast({
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} imported`,
          description: data.message || 'Successfully imported records',
        });
      }

      setUploadProgress(prev => ({ ...prev, [type]: 'complete' }));
      
      // Refresh dataset info
      await ensureUserHasDataset();

    } catch (error: any) {
      console.error(`Upload error for ${type}:`, error);
      setUploadProgress(prev => ({ ...prev, [type]: 'error' }));
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
    }
  };

  const handlePrepareDataset = async () => {
    if (!datasetId) return;

    // Check if we have at least products and (sales or inventory)
    const hasProducts = dataset?.total_products && dataset.total_products > 0;
    const hasData = (dataset?.total_sales_records && dataset.total_sales_records > 0) || 
                     (dataset?.total_inventory_records && dataset.total_inventory_records > 0);

    if (!hasProducts || !hasData) {
      toast({
        variant: "destructive",
        title: "Insufficient data",
        description: "Please upload Products and at least Sales or Inventory data first",
      });
      return;
    }

    try {
      toast({
        title: "Preparing dataset...",
        description: "Calculating active window and validating data",
      });

      const { data, error } = await supabase.functions.invoke('prepare-dataset');

      if (error) throw error;

      if (data.success) {
        const { metadata } = data;
        toast({
          title: "Dataset ready!",
          description: `Active window: ${metadata.startDate} to ${metadata.endDate}`,
        });
        toast({
          title: "Dataset statistics",
          description: `${metadata.totalRecords} records across ${metadata.uniqueLocations} locations and ${metadata.uniqueSkus} SKUs`,
        });

        // Refresh dataset info
        await ensureUserHasDataset();
      }
    } catch (error: any) {
      console.error('Prepare dataset error:', error);
      toast({
        variant: "destructive",
        title: "Preparation failed",
        description: error.message,
      });
    }
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
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Dataset Information</CardTitle>
                <CardDescription>
                  Your active dataset for all data imports
                </CardDescription>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearDataset}
                disabled={!dataset || batchUploading}
              >
                Clear Dataset
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {dataset ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={dataset.status === 'active' ? 'default' : 'secondary'}>
                    {dataset.status === 'active' ? 'Ready' : 'Needs Preparation'}
                  </Badge>
                </div>
                
                {dataset.date_range_start && dataset.date_range_end && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date Range:</span>
                    <span className="font-medium">
                      {format(new Date(dataset.date_range_start), 'MMM d, yyyy')} - {format(new Date(dataset.date_range_end), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div>
                    <div className="text-xs text-muted-foreground">Locations</div>
                    <div className="text-lg font-semibold">{dataset.total_locations || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Products</div>
                    <div className="text-lg font-semibold">{dataset.total_products || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Sales Records</div>
                    <div className="text-lg font-semibold">{dataset.total_sales_records || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Inventory Records</div>
                    <div className="text-lg font-semibold">{dataset.total_inventory_records || 0}</div>
                  </div>
                </div>
                
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="font-medium">
                    {dataset.last_updated 
                      ? format(new Date(dataset.last_updated), 'MMM d, yyyy HH:mm') 
                      : 'Never'}
                  </span>
                </div>

                {dataset.status !== 'active' && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Dataset Not Ready</AlertTitle>
                    <AlertDescription>
                      Upload data files then click "Prepare Dataset" to calculate the active data window.
                    </AlertDescription>
                  </Alert>
                )}
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
              {isExcelUpload && selectedExcelFile && (
                <div className="flex items-center justify-between mt-2 p-2 bg-green-50 dark:bg-green-950 rounded">
                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    {selectedExcelFile.name}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearExcelFile}
                    disabled={batchUploading}
                    className="h-6 w-6 p-0 hover:bg-destructive/10"
                  >
                    <span className="sr-only">Clear file</span>
                    ×
                  </Button>
                </div>
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
                      {selectedFiles[fileType] && !isExcelUpload && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleIndividualUpload(fileType)}
                          disabled={batchUploading || uploadProgress[fileType] === 'uploading'}
                        >
                          {uploadProgress[fileType] === 'uploading' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : uploadProgress[fileType] === 'complete' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>

                    {selectedFiles[fileType] && (
                      <p className="text-sm text-muted-foreground">
                        {uploadProgress[fileType] === 'complete' ? '✓ Uploaded successfully' : `✓ ${selectedFiles[fileType]!.name} ready to upload`}
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
              <div className="flex gap-3">
                <Button
                  onClick={handleBatchUploadAndProcess}
                  disabled={!Object.values(selectedFiles).every(f => f !== null) || batchUploading}
                  className="flex-1"
                  size="lg"
                >
                  {batchUploading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Uploading All Files...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-5 w-5" />
                      Upload All Data
                    </>
                  )}
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handlePrepareDataset}
                  disabled={
                    batchUploading ||
                    !dataset ||
                    !(dataset.total_products && dataset.total_products > 0) ||
                    !((dataset.total_sales_records && dataset.total_sales_records > 0) || (dataset.total_inventory_records && dataset.total_inventory_records > 0))
                  }
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Prepare Dataset
                </Button>
              </div>
              
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
                  Uploading will completely replace all existing data in your dataset with the new files.
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

      {/* Progress Modal */}
      <Dialog open={batchUploading} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Processing Your Data</DialogTitle>
            <DialogDescription>
              {processingStep === 'uploading' && 'Uploading files to cloud storage...'}
              {processingStep === 'validating' && 'Validating data structure...'}
              {processingStep === 'processing' && 'Processing and importing records...'}
              {processingStep === 'complete' && 'Import complete!'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {processingStep === 'uploading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 text-success" />}
                <span className={processingStep === 'uploading' ? 'font-medium' : 'text-muted-foreground'}>Uploading files</span>
              </div>
              <div className="flex items-center gap-3">
                {processingStep === 'validating' ? <Loader2 className="h-4 w-4 animate-spin" /> : processingStep === 'uploading' ? <div className="h-4 w-4" /> : <CheckCircle className="h-4 w-4 text-success" />}
                <span className={processingStep === 'validating' ? 'font-medium' : 'text-muted-foreground'}>Validating data</span>
              </div>
              <div className="flex items-center gap-3">
                {processingStep === 'processing' ? <Loader2 className="h-4 w-4 animate-spin" /> : ['uploading', 'validating'].includes(processingStep) ? <div className="h-4 w-4" /> : <CheckCircle className="h-4 w-4 text-success" />}
                <span className={processingStep === 'processing' ? 'font-medium' : 'text-muted-foreground'}>Processing records</span>
              </div>
              <div className="flex items-center gap-3">
                {processingStep === 'complete' ? <CheckCircle className="h-4 w-4 text-success" /> : <div className="h-4 w-4" />}
                <span className={processingStep === 'complete' ? 'font-medium text-success' : 'text-muted-foreground'}>Complete!</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {(['locations', 'products', 'sales', 'inventory'] as ImportType[]).map(type => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{type}</span>
                  <Badge variant={uploadProgress[type] === 'complete' ? 'default' : uploadProgress[type] === 'error' ? 'destructive' : 'secondary'}>
                    {uploadProgress[type]}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {uploadedFilesSummary && (
        <Alert className="border-success bg-success/10">
          <CheckCircle className="h-5 w-5 text-success" />
          <AlertTitle>Import Successful!</AlertTitle>
          <AlertDescription>
            <div className="space-y-2 mt-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Files processed: {uploadedFilesSummary.filesProcessed}</div>
                <div>Total size: {(uploadedFilesSummary.totalSize / 1024 / 1024).toFixed(2)} MB</div>
              </div>
              <Separator className="my-2" />
              <div className="space-y-1 text-sm">
                <div>Locations: {uploadedFilesSummary.records.locations}</div>
                <div>Products: {uploadedFilesSummary.records.products}</div>
                <div>Sales: {uploadedFilesSummary.records.sales}</div>
                <div>Inventory: {uploadedFilesSummary.records.inventory}</div>
              </div>
              
              {uploadedFilesSummary.warnings.length > 0 && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-1">
                    <div className="font-medium text-warning">Warnings:</div>
                    {uploadedFilesSummary.warnings.map((warning, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground">• {warning}</div>
                    ))}
                  </div>
                </>
              )}
              
              <div className="pt-3">
                <Button onClick={() => navigate('/dashboard')} className="w-full">
                  View Dashboard
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}