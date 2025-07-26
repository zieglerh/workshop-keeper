import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users as UsersIcon, Shield, User, Clock, UserCheck, UserX, LogOut } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User as UserType } from "@shared/schema";
import { format } from "date-fns";

export default function Users() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  const handleLogout = async () => {
    try {
      await apiRequest('/api/logout', {
        method: 'POST',
      });
      
      toast({
        title: "Erfolgreich abgemeldet",
        description: "Auf Wiedersehen!",
      });
      
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Fehler beim Abmelden",
        description: "Es gab ein Problem beim Abmelden",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Nicht authentifiziert",
        description: "Sie sind nicht angemeldet. Weiterleitung zur Anmeldung...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    retry: false,
    enabled: isAuthenticated && user?.role === 'admin',
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Nicht autorisiert",
          description: "Sie sind nicht berechtigt, diese Seite anzuzeigen.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }
    },
  });

  const { data: pendingUsers = [], isLoading: pendingLoading } = useQuery({
    queryKey: ["/api/users/pending"],
    retry: false,
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest(`/api/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/pending"] });
      toast({
        title: "Erfolgreich",
        description: "Benutzerrolle wurde aktualisiert",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Aktualisieren der Benutzerrolle",
        variant: "destructive",
      });
    },
  });

  const activateUserMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest(`/api/users/${userId}/activate`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/pending"] });
      toast({
        title: "Benutzer freigeschaltet",
        description: "Der Benutzer wurde erfolgreich aktiviert",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Freischalten des Benutzers",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !isAuthenticated) {
    return null;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Sie haben keine Berechtigung, diese Seite anzuzeigen. Nur Administratoren können Benutzer verwalten.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive"><Shield className="w-3 h-3 mr-1" />Administrator</Badge>;
      case 'user':
        return <Badge variant="secondary"><User className="w-3 h-3 mr-1" />Benutzer</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Wartend</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const activeUsers = users.filter((u: UserType) => u.role !== 'pending');

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center">
                <UsersIcon className="mr-3 h-8 w-8" />
                Benutzerverwaltung
              </h1>
              <p className="text-muted-foreground">Verwalten Sie Benutzerkonten und Berechtigungen</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Abmelden
            </Button>
          </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending" className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Wartende Freischaltungen</span>
                {pendingUsers.length > 0 && (
                  <Badge variant="destructive" className="ml-2">{pendingUsers.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="active" className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4" />
                <span>Aktive Benutzer</span>
                <Badge variant="secondary" className="ml-2">{activeUsers.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    Wartende Registrierungen
                  </CardTitle>
                  <CardDescription>
                    Neue Benutzer, die auf Admin-Freischaltung warten
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : pendingUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <UserCheck className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>Keine wartenden Registrierungen</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingUsers.map((pendingUser: UserType) => (
                        <div key={pendingUser.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                                <User className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-medium">{pendingUser.firstName && pendingUser.lastName 
                                  ? `${pendingUser.firstName} ${pendingUser.lastName}` 
                                  : pendingUser.username}</p>
                                <p className="text-sm text-muted-foreground">@{pendingUser.username}</p>
                                {pendingUser.email && (
                                  <p className="text-sm text-muted-foreground">{pendingUser.email}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Registriert: {format(new Date(pendingUser.createdAt!), 'dd.MM.yyyy HH:mm')}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              onClick={() => activateUserMutation.mutate({ userId: pendingUser.id, role: 'user' })}
                              disabled={activateUserMutation.isPending}
                            >
                              <UserCheck className="w-4 h-4 mr-1" />
                              Als Benutzer freischalten
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => activateUserMutation.mutate({ userId: pendingUser.id, role: 'admin' })}
                              disabled={activateUserMutation.isPending}
                            >
                              <Shield className="w-4 h-4 mr-1" />
                              Als Admin freischalten
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="active">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserCheck className="mr-2 h-5 w-5" />
                    Aktive Benutzer
                  </CardTitle>
                  <CardDescription>
                    Alle aktiven Benutzerkonten mit ihren Rollen
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : activeUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <UsersIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>Keine aktiven Benutzer</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeUsers.map((activeUser: UserType) => (
                        <div key={activeUser.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                                {activeUser.role === 'admin' ? (
                                  <Shield className="h-5 w-5 text-red-600" />
                                ) : (
                                  <User className="h-5 w-5" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <p className="font-medium">{activeUser.firstName && activeUser.lastName 
                                    ? `${activeUser.firstName} ${activeUser.lastName}` 
                                    : activeUser.username}</p>
                                  {getRoleBadge(activeUser.role!)}
                                </div>
                                <p className="text-sm text-muted-foreground">@{activeUser.username}</p>
                                {activeUser.email && (
                                  <p className="text-sm text-muted-foreground">{activeUser.email}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Erstellt: {format(new Date(activeUser.createdAt!), 'dd.MM.yyyy HH:mm')}
                                </p>
                              </div>
                            </div>
                          </div>
                          {activeUser.id !== user?.id && (
                            <div className="flex items-center space-x-2">
                              <Select
                                defaultValue={activeUser.role!}
                                onValueChange={(role) => updateRoleMutation.mutate({ userId: activeUser.id, role })}
                                disabled={updateRoleMutation.isPending}
                              >
                                <SelectTrigger className="w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">Benutzer</SelectItem>
                                  <SelectItem value="admin">Administrator</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}