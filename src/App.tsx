import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { RequireAuth } from './components/RequireAuth'
import { CreateGroup } from './pages/CreateGroup'
import { EditGroup } from './pages/EditGroup'
import { GroupDetail } from './pages/GroupDetail'
import { Groups } from './pages/Groups'
import { History } from './pages/History'
import { Home } from './pages/Home'
import { JoinGroup } from './pages/JoinGroup'
import { Login } from './pages/Login'
import { Pay } from './pages/Pay'
import { PaySuccess } from './pages/PaySuccess'
import { Settings } from './pages/Settings'
import { Signup } from './pages/Signup'
import { Wallet } from './pages/Wallet'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/new" element={<CreateGroup />} />
          <Route path="/groups/join" element={<JoinGroup />} />
          <Route path="/groups/:groupId" element={<GroupDetail />} />
          <Route path="/groups/:groupId/edit" element={<EditGroup />} />
          <Route path="/groups/:groupId/pay" element={<Pay />} />
          <Route path="/groups/:groupId/pay/success" element={<PaySuccess />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
