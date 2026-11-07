import Dashboard from './components/Dashboard'
import PreviewDashboard from './components/PreviewDashboard'
import './App.css'

function App() {
  const isPreview = import.meta.env.VITE_APP_MODE === 'preview'

  return isPreview ? <PreviewDashboard /> : <Dashboard />
}

export default App
