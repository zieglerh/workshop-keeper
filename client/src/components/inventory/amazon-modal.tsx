import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Link as LinkIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";

interface AmazonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: any) => void;
}

interface AmazonProduct {
  name: string;
  category: string;
  description: string;
  image: string;
  price: string;
  quantity: number;
  url: string;
}

export default function AmazonModal({ isOpen, onClose, onSelectProduct }: AmazonModalProps) {
  const { toast } = useToast();
  const [productUrl, setProductUrl] = useState("");

  const extractMutation = useMutation({
    mutationFn: async (url: string): Promise<AmazonProduct & { url: string }> => {
      const response = await apiRequest("POST", "/api/extract-amazon-product", { productUrl: url });
      const data = await response.json();
      return { ...data, url: url };
    },
    onSuccess: (data: AmazonProduct) => {
      console.log('Amazon Product Extracted:', data);
      onSelectProduct(data);
      handleClose();
      toast({
        title: "Product extracted",
        description: `${data.name} was successfully extracted from Amazon.de.`,
      });
    },
    onError: (error: Error) => {
      console.error('Amazon Extraction Error:', error);
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
        description: `Error: ${error.message || 'The product could not be extracted from Amazon.de.'}`,
        variant: "destructive",
      });
    },
  });

  const handleExtract = () => {
    if (!productUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter an Amazon.de product URL.",
        variant: "destructive",
      });
      return;
    }

    if (!productUrl.includes('amazon.')) {
      toast({
        title: "Invalid URL",
        description: "The URL must be from amazon.de.",
        variant: "destructive",
      });
      return;
    }

    extractMutation.mutate(productUrl.trim());
  };

  const handleClose = () => {
    setProductUrl("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <LinkIcon className="h-5 w-5" />
            <span>Amazon.de Product Extraction</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="productUrl">Amazon.de Product URL</Label>
            <div className="flex space-x-2 mt-1">
              <Input
                id="productUrl"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://www.amazon.de/preisvergleich/..."
                className="flex-1"
                disabled={extractMutation.isPending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleExtract();
                  }
                }}
              />
              <Button
                onClick={handleExtract}
                disabled={extractMutation.isPending || !productUrl.trim()}
              >
                {extractMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Extract
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Insert a product URL from Amazon to automatically create suitable product information for your inventory.
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
