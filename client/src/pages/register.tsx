import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, Wrench, ArrowLeft } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      setIsLoading(false);
      return;
    }

    // Validate required fields
    if (!formData.username || !formData.password) {
      setError('Benutzername und Passwort sind erforderlich');
      setIsLoading(false);
      return;
    }

    try {
      await apiRequest('POST', '/api/register', {
        username: formData.username,
        password: formData.password,
        email: formData.email || null,
        firstName: formData.firstName || null,
        lastName: formData.lastName || null,
        phone: formData.phone || null,
        lastName: formData.lastName || null,
      });

      setSuccess(true);
      toast({
        title: "Registrierung erfolgreich",
        description: "Ihr Konto wurde erstellt und wartet auf Admin-Freischaltung.",
      });

    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Registrierung fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <UserPlus className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-400">
              Registrierung erfolgreich!
            </CardTitle>
            <CardDescription>
              Ihr Konto wurde erstellt und wartet auf Freischaltung durch einen Administrator.
              Sie erhalten eine Benachrichtigung, sobald Ihr Konto aktiviert wurde.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation('/')}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zur Anmeldung
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Wrench className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Neues Konto erstellen</CardTitle>
          <CardDescription>
            Registrieren Sie sich für Zugang zur Workshop-Verwaltung
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Vorname</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  disabled={isLoading}
                  placeholder="Ihr Vorname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nachname</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  disabled={isLoading}
                  placeholder="Ihr Nachname"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-Mail-Adresse</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={isLoading}
                placeholder="ihre.email@beispiel.de"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefonnummer (optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={isLoading}
                placeholder="+49 123 456789"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Benutzername <span className="text-red-500">*</span></Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                required
                disabled={isLoading}
                placeholder="Ihr Benutzername"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Passwort <span className="text-red-500">*</span></Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
                disabled={isLoading}
                placeholder="Sicheres Passwort"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Passwort bestätigen <span className="text-red-500">*</span></Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                required
                disabled={isLoading}
                placeholder="Passwort wiederholen"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrierung läuft...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Registrieren
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => setLocation('/')}
              disabled={isLoading}
            >
              Bereits ein Konto? Zur Anmeldung
            </Button>
          </div>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Nach der Registrierung muss Ihr Konto von einem Administrator freigeschaltet werden.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}