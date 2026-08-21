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
import { CreatorVisitQrPage } from './pages/creator-visit-qr-page'
import { AdminGuestRoute } from './features/admin/components/admin-guest-route'
import { AdminProtectedRoute } from './features/admin/components/admin-protected-route'
import { AdminLayout } from './features/admin/components/admin-layout'
import { AdminLoginPage } from './pages/admin-login-page'
import { AdminDashboardPage } from './pages/admin-dashboard-page'
import { AdminUsersPage } from './pages/admin-users-page'
import { AdminSubscribersPage } from './pages/admin-subscribers-page'
import { AdminRevenuePage } from './pages/admin-revenue-page'
import { AdminCreatorsPage } from './pages/admin-creators-page'

function App() {
  return (
    <Routes>
      <Route element={<AdminGuestRoute />}>
        <Route path="/admin/login" element={<AdminLoginPage />} />
      </Route>

      <Route element={<AdminProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/subscribers" element={<AdminSubscribersPage />} />
          <Route path="/admin/revenue" element={<AdminRevenuePage />} />
          <Route path="/admin/creators" element={<AdminCreatorsPage />} />
        </Route>
      </Route>

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
          <Route path="/mypage/visit-qr" element={<CreatorVisitQrPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
