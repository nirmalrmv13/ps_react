import { useEffect, useState } from 'react'
import { apiGet } from './api.js'
import { STATUS, addDays, localDate } from './appointmentUtils.js'
import { formatINR, formatINRWhole } from './format.js'
import { CardIcon, ChartIcon, PrintIcon, ReceiptIcon, UsersIcon } from './Icons.jsx'
import './MasterPage.css'
import './BillingHistoryPage.css'
import './ReportsPage.css'

const MAX_DAILY_BARS = 62

const shortDay = (day) =>
  new Date(`${day}T00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
const shortMonth = (month) =>
  new Date(`${month}-01T00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })

function compactINR(value) {
  const trim = (n) => n.toFixed(1).replace(/\.0$/, '')
  if (value >= 100000) return `₹${trim(value / 100000)}L`
  if (value >= 1000) return `₹${trim(value / 1000)}k`
  return `₹${Math.round(value)}`
}

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

function presets(today) {
  return [
    { id: 'today', label: 'Today', from: today },
    { id: 'week', label: '7 days', from: addDays(today, -6) },
    { id: 'month', label: '30 days', from: addDays(today, -29) },
    { id: 'calendar', label: 'This month', from: `${today.slice(0, 8)}01` },
    { id: 'quarter', label: '90 days', from: addDays(today, -89) },
  ]
}

/** One bar per day for short ranges, one per month for longer ones, with empty days filled in. */
function buildBuckets(from, to, daily) {
  const byDay = new Map(daily.map((d) => [d.day, d]))
  const days = []
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day)

  if (days.length <= MAX_DAILY_BARS) {
    return days.map((day) => ({
      key: day,
      label: shortDay(day),
      revenue: byDay.get(day)?.revenue ?? 0,
      invoices: byDay.get(day)?.invoices ?? 0,
    }))
  }

  const months = new Map()
  for (const day of days) {
    const key = day.slice(0, 7)
    const entry = months.get(key) ?? { key, label: shortMonth(key), revenue: 0, invoices: 0 }
    entry.revenue += byDay.get(day)?.revenue ?? 0
    entry.invoices += byDay.get(day)?.invoices ?? 0
    months.set(key, entry)
  }
  return [...months.values()]
}

function Delta({ current, previous }) {
  if (!previous) return null
  const change = Math.round(((current - previous) / previous) * 100)
  const tone = change > 0 ? 'is-up' : change < 0 ? 'is-down' : 'is-flat'
  const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→'
  return (
    <span className={`rpt-delta ${tone}`} title="Compared with the previous period of the same length">
      {arrow} {Math.abs(change)}%
    </span>
  )
}

function Kpi({ icon, tone, label, value, current, previous, note }) {
  return (
    <div className="rpt-kpi">
      <div className="rpt-kpi-top">
        <span className={`rpt-kpi-icon is-${tone}`}>{icon}</span>
        <Delta current={current} previous={previous} />
      </div>
      <dt>{label}</dt>
      <dd>{value}</dd>
      <span className="rpt-kpi-note">{note}</span>
    </div>
  )
}

