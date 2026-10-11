import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { AdminPage } from './pages/AdminPage'
import { ArchivePage } from './pages/ArchivePage'
import { AccountPage } from './pages/AccountPage'
import { DailyGamePage } from './pages/DailyGamePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { FriendsPage } from './pages/FriendsPage'

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DailyGamePage />} />
        <Route path="today" element={<Navigate replace to="/" />} />
        <Route path="archive" element={<ArchivePage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="friends" element={<FriendsPage />} />
        <Route path="friends/invite/:token" element={<FriendsPage />} />
        <Route path="challenges/:challengeId" element={<DailyGamePage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
