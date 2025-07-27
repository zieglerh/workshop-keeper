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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Undo2, HandMetal, History, CheckCircle } from "lucide-react";
import type { BorrowingHistoryWithRelations } from "@shared/schema";

export default function Borrowing() {
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

  const { data: borrowingHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ["/api/borrowing-history"],
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

  const returnMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("POST", `/api/inventory/${itemId}/return`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/borrowing-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Item returned successfully",
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
        description: "Failed to return item",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const activeBorrowings = borrowingHistory.filter((item: BorrowingHistoryWithRelations) => !item.isReturned);
  const returnedBorrowings = borrowingHistory.filter((item: BorrowingHistoryWithRelations) => item.isReturned);

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-0">
        <Header 
          title="Borrowing Management"
          subtitle="Track borrowed items and borrowing history."
        />
        
        <div className="p-6 space-y-6">
          {/* Active Borrowings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <HandMetal className="h-5 w-5 text-warning" />
                <span>Currently Borrowed Items ({activeBorrowings.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 animate-pulse">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="h-8 bg-gray-200 rounded w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeBorrowings.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-400 mb-4 mx-auto" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All items returned</h3>
                  <p className="text-gray-600">No items are currently borrowed.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeBorrowings.map((borrowing: BorrowingHistoryWithRelations) => (
                    <div key={borrowing.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{borrowing.item.name}</h4>
                          <p className="text-sm text-gray-600">
                            Borrowed by: {borrowing.borrower.name || borrowing.borrower.email}
                          </p>
                          <p className="text-sm text-gray-500">
                            Since: {format(new Date(borrowing.borrowedAt), 'PPp')}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="bg-warning/10 text-warning">
                            Borrowed
                          </Badge>
                          {(user?.role === 'admin' || borrowing.borrowerId === user?.id) && (
                            <Button
                              size="sm"
                              onClick={() => returnMutation.mutate(borrowing.itemId)}
                              disabled={returnMutation.isPending}
                            >
                              <Undo2 className="mr-2 h-4 w-4" />
                              Return
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Borrowing History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="h-5 w-5 text-gray-600" />
                <span>Borrowing History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {returnedBorrowings.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-clock text-4xl text-gray-400 mb-4"></i>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No borrowing history</h3>
                  <p className="text-gray-600">Completed borrowings will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {returnedBorrowings.slice(0, 10).map((borrowing: BorrowingHistoryWithRelations) => (
                    <div key={borrowing.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{borrowing.item.name}</h4>
                          <p className="text-sm text-gray-600">
                            Borrowed by: {borrowing.borrower.name || borrowing.borrower.email}
                          </p>
                          <div className="text-sm text-gray-500">
                            <span>Borrowed: {format(new Date(borrowing.borrowedAt), 'PPp')}</span>
                            {borrowing.returnedAt && (
                              <span className="ml-4">
                                Returned: {format(new Date(borrowing.returnedAt), 'PPp')}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Returned
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {returnedBorrowings.length > 10 && (
                    <p className="text-center text-gray-500 text-sm">
                      Showing 10 most recent returned items
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
