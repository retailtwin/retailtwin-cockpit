import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, UserPlus, Trash2, Settings2, Users, Calculator, CalendarIcon, Clock, Zap, Sliders, Bell, ChevronDown, AlertTriangle, ArrowLeft, BookOpen, RefreshCw, FileText } from "lucide-react";
import { LandingContentManager } from "@/components/LandingContentManager";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getDataDateRange } from "@/lib/supabase-helpers";

type UserRole = {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
  created_at: string;
};

const Settings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const defaultTab = (location.state as any)?.defaultTab || 'users';
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<'admin' | 'moderator' | 'user'>('user');
  const [isSaving, setIsSaving] = useState(false);

  // Lead Time Configuration
  const [productionLeadTime, setProductionLeadTime] = useState("");
  const [shippingLeadTime, setShippingLeadTime] = useState("");
  const [shippingDays, setShippingDays] = useState<string[]>(["mon", "tue", "wed", "thu", "fri"]);
  
  // Other Settings visibility
  const [showOtherSettings, setShowOtherSettings] = useState(false);
  
  // Responsiveness Thresholds
  const [acceleratorUpPercentage, setAcceleratorUpPercentage] = useState("");
  const [acceleratorDownPercentage, setAcceleratorDownPercentage] = useState("");
  const [idleDays, setIdleDays] = useState("");
  
  // Behavior Properties
  const [dynamicPeriod, setDynamicPeriod] = useState(true);
  const [startOfDayStock, setStartOfDayStock] = useState(true);
  const [dynamicInitialTarget, setDynamicInitialTarget] = useState(true);
  const [unhideFeatures, setUnhideFeatures] = useState(false);
  const [showSkuLocdateData, setShowSkuLocdateData] = useState(false);
  
  // Alerts
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [minimumStockThreshold, setMinimumStockThreshold] = useState("");
  
  // Calculation
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isCalculating, setIsCalculating] = useState(false);
  const [dataMinDate, setDataMinDate] = useState<Date | undefined>();
  const [dataMaxDate, setDataMaxDate] = useState<Date | undefined>();

  // Knowledge Base Sync
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState<{
    lastSync: string | null;
    totalArticles: number;
    articlesByCategory: Record<string, number>;
  }>({
    lastSync: null,
    totalArticles: 0,
    articlesByCategory: {},
  });

  useEffect(() => {
    checkAdminAccess();
    loadSettings();
    loadDataDateRange();
    loadKnowledgeStats();
  }, []);

  const loadDataDateRange = async () => {
    try {
      const dateRange = await getDataDateRange();
      if (dateRange) {
        const minDate = new Date(dateRange.min_date);
        const maxDate = new Date(dateRange.max_date);
        setDataMinDate(minDate);
        setDataMaxDate(maxDate);
        // Initialize with data range if no dates selected
        if (!startDate) setStartDate(minDate);
        if (!endDate) setEndDate(maxDate);
      }
    } catch (error) {
      console.error("Error loading data date range:", error);
    }
  };

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      setCurrentUserId(user.id);

      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (error || !roles) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
      await loadUserRoles();
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserRoles(data || []);
    } catch (error) {
      console.error('Error loading user roles:', error);
      toast({
        title: "Error loading roles",
        description: "Could not load user roles.",
        variant: "destructive",
      });
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("scope", "global");

      if (error) throw error;

      // Map settings to state
      data?.forEach((setting) => {
        const value = String(setting.setting_value);
        switch (setting.setting_key) {
          case "production_lead_time_global":
            setProductionLeadTime(value);
            break;
          case "shipping_lead_time":
            setShippingLeadTime(value);
            break;
          case "order_days":
            try {
              const days = value.split(',').map(d => d.trim());
              if (days.length > 0) {
                setShippingDays(days);
              }
            } catch {
              setShippingDays(["mon", "tue", "wed", "thu", "fri"]);
            }
            break;
          case "accelerator_up_percentage":
            setAcceleratorUpPercentage((parseFloat(value) * 100).toString());
            break;
          case "accelerator_down_percentage":
            setAcceleratorDownPercentage((parseFloat(value) * 100).toString());
            break;
          case "acceleration_idle_days":
            setIdleDays(value);
            break;
          case "dynamic_period":
            setDynamicPeriod(value === "true");
            break;
          case "start_of_day_stock":
            setStartOfDayStock(value === "true");
            break;
          case "dynamic_initial_target":
            setDynamicInitialTarget(value === "true");
            break;
          case "unhide_features":
            setUnhideFeatures(value === "true");
            break;
          case "show_skulocdate_data":
            setShowSkuLocdateData(value === "true");
            break;
          case "minimum_stock_threshold":
            setMinimumStockThreshold(value);
            setAlertsEnabled(parseInt(value) > 0);
            break;
        }
      });
    } catch (error: any) {
      console.error("Error loading settings:", error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    }
  };

  const handleAddRole = async () => {
    if (!newUserEmail) {
      toast({
        title: "Email required",
        description: "Please enter a user email.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      toast({
        title: "Feature Note",
        description: "User lookup by email requires additional setup. Please use user_id directly for now.",
      });
    } catch (error) {
      console.error('Error adding role:', error);
      toast({
        title: "Error adding role",
        description: "Could not add user role.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: "Role removed",
        description: "User role has been removed successfully.",
      });

      await loadUserRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({
        title: "Error removing role",
        description: "Could not remove user role.",
        variant: "destructive",
      });
    }
  };

  const handleSaveSettings = async () => {
    try {
      const updates = [
        { key: "production_lead_time_global", value: productionLeadTime },
        { key: "shipping_lead_time", value: shippingLeadTime },
        { key: "order_days", value: shippingDays.join(',') },
        { key: "accelerator_up_percentage", value: (parseFloat(acceleratorUpPercentage || "0") / 100).toString() },
        { key: "accelerator_down_percentage", value: (parseFloat(acceleratorDownPercentage || "0") / 100).toString() },
        { key: "acceleration_idle_days", value: idleDays },
        { key: "dynamic_period", value: dynamicPeriod.toString() },
        { key: "start_of_day_stock", value: startOfDayStock.toString() },
        { key: "dynamic_initial_target", value: dynamicInitialTarget.toString() },
        { key: "unhide_features", value: unhideFeatures.toString() },
        { key: "show_skulocdate_data", value: showSkuLocdateData.toString() },
        { key: "minimum_stock_threshold", value: minimumStockThreshold },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("system_settings")
          .update({ setting_value: update.value })
          .eq("setting_key", update.key)
          .eq("scope", "global");

        if (error) throw error;
      }

      toast({
        title: "Settings Saved",
        description: "System configuration has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  const handleRunCalculation = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Date range required",
        description: "Please select both start and end dates.",
        variant: "destructive",
      });
      return;
    }

    if (startDate > endDate) {
      toast({
        title: "Invalid date range",
        description: "Start date must be before end date.",
        variant: "destructive",
      });
      return;
    }

    setIsCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('dbm-calculator', {
        body: {
          location_code: 'ALL',
          sku: 'ALL',
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
        },
      });

      if (error) throw error;

      toast({
        title: "Simulation complete",
        description: `Processed ${data.summary.processed} records. ${data.summary.increases} increases, ${data.summary.decreases} decreases.`,
      });
    } catch (error: any) {
      console.error('Simulation error:', error);
      toast({
        title: "Simulation failed",
        description: error.message || "Could not run inventory simulation.",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const loadKnowledgeStats = async () => {
    try {
      const { data: articles, error } = await supabase
        .from('archie_knowledge')
        .select('category, last_synced, source_type')
        .eq('is_active', true)
        .eq('source_type', 'notion');

      if (error) throw error;

      const categoryBreakdown: Record<string, number> = {};
      let mostRecentSync: string | null = null;

      articles?.forEach((article) => {
        categoryBreakdown[article.category] = (categoryBreakdown[article.category] || 0) + 1;
        if (article.last_synced && (!mostRecentSync || article.last_synced > mostRecentSync)) {
          mostRecentSync = article.last_synced;
        }
      });

      setSyncStats({
        lastSync: mostRecentSync,
        totalArticles: articles?.length || 0,
        articlesByCategory: categoryBreakdown,
      });
    } catch (error) {
      console.error('Error loading knowledge stats:', error);
    }
  };

  const handleSyncKnowledge = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('notion-sync-knowledge');

      if (error) throw error;

      toast({
        title: "Sync complete",
        description: `Synced ${data.synced} articles${data.skipped > 0 ? `, skipped ${data.skipped}` : ''}`,
      });

      await loadKnowledgeStats();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync failed",
        description: error.message || "Could not sync knowledge base.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8 flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-lg">Loading settings...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8 pb-16">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage user roles and system configuration
              </p>
            </div>
          </div>

          <Tabs defaultValue={defaultTab} className="space-y-6">
            <TabsList className="grid w-full max-w-4xl grid-cols-5">
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                User Roles
              </TabsTrigger>
              <TabsTrigger value="config" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Configuration
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Knowledge Base
              </TabsTrigger>
              <TabsTrigger value="calculate" className="gap-2">
                <Calculator className="h-4 w-4" />
                Run Simulation
              </TabsTrigger>
              <TabsTrigger value="landing" className="gap-2">
                <FileText className="h-4 w-4" />
                Landing Page
              </TabsTrigger>
            </TabsList>

            {/* User Roles Management Tab */}
            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>User Role Management</CardTitle>
                  <CardDescription>
                    Assign roles to users to control access to different features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Label htmlFor="userEmail">User Email</Label>
                      <Input
                        id="userEmail"
                        type="email"
                        placeholder="user@example.com"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                      />
                    </div>
                    <div className="w-40">
                      <Label htmlFor="role">Role</Label>
                      <Select value={newUserRole} onValueChange={(value: any) => setNewUserRole(value)}>
                        <SelectTrigger id="role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddRole} disabled={isSaving} className="gap-2">
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Add Role
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User ID</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userRoles.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              No user roles configured yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          userRoles.map((userRole) => (
                            <TableRow key={userRole.id}>
                              <TableCell className="font-mono text-xs">
                                {userRole.user_id === currentUserId ? (
                                  <span className="text-primary font-semibold">
                                    {userRole.user_id.substring(0, 8)}... (You)
                                  </span>
                                ) : (
                                  userRole.user_id.substring(0, 8) + '...'
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  userRole.role === 'admin' ? 'default' :
                                  userRole.role === 'moderator' ? 'secondary' :
                                  'outline'
                                }>
                                  {userRole.role}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(userRole.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteRole(userRole.id)}
                                  disabled={userRole.user_id === currentUserId}
                                  className="gap-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Remove
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Configuration Tab */}
            <TabsContent value="config" className="space-y-6">
              {/* Lead Time Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Lead Time Configuration
                  </CardTitle>
                  <CardDescription>
                    Define production, shipping, and ordering parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="production-lead-time">Production Lead Time (days)</Label>
                      <Input
                        id="production-lead-time"
                        type="number"
                        min="0"
                        value={productionLeadTime}
                        onChange={(e) => setProductionLeadTime(e.target.value)}
                        placeholder="e.g., 7"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shipping-lead-time">Shipping Lead Time (days)</Label>
                      <Input
                        id="shipping-lead-time"
                        type="number"
                        min="0"
                        value={shippingLeadTime}
                        onChange={(e) => setShippingLeadTime(e.target.value)}
                        placeholder="e.g., 3"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Shipping Days ({shippingDays.length} {shippingDays.length === 1 ? 'day' : 'days'} per week)</Label>
                    <div className="grid grid-cols-7 gap-2">
                      {[
                        { value: "mon", label: "Mon" },
                        { value: "tue", label: "Tue" },
                        { value: "wed", label: "Wed" },
                        { value: "thu", label: "Thu" },
                        { value: "fri", label: "Fri" },
                        { value: "sat", label: "Sat" },
                        { value: "sun", label: "Sun" },
                      ].map((day) => (
                        <div key={day.value} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-accent">
                          <Checkbox
                            id={`day-${day.value}`}
                            checked={shippingDays.includes(day.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setShippingDays([...shippingDays, day.value]);
                              } else {
                                setShippingDays(shippingDays.filter(d => d !== day.value));
                              }
                            }}
                          />
                          <Label htmlFor={`day-${day.value}`} className="text-xs font-medium cursor-pointer">
                            {day.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Lead Time:</span>
                      <span className="text-lg font-bold text-primary">
                        {(parseInt(productionLeadTime || "0") + parseInt(shippingLeadTime || "0"))} days
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Other Settings - Advanced Configuration */}
              <Collapsible open={showOtherSettings} onOpenChange={setShowOtherSettings}>
                <Card className="border-warning/20 bg-warning/5">
                  <CardHeader>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-warning" />
                          <CardTitle>Other Settings</CardTitle>
                        </div>
                        <ChevronDown className={cn(
                          "h-5 w-5 transition-transform",
                          showOtherSettings && "transform rotate-180"
                        )} />
                      </div>
                    </CollapsibleTrigger>
                    <CardDescription className="text-left mt-2">
                      Advanced configuration for data behavior and alerts. These settings control system-level behavior and are not typical admin controls. Modify with caution.
                    </CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-6 pt-0">
                      {/* Responsiveness Thresholds */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Zap className="h-4 w-4" />
                          <h3 className="font-semibold">Responsiveness Thresholds</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Control how quickly inventory targets adjust to demand changes
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="accelerator-up">UP Percentage (%)</Label>
                            <Input
                              id="accelerator-up"
                              type="number"
                              min="0"
                              max="100"
                              value={acceleratorUpPercentage}
                              onChange={(e) => setAcceleratorUpPercentage(e.target.value)}
                              placeholder="e.g., 40"
                            />
                            <p className="text-xs text-muted-foreground">
                              Increase target when sales reach this threshold
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="accelerator-down">DOWN Percentage (%)</Label>
                            <Input
                              id="accelerator-down"
                              type="number"
                              min="0"
                              max="100"
                              value={acceleratorDownPercentage}
                              onChange={(e) => setAcceleratorDownPercentage(e.target.value)}
                              placeholder="e.g., 20"
                            />
                            <p className="text-xs text-muted-foreground">
                              Decrease target when sales drop below this threshold
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="idle-days">Idle Days</Label>
                            <Input
                              id="idle-days"
                              type="number"
                              min="0"
                              value={idleDays}
                              onChange={(e) => setIdleDays(e.target.value)}
                              placeholder="e.g., 3"
                            />
                            <p className="text-xs text-muted-foreground">
                              Days target isn't altered after update
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Behavior Properties */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Sliders className="h-4 w-4" />
                          <h3 className="font-semibold">Behavior Properties</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Advanced calculation and display options
                        </p>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="dynamic-period">Dynamic Period</Label>
                              <p className="text-sm text-muted-foreground">
                                Auto-detect active stock period
                              </p>
                            </div>
                            <Switch
                              id="dynamic-period"
                              checked={dynamicPeriod}
                              onCheckedChange={setDynamicPeriod}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="start-of-day-stock">Start-of-Day Stock</Label>
                              <p className="text-sm text-muted-foreground">
                                Use stock values from start of day
                              </p>
                            </div>
                            <Switch
                              id="start-of-day-stock"
                              checked={startOfDayStock}
                              onCheckedChange={setStartOfDayStock}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="dynamic-initial-target">Dynamic Initial Target</Label>
                              <p className="text-sm text-muted-foreground">
                                Use calculated targets vs current on-hand
                              </p>
                            </div>
                            <Switch
                              id="dynamic-initial-target"
                              checked={dynamicInitialTarget}
                              onCheckedChange={setDynamicInitialTarget}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="unhide-features">Unhide Features</Label>
                              <p className="text-sm text-muted-foreground">
                                Show/hide advanced features
                              </p>
                            </div>
                            <Switch
                              id="unhide-features"
                              checked={unhideFeatures}
                              onCheckedChange={setUnhideFeatures}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="show-skulocdate">Show SkuLocDate Data</Label>
                              <p className="text-sm text-muted-foreground">
                                Display detailed calculation data
                              </p>
                            </div>
                            <Switch
                              id="show-skulocdate"
                              checked={showSkuLocdateData}
                              onCheckedChange={setShowSkuLocdateData}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Alerts */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Bell className="h-4 w-4" />
                          <h3 className="font-semibold">Alerts</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Configure inventory alert thresholds
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="alerts-enabled">Enable Alerts</Label>
                            <p className="text-sm text-muted-foreground">
                              Receive notifications for low stock
                            </p>
                          </div>
                          <Switch
                            id="alerts-enabled"
                            checked={alertsEnabled}
                            onCheckedChange={setAlertsEnabled}
                          />
                        </div>
                        
                        {alertsEnabled && (
                          <div className="space-y-2">
                            <Label htmlFor="minimum-stock">Minimum Stock Threshold (units)</Label>
                            <Input
                              id="minimum-stock"
                              type="number"
                              min="1"
                              value={minimumStockThreshold}
                              onChange={(e) => setMinimumStockThreshold(e.target.value)}
                              placeholder="e.g., 1"
                            />
                            <p className="text-xs text-muted-foreground">
                              Alert when inventory falls below this level
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              <Button onClick={handleSaveSettings} className="w-full" size="lg">
                Save All Settings
              </Button>
            </TabsContent>

            {/* Knowledge Base Tab */}
            <TabsContent value="knowledge" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Notion Knowledge Base Sync
                  </CardTitle>
                  <CardDescription>
                    Sync knowledge articles from your Notion database to enhance Archie's responses
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Sync Status */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-lg space-y-2">
                      <div className="text-sm text-muted-foreground">Last Sync</div>
                      <div className="text-2xl font-bold">
                        {syncStats.lastSync 
                          ? new Date(syncStats.lastSync).toLocaleDateString()
                          : 'Never'}
                      </div>
                      {syncStats.lastSync && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(syncStats.lastSync).toLocaleTimeString()}
                        </div>
                      )}
                    </div>

                    <div className="p-4 border rounded-lg space-y-2">
                      <div className="text-sm text-muted-foreground">Total Articles</div>
                      <div className="text-2xl font-bold text-primary">
                        {syncStats.totalArticles}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        From Notion
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg space-y-2">
                      <div className="text-sm text-muted-foreground">Categories</div>
                      <div className="text-2xl font-bold">
                        {Object.keys(syncStats.articlesByCategory).length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Active categories
                      </div>
                    </div>
                  </div>

                  {/* Category Breakdown */}
                  {Object.keys(syncStats.articlesByCategory).length > 0 && (
                    <div className="space-y-2">
                      <Label>Articles by Category</Label>
                      <div className="grid gap-2 md:grid-cols-2">
                        {Object.entries(syncStats.articlesByCategory).map(([category, count]) => (
                          <div key={category} className="flex items-center justify-between p-3 border rounded-md">
                            <span className="font-medium">{category}</span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sync Button */}
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <div className="flex items-start gap-3">
                        <RefreshCw className="h-5 w-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium">Sync from Notion</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Fetch all published articles from your Notion database. Only articles with Status = "Published" will be synced.
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={handleSyncKnowledge} 
                      disabled={isSyncing}
                      className="w-full gap-2"
                      size="lg"
                    >
                      {isSyncing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Syncing from Notion...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Sync Now
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Info Box */}
                  <div className="p-4 border-l-4 border-primary bg-primary/5 rounded-r-md space-y-1">
                    <div className="font-medium text-sm">How it works</div>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Articles are fetched from your configured Notion database</li>
                      <li>Only "Published" status articles are imported</li>
                      <li>Archie uses semantic search to find relevant knowledge</li>
                      <li>Full article content is fetched on-demand when used</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Run Simulation Tab */}
            <TabsContent value="calculate" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Run Simulation</CardTitle>
                  <CardDescription>
                    Execute inventory target simulations for a specific date range
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            defaultMonth={startDate || dataMinDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            defaultMonth={endDate || dataMaxDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Simulation Info:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Processes all SKUs and locations in the selected date range</li>
                      <li>Updates target inventory levels based on current settings</li>
                      <li>Calculates economic units and overstock indicators</li>
                      <li>May take several minutes for large date ranges</li>
                    </ul>
                  </div>

                  <Button 
                    onClick={handleRunCalculation} 
                    disabled={isCalculating || !startDate || !endDate}
                    className="w-full"
                    size="lg"
                  >
                    {isCalculating ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Running Simulation...
                      </>
                    ) : (
                      <>
                        <Calculator className="mr-2 h-5 w-5" />
                        Run Simulation
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Landing Page Content Tab */}
            <TabsContent value="landing">
              <LandingContentManager />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
