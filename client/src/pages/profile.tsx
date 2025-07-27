import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { User, Lock, Trash2, Save, LogOut } from "lucide-react";

export default function Profile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
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

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      await apiRequest('PATCH', '/api/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile updated",
        description: "Your profile data has been successfully saved",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error updating profile",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      await apiRequest('POST', '/api/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      toast({
        title: "Password changed",
        description: "Your password has been successfully updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error changing password",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', '/api/profile');
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "Your account has been successfully deleted",
      });
      window.location.href = '/';
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error deleting account",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !isAuthenticated || !user) {
    return null;
  }

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "The new passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "The new password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate(passwordData);
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center">
                <User className="mr-3 h-8 w-8" />
                My Profile
              </h1>
              <p className="text-muted-foreground">Manage your account information and settings</p>
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

        <div className="p-6 space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Your first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Your last name"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your.email@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    type="text"
                    value={user.username}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    Username cannot be changed
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="mr-2 h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password for better security
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    required
                    placeholder="Your current password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    required
                    placeholder="New secure password"
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                    placeholder="Repeat new password"
                    minLength={6}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <Lock className="mr-2 h-4 w-4" />
                  {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <Trash2 className="mr-2 h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions for your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <Trash2 className="h-4 w-4" />
                <AlertDescription>
                  Deleting your account is permanent and cannot be undone.
                  All your data will be permanently deleted.
                </AlertDescription>
              </Alert>

              <Separator />

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full sm:w-auto">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Really delete account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. Your account and all
                      associated data will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteAccountMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deleteAccountMutation.isPending}
                    >
                      {deleteAccountMutation.isPending ? 'Deleting...' : 'Yes, delete account'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}