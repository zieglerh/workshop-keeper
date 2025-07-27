import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto">
                <Wrench className="text-white h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">WorkshopTracker</h1>
              <p className="text-gray-600">Professional inventory management for workshops</p>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Sign in to access your workshop inventory, manage tools and equipment, track borrowing, and monitor your workshop's productivity.
              </p>
              
              <Button 
                onClick={() => window.location.href = "/api/login"}
                className="w-full bg-primary hover:bg-primary-dark text-white"
                size="lg"
              >
                Sign In
              </Button>
            </div>

            <div className="text-xs text-gray-500 border-t pt-4">
              <p>Secure authentication powered by Replit</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
