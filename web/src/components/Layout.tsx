import { Outlet, NavLink } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Layers,
  Cpu,
  Package,
  Server,
  GitBranch,
  ScrollText,
  RefreshCw,
  Sun,
  Moon,
  LayoutGrid,
} from 'lucide-react'
import { useTheme } from '../theme/ThemeProvider'
import { useCluster } from '../contexts/ClusterContext'
import { useDashboard } from '../api/hooks'
import { CloudBurstLogo } from './CloudBurstLogo'

export function Layout() {
  const { theme, toggleTheme } = useTheme()
  const queryClient = useQueryClient()
  const { clusterId, clusters, setClusterId, isMultiCluster, apiClusterId } = useCluster()
  const { isLoading, dataUpdatedAt } = useDashboard(apiClusterId)
  const showLastUpdated = !!clusterId

  const clusterNav = clusterId
    ? [
        { to: `/clusters/${clusterId}/overview`, label: 'Overview', icon: LayoutDashboard },
        { to: `/clusters/${clusterId}/pods`, label: 'Pods', icon: Layers },
        { to: `/clusters/${clusterId}/nodeclaims`, label: 'Node Claims', icon: Cpu },
        { to: `/clusters/${clusterId}/nodepools`, label: 'Node Pools', icon: Package },
        { to: `/clusters/${clusterId}/nodes`, label: 'Nodes', icon: Server },
        { to: `/clusters/${clusterId}/graph`, label: 'Graph', icon: GitBranch },
        { to: `/clusters/${clusterId}/logs`, label: 'Logs', icon: ScrollText },
      ]
    : []

  const currentCluster = clusterId ? clusters.find((c) => c.id === clusterId) : null

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0d1117]">
      <header className="bg-gradient-to-r from-primary-500 to-primary-700 dark:from-[#0d1117] dark:to-[#161b22] dark:border-b dark:border-[#30363d] text-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <CloudBurstLogo size={28} />
              <h1 className="text-xl font-semibold">CloudBurst Dashboard</h1>
              {isMultiCluster && (
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
                      isActive ? 'bg-white/20' : 'hover:bg-white/10'
                    }`
                  }
                >
                  <LayoutGrid className="w-4 h-4" />
                  Fleet
                </NavLink>
              )}
              {currentCluster && (
                <span className="text-sm opacity-90 hidden sm:inline">
                  {currentCluster.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {isMultiCluster && clusters.length > 0 && (
                <select
                  value={clusterId ?? ''}
                  onChange={(e) => {
                    const id = e.target.value
                    if (id) setClusterId(id)
                  }}
                  className="bg-white/10 border border-white/20 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-white/50"
                >
                  <option value="">Select cluster</option>
                  {clusters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {!c.reachable ? '(unreachable)' : ''}
                    </option>
                  ))}
                </select>
              )}
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
          {showLastUpdated && dataUpdatedAt && (
            <p className="text-xs opacity-75 pb-2">
              Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <nav className="flex gap-1 px-4 sm:px-6 lg:px-8 border-t border-white/10">
          {clusterNav.length > 0 ? (
            clusterNav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to.endsWith('/overview')}
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
            ))
          ) : (
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  isActive
                    ? 'border-white text-white'
                    : 'border-transparent text-white/80 hover:text-white'
                }`
              }
            >
              <LayoutGrid className="w-4 h-4" />
              Fleet
            </NavLink>
          )}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  )
}
