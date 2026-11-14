import { useEffect, useState } from 'react'
import { onUnauthorized } from './api.js'
import AppointmentsPage from './AppointmentsPage.jsx'
import BillingHistoryPage from './BillingHistoryPage.jsx'
import BillingPage from './BillingPage.jsx'
import BookingPage from './BookingPage.jsx'
import CustomersPage from './CustomersPage.jsx'
import InventoryPage from './InventoryPage.jsx'
import InvoiceView from './InvoiceView.jsx'
import Login from './Login.jsx'
import MasterPage from './MasterPage.jsx'
import { masterConfigs } from './masterConfigs.js'
import PurchasesPage from './PurchasesPage.jsx'
import ReceiptLabPage from './ReceiptLabPage.jsx'
import ReceiptPage from './ReceiptPage.jsx'
import ReportsPage from './ReportsPage.jsx'
import { clearSession, loadSession, saveSession } from './session.js'
import Sidebar from './Sidebar.jsx'

const params = new URLSearchParams(window.location.search)
const invoiceTabId = params.get('invoice')
const isBookingPage = params.has('book') || /\/book\/?$/.test(window.location.pathname)

const SHARED_PAGES = ['appointments', 'history', 'customers', 'receipt', 'receiptLab']
const ADMIN_PAGES = ['inventory', 'purchases', 'reports']

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

  if (isBookingPage) {
    return <BookingPage />
  }

  if (!session) {
    return <Login key={loginMessage} message={loginMessage} onLogin={handleLogin} />
  }

  if (invoiceTabId) {
    return <InvoiceView id={invoiceTabId} />
  }

  const isAdmin = session.user.role === 'admin'
  const activePage =
    SHARED_PAGES.includes(page) || (isAdmin && (ADMIN_PAGES.includes(page) || masterConfigs[page]))
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
        ) : activePage === 'customers' ? (
          <CustomersPage />
        ) : activePage === 'inventory' ? (
          <InventoryPage />
        ) : activePage === 'purchases' ? (
          <PurchasesPage />
        ) : activePage === 'reports' ? (
          <ReportsPage />
        ) : activePage === 'receipt' ? (
          <ReceiptPage />
        ) : activePage === 'receiptLab' ? (
          <ReceiptLabPage />
        ) : (
          <MasterPage key={activePage} config={masterConfigs[activePage]} />
        )}
      </div>
    </div>
  )
}

export default App
