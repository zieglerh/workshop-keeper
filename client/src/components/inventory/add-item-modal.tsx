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
import GoogleShoppingModal from "./google-shopping-modal";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

export default function AddItemModal({ isOpen, onClose, categories }: AddItemModalProps) {
  const { toast } = useToast();
  const [isPurchasable, setIsPurchasable] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [totalCost, setTotalCost] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [showGoogleShopping, setShowGoogleShopping] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

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
      price: 0,
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
      setTotalCost("");
      setQuantity("1");

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

  // Calculate price per unit when total cost or quantity changes
  const calculatePricePerUnit = () => {
    const cost = parseFloat(totalCost) || 0;
    const qty = parseFloat(quantity) || 1;
    if (qty > 0) {
      const pricePerUnit = cost / qty;
      form.setValue('price', parseFloat(pricePerUnit.toFixed(2)));
    }
  };

  // Update calculations when values change
  const handleTotalCostChange = (value: string) => {
    setTotalCost(value);
    setTimeout(calculatePricePerUnit, 0);
  };

  const handleQuantityChange = (value: string) => {
    setQuantity(value);
    const qty = parseFloat(value) || 1;
    // Set stock quantity to entered quantity if not already set
    if (!form.getValues('stockQuantity') || form.getValues('stockQuantity') === 1) {
      form.setValue('stockQuantity', qty);
    }
    setTimeout(calculatePricePerUnit, 0);
  };

  const downloadImageFromUrl = async (imageUrl: string) => {
    try {
      setIsDownloadingImage(true);
      
      const response = await apiRequest('POST', '/api/download-image', {
        imageUrl: imageUrl
      });
      
      if (response.success && response.localPath) {
        form.setValue("imageUrl", response.localPath);
        setUploadedImage(response.localPath);
        toast({
          title: "Bild heruntergeladen",
          description: "Das Bild wurde erfolgreich lokal gespeichert.",
        });
        return response.localPath;
      } else {
        throw new Error(response.error || "Download failed");
      }
    } catch (error: any) {
      console.error("Error downloading image:", error);
      toast({
        title: "Bild-Download fehlgeschlagen",
        description: error.message || "Das Bild konnte nicht heruntergeladen werden.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handleImageUrlChange = async (imageUrl: string) => {
    form.setValue("imageUrl", imageUrl);
    
    // Check if it's a valid URL and try to download it
    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      const localPath = await downloadImageFromUrl(imageUrl);
      if (localPath) {
        // Image was downloaded successfully, localPath is already set
        return;
      }
    }
    
    // If not a URL or download failed, just use the URL as is
    setUploadedImage(imageUrl);
  };

  const handleGoogleShoppingSelect = async (item: any) => {
    form.setValue("name", item.title);
    if (item.price) {
      const priceValue = parseFloat(item.price.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!isNaN(priceValue)) {
        setTotalCost(priceValue.toString());
        form.setValue("price", priceValue);
      }
    }
    if (item.thumbnail) {
      // Download the Google Shopping thumbnail
      await downloadImageFromUrl(item.thumbnail);
    }
    setShowGoogleShopping(false);
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
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowGoogleShopping(true)}
              className="flex items-center gap-2"
            >
              🛒 Add Google Item
            </Button>
          </div>
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
              <Label htmlFor="imageUrl">Or Image URL (automatic download)</Label>
              <div className="flex gap-2">
                <Input
                  id="imageUrl"
                  {...form.register("imageUrl")}
                  placeholder="https://example.com/image.jpg"
                  className="mt-1"
                  onChange={(e) => handleImageUrlChange(e.target.value)}
                  disabled={isDownloadingImage}
                />
                {isDownloadingImage && (
                  <div className="flex items-center px-3 mt-1">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                URLs werden automatisch heruntergeladen und lokal gespeichert
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
            <div className="space-y-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">Purchase Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="totalCost">Total Purchase Cost (€)</Label>
                  <Input
                    id="totalCost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalCost}
                    onChange={(e) => handleTotalCostChange(e.target.value)}
                    placeholder="0.00"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    What you paid in total for this purchase
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="purchaseQuantity">Purchase Quantity</Label>
                  <Input
                    id="purchaseQuantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    placeholder="1"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    How many units you purchased
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="price">Price per Unit (€)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register("price", {
                      valueAsNumber: true,
                    })}
                    placeholder="0.00"
                    className="mt-1 bg-gray-100"
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Automatically calculated from total cost ÷ quantity
                  </p>
                  {form.formState.errors.price && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.price.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="stockQuantity">Initial Stock Quantity</Label>
                  <Input
                    id="stockQuantity"
                    type="number"
                    min="0"
                    {...form.register("stockQuantity", {
                      valueAsNumber: true,
                    })}
                    placeholder="Will default to purchase quantity"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Defaults to purchase quantity if not set
                  </p>
                  {form.formState.errors.stockQuantity && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.stockQuantity.message}
                    </p>
                  )}
                </div>
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
        
        <GoogleShoppingModal
          isOpen={showGoogleShopping}
          onClose={() => setShowGoogleShopping(false)}
          onSelectItem={handleGoogleShoppingSelect}
        />

      </DialogContent>
    </Dialog>
  );
}
