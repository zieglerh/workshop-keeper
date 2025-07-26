import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInventoryItemSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useState } from "react";
import type { Category } from "@shared/schema";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

export default function AddItemModal({ isOpen, onClose, categories }: AddItemModalProps) {
  const { toast } = useToast();
  const [isPurchasable, setIsPurchasable] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertInventoryItemSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      location: "",
      purchaseDate: new Date(),
      imageUrl: "",
      isPurchasable: false,
      pricePerUnit: "0",
      stockQuantity: 1,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/inventory", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Item added successfully",
      });
      onClose();
      form.reset();
      setIsPurchasable(false);
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
        description: "Failed to add item",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    const formattedData = {
      ...data,
      isPurchasable,
      pricePerUnit: isPurchasable ? data.pricePerUnit : null,
      stockQuantity: isPurchasable ? data.stockQuantity : 1,
    };
    createMutation.mutate(formattedData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
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
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
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
                {...form.register("purchaseDate", {
                  setValueAs: (value) => new Date(value),
                })}
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="purchasable"
              checked={isPurchasable}
              onCheckedChange={setIsPurchasable}
            />
            <Label htmlFor="purchasable" className="text-sm">
              Mark as purchasable item
            </Label>
          </div>

          {isPurchasable && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="pricePerUnit">Price per Unit (€)</Label>
                <Input
                  id="pricePerUnit"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("pricePerUnit")}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="stockQuantity">Initial Stock</Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  min="0"
                  {...form.register("stockQuantity", {
                    setValueAs: (value) => parseInt(value) || 0,
                  })}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
