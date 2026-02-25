import { useState } from 'react'
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
  BarChart2,
  Activity,
  RefreshCw,
  Sun,
  Moon,
  LayoutGrid,
  Menu,
  X,
} from 'lucide-react'
import { useTheme } from '../theme/ThemeProvider'
import { useCluster } from '../contexts/ClusterContext'
import { useDashboard } from '../api/hooks'
import { CloudBurstLogo } from './CloudBurstLogo'

const RESOURCES_NAV = [
  { to: 'overview', label: 'Overview', icon: LayoutDashboard },
  { to: 'pods', label: 'Pods', icon: Layers },
  { to: 'nodeclaims', label: 'Node Claims', icon: Cpu },
  { to: 'nodepools', label: 'Node Pools', icon: Package },
  { to: 'nodes', label: 'Nodes', icon: Server },
]
const OPERATIONS_NAV = [
  { to: 'graph', label: 'Graph', icon: GitBranch },
  { to: 'logs', label: 'Logs', icon: ScrollText },
  { to: 'metrics', label: 'Metrics', icon: BarChart2 },
  { to: 'events', label: 'Events', icon: Activity },
]

export function Layout() {
  const { theme, toggleTheme } = useTheme()
  const queryClient = useQueryClient()
  const { clusterId, clusters, setClusterId, isMultiCluster, apiClusterId } = useCluster()
  const { isLoading, dataUpdatedAt } = useDashboard(apiClusterId)
  const showLastUpdated = !!clusterId
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const clusterNav = clusterId
    ? [...RESOURCES_NAV, ...OPERATIONS_NAV].map((item) => ({
        ...item,
        to: `/clusters/${clusterId}/${item.to}`,
      }))
    : []

  const currentCluster = clusterId ? clusters.find((c) => c.id === clusterId) : null

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0d1117]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-gray-900 focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        Skip to main content
      </a>
      <header className="relative bg-gradient-to-r from-primary-500 to-primary-700 dark:from-[#0d1117] dark:to-[#161b22] dark:border-b dark:border-[#30363d] text-white shadow">
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
                  aria-label="Select cluster"
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
                className="p-2 rounded hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-white/50"
                title="Refresh"
                aria-label="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-white/50"
                title={theme === 'light' ? 'Dark mode' : 'Light mode'}
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
              {clusterNav.length > 0 && (
                <button
                  onClick={() => setMobileNavOpen((o) => !o)}
                  className="lg:hidden p-2 rounded hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-white/50"
                  aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
                  aria-expanded={mobileNavOpen}
                >
                  {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>
          {showLastUpdated && dataUpdatedAt && (
            <div className="flex items-center gap-2 pb-2">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 text-xs font-medium"
                title={`Last updated: ${new Date(dataUpdatedAt).toLocaleString()}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" aria-hidden />
                {new Date(dataUpdatedAt).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
        <nav
          className="border-t border-white/10"
          aria-label="Main navigation"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1">
          {clusterNav.length > 0 ? (
            <>
              <div className="hidden lg:flex flex-wrap gap-1">
                {clusterNav.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to.endsWith('/overview')}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-primary-600 ${
                        isActive
                          ? 'border-white text-white'
                          : 'border-transparent text-white/80 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" aria-hidden />
                    {label}
                  </NavLink>
                ))}
              </div>
              {mobileNavOpen && (
                <div
                  className="lg:hidden absolute left-0 right-0 top-full bg-primary-600 dark:bg-[#161b22] border-b border-white/10 shadow-lg z-40 max-h-[70vh] overflow-y-auto"
                  role="dialog"
                  aria-label="Navigation menu"
                >
                  <div className="px-4 py-3 space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/60 px-2 mb-2">
                        Resources
                      </p>
                      <div className="space-y-1">
                        {RESOURCES_NAV.map(({ to, label, icon: Icon }) => {
                          const fullTo = `/clusters/${clusterId}/${to}`
                          return (
                            <NavLink
                              key={fullTo}
                              to={fullTo}
                              end={to === 'overview'}
                              onClick={() => setMobileNavOpen(false)}
                              className={({ isActive }) =>
                                `flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition ${
                                  isActive ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/10'
                                }`
                              }
                            >
                              <Icon className="w-4 h-4" aria-hidden />
                              {label}
                            </NavLink>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/60 px-2 mb-2">
                        Operations
                      </p>
                      <div className="space-y-1">
                        {OPERATIONS_NAV.map(({ to, label, icon: Icon }) => {
                          const fullTo = `/clusters/${clusterId}/${to}`
                          return (
                            <NavLink
                              key={fullTo}
                              to={fullTo}
                              onClick={() => setMobileNavOpen(false)}
                              className={({ isActive }) =>
                                `flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition ${
                                  isActive ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/10'
                                }`
                              }
                            >
                              <Icon className="w-4 h-4" aria-hidden />
                              {label}
                            </NavLink>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
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
          </div>
        </nav>
      </header>
      <main
        id="main-content"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
        tabIndex={-1}
      >
        <Outlet />
      </main>
    </div>
  )
}
