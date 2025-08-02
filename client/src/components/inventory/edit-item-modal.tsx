import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInventoryItemSchema } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect } from "react";
import { format } from "date-fns";
import type { InventoryItemWithRelations, Category } from "@shared/schema";
import PurchaseInfoFields from "@/components/inventory/purchase-info-fields.tsx";

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItemWithRelations;
}

export default function EditItemModal({ isOpen, onClose, item }: EditItemModalProps) {
  const { toast } = useToast();

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    retry: false,
  });

  const form = useForm({
    resolver: zodResolver(insertInventoryItemSchema.partial()),
    defaultValues: {
      name: item.name,
      description: item.description || "",
      categoryId: item.categoryId,
      location: item.location,
      purchaseDate: item.purchaseDate,
      imageUrl: item.imageUrl || "",
      externalLink: item.externalLink || "",
      isPurchasable: item.isPurchasable || false,
      purchasePrice: item.purchasePrice || 0,
      pricePerUnit: item.pricePerUnit || 0,
      stockQuantity: item.stockQuantity || 1,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: item.name,
        description: item.description || "",
        categoryId: item.categoryId,
        location: item.location,
        purchaseDate: item.purchaseDate
            ? format(new Date(item.purchaseDate), 'yyyy-MM-dd')
            : item.purchaseDate,
        imageUrl: item.imageUrl || "",
        externalLink: item.externalLink || "",
        isPurchasable: item.isPurchasable || false,
        purchasePrice: item.purchasePrice || 0,
        pricePerUnit: item.pricePerUnit || 0,
        stockQuantity: item.stockQuantity || 1,
      });
    }
  }, [isOpen, item, form]);

  const handleExternalLinkChange = (externalLink: string) => {
    const cleanUrl = externalLink.split('?')[0];
    form.setValue("externalLink", cleanUrl);
  };

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PATCH", `/api/inventory/${item.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
      onClose();
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
        description: "Failed to update item",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    console.log("on submit", data);
    const formattedData = {
      ...data,
      purchaseDate: data.purchaseDate ?? null,
    };
    console.log("on submit", formattedData);
    updateMutation.mutate(formattedData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Item Name</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Enter item name"
                className="mt-1"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="categoryId">Category</Label>
              <Select
                value={form.watch("categoryId")}
                onValueChange={(value) => form.setValue("categoryId", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category: Category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name} ({category.description})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.categoryId && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.categoryId.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              rows={3}
              placeholder="Enter item description"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                {...form.register("location")}
                placeholder="Workshop A-12"
                className="mt-1"
              />
              {form.formState.errors.location && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.location.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="purchaseDate">Purchase Date</Label>
              <Input
                id="purchaseDate"
                type="date"
                {...form.register("purchaseDate")}
                className="mt-1"
              />
              {form.formState.errors.purchaseDate && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.purchaseDate.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="imageUrl">Image URL (optional)</Label>
            <Input
              id="imageUrl"
              {...form.register("imageUrl")}
              placeholder="https://example.com/image.jpg"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="externalLink">Product URL</Label>
            <Input
                id="externalLink"
                {...form.register("externalLink")}
                placeholder="https://amazon.de/product/1234567890"
                onChange={(e) => handleExternalLinkChange(e.target.value)}
                className="mt-1"
            />
            {form.formState.errors.externalLink && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.externalLink.message}
                </p>
            )}
          </div>

          <PurchaseInfoFields
              form={form}
          />

          {!item.isAvailable && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <i className="fas fa-exclamation-triangle text-yellow-600"></i>
                <p className="text-sm text-yellow-800">
                  This item is currently borrowed by {item.currentBorrower?.name || item.currentBorrower?.email}.
                  Changes will take effect when the item is returned.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
