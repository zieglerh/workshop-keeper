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
        title: "Produkt extrahiert",
        description: `${data.name} wurde erfolgreich von Idealo.de extrahiert.`,
      });
    },
    onError: (error: Error) => {
      console.error('Idealo Extraction Error:', error);
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
        description: `Fehler: ${error.message || 'Das Produkt konnte nicht von Idealo.de extrahiert werden.'}`,
        variant: "destructive",
      });
    },
  });

  const handleExtract = () => {
    if (!productUrl.trim()) {
      toast({
        title: "URL erforderlich",
        description: "Bitte geben Sie eine Idealo.de Produkt-URL ein.",
        variant: "destructive",
      });
      return;
    }

    if (!productUrl.includes('idealo.de')) {
      toast({
        title: "Ungültige URL",
        description: "Die URL muss von idealo.de stammen.",
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
            <span>Idealo.de Produktextraktion</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="productUrl">Idealo.de Produkt-URL</Label>
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
                    Extrahiere...
                  </>
                ) : (
                  <>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Extrahieren
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Fügen Sie eine Produkt-URL von idealo.de ein. Das System extrahiert automatisch 
              Produktname, Kategorie, Beschreibung, Bild und Preis mit Hilfe von ChatGPT.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Unterstützte Kategorien:</h4>
            <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
              <div>Tools - Cutting, Electrical, Fastening</div>
              <div>Equipment - Cleaning, Heavy, Lifting</div>
              <div>Material & Supply - Consumables, etc.</div>
              <div>und weitere...</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Abbrechen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}