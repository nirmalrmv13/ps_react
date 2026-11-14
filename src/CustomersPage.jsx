import { useEffect, useRef, useState } from 'react'
import { apiGet, apiPost, apiPut } from './api.js'
import { STATUS, addDays, formatClock, localDate } from './appointmentUtils.js'
import { formatDate, formatINR, formatINRWhole } from './format.js'
import { EditIcon, ExternalLinkIcon, GiftIcon, PlusIcon, SearchIcon, StarIcon, XIcon } from './Icons.jsx'
import './MasterPage.css'
import './InventoryPage.css'
import './CustomersPage.css'

const LAPSED_DAYS = 90

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'members', label: 'Members' },
  { id: 'reward', label: 'Free service ready' },
  { id: 'birthday', label: 'Birthdays this month' },
  { id: 'lapsed', label: `Not seen ${LAPSED_DAYS}+ days` },
]

const GENDERS = [
  { value: '', label: 'Not specified' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
]

const EMPTY_FORM = { name: '', phone: '', email: '', gender: '', birthday: '', notes: '' }

const dayDate = (day) => formatDate(`${day}T00:00`)

function openInvoice(id) {
  window.open(`${window.location.pathname}?invoice=${id}`, '_blank')
}

function formatBirthday(day) {
  return new Date(`${day}T00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
}

function CustomerForm({ customer, onClose, onSaved }) {
  const dialogRef = useRef(null)
  const isNew = customer.id == null
  const [values, setValues] = useState(() =>
    isNew ? EMPTY_FORM : Object.fromEntries(Object.keys(EMPTY_FORM).map((key) => [key, customer[key] ?? ''])),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    dialog.querySelector('input')?.focus()
    return () => dialog.close()
  }, [])

  const update = (name) => (event) => setValues((current) => ({ ...current, [name]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const data = isNew
        ? await apiPost('/api/customers', values)
        : await apiPut(`/api/customers/${customer.id}`, values)
      onSaved(data.customer, isNew)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="master-dialog"
      aria-labelledby="customer-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!saving) onClose()
      }}
    >
      <form className="master-form" onSubmit={handleSubmit}>
        <header className="master-form-header">
          <p className="master-form-eyebrow">Customers</p>
          <h2 id="customer-dialog-title">{isNew ? 'Add customer' : `Edit ${customer.name}`}</h2>
          <button type="button" className="master-dialog-close" onClick={onClose} disabled={saving} aria-label="Close">
            <XIcon />
          </button>
        </header>

        <div className="master-form-body">
          <div className="master-form-grid">
            <div className="master-field">
              <label htmlFor="customer-name">
                Full name<span className="master-required" aria-hidden="true">*</span>
              </label>
              <input id="customer-name" value={values.name} onChange={update('name')} maxLength={100} required />
            </div>
            <div className="master-field">
              <label htmlFor="customer-phone">
                Mobile number<span className="master-required" aria-hidden="true">*</span>
              </label>
              <input
                id="customer-phone"
                type="tel"
                value={values.phone}
                onChange={update('phone')}
                maxLength={20}
                pattern="\+?[0-9 \-]{10,19}"
                placeholder="e.g. 98765 43210"
                required
              />
            </div>
            <div className="master-field">
              <label htmlFor="customer-email">Email</label>
              <input id="customer-email" type="email" value={values.email} onChange={update('email')} maxLength={255} />
            </div>
            <div className="master-field">
              <label htmlFor="customer-gender">Gender</label>
              <select id="customer-gender" value={values.gender} onChange={update('gender')}>
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="master-field">
              <label htmlFor="customer-birthday">Birthday</label>
              <input
                id="customer-birthday"
                type="date"
                value={values.birthday}
                max={localDate()}
                onChange={update('birthday')}
              />
            </div>
            <div className="master-field is-wide">
              <label htmlFor="customer-notes">Notes</label>
              <textarea
                id="customer-notes"
                rows={3}
                value={values.notes}
                onChange={update('notes')}
                maxLength={1000}
                placeholder="Preferences, allergies, favourite stylist…"
              />
            </div>
          </div>

          {!isNew && (
            <p className="crm-form-note">
              Loyalty stars and memberships are not edited here. They change when bills are settled at POS.
            </p>
          )}

          {error && (
            <p className="master-alert is-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <footer className="master-form-actions">
          <button type="button" className="master-button is-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="master-button is-primary" disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Add customer' : 'Save changes'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}

function CustomerProfile({ profile, starsForFree, onEdit, onClose }) {
  const { customer, invoices, appointments, memberships } = profile
  const membership = customer.membership
  const averageBill = customer.visits ? customer.totalSpent / customer.visits : 0

  return (
    <>
      <div className="inv-side-head">
        <div>
          <h2 className="inv-side-title">{customer.name}</h2>
          <p className="inv-side-subtitle mono">{customer.phone}</p>
        </div>
        <div className="crm-side-actions">
          <button type="button" className="master-icon-button" onClick={onEdit} title={`Edit ${customer.name}`}>
            <EditIcon />
            <span className="sr-only">Edit {customer.name}</span>
          </button>
          <button type="button" className="inv-link" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="crm-profile">
        <dl className="crm-facts">
          <div>
            <dt>Visits</dt>
            <dd>{customer.visits}</dd>
          </div>
          <div>
            <dt>Total spent</dt>
            <dd>{formatINRWhole(customer.totalSpent)}</dd>
          </div>
          <div>
            <dt>Average bill</dt>
            <dd>{formatINRWhole(averageBill)}</dd>
          </div>
        </dl>

        <section className="crm-section">
          <h3>Details</h3>
          <ul className="crm-details">
            {customer.email && <li>{customer.email}</li>}
            {customer.gender && <li className="crm-capitalize">{customer.gender}</li>}
            {customer.birthday && <li>Birthday: {formatBirthday(customer.birthday)}</li>}
            <li>Customer since {formatDate(customer.createdAt)}</li>
            {customer.lastVisit && <li>Last visit {formatDate(customer.lastVisit)}</li>}
          </ul>
          {customer.notes && <p className="crm-notes">{customer.notes}</p>}
        </section>

        <section className="crm-section">
          <h3>Loyalty &amp; membership</h3>
          <p className="crm-stars">
            <StarIcon filled />
            {customer.stars} of {starsForFree} stars
            {customer.stars >= starsForFree && (
              <span className="crm-reward">
                <GiftIcon /> Free service ready
              </span>
            )}
          </p>
          {customer.freeServicesRedeemed > 0 && (
            <p className="crm-muted">
              {customer.freeServicesRedeemed} free {customer.freeServicesRedeemed === 1 ? 'service' : 'services'}{' '}
              redeemed
            </p>
          )}
          {membership ? (
            <p className="crm-member-card">
              <strong>{membership.planName}</strong>
              <span>
                {membership.discountPercent}% off services · valid till {dayDate(membership.validUntil)}
              </span>
            </p>
          ) : (
            <p className="crm-muted">No active membership. Sell one from Billing &amp; POS.</p>
          )}
          {memberships.length > 0 && (
            <ul className="crm-list">
              {memberships.map((m) => (
                <li key={m.id}>
                  <span>
                    {m.planName} · {formatINRWhole(m.pricePaid)}
                  </span>
                  <span className="crm-muted">
                    {dayDate(m.startDate)} – {dayDate(m.endDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="crm-section">
          <h3>Recent bills</h3>
          {invoices.length === 0 ? (
            <p className="crm-muted">No bills yet.</p>
          ) : (
            <ul className="crm-list">
              {invoices.map((inv) => (
                <li key={inv.id}>
                  <button type="button" className="crm-bill" onClick={() => openInvoice(inv.id)}>
                    <span className="crm-bill-top">
                      <span className="mono">{inv.invoiceNumber}</span>
                      <span className="mono">{formatINR(inv.total)}</span>
                    </span>
                    <span className="crm-muted crm-bill-items">{inv.items}</span>
                    <span className="crm-muted">
                      {formatDate(inv.createdAt)}
                      {inv.starsEarned > 0 && ` · +${inv.starsEarned} ★`}
                      <ExternalLinkIcon />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="crm-section">
          <h3>Appointments</h3>
          {appointments.length === 0 ? (
            <p className="crm-muted">No appointments booked with this mobile number.</p>
          ) : (
            <ul className="crm-list">
              {appointments.map((a) => (
                <li key={a.id}>
                  <span>
                    {a.serviceName}
                    <span className={`crm-status is-${STATUS[a.status]?.tone ?? a.status}`}>
                      {STATUS[a.status]?.label ?? a.status}
                    </span>
                  </span>
                  <span className="crm-muted">
                    {dayDate(a.date)} · {formatClock(a.startTime)} · {a.employeeName}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}

function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [starsForFree, setStarsForFree] = useState(5)
  const [limit, setLimit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    apiGet('/api/customers', { signal: controller.signal })
      .then((data) => {
        setCustomers(data.customers)
        setStarsForFree(data.starsForFree)
        setLimit(data.limit)
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setLoading(false)
      })
    return () => controller.abort()
  }, [reloadKey])

  useEffect(() => {
    if (!selectedId) return
    const controller = new AbortController()
    apiGet(`/api/customers/${selectedId}`, { signal: controller.signal })
      .then(setProfile)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
    return () => controller.abort()
  }, [selectedId, reloadKey])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 3500)
    return () => clearTimeout(timer)
  }, [notice])

  const today = localDate()
  const month = today.slice(5, 7)
  const lapsedBefore = addDays(today, -LAPSED_DAYS)
  const isMember = (c) => Boolean(c.membershipName)
  const hasReward = (c) => c.stars >= starsForFree
  const hasBirthday = (c) => c.birthday?.slice(5, 7) === month
  const isLapsed = (c) => c.lastVisit && localDate(new Date(c.lastVisit)) < lapsedBefore

  const summary = {
    total: customers.length,
    members: customers.filter(isMember).length,
    newThisMonth: customers.filter((c) => localDate(new Date(c.createdAt)).slice(0, 7) === today.slice(0, 7)).length,
    rewards: customers.filter(hasReward).length,
    birthdays: customers.filter(hasBirthday).length,
  }

  const term = query.trim().toLowerCase()
  const digits = term.replace(/\D/g, '')
  const matchesFilter = {
    all: () => true,
    members: isMember,
    reward: hasReward,
    birthday: hasBirthday,
    lapsed: isLapsed,
  }[filter]
  const visible = customers.filter(
    (c) =>
      matchesFilter(c) &&
      (!term ||
        c.name.toLowerCase().includes(term) ||
        (c.email ?? '').toLowerCase().includes(term) ||
        (digits && c.phone.includes(digits))),
  )
  const selectedProfile = profile?.customer.id === selectedId ? profile : null

  function handleSaved(saved, isNew) {
    setEditing(null)
    setError('')
    setNotice(`${saved.name} ${isNew ? 'added' : 'updated'}.`)
    setSelectedId(saved.id)
    setReloadKey((key) => key + 1)
  }

  return (
    <div className="master-page inv-page crm-page">
      <header className="master-header">
        <h1 className="master-title">Customers</h1>
        <button type="button" className="master-add" onClick={() => setEditing({})}>
          <PlusIcon />
          Add Customer
        </button>
      </header>

      <div className="inv-body">
        <dl className="inv-stats">
          <div>
            <dt>Customers</dt>
            <dd>{summary.total.toLocaleString('en-IN')}</dd>
          </div>
          <div>
            <dt>Active members</dt>
            <dd>{summary.members}</dd>
          </div>
          <div>
            <dt>New this month</dt>
            <dd>{summary.newThisMonth}</dd>
          </div>
          <div className={summary.rewards ? 'is-warn' : ''}>
            <dt>Free service ready</dt>
            <dd>{summary.rewards}</dd>
          </div>
          <div>
            <dt>Birthdays this month</dt>
            <dd>{summary.birthdays}</dd>
          </div>
        </dl>

        <div className="inv-panels">
          <section className="inv-main">
            <div className="master-toolbar">
              <label className="master-search">
                <SearchIcon />
                <span className="sr-only">Search customers</span>
                <input
                  type="search"
                  placeholder="Name, mobile or email…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="master-filter crm-filter" role="group" aria-label="Filter customers">
                {FILTERS.map((f) => (
                  <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="master-alert is-error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="master-alert is-success" role="status">
                {notice}
              </p>
            )}

            <div className="master-table-wrap">
              <table className="master-table inv-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Membership</th>
                    <th className="is-right">Visits</th>
                    <th className="is-right">Total spent</th>
                    <th>Last visit</th>
                    <th className="is-right">Stars</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="master-empty">
                        Loading customers…
                      </td>
                    </tr>
                  ) : visible.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="master-empty">
                        {customers.length === 0
                          ? 'No customers yet. They are added when a bill is settled with a mobile number, or with “Add Customer”.'
                          : 'No customers match your filters.'}
                      </td>
                    </tr>
                  ) : (
                    visible.map((c) => (
                      <tr
                        key={c.id}
                        className={`inv-row ${c.id === selectedId ? 'is-selected' : ''}`}
                        onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                        aria-selected={c.id === selectedId}
                      >
                        <td>
                          <span className="master-cell-value">{c.name}</span>
                          <span className="master-cell-detail mono">{c.phone}</span>
                        </td>
                        <td>
                          {c.membershipName ? (
                            <>
                              <span className="crm-member">{c.membershipName}</span>
                              <span className="master-cell-detail">till {dayDate(c.membershipUntil)}</span>
                            </>
                          ) : (
                            <span className="crm-muted">—</span>
                          )}
                        </td>
                        <td className="is-right mono">{c.visits}</td>
                        <td className="is-right mono">{formatINRWhole(c.totalSpent)}</td>
                        <td>
                          {c.lastVisit ? (
                            <span className={`master-cell-value ${isLapsed(c) ? 'is-warn' : ''}`}>
                              {formatDate(c.lastVisit)}
                            </span>
                          ) : (
                            <span className="crm-muted">No bills yet</span>
                          )}
                        </td>
                        <td className="is-right">
                          <span className={`crm-star-count ${hasReward(c) ? 'is-ready' : ''}`}>
                            {hasReward(c) ? <GiftIcon /> : <StarIcon filled />}
                            {c.stars}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {limit && customers.length >= limit && (
              <p className="crm-muted crm-limit">Showing the {limit} most recent customers.</p>
            )}
          </section>

          <aside className="inv-side crm-side">
            {selectedId == null ? (
              <p className="inv-movements-empty">Select a customer to see their profile, bills and appointments.</p>
            ) : selectedProfile ? (
              <CustomerProfile
                profile={selectedProfile}
                starsForFree={starsForFree}
                onEdit={() => setEditing(selectedProfile.customer)}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <p className="inv-movements-empty">Loading profile…</p>
            )}
          </aside>
        </div>
      </div>

      {editing && (
        <CustomerForm
          key={editing.id ?? 'new'}
          customer={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

export default CustomersPage
