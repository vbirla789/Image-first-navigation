import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import PDP from './pages/PDP'
import PRP from './pages/PRP'
import ImageView from './pages/ImageView'

const router = createBrowserRouter([
  { path: '/', element: <PDP /> },
  { path: '/reviews', element: <PRP /> },
  { path: '/image-view', element: <ImageView /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
