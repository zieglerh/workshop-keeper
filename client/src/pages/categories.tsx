import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import CategoryModal from "@/components/categories/category-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Edit, Trash2, Tags, Lock } from "lucide-react";
import type { Category } from "@shared/schema";

export default function Categories() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

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

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
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

  const { data: inventory = [] } = useQuery({
    queryKey: ["/api/inventory"],
    retry: false,
    enabled: isAuthenticated,
  });

  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      await apiRequest("DELETE", `/api/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Success",
        description: "Category deleted successfully",
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
        description: "Failed to delete category",
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
          <Header title="Categories" subtitle="Manage inventory categories." />
          <div className="p-6">
            <div className="text-center py-12">
              <Lock className="h-16 w-16 text-gray-400 mb-4 mx-auto" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Admin Access Required</h3>
              <p className="text-gray-600">Only administrators can manage categories.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const getCategoryItemCount = (categoryId: string) => {
    return inventory.filter((item: any) => item.categoryId === categoryId).length;
  };

  const handleDeleteCategory = (category: Category) => {
    const itemCount = getCategoryItemCount(category.id);
    if (itemCount > 0) {
      toast({
        title: "Cannot Delete Category",
        description: `This category contains ${itemCount} item(s). Please move or delete the items first.`,
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
      deleteMutation.mutate(category.id);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-0">
        <Header 
          title="Categories"
          subtitle="Manage inventory categories and organization."
          showAddButton={true}
          onAddClick={() => setShowAddModal(true)}
          addButtonText="Add Category"
        />
        
        <div className="p-6">
          {categoriesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <Tags className="h-16 w-16 text-gray-400 mb-4 mx-auto" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
              <p className="text-gray-600">Start by creating your first inventory category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category: Category) => {
                const itemCount = getCategoryItemCount(category.id);
                return (
                  <Card key={category.id} className="hover:shadow-material-lg transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color }}
                          ></div>
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                        </div>
                        <Badge variant="secondary">{itemCount} items</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {category.description && (
                        <p className="text-gray-600 mb-4">{category.description}</p>
                      )}
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingCategory(category)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCategory(category)}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {showAddModal && (
        <CategoryModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingCategory && (
        <CategoryModal
          isOpen={true}
          onClose={() => setEditingCategory(null)}
          category={editingCategory}
        />
      )}
    </div>
  );
}
