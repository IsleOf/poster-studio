import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import PrivacyPolicy from './components/PrivacyPolicy'
import VerifyOrder from './components/VerifyOrder'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/verify" element={<VerifyOrder />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
