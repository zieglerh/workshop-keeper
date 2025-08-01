import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatsWidget from "@/components/stats/stats-widget";
import ItemCard from "@/components/inventory/item-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, ShoppingBag, LogOut, Package, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import AddItemModal from "@/components/inventory/add-item-modal";

import type { InventoryItemWithRelations, Category } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [showPurchasableOnly, setShowPurchasableOnly] = useState(false);

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/logout');
      
      toast({
        title: "Successfully signed out",
        description: "Goodbye!",
      });
      
      // Reload page to trigger auth state update
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

  const { data: inventory = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ["/api/inventory"],
    retry: false,
    enabled: isAuthenticated,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    retry: false,
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const filteredInventory = (inventory as InventoryItemWithRelations[]).filter((item: InventoryItemWithRelations) => {
    if (selectedCategory !== "all" && item.categoryId !== selectedCategory) return false;
    if (showAvailableOnly && !item.isAvailable) return false;
    if (showPurchasableOnly && !item.isPurchasable) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back! Here's your workshop overview.</p>
            </div>
            <div className="flex items-center space-x-4">
              {user?.role === 'admin' && (
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Item
                </Button>
              )}
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
        </div>
        
        <div className="p-6">
          <StatsWidget />
          
          {/* Filters Bar */}
          <div className="bg-surface rounded-xl shadow-material p-6 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-0">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {(categories as Category[]).map((category: Category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant={showAvailableOnly ? "default" : "secondary"}
                  onClick={() => setShowAvailableOnly(!showAvailableOnly)}
                  className="flex items-center space-x-2"
                >
                  <Filter className="h-4 w-4" />
                  <span>Available</span>
                </Button>
                <Button
                  variant={showPurchasableOnly ? "default" : "secondary"}
                  onClick={() => setShowPurchasableOnly(!showPurchasableOnly)}
                  className="flex items-center space-x-2"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>Purchasable</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Inventory Grid */}
          {inventoryLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-surface rounded-xl shadow-material p-4 animate-pulse">
                  <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mb-4 mx-auto" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
              <p className="text-gray-600">
                {selectedCategory !== "all" || showAvailableOnly || showPurchasableOnly
                  ? "Try adjusting your filters to see more items."
                  : user?.role === 'admin'
                  ? "Start by adding your first inventory item."
                  : "No inventory items available."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredInventory.map((item: InventoryItemWithRelations) => (
                <ItemCard key={item.id} item={item} userRole={user?.role} />
              ))}
            </div>
          )}
        </div>
      </main>

      {showAddModal && (
        <AddItemModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          categories={categories as Category[]}
        />
      )}


    </div>
  );
}
