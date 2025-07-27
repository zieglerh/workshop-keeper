import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users as UsersIcon, Shield, User, Clock, UserCheck, UserX, LogOut, Edit, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User as UserType } from "@shared/schema";
import { format } from "date-fns";

export default function Users() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [editUser, setEditUser] = useState<UserType | null>(null);
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/logout');
      
      toast({
        title: "Successfully signed out",
        description: "Goodbye!",
      });
      
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error signing out",
        description: "There was a problem signing out",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Nicht authentifiziert",
        description: "Sie sind nicht angemeldet. Weiterleitung zur Anmeldung...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    retry: false,
    enabled: isAuthenticated && user?.role === 'admin',
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Nicht autorisiert",
          description: "Sie sind nicht berechtigt, diese Seite anzuzeigen.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }
    },
  });

  const { data: pendingUsers = [], isLoading: pendingLoading } = useQuery({
    queryKey: ["/api/users/pending"],
    retry: false,
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest('PATCH', `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/pending"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error updating user role",
        variant: "destructive",
      });
    },
  });

  const activateUserMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest('PATCH', `/api/users/${userId}/activate`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/pending"] });
      toast({
        title: "User approved",
        description: "User has been successfully activated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error approving user",
        variant: "destructive",
      });
    },
  });

  const editUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: typeof editData }) => {
      await apiRequest('PATCH', `/api/users/${userId}/profile`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditUser(null);
      toast({
        title: "User updated",
        description: "User data has been successfully updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error updating user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('DELETE', `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/pending"] });
      toast({
        title: "User deleted",
        description: "User has been successfully deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error deleting user",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const handleEditUser = (userToEdit: UserType) => {
    setEditUser(userToEdit);
    setEditData({
      firstName: userToEdit.firstName || '',
      lastName: userToEdit.lastName || '',
      email: userToEdit.email || '',
    });
  };

  const handleSaveEdit = () => {
    if (editUser) {
      editUserMutation.mutate({ userId: editUser.id, data: editData });
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to view this page. Only administrators can manage users.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive"><Shield className="w-3 h-3 mr-1" />Administrator</Badge>;
      case 'user':
        return <Badge variant="secondary"><User className="w-3 h-3 mr-1" />User</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const activeUsers = users.filter((u: UserType) => u.role !== 'pending');

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center">
                <UsersIcon className="mr-3 h-8 w-8" />
                User Management
              </h1>
              <p className="text-muted-foreground">Manage user accounts and permissions</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending" className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Pending Approvals</span>
                {pendingUsers.length > 0 && (
                  <Badge variant="destructive" className="ml-2">{pendingUsers.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="active" className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4" />
                <span>Active Users</span>
                <Badge variant="secondary" className="ml-2">{activeUsers.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    Pending Registrations
                  </CardTitle>
                  <CardDescription>
                    New users waiting for admin approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : pendingUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <UserCheck className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>No pending registrations</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingUsers.map((pendingUser: UserType) => (
                        <div key={pendingUser.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                                <User className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-medium">{pendingUser.firstName && pendingUser.lastName 
                                  ? `${pendingUser.firstName} ${pendingUser.lastName}` 
                                  : pendingUser.username}</p>
                                <p className="text-sm text-muted-foreground">@{pendingUser.username}</p>
                                {pendingUser.email && (
                                  <p className="text-sm text-muted-foreground">{pendingUser.email}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Registered: {format(new Date(pendingUser.createdAt!), 'dd.MM.yyyy HH:mm')}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              onClick={() => activateUserMutation.mutate({ userId: pendingUser.id, role: 'user' })}
                              disabled={activateUserMutation.isPending}
                            >
                              <UserCheck className="w-4 h-4 mr-1" />
                              Approve as User
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => activateUserMutation.mutate({ userId: pendingUser.id, role: 'admin' })}
                              disabled={activateUserMutation.isPending}
                            >
                              <Shield className="w-4 h-4 mr-1" />
                              Approve as Admin
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="active">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserCheck className="mr-2 h-5 w-5" />
                    Active Users
                  </CardTitle>
                  <CardDescription>
                    All active user accounts with their roles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : activeUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <UsersIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>No active users</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeUsers.map((activeUser: UserType) => (
                        <div key={activeUser.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                                {activeUser.role === 'admin' ? (
                                  <Shield className="h-5 w-5 text-red-600" />
                                ) : (
                                  <User className="h-5 w-5" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <p className="font-medium">{activeUser.firstName && activeUser.lastName 
                                    ? `${activeUser.firstName} ${activeUser.lastName}` 
                                    : activeUser.username}</p>
                                  {getRoleBadge(activeUser.role!)}
                                </div>
                                <p className="text-sm text-muted-foreground">@{activeUser.username}</p>
                                {activeUser.email && (
                                  <p className="text-sm text-muted-foreground">{activeUser.email}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Created: {format(new Date(activeUser.createdAt!), 'dd.MM.yyyy HH:mm')}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditUser(activeUser)}
                                  >
                                    <Edit className="w-4 h-4 mr-1" />
                                    Edit
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Edit User</DialogTitle>
                                    <DialogDescription>
                                      Change user data for @{editUser?.username}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="editFirstName">First Name</Label>
                                        <Input
                                          id="editFirstName"
                                          value={editData.firstName}
                                          onChange={(e) => setEditData(prev => ({ ...prev, firstName: e.target.value }))}
                                          placeholder="First name"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="editLastName">Last Name</Label>
                                        <Input
                                          id="editLastName"
                                          value={editData.lastName}
                                          onChange={(e) => setEditData(prev => ({ ...prev, lastName: e.target.value }))}
                                          placeholder="Last name"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="editEmail">Email</Label>
                                      <Input
                                        id="editEmail"
                                        type="email"
                                        value={editData.email}
                                        onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="Email address"
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      onClick={handleSaveEdit}
                                      disabled={editUserMutation.isPending}
                                    >
                                      {editUserMutation.isPending ? 'Saving...' : 'Save'}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              <Select
                                defaultValue={activeUser.role!}
                                onValueChange={(role) => updateRoleMutation.mutate({ userId: activeUser.id, role })}
                                disabled={updateRoleMutation.isPending}
                              >
                                <SelectTrigger className="w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="admin">Administrator</SelectItem>
                                </SelectContent>
                              </Select>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete user "@{activeUser.username}"?
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteUserMutation.mutate(activeUser.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      disabled={deleteUserMutation.isPending}
                                    >
                                      {deleteUserMutation.isPending ? 'Deleting...' : 'Yes, delete'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}