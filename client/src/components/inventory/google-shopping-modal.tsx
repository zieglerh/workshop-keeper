import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Search, Star, Truck, ExternalLink, Loader2 } from "lucide-react";

interface GoogleShoppingItem {
  title: string;
  price?: string;
  link: string;
  thumbnail?: string;
  source: string;
  delivery?: string;
  rating?: number;
  reviews?: number;
  description?: string;
}

interface GoogleShoppingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: GoogleShoppingItem) => void;
}

export default function GoogleShoppingModal({ isOpen, onClose, onSelectItem }: GoogleShoppingModalProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GoogleShoppingItem[]>([]);

  const searchMutation = useMutation({
    mutationFn: async (query: string): Promise<{ results: GoogleShoppingItem[] }> => {
      const response = await apiRequest("POST", "/api/search-google-shopping", { query });
      return await response.json();
    },
    onSuccess: (data: { results: GoogleShoppingItem[] }) => {
      console.log('Google Shopping API Response:', data);
      setSearchResults(data.results || []);
      if (!data.results || data.results.length === 0) {
        toast({
          title: "Keine Ergebnisse",
          description: "Keine Produkte für diese Suche gefunden. Versuchen Sie andere Suchbegriffe.",
          variant: "default",
        });
      } else {
        toast({
          title: "Suchergebnisse geladen",
          description: `${data.results.length} Produkte gefunden.`,
        });
      }
    },
    onError: (error: Error) => {
      console.error('Google Shopping Search Error:', error);
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
        title: "Suchfehler",
        description: `Fehler: ${error.message || 'Die Google Shopping-Suche konnte nicht ausgeführt werden.'}`,
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

    searchMutation.mutate(searchQuery.trim());
  };

  const handleSelectItem = (item: GoogleShoppingItem) => {
    onSelectItem(item);
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery("");
    setSearchResults([]);
    onClose();
  };

  const formatPrice = (price?: string) => {
    if (!price) return "Preis auf Anfrage";
    return price.includes("€") ? price : `€${price}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Google Shopping Suche</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div>
            <Label htmlFor="search">Suchbegriff</Label>
            <div className="flex space-x-2 mt-1">
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="z.B. spax 4x80, bosch bohrmaschine..."
                className="flex-1"
                disabled={searchMutation.isPending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              <Button
                onClick={handleSearch}
                disabled={searchMutation.isPending || !searchQuery.trim()}
              >
                {searchMutation.isPending ? (
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
              Suchen Sie nach Produkten in deutschen Online-Shops über Google Shopping.
            </p>
          </div>

          {/* Search Results */}
          {searchResults && searchResults.length > 0 && (
            <div className="flex-1 overflow-hidden">
              <h3 className="text-lg font-semibold mb-3">
                Suchergebnisse ({searchResults ? searchResults.length : 0})
              </h3>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {searchResults && searchResults.map((item, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow border-2 hover:border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex space-x-4">
                          {/* Product Image */}
                          <div className="flex-shrink-0">
                            <div className="w-20 h-20 border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                              {item.thumbnail ? (
                                <img
                                  src={item.thumbnail}
                                  alt={item.title}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<div class="text-gray-400 text-2xl">📦</div>';
                                    }
                                  }}
                                />
                              ) : (
                                <div className="text-gray-400 text-2xl">📦</div>
                              )}
                            </div>
                          </div>

                          {/* Product Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm leading-tight mb-2 line-clamp-2">
                              {item.title}
                            </h4>

                            <div className="flex items-center space-x-4 mb-2">
                              <div className="font-semibold text-primary">
                                {formatPrice(item.price)}
                              </div>

                              {item.rating && (
                                <div className="flex items-center space-x-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs text-gray-600">
                                    {item.rating.toFixed(1)}
                                    {item.reviews && ` (${item.reviews})`}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              <Badge variant="secondary" className="text-xs">
                                {item.source}
                              </Badge>

                              {item.delivery && (
                                <div className="flex items-center space-x-1 text-xs text-gray-500">
                                  <Truck className="h-3 w-3" />
                                  <span>{item.delivery}</span>
                                </div>
                              )}
                            </div>

                            <div className="mt-2 flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs flex-1"
                                onClick={() => handleSelectItem(item)}
                              >
                                Auswählen
                              </Button>

                              {item.link && item.link.trim() !== '' ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(item.link, '_blank', 'noopener,noreferrer');
                                  }}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Details anzeigen
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const searchQuery = encodeURIComponent(`${item.title} ${item.source}`);
                                    window.open(`https://google.de/search?q=${searchQuery}`, '_blank', 'noopener,noreferrer');
                                  }}
                                >
                                  <Search className="h-3 w-3" />
                                  Auf Google suchen
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Empty State */}
          {!searchMutation.isPending && (!searchResults || searchResults.length === 0) && searchQuery && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Keine Suchergebnisse gefunden</p>
                <p className="text-sm">Versuchen Sie andere Suchbegriffe</p>
              </div>
            </div>
          )}

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
