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
import { useState, useRef } from "react";
import type { Category } from "@shared/schema";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

export default function AddItemModal({ isOpen, onClose, categories }: AddItemModalProps) {
  const { toast } = useToast();
  const [isPurchasable, setIsPurchasable] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // First create the item
      const response = await apiRequest("POST", "/api/inventory", data);
      
      // Then upload image if one was selected
      if (uploadedImage && fileInputRef.current?.files?.[0]) {
        const formData = new FormData();
        formData.append('image', fileInputRef.current.files[0]);
        
        await fetch(`/api/inventory/${response.id}/upload-image`, {
          method: 'POST',
          body: formData,
        });
      }
      
      return response;
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
      setUploadedImage(null);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setUploadedImage(previewUrl);
    }
  };

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

          {/* Image Upload Section */}
          <div className="space-y-4">
            <div>
              <Label>Item Image</Label>
              <div className="mt-2 flex items-start space-x-4">
                <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  {uploadedImage ? (
                    <img 
                      src={uploadedImage} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <div className="text-2xl">📷</div>
                      <div className="text-xs">No image</div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload Image
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    JPG, PNG or GIF (max. 5MB)
                  </p>
                  {uploadedImage && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUploadedImage(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      Remove Image
                    </Button>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            
            <div>
              <Label htmlFor="imageUrl">Or Image URL (optional fallback)</Label>
              <Input
                id="imageUrl"
                {...form.register("imageUrl")}
                placeholder="https://example.com/image.jpg"
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                URL will be used only if no image is uploaded
              </p>
            </div>
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
