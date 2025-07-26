import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import ItemCard from "@/components/inventory/item-card";
import AddItemModal from "@/components/inventory/add-item-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InventoryItemWithRelations, Category } from "@shared/schema";

export default function Inventory() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [showPurchasableOnly, setShowPurchasableOnly] = useState(false);

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

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    retry: false,
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const filteredInventory = inventory.filter((item: InventoryItemWithRelations) => {
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    if (selectedCategory !== "all" && item.categoryId !== selectedCategory) return false;
    if (showAvailableOnly && !item.isAvailable) return false;
    if (showPurchasableOnly && !item.isPurchasable) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-0">
        <Header 
          title="Inventory Management"
          subtitle="Manage your workshop tools, machines, and equipment."
          showAddButton={user?.role === 'admin'}
          onAddClick={() => setShowAddModal(true)}
          showSearch={true}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
        />
        
        <div className="p-6">
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
                    {categories.map((category: Category) => (
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
                  <i className="fas fa-filter"></i>
                  <span>Available</span>
                </Button>
                <Button
                  variant={showPurchasableOnly ? "default" : "secondary"}
                  onClick={() => setShowPurchasableOnly(!showPurchasableOnly)}
                  className="flex items-center space-x-2"
                >
                  <i className="fas fa-shopping-tag"></i>
                  <span>Purchasable</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Inventory Grid */}
          {inventoryLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(12)].map((_, i) => (
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
              <i className="fas fa-search text-4xl text-gray-400 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
              <p className="text-gray-600">
                {searchTerm || selectedCategory !== "all" || showAvailableOnly || showPurchasableOnly
                  ? "Try adjusting your search or filters to see more items."
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
          categories={categories}
        />
      )}
    </div>
  );
}
