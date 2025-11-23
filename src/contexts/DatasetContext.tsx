import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Dataset {
  id: string;
  dataset_name: string;
  dataset_slug: string;
  is_active: boolean;
  is_template: boolean;
  status: string;
  date_range_start: string | null;
  date_range_end: string | null;
}

interface DatasetContextType {
  activeDataset: Dataset | null;
  datasets: Dataset[];
  isLoading: boolean;
  setActiveDataset: (dataset: Dataset | null) => void;
  refreshDatasets: () => Promise<void>;
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export const DatasetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDataset, setActiveDatasetState] = useState<Dataset | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchDatasets = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setDatasets([]);
        setActiveDatasetState(null);
        return;
      }

      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .or(`user_id.eq.${user.id},is_template.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDatasets(data || []);

      // Auto-select active dataset or first available
      const active = data?.find(d => d.is_active) || data?.[0] || null;
      setActiveDatasetState(active);
    } catch (error: any) {
      console.error('Error fetching datasets:', error);
      toast({
        title: 'Error loading datasets',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setActiveDataset = async (dataset: Dataset | null) => {
    if (!dataset) {
      setActiveDatasetState(null);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Deactivate all user datasets
      await supabase
        .from('datasets')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Activate selected dataset
      await supabase
        .from('datasets')
        .update({ is_active: true })
        .eq('id', dataset.id);

      setActiveDatasetState(dataset);
      
      toast({
        title: 'Dataset switched',
        description: `Now using: ${dataset.dataset_name}`,
      });
    } catch (error: any) {
      console.error('Error switching dataset:', error);
      toast({
        title: 'Error switching dataset',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  return (
    <DatasetContext.Provider
      value={{
        activeDataset,
        datasets,
        isLoading,
        setActiveDataset,
        refreshDatasets: fetchDatasets,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
};

export const useDataset = () => {
  const context = useContext(DatasetContext);
  if (context === undefined) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
};
