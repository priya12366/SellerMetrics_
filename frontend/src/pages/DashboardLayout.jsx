import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  CreditCard, 
  Undo2, 
  Package, 
  BarChart2, 
  FileText, 
  Settings, 
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  TrendingUp,
  UploadCloud,
  Calendar
} from 'lucide-react';

const SIDEBAR_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { name: 'Upload Data', icon: UploadCloud, path: '/dashboard/upload' },
  { name: 'Orders', icon: ShoppingCart, path: '/dashboard/orders' },
  { name: 'Settlements', icon: CreditCard, path: '/dashboard/settlements' },
  { name: 'Returns', icon: Undo2, path: '/dashboard/returns' },
  { name: 'Products', icon: Package, path: '/dashboard/products' },
  { name: 'Product Costs', icon: Package, path: '/dashboard/product-costs' },
  { name: 'Period Analysis', icon: Calendar, path: '/dashboard/period-analysis' },
  { name: 'Profitability', icon: TrendingUp, path: '/dashboard/profitability' },
  { name: 'Analytics', icon: BarChart2, path: '/dashboard/analytics' },
  { name: 'Reports', icon: FileText, path: '/dashboard/reports' },
];

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        const response = await fetch('http://127.0.0.1:8000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Unauthorized');
        }
        const data = await response.json();
        setUser(data);
      } catch (err) {
        localStorage.removeItem('access_token');
        navigate('/login');
      }
    };
    fetchUser();
  }, [navigate]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  if (!user) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-medium">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 flex flex-col ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-slate-100">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
              <BarChart2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">SellerMetrics</span>
          </Link>
          <button onClick={toggleSidebar} className="lg:hidden p-1 text-slate-500 hover:bg-slate-100 rounded-md">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-100 p-4 space-y-1">
          <Link
            to="/dashboard/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
          >
            <Settings className="h-5 w-5 text-slate-400" />
            Settings
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-50"
          >
            <LogOut className="h-5 w-5 text-red-500" />
            Logout
          </Link>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* Top Navbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8 shadow-sm z-30">
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSidebar} 
              className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            {/* Search Bar (Desktop) */}
            <div className="hidden sm:flex relative w-96">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search orders, reports, or analytics..."
                className="block w-full rounded-full border-0 py-1.5 pl-10 pr-4 text-slate-900 bg-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            {/* Search (Mobile Icon) */}
            <button className="p-2 text-slate-400 hover:text-slate-500 sm:hidden">
              <Search className="h-5 w-5" />
            </button>

            {/* Notifications */}
            <button className="relative p-2 text-slate-400 hover:text-slate-500">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            </button>

            {/* Divider */}
            <div className="hidden sm:block h-6 w-px bg-slate-200"></div>

            {/* Profile Dropdown (UI Only) */}
            <button className="flex items-center gap-3 p-1 rounded-full hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-sm font-bold text-indigo-700 uppercase">
                {user.full_name.charAt(0)}
              </div>
              <div className="hidden lg:flex flex-col items-start">
                <span className="text-sm font-semibold text-slate-700 leading-tight">{user.full_name}</span>
                <span className="text-xs font-medium text-slate-500 leading-tight">{user.business_name}</span>
              </div>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          <Outlet context={{ user }} />
        </main>

      </div>
    </div>
  );
}
