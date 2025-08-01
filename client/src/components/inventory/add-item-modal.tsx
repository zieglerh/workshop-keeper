import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import IdealoModal from "./idealo-modal";
import AmazonModal from "./amazon-modal";
import PurchaseInfoFields from "./purchase-info-fields";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

export default function AddItemModal({ isOpen, onClose, categories }: AddItemModalProps) {
  const { toast } = useToast();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showGoogleShopping, setShowGoogleShopping] = useState(false);
  const [showIdealoModal, setShowIdealoModal] = useState(false);
  const [showAmazonModal, setShowAmazonModal] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    resolver: zodResolver(insertInventoryItemSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      location: "",
      purchaseDate: "",
      imageUrl: "",
      externalLink: "",
      isPurchasable: false,
      purchasePrice: 0,
      pricePerUnit: 0,
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
      form.setValue("isPurchasable", false);
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

  const handleExternalLinkChange = (externalLink: string) => {
    const cleanUrl = externalLink.split('?')[0];
    form.setValue("externalLink", cleanUrl);
  };

  const handleGoogleShoppingSelect = async (item: any) => {
    try {
      // First, try to get detailed product information from API
      let productDescription = "";

      if (item.link) {
        try {
          const detailResponse = await apiRequest('POST', '/api/get-product-details', {
            productLink: item.link
          });

          if (detailResponse.description) {
            productDescription = detailResponse.description;
          }
        } catch (error) {
          console.log('Could not fetch detailed product info, using basic data');
        }
      }

      // Set item name
      if (item.title) {
        form.setValue("name", item.title);
      }

      // Set description - prefer API description, otherwise fallback to source info
      if (productDescription) {
        form.setValue("description", productDescription);
      } else if (item.description) {
        form.setValue("description", item.description);
      } else {
        let description = `Gefunden in: ${item.source || 'Unbekannter Shop'}`;
        if (item.price) {
          description += `\nPreis: ${item.price}`;
        }
        if (item.rating) {
          description += `\nBewertung: ${item.rating}/5`;
          if (item.reviews) {
            description += ` (${item.reviews} Bewertungen)`;
          }
        }
        form.setValue("description", description);
      }

      // Set price for purchasable items
      if (item.price) {
        const priceValue = parseFloat(item.price.replace(/[^\d.,]/g, '').replace(',', '.'));
        if (!isNaN(priceValue)) {
          form.setValue('purchasePrice', priceValue);
        }
      }

      // Set image from thumbnail - only set URL, don't trigger download
      if (item.thumbnail) {
        form.setValue("imageUrl", item.thumbnail);
        setUploadedImage(item.thumbnail);
      }

      setShowGoogleShopping(false);
    } catch (error) {
      console.error('Error processing Google Shopping selection:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Verarbeiten der Produktauswahl",
        variant: "destructive",
      });
    }
  };

  const handleIdealoSelect = async (product: any) => {
    // Set product data from Idealo extraction
    if (product.name) {
      form.setValue("name", product.name);
    }

    if (product.description) {
      form.setValue("description", product.description);
    }

    // Set category - find matching category ID
    if (product.category) {
      const matchingCategory = categories?.find(cat => cat.name === product.category);
      if (matchingCategory) {
        form.setValue("categoryId", matchingCategory.id);
      }
    }

    // Set stockQuantity
    if (product.quantity) {
      // setStockQuantity(product.quantity.toString());
      form.setValue('stockQuantity', product.quantity);
    }

    // Set price for purchasable items
    if (product.price) {
      const priceValue = parseFloat(product.price.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!isNaN(priceValue)) {
        form.setValue('purchasePrice', priceValue);
      }
    }

    // Set image from URL - only set URL, don't trigger download
    if (product.image) {
      form.setValue("imageUrl", product.image);
      setUploadedImage(product.image);
    }

    setShowIdealoModal(false);
  };

  const handleAmazonSelect = async (product: any) => {
    // Set product data from Amazon extraction
    if (product.name) {
      form.setValue("name", product.name);
    }

    if (product.description) {
      form.setValue("description", product.description);
    }

    // Set category - find matching category ID
    if (product.category) {
      const matchingCategory = categories?.find(cat => cat.name === product.category);
      if (matchingCategory) {
        form.setValue("categoryId", matchingCategory.id);
      }
    }

    // Set stockQuantity
    if (product.quantity) {
      form.setValue('stockQuantity', product.quantity);
    }

    // Set price for purchasable items
    if (product.price) {
      const priceValue = parseFloat(product.price.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!isNaN(priceValue)) {
        form.setValue('purchasePrice', priceValue);
      }
    }

    // Set image from URL - only set URL, don't trigger download
    if (product.image) {
      form.setValue("imageUrl", product.image);
      setUploadedImage(product.image);
    }

    // Set external link
    if (product.url) {
      handleExternalLinkChange(product.url);
    }

    setShowAmazonModal(false);
  };


  const onSubmit = (data: any) => {
    const formattedData = {
      ...data,
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowIdealoModal(true)}
              className="flex items-center gap-2"
            >
              🔗 Add Idealo Item
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAmazonModal(true)}
              className="flex items-center gap-2"
            >
              🔗 Add Amazon Item
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
                      className="w-full h-full object-contain"
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

            <div>
              <Label htmlFor="externalLink">Product URL</Label>
              <div>
                <Input
                  id="externalLink"
                  {...form.register("externalLink")}
                  placeholder="https://amazon.de/product/1234567890"
                  onChange={(e) => handleExternalLinkChange(e.target.value)}
                  className="mt-1"
                />
              </div>
              {form.formState.errors.externalLink && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.externalLink.message}
                  </p>
              )}
            </div>
          </div>

          <PurchaseInfoFields
              form={form}
          />

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

        <IdealoModal
          isOpen={showIdealoModal}
          onClose={() => setShowIdealoModal(false)}
          onSelectProduct={handleIdealoSelect}
        />

        <AmazonModal
          isOpen={showAmazonModal}
          onClose={() => setShowAmazonModal(false)}
          onSelectProduct={handleAmazonSelect}
        />

      </DialogContent>
    </Dialog>
  );
}
