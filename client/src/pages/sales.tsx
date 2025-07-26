import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { PurchaseWithRelations } from "@shared/schema";

export default function Sales() {
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

  const { data: purchases = [], isLoading: purchasesLoading } = useQuery({
    queryKey: ["/api/purchases"],
    retry: false,
    enabled: isAuthenticated,
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

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const totalRevenue = purchases.reduce((sum: number, purchase: PurchaseWithRelations) => {
    return sum + parseFloat(purchase.totalPrice);
  }, 0);

  const totalQuantitySold = purchases.reduce((sum: number, purchase: PurchaseWithRelations) => {
    return sum + purchase.quantity;
  }, 0);

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-0">
        <Header 
          title="Sales & Purchases"
          subtitle="Track sold items and purchase history."
        />
        
        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Sales</p>
                    <p className="text-3xl font-bold text-gray-900">{purchases.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-shopping-cart text-primary text-xl"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Items Sold</p>
                    <p className="text-3xl font-bold text-gray-900">{totalQuantitySold}</p>
                  </div>
                  <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-boxes text-success text-xl"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">€{totalRevenue.toFixed(2)}</p>
                  </div>
                  <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-euro-sign text-warning text-xl"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Purchase History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-history text-gray-600"></i>
                <span>Purchase History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {purchasesLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 animate-pulse">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : purchases.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-shopping-cart text-4xl text-gray-400 mb-4"></i>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No purchases yet</h3>
                  <p className="text-gray-600">Purchase transactions will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {purchases.map((purchase: PurchaseWithRelations) => (
                    <div key={purchase.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{purchase.item.name}</h4>
                          <p className="text-sm text-gray-600">
                            Purchased by: {purchase.user.name || purchase.user.email}
                          </p>
                          <div className="text-sm text-gray-500 mt-1">
                            <span>Quantity: {purchase.quantity}</span>
                            <span className="ml-4">Unit Price: €{parseFloat(purchase.pricePerUnit).toFixed(2)}</span>
                            <span className="ml-4">
                              Date: {format(new Date(purchase.purchasedAt!), 'PPp')}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="bg-green-100 text-green-800 mb-2">
                            Sold
                          </Badge>
                          <p className="text-lg font-semibold text-gray-900">
                            €{parseFloat(purchase.totalPrice).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