function RevenueChart({ buckets }) {
  const max = Math.max(...buckets.map((b) => b.revenue), 0)
  const labelEvery = Math.ceil(buckets.length / 10)
  const peak = buckets.findIndex((b) => b.revenue === max)

  if (max === 0) {
    return <p className="rpt-empty">No sales in this period.</p>
  }
  return (
    <div className="rpt-chart-wrap">
      <div className="rpt-axis" aria-hidden="true">
        <span>{compactINR(max)}</span>
        <span>{compactINR(max / 2)}</span>
        <span>₹0</span>
      </div>
      <div className="rpt-chart" role="img" aria-label="Revenue over the selected period">
        {buckets.map((b, index) => (
          <div key={b.key} className="rpt-bar-col">
            <span className="rpt-bar-track">
              <span
                className={`rpt-bar ${index === peak ? 'is-peak' : ''}`}
                style={{ height: `${(b.revenue / max) * 100}%` }}
              />
              <span
                className={`rpt-tip ${index < buckets.length / 4 ? 'is-start' : index >= (buckets.length * 3) / 4 ? 'is-end' : ''}`}
              >
                <strong>{formatINR(b.revenue)}</strong>
                {b.label} · {b.invoices} {b.invoices === 1 ? 'bill' : 'bills'}
              </span>
            </span>
            <span className="rpt-bar-label">{index % labelEvery === 0 ? b.label : ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RankList({ rows, empty, value = (r) => r.revenue, detail }) {
  if (rows.length === 0) return <p className="rpt-empty">{empty}</p>
  const max = Math.max(...rows.map(value), 0)
  return (
    <ol className="rpt-rank">
      {rows.map((row, index) => (
        <li key={row.key ?? row.id ?? row.name}>
          <span className="rpt-rank-no">{index + 1}</span>
          <div className="rpt-rank-body">
            <div className="rpt-rank-top">
              <span className="rpt-rank-name">{row.name}</span>
              <span className="rpt-rank-value">{formatINR(value(row))}</span>
            </div>
            <span className="rpt-share">
              <span style={{ width: `${max ? (value(row) / max) * 100 : 0}%` }} />
            </span>
            {detail && <span className="rpt-rank-detail">{detail(row)}</span>}
          </div>
        </li>
      ))}
    </ol>
  )
}

const SELLER_TABS = [
  { id: 'services', label: 'Services' },
  { id: 'products', label: 'Products' },
  { id: 'categories', label: 'Categories' },
]

function TopSellers({ report }) {
  const [tab, setTab] = useState('services')
  const rows = {
    services: report.services.slice(0, 6),
    products: report.products.slice(0, 6),
    categories: report.categories.slice(0, 6).map((c) => ({ ...c, key: `${c.type}:${c.category}`, name: c.category })),
  }[tab]

  return (
    <Panel
      title="Top sellers"
      action={
        <div className="rpt-tabs no-print" role="tablist" aria-label="Top sellers">
          {SELLER_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      }
    >
      <RankList
        rows={rows}
        empty={tab === 'products' ? 'No products sold.' : 'No services billed.'}
        detail={(r) =>
          tab === 'categories'
            ? `${r.type[0].toUpperCase()}${r.type.slice(1)} · ${r.quantity} sold`
            : `${r.quantity} sold · ${r.category}`
        }
      />
    </Panel>
  )
}

function TopCustomers({ customers }) {
  if (customers.length === 0) return <p className="rpt-empty">No registered customers billed.</p>
  return (
    <ul className="rpt-people">
      {customers.slice(0, 6).map((c) => (
        <li key={c.id}>
          <span className="rpt-avatar">{initials(c.name)}</span>
          <div>
            <strong>{c.name}</strong>
            <span>
              {c.visits} {c.visits === 1 ? 'visit' : 'visits'} · {c.phone}
            </span>
          </div>
          <span className="rpt-rank-value">{formatINR(c.spent)}</span>
        </li>
      ))}
    </ul>
  )
}

function AppointmentMix({ counts }) {
  const entries = Object.entries(STATUS)
    .map(([status, { label, tone }]) => ({ status, label, tone, count: counts[status] ?? 0 }))
    .filter((e) => e.count > 0)
  const total = entries.reduce((sum, e) => sum + e.count, 0)
  if (total === 0) return <p className="rpt-empty">No appointments in this period.</p>

  const completed = counts.completed ?? 0
  return (
    <>
      <p className="rpt-big">
        {total} <span>booked · {Math.round((completed / total) * 100)}% completed</span>
      </p>
      <div className="rpt-stack" aria-hidden="true">
        {entries.map((e) => (
          <span key={e.status} className={`is-${e.tone}`} style={{ width: `${(e.count / total) * 100}%` }} />
        ))}
      </div>
      <ul className="rpt-legend">
        {entries.map((e) => (
          <li key={e.status}>
            <span className={`rpt-dot is-${e.tone}`} />
            {e.label}
            <strong>{e.count}</strong>
          </li>
        ))}
      </ul>
    </>
  )
}

function Panel({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`rpt-panel ${className}`}>
      <header>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

function ReportsPage() {
  const today = localDate()
  const [from, setFrom] = useState(() => addDays(today, -29))
  const [to, setTo] = useState(today)
  const [report, setReport] = useState(null)
  const [loadedKey, setLoadedKey] = useState(null)
  const [error, setError] = useState('')

  const requestKey = `${from}|${to}`

  useEffect(() => {
    if (!from || !to || from > to) return
    const controller = new AbortController()
    apiGet(`/api/reports?from=${from}&to=${to}`, { signal: controller.signal })
      .then((data) => {
        setReport(data)
        setLoadedKey(requestKey)
        setError('')
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setLoadedKey(requestKey)
      })
    return () => controller.abort()
  }, [from, to, requestKey])

  const loading = loadedKey !== requestKey
  const activePreset = to === today ? presets(today).find((p) => p.from === from)?.id : null
  const sales = report?.sales
  const previous = report?.previous
  const discounts = sales ? sales.couponDiscounts + sales.loyaltyDiscounts + sales.membershipDiscounts : 0
  const membershipRevenue = report?.memberships.reduce((sum, m) => sum + m.revenue, 0) ?? 0
  const membershipsSold = report?.memberships.reduce((sum, m) => sum + Number(m.quantity), 0) ?? 0
  const commissionTotal = report?.staff.reduce((sum, s) => sum + s.commission, 0) ?? 0
  const buckets = report ? buildBuckets(report.from, report.to, report.daily) : []
  const monthly = buckets[0]?.key.length === 7

  return (
    <div className="master-page rpt-page">
      <header className="master-header">
        <div>
          <h1 className="master-title">Reports</h1>
          {report && (
            <p className="rpt-subtitle">
              {shortDay(report.from)} – {shortDay(report.to)} {report.to.slice(0, 4)}
              {loading && ' · updating…'}
            </p>
          )}
        </div>
        <button type="button" className="master-add no-print" onClick={() => window.print()} disabled={!report}>
          <PrintIcon />
          Print
        </button>
      </header>

      <div className="rpt-body">
        <div className="rpt-toolbar no-print">
          <div className="master-filter" role="group" aria-label="Quick date range">
            {presets(today).map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={activePreset === p.id}
                onClick={() => {
                  setFrom(p.from)
                  setTo(today)
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="bh-filters">
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

        {!report ? (
          !error && <p className="rpt-empty">Loading reports…</p>
        ) : (
          <div className={`rpt-content ${loading ? 'is-stale' : ''}`}>
            <dl className="rpt-kpis">
              <Kpi
                icon={<ChartIcon />}
                tone="green"
                label="Revenue"
                value={formatINRWhole(sales.revenue)}
                current={sales.revenue}
                previous={previous.revenue}
                note={`${formatINRWhole(sales.netSales)} before GST`}
              />
              <Kpi
                icon={<ReceiptIcon />}
                tone="gold"
                label="Bills"
                value={sales.invoices.toLocaleString('en-IN')}
                current={sales.invoices}
                previous={previous.invoices}
                note={`${sales.walkIns} walk-in ${sales.walkIns === 1 ? 'bill' : 'bills'}`}
              />
              <Kpi
                icon={<CardIcon />}
                tone="terracotta"
                label="Average bill"
                value={formatINRWhole(sales.averageBill)}
                current={sales.averageBill}
                previous={previous.averageBill}
                note="Per bill, including GST"
              />
              <Kpi
                icon={<UsersIcon />}
                tone="mint"
                label="Customers"
                value={sales.customers.toLocaleString('en-IN')}
                current={sales.customers}
                previous={previous.customers}
                note={`${sales.newCustomers} new this period`}
              />
            </dl>

            <Panel
              title="Revenue"
              subtitle={`Per ${monthly ? 'month' : 'day'}, including GST · hover a bar for details`}
              className="rpt-trend"
              action={
                <div className="rpt-trend-total">
                  <strong>{formatINR(sales.revenue)}</strong>
                  <span>{sales.invoices} bills</span>
                </div>
              }
            >
              <RevenueChart buckets={buckets} />
            </Panel>

            <div className="rpt-grid">
              <TopSellers report={report} />
              <Panel title="Top customers" subtitle="By amount spent">
                <TopCustomers customers={report.topCustomers} />
              </Panel>
            </div>

            <Panel title="Staff performance" subtitle="Services checked out from appointments">
              {report.staff.length === 0 ? (
                <p className="rpt-empty">No appointments were billed in this period.</p>
              ) : (
                <table className="rpt-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th className="is-right">Services</th>
                      <th className="is-right">Service value</th>
                      <th className="is-right">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.staff.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div className="rpt-person">
                            <span className="rpt-avatar">{initials(s.name)}</span>
                            <div>
                              <strong>{s.name}</strong>
                              <span>{s.designation}</span>
                            </div>
                          </div>
                        </td>
                        <td className="is-right mono">{s.services}</td>
                        <td className="is-right mono">{formatINR(s.serviceValue)}</td>
                        <td className="is-right mono">
                          {formatINR(s.commission)}
                          <span className="rpt-rate">{s.commissionPercent}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}>Total commission payable</td>
                      <td className="is-right mono">{formatINR(commissionTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </Panel>

            <div className="rpt-grid is-thirds">
              <Panel title="Appointments">
                <AppointmentMix counts={report.appointments} />
              </Panel>

              <Panel title="Memberships">
                <p className="rpt-big">
                  {report.activeMembers} <span>active members today</span>
                </p>
                <ul className="rpt-kv">
                  <li>
                    <span>Sold this period</span>
                    <strong>{membershipsSold}</strong>
                  </li>
                  <li>
                    <span>Membership revenue</span>
                    <strong>{formatINR(membershipRevenue)}</strong>
                  </li>
                  <li>
                    <span>Member discounts given</span>
                    <strong>{formatINR(sales.membershipDiscounts)}</strong>
                  </li>
                </ul>
              </Panel>

              <Panel title="Tax, discounts & purchases">
                <ul className="rpt-kv">
                  <li>
                    <span>GST collected</span>
                    <strong>{formatINR(sales.gst)}</strong>
                  </li>
                  <li>
                    <span>All discounts</span>
                    <strong>{formatINR(discounts)}</strong>
                  </li>
                  <li>
                    <span>Stock purchased</span>
                    <strong>{formatINR(report.purchases.total)}</strong>
                  </li>
                  <li>
                    <span>Unpaid to suppliers</span>
                    <strong className={report.purchases.unpaid > 0 ? 'is-warn' : ''}>
                      {formatINR(report.purchases.unpaid)}
                    </strong>
                  </li>
                </ul>
              </Panel>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReportsPage
