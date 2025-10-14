import { Routes, Route } from 'react-router-dom'
import LogisticaDashboardNew from './LogisticaDashboardNew'

export default function Logistica() {
  return (
    <Routes>
      <Route path="/*" element={<LogisticaDashboardNew />} />
    </Routes>
  )
}

