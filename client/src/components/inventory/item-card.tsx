import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, HandIcon, RotateCcw, Edit, Trash2, ImageIcon, ExternalLink } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useState } from "react";
import EditItemModal from "./edit-item-modal";
import { format } from "date-fns";
import type { InventoryItemWithRelations, Category } from "@shared/schema";

interface ItemCardProps {
  item: InventoryItemWithRelations;
  userRole?: string;
  onPurchaseSuccess?: () => void;
  onBorrowSuccess?: () => void;
}

export default function ItemCard({ item, userRole, onPurchaseSuccess, onBorrowSuccess }: ItemCardProps) {
  const { toast } = useToast();
  const [showEditModal, setShowEditModal] = useState(false);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);

  const borrowMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/inventory/${item.id}/borrow`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      if (data?.notification) {
        onBorrowSuccess?.();
      }
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
        description: "Failed to borrow item",
        variant: "destructive",
      });
    },
  });

  const returnMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/inventory/${item.id}/return`);
    },
    onSuccess: () => {
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

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/purchases`, {
        itemId: item.id,
        quantity: purchaseQuantity,
        pricePerUnit: item.pricePerUnit || 0,
        totalPrice: (item.pricePerUnit || 0) * purchaseQuantity,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      if (data?.notification) {
        onPurchaseSuccess?.();
      }
      setPurchaseQuantity(1);
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
        description: "Failed to purchase item",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/inventory/${item.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Item deleted successfully",
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
        description: "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      deleteMutation.mutate();
    }
  };

  const handlePurchase = () => {
    if (item.isPurchasable && item.stockQuantity && purchaseQuantity > item.stockQuantity) {
      toast({
        title: "Error",
        description: "Insufficient stock",
        variant: "destructive",
      });
      return;
    }
    purchaseMutation.mutate();
  };

  return (
    <>
      <Card className="bg-surface rounded-xl shadow-material overflow-hidden hover:shadow-material-lg transition-shadow">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-48 object-contain p-3"
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-gray-400" />
          </div>
        )}

        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 truncate flex-1">{item.name}</h3>
            <Badge
              variant={item.isAvailable ? "secondary" : "secondary"}
              className={
                item.isAvailable
                  ? "bg-success/10 text-success ml-2"
                  : "bg-warning/10 text-warning ml-2"
              }
            >
              {item.isAvailable ? "Available" : "Borrowed"}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-1 mb-3">
            <Badge
              variant="secondary"
              className="text-xs"
              style={{
                backgroundColor: `${item.category.color}15`,
                color: item.category.color
              }}
            >
              {item.category.name}
            </Badge>
            {item.isPurchasable && (
              <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                Purchasable
              </Badge>
            )}
          </div>

          <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex justify-between">
                <span>Price:</span>
                <span className="font-semibold text-gray-900">
                {item.purchasePrice && (
                    <span>
                        €{parseFloat(item.purchasePrice || '0').toFixed(2)}
                    </span>
                )}
                </span>
              </div>
            <div className="flex justify-between">
              <span>Location:</span>
              <span className="truncate ml-2">{item.location}</span>
            </div>
            {item.isAvailable ? (
              <div className="flex justify-between">
                <span>Purchased:</span>
                <span>{item.purchaseDate ? format(new Date(item.purchaseDate), 'PP') : ''}</span>
              </div>
            ) : (
              <div className="flex justify-between">
                <span>Borrowed by:</span>
                <span className="truncate ml-2">
                  {item.currentBorrower?.name || item.currentBorrower?.email}
                </span>
              </div>
            )}
            {item.isPurchasable && (
              <>
                {/*<div className="flex justify-between">*/}
                {/*  <span>Price:</span>*/}
                {/*  <span className="font-semibold text-gray-900">*/}
                {/*    €{parseFloat(item.pricePerUnit || '0').toFixed(2)}*/}
                {/*  </span>*/}
                {/*</div>*/}
                <div className="flex justify-between">
                  <span>Stock:</span>
                  <span>{item.stockQuantity || 0} units</span>
                </div>
              </>
            )}
          </div>

          <div className="flex space-x-2">
            {item.isPurchasable && item.stockQuantity && item.stockQuantity > 0 ? (
              <div className="flex-1 flex space-x-1">
                <input
                  type="number"
                  min="1"
                  max={item.stockQuantity}
                  value={purchaseQuantity}
                  onChange={(e) => setPurchaseQuantity(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 border rounded text-xs"
                />
                <Button
                  size="sm"
                  onClick={handlePurchase}
                  disabled={purchaseMutation.isPending}
                  className="flex-1 bg-success hover:bg-success/90 text-white text-xs flex items-center space-x-1"
                >
                  <ShoppingCart className="h-3 w-3" />
                  <span>€{(parseFloat(item.pricePerUnit || '0') * purchaseQuantity).toFixed(2)}</span>
                </Button>
              </div>
            ) : item.isAvailable ? (
              <Button
                size="sm"
                onClick={() => borrowMutation.mutate()}
                disabled={borrowMutation.isPending}
                className="flex-1 bg-primary hover:bg-primary-dark text-white flex items-center space-x-2"
              >
                <HandIcon className="h-4 w-4" />
                <span>Borrow</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => returnMutation.mutate()}
                disabled={returnMutation.isPending || !item.currentBorrowerId}
                variant="outline"
                className="flex-1 flex items-center space-x-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Return</span>
              </Button>
            )}
            {item.externalLink && (
              <a
                  href={item.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background p-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 w-9"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {userRole === 'admin' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {showEditModal && (
        <EditItemModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          item={item}
        />
      )}
    </>
  );
}
