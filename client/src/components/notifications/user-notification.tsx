import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, X } from "lucide-react";
import type { NotificationTemplate } from "@shared/schema";

interface UserNotificationProps {
  type: 'purchase' | 'borrow';
  isVisible: boolean;
  onClose: () => void;
}

export default function UserNotification({ type, isVisible, onClose }: UserNotificationProps) {
  const [show, setShow] = useState(false);

  const { data: template } = useQuery({
    queryKey: ["/api/notification-templates", type],
    enabled: isVisible,
  });

  useEffect(() => {
    if (isVisible && template) {
      setShow(true);
      // Auto-hide after 8 seconds
      const timeout = setTimeout(() => {
        handleClose();
      }, 8000);
      return () => clearTimeout(timeout);
    }
  }, [isVisible, template]);

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  if (!show || !template) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-96 max-w-md">
      <Card className={`transform transition-all duration-300 ${
        show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      } border-l-4 ${type === 'purchase' ? 'border-l-green-500 bg-green-50' : 'border-l-blue-500 bg-blue-50'} shadow-lg`}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className={`flex-shrink-0 ${
              type === 'purchase' ? 'text-green-600' : 'text-blue-600'
            }`}>
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold ${
                type === 'purchase' ? 'text-green-800' : 'text-blue-800'
              }`}>
                {template.title}
              </h3>
              <p className={`mt-1 text-sm ${
                type === 'purchase' ? 'text-green-700' : 'text-blue-700'
              } whitespace-pre-wrap`}>
                {template.message}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className={`flex-shrink-0 ${
                type === 'purchase' ? 'text-green-600 hover:text-green-800' : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}