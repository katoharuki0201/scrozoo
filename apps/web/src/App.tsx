import { Route, Routes } from 'react-router'
import { GuestOnlyRoute } from './features/auth/components/guest-only-route'
import { ProtectedRoute } from './features/auth/components/protected-route'
import { CreatorOnlyRoute } from './features/auth/components/creator-only-route'
import { ViewerOnlyRoute } from './features/auth/components/viewer-only-route'
import { HomePage } from './pages/home-page'
import { LoginPage } from './pages/login-page'
import { RegistrationPage } from './pages/registration-page'
import { NotFoundPage } from './pages/not-found-page'
import { SearchResultsPage } from './pages/search-results-page'
import { MyProfilePage } from './pages/my-profile-page'
import { ZooProfilePage } from './pages/zoo-profile-page'
import { AccountInformationPage } from './pages/account-information-page'
import { FavoritesPage } from './pages/favorites-page'
import { QrScanPage } from './pages/qr-scan-page'
import { GalleryCapturePage } from './pages/gallery-capture-page'
import { SupportPlansPage } from './pages/support-plans-page'
import { SupportGoalManagementPage } from './pages/support-goal-management-page'
import { CreatorPostCreationPage } from './pages/creator-post-creation-page'
import { CreatorSupportersPage } from './pages/creator-supporters-page'
import { CreatorVideoPage } from './pages/creator-video-page'

function App() {
  return (
    <Routes>
      <Route element={<GuestOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/mypage" element={<MyProfilePage />} />
        <Route path="/mypage/account" element={<AccountInformationPage />} />

        <Route element={<ViewerOnlyRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/scan" element={<QrScanPage />} />
          <Route path="/scan/capture/:sessionId" element={<GalleryCapturePage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/mypage/plans" element={<SupportPlansPage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/zoos/:zooId" element={<ZooProfilePage />} />
        </Route>

        <Route element={<CreatorOnlyRoute />}>
          <Route path="/mypage/support-goal" element={<SupportGoalManagementPage />} />
          <Route path="/mypage/posts/new" element={<CreatorPostCreationPage />} />
          <Route path="/mypage/videos/:videoId" element={<CreatorVideoPage />} />
          <Route path="/mypage/supporters" element={<CreatorSupportersPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
