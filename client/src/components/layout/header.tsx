import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
  showAddButton?: boolean;
  onAddClick?: () => void;
  addButtonText?: string;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

export default function Header({
  title,
  subtitle,
  showAddButton = false,
  onAddClick,
  addButtonText = "Add Item",
  showSearch = false,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search inventory...",
}: HeaderProps) {
  return (
    <header className="bg-surface shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center space-x-4">
          {showSearch && (
            <div className="relative">
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-80 pl-10"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          )}
          {showAddButton && (
            <Button 
              onClick={onAddClick}
              className="bg-primary hover:bg-primary-dark text-white flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>{addButtonText}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
