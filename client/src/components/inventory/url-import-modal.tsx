import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Loader2, Globe, CheckCircle, AlertCircle, Eye } from "lucide-react";

interface ExtractedData {
  name: string;
  description: string;
  price?: number;
  imageUrl?: string;
  isPurchasable: boolean;
  confidence: number;
}

interface UrlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: ExtractedData) => void;
}

export default function UrlImportModal({ isOpen, onClose, onImport }: UrlImportModalProps) {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  const extractMutation = useMutation({
    mutationFn: async (url: string) => {
      return await apiRequest("POST", "/api/import-from-url", { url });
    },
    onSuccess: (data: ExtractedData) => {
      setExtractedData(data);
      if (data.confidence < 50) {
        toast({
          title: "Daten extrahiert",
          description: "Die automatische Extraktion war teilweise erfolgreich. Bitte überprüfen Sie die Daten.",
          variant: "default",
        });
      } else {
        toast({
          title: "Erfolgreich extrahiert",
          description: `Artikeldaten mit ${data.confidence}% Vertrauen extrahiert.`,
        });
      }
    },
    onError: (error: Error) => {
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
        title: "Fehler beim Extrahieren",
        description: "Die URL konnte nicht verarbeitet werden. Versuchen Sie es mit einer anderen URL.",
        variant: "destructive",
      });
    },
  });

  const handleExtract = () => {
    if (!url.trim()) {
      toast({
        title: "URL erforderlich",
        description: "Bitte geben Sie eine gültige URL ein.",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(url); // Validate URL format
      extractMutation.mutate(url.trim());
    } catch {
      toast({
        title: "Ungültige URL",
        description: "Bitte geben Sie eine gültige URL ein (z.B. https://example.com/product).",
        variant: "destructive",
      });
    }
  };

  const handleImport = () => {
    if (extractedData) {
      onImport(extractedData);
      handleClose();
    }
  };

  const handleClose = () => {
    setUrl("");
    setExtractedData(null);
    onClose();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-100 text-green-800";
    if (confidence >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 70) return <CheckCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Artikel aus URL importieren</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* URL Input */}
          <div>
            <Label htmlFor="url">Produkt-URL</Label>
            <div className="flex space-x-2 mt-1">
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/product/..."
                className="flex-1"
                disabled={extractMutation.isPending}
              />
              <Button
                onClick={handleExtract}
                disabled={extractMutation.isPending || !url.trim()}
              >
                {extractMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analysiere...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Analysieren
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Geben Sie eine URL zu einem Produkt oder Artikel ein, um die Daten automatisch zu extrahieren.
            </p>
          </div>

          {/* Extracted Data Preview */}
          {extractedData && (
            <Card className="border-2 border-dashed border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Extrahierte Daten</h3>
                  <Badge className={getConfidenceColor(extractedData.confidence)}>
                    {getConfidenceIcon(extractedData.confidence)}
                    <span className="ml-1">{extractedData.confidence}% Vertrauen</span>
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Name</Label>
                      <p className="text-sm font-medium truncate" title={extractedData.name}>
                        {extractedData.name}
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-600">Beschreibung</Label>
                      <p className="text-sm text-gray-700 line-clamp-3">
                        {extractedData.description}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Preis</Label>
                        <p className="text-sm font-medium">
                          {extractedData.price ? `€${extractedData.price.toFixed(2)}` : 'Nicht gefunden'}
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-600">Kaufbar</Label>
                        <Badge variant={extractedData.isPurchasable ? "default" : "secondary"}>
                          {extractedData.isPurchasable ? "Ja" : "Nein"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Image */}
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Bild</Label>
                    <div className="mt-2 w-full h-32 border-2 border-dashed border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                      {extractedData.imageUrl ? (
                        <img 
                          src={extractedData.imageUrl} 
                          alt="Product preview" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = '<div class="text-center text-gray-400"><div class="text-xl">📷</div><div class="text-xs">Bild nicht verfügbar</div></div>';
                            }
                          }}
                        />
                      ) : (
                        <div className="text-center text-gray-400">
                          <div className="text-xl">📷</div>
                          <div className="text-xs">Kein Bild gefunden</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Abbrechen
            </Button>
            <Button
              onClick={handleImport}
              disabled={!extractedData}
              className="bg-primary hover:bg-primary-dark"
            >
              Daten importieren
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}