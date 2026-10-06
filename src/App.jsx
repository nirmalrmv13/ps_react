import { useEffect, useState } from 'react'
import { onUnauthorized } from './api.js'
import AppointmentsPage from './AppointmentsPage.jsx'
import BillingHistoryPage from './BillingHistoryPage.jsx'
import BillingPage from './BillingPage.jsx'
import InventoryPage from './InventoryPage.jsx'
import InvoiceView from './InvoiceView.jsx'
import Login from './Login.jsx'
import MasterPage from './MasterPage.jsx'
import { masterConfigs } from './masterConfigs.js'
import { clearSession, loadSession, saveSession } from './session.js'
import Sidebar from './Sidebar.jsx'

const invoiceTabId = new URLSearchParams(window.location.search).get('invoice')

function App() {
  const [session, setSession] = useState(loadSession)
  const [page, setPage] = useState('billing')
  const [checkout, setCheckout] = useState(null)
  const [loginMessage, setLoginMessage] = useState('')

  useEffect(
    () =>
      onUnauthorized((message) => {
        clearSession()
        setSession(null)
        setPage('billing')
        setCheckout(null)
        setLoginMessage(message || 'Please log in again.')
      }),
    [],
  )

  function handleLogin(newSession) {
    saveSession(newSession)
    setSession(newSession)
    setLoginMessage('')
  }

  function handleLogout() {
    clearSession()
    setSession(null)
    setPage('billing')
    setCheckout(null)
  }

  function navigate(nextPage) {
    setCheckout(null)
    setPage(nextPage)
  }

  function checkoutAppointment(appointment) {
    setCheckout(appointment)
    setPage('billing')
  }

  if (!session) {
    return <Login key={loginMessage} message={loginMessage} onLogin={handleLogin} />
  }

  if (invoiceTabId) {
    return <InvoiceView id={invoiceTabId} />
  }

  const isAdmin = session.user.role === 'admin'
  const activePage =
    page === 'appointments' ||
    page === 'history' ||
    (isAdmin && (page === 'inventory' || masterConfigs[page]))
      ? page
      : 'billing'

  return (
    <div className="app-shell">
      <Sidebar
        user={session.user}
        activePage={activePage}
        onNavigate={navigate}
        onLogout={handleLogout}
      />
      <div className="app-content">
        {activePage === 'billing' ? (
          <BillingPage key={checkout?.id ?? 'walk-in'} appointment={checkout} />
        ) : activePage === 'appointments' ? (
          <AppointmentsPage onCheckout={checkoutAppointment} />
        ) : activePage === 'history' ? (
          <BillingHistoryPage />
        ) : activePage === 'inventory' ? (
          <InventoryPage />
        ) : (
          <MasterPage key={activePage} config={masterConfigs[activePage]} />
        )}
      </div>
    </div>
  )
}

export default App
