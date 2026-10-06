import { useEffect, useState } from 'react'
import { apiGet } from './api.js'
import { addDays, localDate } from './appointmentUtils.js'
import { formatINR, formatINRWhole } from './format.js'
import { ExternalLinkIcon, SearchIcon, StarIcon } from './Icons.jsx'
import './MasterPage.css'
import './BillingHistoryPage.css'

const RANGES = [
  { id: 'today', label: 'Today', days: 0 },
  { id: 'week', label: '7 days', days: 6 },
  { id: 'month', label: '30 days', days: 29 },
]

function invoiceTabUrl(id) {
  return `${window.location.pathname}?invoice=${id}`
}

function openInvoice(id) {
  window.open(invoiceTabUrl(id), '_blank')
}

function formatWhen(value) {
  const when = new Date(value)
  return {
    date: when.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: when.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
  }
}

function itemSummary(invoice) {
  const parts = []
  if (invoice.services) parts.push(`${invoice.services} ${invoice.services === 1 ? 'service' : 'services'}`)
  if (invoice.products) parts.push(`${invoice.products} ${invoice.products === 1 ? 'product' : 'products'}`)
  return parts.join(' · ') || '—'
}

function BillingHistoryPage() {
  const today = localDate()
  const [from, setFrom] = useState(() => addDays(today, -29))
  const [to, setTo] = useState(today)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [data, setData] = useState(null)
  const [loadedKey, setLoadedKey] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  const requestKey = `${from}|${to}|${search}`

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (search) params.set('q', search)
    apiGet(`/api/invoices?${params}`, { signal: controller.signal })
      .then((result) => {
        setData(result)
        setLoadedKey(requestKey)
        setError('')
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setLoadedKey(requestKey)
      })
    return () => controller.abort()
  }, [from, to, search, requestKey])

  const loading = loadedKey !== requestKey
  const invoices = data?.invoices ?? []
  const summary = data?.summary
  const activeRange = to === today ? RANGES.find((r) => from === addDays(today, -r.days))?.id : null

  function pickRange(days) {
    setFrom(addDays(today, -days))
    setTo(today)
  }

  return (
    <div className="master-page bh-page">
      <header className="master-header">
        <h1 className="master-title">Billing History</h1>
      </header>

      <div className="bh-body">
        <dl className="bh-stats">
          <div>
            <dt>Invoices</dt>
            <dd>{summary ? summary.count.toLocaleString('en-IN') : '—'}</dd>
          </div>
          <div>
            <dt>Revenue</dt>
            <dd>{summary ? formatINRWhole(summary.revenue) : '—'}</dd>
          </div>
          <div>
            <dt>GST collected</dt>
            <dd>{summary ? formatINRWhole(summary.gst) : '—'}</dd>
          </div>
          <div>
            <dt>Discounts given</dt>
            <dd>{summary ? formatINRWhole(summary.discounts) : '—'}</dd>
          </div>
        </dl>

        <div className="master-toolbar">
          <label className="master-search">
            <SearchIcon />
            <span className="sr-only">Search invoices</span>
            <input
              type="search"
              placeholder="Invoice number, customer or phone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="bh-filters">
            <div className="master-filter" role="group" aria-label="Quick date range">
              {RANGES.map((r) => (
                <button key={r.id} type="button" aria-pressed={activeRange === r.id} onClick={() => pickRange(r.days)}>
                  {r.label}
                </button>
              ))}
            </div>
            <label className="bh-date">
              <span>From</span>
              <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="bh-date">
              <span>To</span>
              <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
        </div>

        {error && (
          <p className="master-alert is-error" role="alert">
            {error}
          </p>
        )}

        <div className="master-table-wrap">
          <table className="master-table bh-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Items</th>
                <th className="is-right">Discounts</th>
                <th className="is-right">Total</th>
                <th className="is-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={7} className="master-empty">
                    Loading invoices…
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="master-empty">
                    No invoices {search ? 'match your search' : 'in this date range'}.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const when = formatWhen(inv.createdAt)
                  const discounts = inv.discount + inv.loyaltyDiscount
                  return (
                    <tr
                      key={inv.id}
                      className={`bh-row ${loading ? 'is-stale' : ''}`}
                      onClick={() => openInvoice(inv.id)}
                      title="Open invoice in a new tab"
                    >
                      <td>
                        <span className="master-cell-value is-mono">{inv.invoiceNumber}</span>
                        {inv.appointmentId && <span className="master-cell-detail">From appointment</span>}
                      </td>
                      <td>
                        <span className="master-cell-value">{when.date}</span>
                        <span className="master-cell-detail">{when.time}</span>
                      </td>
                      <td>
                        {inv.customerName ? (
                          <>
                            <span className="master-cell-value">{inv.customerName}</span>
                            <span className="master-cell-detail mono">{inv.customerPhone}</span>
                          </>
                        ) : (
                          <span className="bh-walkin">Walk-in</span>
                        )}
                      </td>
                      <td>
                        <span className="master-cell-value bh-items">{itemSummary(inv)}</span>
                        {inv.starsEarned > 0 && (
                          <span className="master-cell-detail bh-stars">
                            <StarIcon filled />+{inv.starsEarned}
                          </span>
                        )}
                      </td>
                      <td className="is-right">
                        {discounts > 0 ? (
                          <>
                            <span className="master-cell-value is-mono bh-discount">−{formatINR(discounts)}</span>
                            <span className="master-cell-detail">
                              {[inv.freeServiceUsed && 'Free service', inv.couponCode].filter(Boolean).join(' · ')}
                            </span>
                          </>
                        ) : (
                          <span className="bh-muted">—</span>
                        )}
                      </td>
                      <td className="is-right">
                        <span className="master-cell-value is-mono">{formatINR(inv.total)}</span>
                        <span className="master-cell-detail">GST {formatINR(inv.gst)}</span>
                      </td>
                      <td className="is-right">
                        <a
                          className="master-text-button bh-open"
                          href={invoiceTabUrl(inv.id)}
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            openInvoice(inv.id)
                          }}
                        >
                          View
                          <ExternalLinkIcon />
                        </a>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {data && data.invoices.length >= data.limit && (
          <p className="bh-note">
            Showing the latest {data.limit} invoices. Narrow the date range to see older ones.
          </p>
        )}
      </div>
    </div>
  )
}

export default BillingHistoryPage
