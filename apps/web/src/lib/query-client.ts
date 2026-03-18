import { QueryClient } from '@tanstack/react-query'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,    // 1 min: avoid refetch after SSR hydration
        gcTime: 5 * 60 * 1000,   // 5 min: standard, never set to 0
      },
    },
  })
}
