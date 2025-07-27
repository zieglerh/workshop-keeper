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

interface IdealoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: any) => void;
}

interface IdealoProduct {
  name: string;
  category: string;
  description: string;
  image: string;
  price: string;
  quantity: number;
}

export default function IdealoModal({ isOpen, onClose, onSelectProduct }: IdealoModalProps) {
  const { toast } = useToast();
  const [productUrl, setProductUrl] = useState("");

  const extractMutation = useMutation({
    mutationFn: async (url: string): Promise<IdealoProduct> => {
      const response = await apiRequest("POST", "/api/extract-idealo-product", { productUrl: url });
      return await response.json();
    },
    onSuccess: (data: IdealoProduct) => {
      console.log('Idealo Product Extracted:', data);
      onSelectProduct(data);
      handleClose();
      toast({
        title: "Product extracted",
        description: `${data.name} was successfully extracted from Idealo.de.`,
      });
    },
    onError: (error: Error) => {
      console.error('Idealo Extraction Error:', error);
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
        description: `Error: ${error.message || 'The product could not be extracted from Idealo.de.'}`,
        variant: "destructive",
      });
    },
  });

  const handleExtract = () => {
    if (!productUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter an Idealo.de product URL.",
        variant: "destructive",
      });
      return;
    }

    if (!productUrl.includes('idealo.de')) {
      toast({
        title: "Invalid URL",
        description: "The URL must be from idealo.de.",
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
            <span>Idealo.de Product Extraction</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="productUrl">Idealo.de Product URL</Label>
            <div className="flex space-x-2 mt-1">
              <Input
                id="productUrl"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://www.idealo.de/preisvergleich/..."
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
            <p className="text-xs text-gray-500 mt-1">
              Insert a product URL from idealo.de. ChatGPT analyzes the URL and 
              automatically creates suitable product information for your inventory.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Supported Categories:</h4>
            <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
              <div>Tools - Cutting, Electrical, Fastening</div>
              <div>Equipment - Cleaning, Heavy, Lifting</div>
              <div>Material & Supply - Consumables, etc.</div>
              <div>and more...</div>
            </div>
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