import { Link, Outlet, useLocation } from 'react-router-dom';
import { Compass, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Layout() {
  const location = useLocation();

  if (location.pathname === '/srt') {
    return <Outlet />;
  }

  const navItems = [
    { name: '提示词库', path: '/', icon: Compass },
    { name: 'SRT 引用', path: '/quick-ref', icon: Zap },
    { name: '管理后台', path: '/admin', icon: ShieldCheck },
  ];

  return (
    <div className="flex min-h-screen bg-[#1A1A1A] font-sans text-white">
      <aside className="fixed z-10 flex h-full w-64 flex-col border-r border-white/5 bg-[#1A1A1A]">
        <div className="p-6">
          <Link to="/" className="group flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-transform group-hover:rotate-12">
              <Zap className="h-6 w-6 fill-current text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">提示词库</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                  isActive ? 'bg-[#2A2A2A] text-white' : 'text-white/50 hover:bg-[#2A2A2A]/50'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive ? 'text-white' : 'group-hover:text-white')} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="ml-64 min-h-screen flex-1 bg-[#1A1A1A] p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
