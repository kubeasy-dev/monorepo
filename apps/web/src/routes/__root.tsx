import { createRootRouteWithContext, Outlet, ScrollRestoration } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Kubeasy - Learn Kubernetes by Doing' },
    ],
    links: [{ rel: 'stylesheet', href: '/styles/globals.css' }],
  }),
  component: RootComponent,
})

function RootComponent() {
  const { queryClient } = Route.useRouteContext()
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <ScrollRestoration />
    </QueryClientProvider>
  )
}
