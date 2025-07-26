import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import type { User } from "@shared/schema";

export default function Users() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
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
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });

  const { data: borrowingHistory = [] } = useQuery({
    queryKey: ["/api/borrowing-history"],
    retry: false,
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["/api/purchases"],
    retry: false,
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !isAuthenticated) {
    return null;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <main className="flex-1 lg:ml-0">
          <Header title="User Management" subtitle="Manage workshop users and permissions." />
          <div className="p-6">
            <div className="text-center py-12">
              <i className="fas fa-lock text-4xl text-gray-400 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Admin Access Required</h3>
              <p className="text-gray-600">Only administrators can manage users.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const getUserStats = (userId: string) => {
    const userBorrowings = borrowingHistory.filter((item: any) => item.borrowerId === userId);
    const activeBorrowings = userBorrowings.filter((item: any) => !item.isReturned).length;
    const totalBorrowings = userBorrowings.length;
    
    const userPurchases = purchases.filter((item: any) => item.userId === userId);
    const totalPurchases = userPurchases.length;
    const totalSpent = userPurchases.reduce((sum: number, purchase: any) => {
      return sum + parseFloat(purchase.totalPrice);
    }, 0);

    return {
      activeBorrowings,
      totalBorrowings,
      totalPurchases,
      totalSpent,
    };
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-0">
        <Header 
          title="User Management"
          subtitle="Manage workshop users and permissions."
        />
        
        <div className="p-6">
          {usersLoading ? (
            <div className="space-y-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="text-center">
                          <div className="h-8 bg-gray-200 rounded w-full mb-1"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-users text-4xl text-gray-400 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600">Users will appear here when they sign in for the first time.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {users.map((userItem: User) => {
                const stats = getUserStats(userItem.id);
                return (
                  <Card key={userItem.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-4">
                          {userItem.profileImageUrl ? (
                            <img 
                              src={userItem.profileImageUrl} 
                              alt={userItem.name || userItem.email || ''} 
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-white font-medium">
                                {(userItem.name || userItem.email || '?').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-lg">
                              {userItem.name || userItem.email}
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                              {userItem.email}
                              {userItem.phone && ` • ${userItem.phone}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              Joined {format(new Date(userItem.createdAt!), 'PP')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={userItem.role === 'admin' ? 'default' : 'secondary'}
                            className={userItem.role === 'admin' ? 'bg-primary text-white' : ''}
                          >
                            {userItem.role === 'admin' ? 'Admin' : 'User'}
                          </Badge>
                          {userItem.id !== user?.id && (
                            <Select
                              value={userItem.role}
                              onValueChange={(newRole) => 
                                updateRoleMutation.mutate({ userId: userItem.id, role: newRole })
                              }
                              disabled={updateRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-warning">{stats.activeBorrowings}</p>
                          <p className="text-sm text-gray-600">Active Borrowings</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">{stats.totalBorrowings}</p>
                          <p className="text-sm text-gray-600">Total Borrowings</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{stats.totalPurchases}</p>
                          <p className="text-sm text-gray-600">Purchases</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-success">€{stats.totalSpent.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">Total Spent</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
