import { Navigate, Route, Routes } from 'react-router'
import LoginPage from './auth-login/page'
import AppShell from './components/ui/AppShell'
import Dashboard from './dashboard/page'
import TasksList from './tasks-list/page'
import EventsHistory from './events-history/page'
import EventDetails from './events-history/[id]/page'
import PeopleDirectory from './people-directory/page'
import PersonDetails from './people-directory/[id]/page'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/auth-login" element={<LoginPage />} />

      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tasks-list" element={<TasksList />} />
        <Route path="/events-history" element={<EventsHistory />} />
        <Route path="/events-history/:id" element={<EventDetails />} />
        <Route path="/people-directory" element={<PeopleDirectory />} />
        <Route path="/people-directory/:id" element={<PersonDetails />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
