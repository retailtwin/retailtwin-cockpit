import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useDataset } from "@/contexts/DatasetContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database as DatabaseIcon, Check, Trash2, Edit2, Calendar, MapPin, Package, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Dataset = Database['public']['Tables']['datasets']['Row'];

const DatasetManagement = () => {
  const { datasets, activeDataset, setActiveDataset, refreshDatasets } = useDataset();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleDelete = async () => {
    if (!selectedDataset || selectedDataset.is_template) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('datasets')
        .delete()
        .eq('id', selectedDataset.id);

      if (error) throw error;

      toast({
        title: "Dataset deleted",
        description: `${selectedDataset.dataset_name} has been removed.`,
      });

      await refreshDatasets();
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error deleting dataset",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedDataset) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('datasets')
        .update({
          dataset_name: editName,
          description: editDescription,
        })
        .eq('id', selectedDataset.id);

      if (error) throw error;

      toast({
        title: "Dataset updated",
        description: "Changes saved successfully.",
      });

      await refreshDatasets();
      setEditDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error updating dataset",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openEditDialog = (dataset: any) => {
    setSelectedDataset(dataset);
    setEditName(dataset.dataset_name);
    setEditDescription(dataset.description || "");
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (dataset: any) => {
    setSelectedDataset(dataset);
    setDeleteDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'processing': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'failed': return 'bg-red-500/10 text-red-700 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Dataset Management</h1>
          <p className="text-muted-foreground">
            Manage your data collections and switch between different datasets
          </p>
        </div>

        <div className="grid gap-4">
          {datasets.map((dataset) => (
            <Card
              key={dataset.id}
              className={`transition-all ${
                dataset.id === activeDataset?.id
                  ? 'border-primary shadow-lg'
                  : 'hover:border-border/60'
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <DatabaseIcon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-xl">{dataset.dataset_name}</CardTitle>
                      {dataset.id === activeDataset?.id && (
                        <Badge variant="default" className="gap-1">
                          <Check className="h-3 w-3" />
                          Active
                        </Badge>
                      )}
                      {dataset.is_template && (
                        <Badge variant="outline">Template</Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className={getStatusColor(dataset.status)}
                      >
                        {dataset.status}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {dataset.description || "No description provided"}
                    </CardDescription>
                  </div>

                  <div className="flex gap-2">
                    {dataset.id !== activeDataset?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveDataset(dataset)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Set Active
                      </Button>
                    )}
                    {!dataset.is_template && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(dataset)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(dataset)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{dataset.total_locations || 0}</div>
                      <div className="text-xs text-muted-foreground">Locations</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{dataset.total_products || 0}</div>
                      <div className="text-xs text-muted-foreground">Products</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {((dataset.total_sales_records || 0) / 1000).toFixed(1)}K
                      </div>
                      <div className="text-xs text-muted-foreground">Sales Records</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {((dataset.total_inventory_records || 0) / 1000).toFixed(1)}K
                      </div>
                      <div className="text-xs text-muted-foreground">Inventory Records</div>
                    </div>
                  </div>
                </div>

                {dataset.date_range_start && dataset.date_range_end && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Data Range: {format(new Date(dataset.date_range_start), 'MMM d, yyyy')} - {format(new Date(dataset.date_range_end), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}

                {dataset.error_message && (
                  <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                    {dataset.error_message}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {datasets.length === 0 && (
            <Card className="p-12 text-center">
              <DatabaseIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No datasets found</h3>
              <p className="text-muted-foreground mb-4">
                Import data to create your first dataset
              </p>
              <Button onClick={() => window.location.href = '/import'}>
                Import Data
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dataset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{selectedDataset?.dataset_name}</strong> and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Dataset</DialogTitle>
            <DialogDescription>
              Update the name and description for this dataset
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Dataset Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter dataset name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter dataset description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSaving || !editName.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default DatasetManagement;
