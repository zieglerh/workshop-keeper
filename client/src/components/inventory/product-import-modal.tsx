import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Search, Loader2 } from "lucide-react";

interface ProductItem {
  name: string;
  category: string;
  description: string;
  image: string;
  price: string;
  quantity: number;
  url: string;
}

interface ProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (item: ProductItem) => void;
}

export default function ProductImportModal({ isOpen, onClose, onSelectProduct }: ProductImportModalProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const extractMutation = useMutation({
    mutationFn: async (query: string): Promise<ProductItem & { query: string }> => {
      const response = await apiRequest("POST", "/api/get-product-details", { productName: query });
      const data = await response.json();
      return { ...data, query: query };
    },
    onSuccess: (data: ProductItem) => {
      console.log('Product Extracted:', data);
      onSelectProduct(data);
      handleClose();
      toast({
        title: "Product extracted",
        description: `${data.name} was successfully fetched.`,
      });
    },
    onError: (error: Error) => {
      console.error('Extraction Error:', error);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are not logged in. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Extraction error",
        description: `Error: ${error.message || 'The product infos could not be fetched'}`,
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Suchbegriff erforderlich",
        description: "Bitte geben Sie einen Suchbegriff ein.",
        variant: "destructive",
      });
      return;
    }

    extractMutation.mutate(searchQuery.trim());
  };

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Product Import</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div>
            <Label htmlFor="search">Product name</Label>
            <div className="flex space-x-2 mt-1">
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="z.B. hama 00053052"
                className="flex-1"
                disabled={extractMutation.isPending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              <Button
                onClick={handleSearch}
                disabled={extractMutation.isPending || !searchQuery.trim()}
              >
                {extractMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Suche...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Suchen
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Search and import products via ChatGPT
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Abbrechen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
