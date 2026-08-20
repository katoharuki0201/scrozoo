import { Route, Routes } from 'react-router'
import { GuestOnlyRoute } from './features/auth/components/guest-only-route'
import { ProtectedRoute } from './features/auth/components/protected-route'
import { HomePage } from './pages/home-page'
import { LoginPage } from './pages/login-page'
import { NotFoundPage } from './pages/not-found-page'
import { PlaceholderPage } from './pages/placeholder-page'
import { SearchResultsPage } from './pages/search-results-page'

function App() {
  return (
    <Routes>
      <Route element={<GuestOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/scan" element={<PlaceholderPage title="QR読み込み" />} />
        <Route path="/favorites" element={<PlaceholderPage title="お気に入り" />} />
        <Route path="/mypage" element={<PlaceholderPage title="マイページ" />} />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route path="/zoos/:zooId" element={<PlaceholderPage title="動物園プロフィール" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
