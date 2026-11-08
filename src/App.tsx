import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/providers/AuthProvider'
import { router } from '@/routes/AppRoutes'

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
