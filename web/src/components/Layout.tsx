import { Outlet, NavLink } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { LayoutDashboard, Layers, Cpu, Package, Server, GitBranch, ScrollText, RefreshCw, Sun, Moon } from 'lucide-react'
import { useTheme } from '../theme/ThemeProvider'
import { useDashboard } from '../api/hooks'

export function Layout() {
  const { theme, toggleTheme } = useTheme()
  const queryClient = useQueryClient()
  const { isLoading, dataUpdatedAt } = useDashboard()

  const nav = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/pods', label: 'Pods', icon: Layers },
    { to: '/nodeclaims', label: 'Node Claims', icon: Cpu },
    { to: '/nodepools', label: 'Node Pools', icon: Package },
    { to: '/nodes', label: 'Nodes', icon: Server },
    { to: '/graph', label: 'Graph', icon: GitBranch },
    { to: '/logs', label: 'Logs', icon: ScrollText },
  ]

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-700 dark:to-primary-900 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold">CloudBurst Dashboard</h1>
            <p className="text-sm opacity-90 hidden sm:block">Pods & Node Lifecycle</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => queryClient.invalidateQueries()}
                className="p-2 rounded hover:bg-white/10 transition"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded hover:bg-white/10 transition"
                title={theme === 'light' ? 'Dark mode' : 'Light mode'}
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            </div>
          </div>
          {dataUpdatedAt && (
            <p className="text-xs opacity-75 pb-2">
              Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <nav className="flex gap-1 px-4 sm:px-6 lg:px-8 border-t border-white/10">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  isActive
                    ? 'border-white text-white'
                    : 'border-transparent text-white/80 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  )
}
