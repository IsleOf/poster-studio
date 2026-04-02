import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import ErrorBoundary from './components/ErrorBoundary'

const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'))
const VerifyOrder = lazy(() => import('./components/VerifyOrder'))
const PosterRenderPage = lazy(() => import('./components/PosterRenderPage'))
const GalleryPage = lazy(() => import('./components/GalleryPage'))
const TemplateSelector = lazy(() => import('./components/TemplateSelector'))
const ListingPage = lazy(() => import('./components/ListingPage'))
const AdminLayout = lazy(() => import('./admin/AdminLayout'))

const PageFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#666' }}>
    Loading…
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<MainLayout />} />
          <Route path="/t/:templateId" element={<MainLayout />} />
          <Route path="/design" element={<TemplateSelector />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/verify" element={<VerifyOrder />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/l/:slug" element={<ListingPage />} />
          {/* Headless render target — used by server-side Puppeteer renderer */}
          <Route path="/render" element={<PosterRenderPage />} />
          <Route path="/admin/*" element={<AdminLayout />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
