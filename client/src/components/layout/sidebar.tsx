import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: "fas fa-home" },
  { name: "Inventory", href: "/inventory", icon: "fas fa-boxes" },
  { name: "Categories", href: "/categories", icon: "fas fa-tags", adminOnly: true },
  { name: "Borrowing", href: "/borrowing", icon: "fas fa-exchange-alt" },
  { name: "Sales", href: "/sales", icon: "fas fa-shopping-cart" },
  { name: "Users", href: "/users", icon: "fas fa-users", adminOnly: true },
];

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const filteredNavigation = navigation.filter(item => 
    !item.adminOnly || user?.role === 'admin'
  );

  return (
    <aside className="w-64 bg-surface shadow-material-lg fixed h-full z-10 lg:relative">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-tools text-white text-sm"></i>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">WorkshopTracker</h1>
            <p className="text-sm text-gray-500">Inventory Manager</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4 space-y-2">
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
            <i className={`${item.icon} w-5`}></i>
            <span>{item.name}</span>
          </button>
        ))}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-surface">
        <div className="flex items-center space-x-3">
          {user?.profileImageUrl ? (
            <img 
              src={user.profileImageUrl} 
              alt={user.name || user.email || ''} 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name || user?.email}
            </p>
            <p className="text-xs text-gray-500">
              {user?.role === 'admin' ? 'Admin' : 'User'}
            </p>
          </div>
          <button 
            onClick={() => window.location.href = "/api/logout"}
            className="text-gray-400 hover:text-gray-600"
            title="Sign out"
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
    </aside>
  );
}
