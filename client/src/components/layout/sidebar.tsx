import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Home, Package, Tags, RefreshCw, ShoppingCart, Users, Wrench, User } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Categories", href: "/categories", icon: Tags, adminOnly: true },
  { name: "Borrowing", href: "/borrowing", icon: RefreshCw },
  { name: "Sales", href: "/sales", icon: ShoppingCart },
  { name: "Users", href: "/users", icon: Users, adminOnly: true },
];

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const filteredNavigation = navigation.filter(item => 
    !item.adminOnly || user?.role === 'admin'
  );

  return (
    <aside className="w-64 bg-surface shadow-material-lg fixed h-full z-10 lg:relative flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Wrench className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">WorkshopTracker</h1>
            <p className="text-sm text-gray-500">Inventory Manager</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4 space-y-2 flex-1">
        {filteredNavigation.map((item) => (
          <button
            key={item.name}
            onClick={() => setLocation(item.href)}
            className={cn(
              "w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors text-left",
              location === item.href
                ? "bg-primary/10 text-primary"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 bg-surface mt-auto">
        <button
          onClick={() => setLocation('/profile')}
          className="flex items-center space-x-3 w-full text-left hover:bg-gray-50 rounded-lg p-2 transition-colors group"
          title="Edit Profile"
        >
          {user?.profileImagePath ? (
            <img 
              src={`/${user.profileImagePath}`} 
              alt={user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username} 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : user?.profileImageUrl ? (
            <img 
              src={user.profileImageUrl} 
              alt={user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username} 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {user?.username?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary">
              {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.username}
            </p>
            <p className="text-xs text-gray-500">
              {user?.role === 'admin' ? 'Administrator' : 'User'}
            </p>
          </div>
          <User className="h-4 w-4 text-gray-400 group-hover:text-primary" />
        </button>
      </div>
    </aside>
  );
}
