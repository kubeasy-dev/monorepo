import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { getSessionFn } from '@/lib/auth.functions'

export const Route = createFileRoute('/_protected')({
  beforeLoad: async ({ location }) => {
    const session = await getSessionFn()
    if (!session) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
    return { user: session.user }
  },
  component: () => <Outlet />,
})
