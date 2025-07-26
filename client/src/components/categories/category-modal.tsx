import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCategorySchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect } from "react";
import type { Category } from "@shared/schema";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category;
}

const colorOptions = [
  { name: "Blue", value: "#1976D2" },
  { name: "Green", value: "#4CAF50" },
  { name: "Orange", value: "#FF9800" },
  { name: "Red", value: "#F44336" },
  { name: "Purple", value: "#9C27B0" },
  { name: "Teal", value: "#009688" },
  { name: "Indigo", value: "#3F51B5" },
  { name: "Pink", value: "#E91E63" },
  { name: "Brown", value: "#795548" },
  { name: "Gray", value: "#607D8B" },
];

export default function CategoryModal({ isOpen, onClose, category }: CategoryModalProps) {
  const { toast } = useToast();
  const isEditing = !!category;

  const form = useForm({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#1976D2",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (category) {
        form.reset({
          name: category.name,
          description: category.description || "",
          color: category.color,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          color: "#1976D2",
        });
      }
    }
  }, [isOpen, category, form]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        await apiRequest("PATCH", `/api/categories/${category.id}`, data);
      } else {
        await apiRequest("POST", "/api/categories", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Success",
        description: `Category ${isEditing ? 'updated' : 'created'} successfully`,
      });
      onClose();
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} category`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Category' : 'Add New Category'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Enter category name"
              className="mt-1"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              rows={3}
              placeholder="Enter category description"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Color</Label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => form.setValue("color", color.value)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    form.watch("color") === color.value
                      ? "border-gray-800 scale-110"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {form.watch("color") === color.value && (
                    <i className="fas fa-check text-white text-sm"></i>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending 
                ? (isEditing ? "Updating..." : "Creating...") 
                : (isEditing ? "Update Category" : "Create Category")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
