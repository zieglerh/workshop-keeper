import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Loader2, ExternalLink, Package, Info } from "lucide-react";

interface IdealoProductDetails {
  title: string;
  price?: string;
  description?: string;
  specifications: {
    [key: string]: string;
  };
  imageUrl?: string;
  productTypes?: string[];
}

interface IdealoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportProduct: (product: IdealoProductDetails) => void;
}

export default function IdealoImportModal({ isOpen, onClose, onImportProduct }: IdealoImportModalProps) {
  const { toast } = useToast();
  const [productUrl, setProductUrl] = useState("");
  const [extractedProduct, setExtractedProduct] = useState<IdealoProductDetails | null>(null);

  const extractMutation = useMutation({
    mutationFn: async (url: string): Promise<IdealoProductDetails> => {
      const response = await apiRequest("POST", "/api/extract-idealo-product", { url });
      return await response.json();
    },
    onSuccess: (data: IdealoProductDetails) => {
      console.log('Idealo Product Details:', data);
      setExtractedProduct(data);
      toast({
        title: "Produkt extrahiert",
        description: "Produktdetails erfolgreich von Idealo geladen.",
      });
    },
    onError: (error: Error) => {
      console.error('Idealo extraction error:', error);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Nicht autorisiert",
          description: "Sie sind nicht angemeldet. Melden Sie sich erneut an...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Extraktionsfehler",
        description: `Fehler: ${error.message || 'Das Produkt konnte nicht von Idealo extrahiert werden.'}`,
        variant: "destructive",
      });
    },
  });

  const handleExtract = () => {
    if (!productUrl.trim()) {
      toast({
        title: "URL erforderlich",
        description: "Bitte geben Sie eine Idealo-Produkt-URL ein.",
        variant: "destructive",
      });
      return;
    }

    if (!productUrl.includes('idealo.de')) {
      toast({
        title: "Ungültige URL",
        description: "Bitte geben Sie eine gültige Idealo.de URL ein.",
        variant: "destructive",
      });
      return;
    }

    extractMutation.mutate(productUrl.trim());
  };

  const handleImport = () => {
    if (extractedProduct) {
      onImportProduct(extractedProduct);
      handleClose();
    }
  };

  const handleClose = () => {
    setProductUrl("");
    setExtractedProduct(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produkt von Idealo importieren
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* URL Input Section */}
          <div className="space-y-3">
            <Label htmlFor="product-url">Idealo Produkt-URL</Label>
            <div className="flex gap-2">
              <Input
                id="product-url"
                placeholder="https://www.idealo.de/preisvergleich/OffersOfProduct/..."
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                disabled={extractMutation.isPending}
              />
              <Button 
                onClick={handleExtract} 
                disabled={extractMutation.isPending || !productUrl.trim()}
              >
                {extractMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Extrahieren
              </Button>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Info className="h-4 w-4" />
              Fügen Sie die URL eines Idealo-Produkts ein, um automatisch Details zu extrahieren.
            </p>
          </div>

          {/* Extracted Product Display */}
          {extractedProduct && (
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
              <h3 className="font-semibold text-lg">{extractedProduct.title}</h3>
              
              {extractedProduct.price && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Preis:</span>
                  <span className="text-green-600 font-semibold">{extractedProduct.price}</span>
                </div>
              )}

              {extractedProduct.productTypes && extractedProduct.productTypes.length > 0 && (
                <div>
                  <span className="font-medium">Produkttypen:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {extractedProduct.productTypes.map((type, index) => (
                      <span key={index} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {extractedProduct.imageUrl && (
                <div>
                  <span className="font-medium">Produktbild:</span>
                  <img 
                    src={extractedProduct.imageUrl} 
                    alt={extractedProduct.title}
                    className="mt-2 max-w-32 h-auto rounded border"
                  />
                </div>
              )}

              {Object.keys(extractedProduct.specifications).length > 0 && (
                <div>
                  <span className="font-medium">Spezifikationen:</span>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(extractedProduct.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{key}:</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={handleImport} className="flex-1">
                  <Package className="h-4 w-4 mr-2" />
                  Produkt importieren
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Abbrechen
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}