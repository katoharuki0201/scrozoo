import { Route, Routes } from 'react-router'
import { GuestOnlyRoute } from './features/auth/components/guest-only-route'
import { ProtectedRoute } from './features/auth/components/protected-route'
import { HomePage } from './pages/home-page'
import { LoginPage } from './pages/login-page'
import { NotFoundPage } from './pages/not-found-page'
import { SearchResultsPage } from './pages/search-results-page'
import { MyProfilePage } from './pages/my-profile-page'
import { ZooProfilePage } from './pages/zoo-profile-page'
import { AccountInformationPage } from './pages/account-information-page'
import { FavoritesPage } from './pages/favorites-page'
import { QrScanPage } from './pages/qr-scan-page'
import { GalleryCapturePage } from './pages/gallery-capture-page'

function App() {
  return (
    <Routes>
      <Route element={<GuestOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/scan" element={<QrScanPage />} />
        <Route path="/scan/capture/:sessionId" element={<GalleryCapturePage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/mypage" element={<MyProfilePage />} />
        <Route path="/mypage/account" element={<AccountInformationPage />} />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route path="/zoos/:zooId" element={<ZooProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
