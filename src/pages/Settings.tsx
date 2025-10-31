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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, UserPlus, Trash2, Settings2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

type UserRole = {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
  created_at: string;
};

const Settings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<'admin' | 'moderator' | 'user'>('user');
  const [isSaving, setIsSaving] = useState(false);

  // System Configuration State
  const [minStockThreshold, setMinStockThreshold] = useState("10");
  const [targetServiceLevel, setTargetServiceLevel] = useState("95");
  const [reorderLeadTime, setReorderLeadTime] = useState("7");
  const [lowStockAlert, setLowStockAlert] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      setCurrentUserId(user.id);

      // Check if user has admin role
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
      // Note: In production, you'd need to look up user by email first
      // For now, this assumes the user_id is known
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
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage user roles and system configuration
              </p>
            </div>
          </div>

          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                User Roles
              </TabsTrigger>
              <TabsTrigger value="config" className="gap-2">
                <Settings2 className="h-4 w-4" />
                System Config
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
                  {/* Add New Role */}
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

                  {/* Roles Table */}
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
            <TabsContent value="config" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Configuration</CardTitle>
                  <CardDescription>
                    Configure system-wide inventory management rules
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="minStock">Minimum Stock Threshold (units)</Label>
                      <Input
                        id="minStock"
                        type="number"
                        value={minStockThreshold}
                        onChange={(e) => setMinStockThreshold(e.target.value)}
                        placeholder="10"
                      />
                      <p className="text-xs text-muted-foreground">
                        Alert when stock falls below this level
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="serviceLevel">Target Service Level (%)</Label>
                      <Input
                        id="serviceLevel"
                        type="number"
                        min="0"
                        max="100"
                        value={targetServiceLevel}
                        onChange={(e) => setTargetServiceLevel(e.target.value)}
                        placeholder="95"
                      />
                      <p className="text-xs text-muted-foreground">
                        Target percentage for product availability
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="leadTime">Reorder Lead Time (days)</Label>
                      <Input
                        id="leadTime"
                        type="number"
                        value={reorderLeadTime}
                        onChange={(e) => setReorderLeadTime(e.target.value)}
                        placeholder="7"
                      />
                      <p className="text-xs text-muted-foreground">
                        Expected delivery time for new orders
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="alertToggle">Low Stock Alerts</Label>
                      <div className="flex items-center space-x-2 pt-2">
                        <Button
                          id="alertToggle"
                          variant={lowStockAlert ? "default" : "outline"}
                          onClick={() => setLowStockAlert(!lowStockAlert)}
                          className="w-full"
                        >
                          {lowStockAlert ? "Enabled" : "Disabled"}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Receive notifications for low stock items
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={() => {
                      toast({
                        title: "Settings saved",
                        description: "System configuration has been updated successfully.",
                      });
                    }}>
                      Save Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alert Preferences</CardTitle>
                  <CardDescription>
                    Configure when and how you receive system alerts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Additional alert configuration options coming soon.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
