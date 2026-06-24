import { Link, Outlet, useLocation } from 'react-router-dom';
import { Compass, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Layout() {
  const location = useLocation();

  const isSRTMode = location.pathname === '/srt';

  if (isSRTMode) {
    return <Outlet />;
  }

  const navItems = [
    { name: '提示词库', path: '/', icon: Compass },
    { name: 'SRT 引用', path: '/quick-ref', icon: Zap },
  ];

  return (
    <div className="flex min-h-screen bg-[#1A1A1A] font-sans text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#1A1A1A] flex flex-col fixed h-full z-10">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white group-hover:rotate-12 transition-transform">
              <Zap className="w-6 h-6 fill-current text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">提示词库</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
                  isActive
                    ? "bg-[#2A2A2A] text-white"
                    : "hover:bg-[#2A2A2A]/50 text-white/50"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-white" : "group-hover:text-white")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 min-h-screen bg-[#1A1A1A]">
        <div className="max-w-7xl mx-auto space-y-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
