import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, Save, X, MessageSquare } from "lucide-react";
import type { NotificationTemplate } from "@shared/schema";

export default function NotificationManager() {
  const { toast } = useToast();
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [editForm, setEditForm] = useState({ title: "", message: "", isActive: true });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["/api/notification-templates"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NotificationTemplate> }) => {
      return await apiRequest('PATCH', `/api/notification-templates/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Benachrichtigung aktualisiert",
        description: "Die Benachrichtigungsvorlage wurde erfolgreich aktualisiert.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notification-templates"] });
      setEditingTemplate(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Aktualisieren",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/notification-templates/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Benachrichtigung gelöscht",
        description: "Die Benachrichtigungsvorlage wurde erfolgreich gelöscht.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notification-templates"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Löschen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startEdit = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setEditForm({
      title: template.title,
      message: template.message,
      isActive: template.isActive ?? true,
    });
  };

  const cancelEdit = () => {
    setEditingTemplate(null);
    setEditForm({ title: "", message: "", isActive: true });
  };

  const saveEdit = () => {
    if (!editingTemplate) return;
    
    updateMutation.mutate({
      id: editingTemplate.id,
      data: editForm,
    });
  };

  const handleDelete = (template: NotificationTemplate) => {
    deleteMutation.mutate(template.id);
  };

  const getTypeLabel = (type: string) => {
    return type === 'purchase' ? 'Kauf' : type === 'borrow' ? 'Ausleihe' : type;
  };

  const getTypeColor = (type: string) => {
    return type === 'purchase' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <MessageSquare className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Benachrichtigungsvorlagen</h2>
      </div>
      
      <p className="text-gray-600">
        Verwalten Sie die Nachrichten, die Benutzern nach Käufen und Ausleihen angezeigt werden.
      </p>

      <div className="space-y-4">
        {templates.map((template: NotificationTemplate) => (
          <Card key={template.id} className="border-l-4 border-l-primary">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge className={getTypeColor(template.type)}>
                    {getTypeLabel(template.type)}
                  </Badge>
                  <Badge variant={template.isActive ? "default" : "outline"}>
                    {template.isActive ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(template)}
                    disabled={editingTemplate?.id === template.id}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Vorlage löschen</AlertDialogTitle>
                        <AlertDialogDescription>
                          Sind Sie sich sicher, dass Sie diese Benachrichtigungsvorlage löschen möchten? 
                          Diese Aktion kann nicht rückgängig gemacht werden.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(template)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Löschen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editingTemplate?.id === template.id ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Titel</Label>
                    <Input
                      id="title"
                      value={editForm.title}
                      onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Benachrichtungstitel"
                    />
                  </div>
                  <div>
                    <Label htmlFor="message">Nachricht</Label>
                    <Textarea
                      id="message"
                      value={editForm.message}
                      onChange={(e) => setEditForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Benachrichtigungstext"
                      rows={4}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={editForm.isActive}
                      onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label>Aktiv</Label>
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <Button onClick={saveEdit} disabled={updateMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      Speichern
                    </Button>
                    <Button variant="outline" onClick={cancelEdit}>
                      <X className="h-4 w-4 mr-2" />
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{template.title}</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{template.message}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="text-center p-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Keine Benachrichtigungsvorlagen gefunden
            </h3>
            <p className="text-gray-500">
              Es wurden noch keine Benachrichtigungsvorlagen erstellt.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}