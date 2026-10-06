import { useEffect, useMemo, useRef, useState } from 'react'
import { apiGet, apiPut } from './api.js'
import {
  INACTIVE_STATUSES,
  STATUS,
  addDays,
  formatClock,
  formatLongDate,
  initials,
  localDate,
  toClock,
  toMinutes,
} from './appointmentUtils.js'
import BookingForm from './BookingForm.jsx'
import { formatINRWhole } from './format.js'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  PhoneIcon,
  PlusIcon,
  ReceiptIcon,
} from './Icons.jsx'
import './MasterPage.css'
import './AppointmentsPage.css'

const SLOT_MINUTES = 30
const SLOT_HEIGHT = 48

const NEXT_STEP = {
  pending: { status: 'confirmed', label: 'Confirm booking' },
  confirmed: { status: 'checked_in', label: 'Check in client' },
  checked_in: { status: 'in_service', label: 'Start service' },
}

const LEGEND = ['pending', 'confirmed', 'checked_in', 'in_service', 'completed']

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

function StatusChip({ status }) {
  return <span className={`appt-chip is-${STATUS[status].tone}`}>{STATUS[status].label}</span>
}

function AppointmentDetails({ appointment, busy, onStatus, onEdit, onCheckout }) {
  const { status } = appointment
  const active = !INACTIVE_STATUSES.includes(status) && status !== 'completed'
  const next = NEXT_STEP[status]

  return (
    <section className="appt-card">
      <h2 className="appt-card-title">
        Booking details
        <StatusChip status={status} />
      </h2>

      <div className="appt-client">
        <span className="appt-avatar" aria-hidden="true">
          {initials(appointment.clientName)}
        </span>
        <div>
          <p className="appt-client-name">{appointment.clientName}</p>
          {appointment.clientPhone && (
            <a className="appt-client-phone" href={`tel:${appointment.clientPhone}`}>
              <PhoneIcon />
              {appointment.clientPhone}
            </a>
          )}
        </div>
      </div>

      <div className="appt-section">
        <p className="appt-section-label">Scheduled service</p>
        <div className="appt-service-row">
          <strong className="appt-service-name">{appointment.serviceName}</strong>
          <span className="appt-service-price">{formatINRWhole(appointment.servicePrice)}</span>
        </div>
        <p className="appt-meta">
          <ClockIcon />
          {formatClock(appointment.startTime)} – {formatClock(appointment.endTime)} ·{' '}
          {toMinutes(appointment.endTime) - toMinutes(appointment.startTime)} min
        </p>
      </div>

      <div className="appt-section">
        <p className="appt-section-label">Specialist</p>
        <p className="appt-specialist">
          {appointment.employeeName}
          {appointment.employeeDesignation && <span>{appointment.employeeDesignation}</span>}
        </p>
      </div>

      {appointment.notes && (
        <div className="appt-section">
          <p className="appt-section-label">Notes &amp; preferences</p>
          <p className="appt-notes">{appointment.notes}</p>
        </div>
      )}

      <div className="appt-actions">
        {status === 'completed' && (
          <p className="appt-billed">
            Billed on invoice <strong className="mono">#{appointment.invoiceNumber}</strong>
          </p>
        )}
        {next && (
          <button type="button" className="appt-button is-accent" disabled={busy} onClick={() => onStatus(next.status)}>
            {next.label}
          </button>
        )}
        {active && (
          <button type="button" className="appt-primary" disabled={busy} onClick={onCheckout}>
            <ReceiptIcon />
            Proceed to Checkout / POS
          </button>
        )}
        {active && status !== 'in_service' && (
          <div className="appt-button-row">
            <button type="button" className="appt-button" disabled={busy} onClick={onEdit}>
              Reschedule
            </button>
            <button
              type="button"
              className="appt-button is-danger"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Cancel ${appointment.clientName}'s booking?`)) onStatus('cancelled')
              }}
            >
              Cancel booking
            </button>
          </div>
        )}
        {(status === 'pending' || status === 'confirmed') && (
          <button type="button" className="appt-link" disabled={busy} onClick={() => onStatus('no_show')}>
            Mark as no-show
          </button>
        )}
        {INACTIVE_STATUSES.includes(status) && (
          <button type="button" className="appt-button" disabled={busy} onClick={() => onStatus('confirmed')}>
            Restore booking
          </button>
        )}
      </div>
    </section>
  )
}

function AppointmentsPage({ onCheckout }) {
  const [day, setDay] = useState(localDate)
  const [config, setConfig] = useState(null)
  const [employees, setEmployees] = useState([])
  const [services, setServices] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loadedDay, setLoadedDay] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [specialist, setSpecialist] = useState('all')
  const [showCancelled, setShowCancelled] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [booking, setBooking] = useState(null)
  const [busy, setBusy] = useState(false)
  const gridRef = useRef(null)
  const scrollPending = useRef(true)
  const now = useNow()

  useEffect(() => {
    Promise.all([apiGet('/api/config'), apiGet('/api/employees'), apiGet('/api/services')])
      .then(([configData, employeeData, serviceData]) => {
        setConfig(configData)
        setEmployees(employeeData.employees)
        setServices(serviceData.services)
      })
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    apiGet(`/api/appointments?date=${day}`, { signal: controller.signal })
      .then((data) => {
        setAppointments(data.appointments)
        setLoadedDay(day)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
    return () => controller.abort()
  }, [day])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 3500)
    return () => clearTimeout(timer)
  }, [notice])

  const opensAt = toMinutes(config?.opensAt ?? '09:00')
  const closesAt = toMinutes(config?.closesAt ?? '21:00')
  const gridHeight = ((closesAt - opensAt) / SLOT_MINUTES) * SLOT_HEIGHT
  const offsetOf = (minutes) => ((minutes - opensAt) / SLOT_MINUTES) * SLOT_HEIGHT

  const allColumns = useMemo(() => {
    const list = employees.map(({ id, name, designation }) => ({ id, name, designation }))
    for (const a of appointments) {
      if (!list.some((e) => e.id === a.employeeId)) {
        list.push({ id: a.employeeId, name: a.employeeName, designation: a.employeeDesignation })
      }
    }
    return list
  }, [employees, appointments])
  const columns = specialist === 'all' ? allColumns : allColumns.filter((e) => String(e.id) === specialist)

  const loading = loadedDay !== day
  const dayAppointments = loading ? [] : appointments
  const visible = dayAppointments.filter((a) => showCancelled || !INACTIVE_STATUSES.includes(a.status))
  const selected = dayAppointments.find((a) => a.id === selectedId) ?? null

  const live = dayAppointments.filter((a) => !INACTIVE_STATUSES.includes(a.status))
  const countOf = (status) => live.filter((a) => a.status === status).length
  const cancelledCount = dayAppointments.length - live.length
  const expectedRevenue = live.reduce((sum, a) => sum + a.servicePrice, 0)

  const slots = []
  for (let m = opensAt; m < closesAt; m += SLOT_MINUTES) slots.push(m)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const showNow = day === localDate(now) && nowMinutes >= opensAt && nowMinutes <= closesAt

  useEffect(() => {
    if (!scrollPending.current || !config || loading || !gridRef.current) return
    scrollPending.current = false
    const firstStart = visible.length ? Math.min(...visible.map((a) => toMinutes(a.startTime))) : opensAt
    const target = showNow ? nowMinutes - 60 : firstStart - SLOT_MINUTES
    gridRef.current.scrollTop = Math.max(0, offsetOf(target))
  })

  function upsert(saved) {
    setAppointments((current) =>
      current.some((a) => a.id === saved.id)
        ? current.map((a) => (a.id === saved.id ? saved : a))
        : [...current, saved],
    )
  }

  function handleSaved(saved, isNew) {
    setBooking(null)
    setError('')
    if (saved.date === day) {
      upsert(saved)
    } else {
      scrollPending.current = true
      setDay(saved.date)
    }
    setSelectedId(saved.id)
    setNotice(
      `${saved.clientName} ${isNew ? 'booked' : 'updated'} with ${saved.employeeName} at ${formatClock(saved.startTime)}.`,
    )
  }

  async function changeStatus(status) {
    setBusy(true)
    setError('')
    try {
      const data = await apiPut(`/api/appointments/${selected.id}/status`, { status })
      upsert(data.appointment)
      setNotice(`${data.appointment.clientName} marked as ${STATUS[status].label.toLowerCase()}.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function goToDay(next) {
    if (!next) return
    scrollPending.current = true
    setDay(next)
    setSelectedId(null)
  }

  return (
    <div className="master-page appt-page">
      <header className="master-header">
        <h1 className="master-title">Appointments</h1>
        <button
          type="button"
          className="master-add"
          onClick={() => setBooking({ date: day })}
          disabled={!config}
        >
          <PlusIcon />
          Book Appointment
        </button>
      </header>

      <div className="appt-body">
        <main className="appt-main">
          <div className="appt-toolbar">
            <div className="appt-date-nav">
              <button type="button" className="appt-nav-button" onClick={() => goToDay(addDays(day, -1))} title="Previous day">
                <ChevronLeftIcon />
                <span className="sr-only">Previous day</span>
              </button>
              <input
                type="date"
                className="appt-date-input"
                value={day}
                onChange={(event) => goToDay(event.target.value)}
                aria-label="Appointment date"
              />
              <button type="button" className="appt-nav-button" onClick={() => goToDay(addDays(day, 1))} title="Next day">
                <ChevronRightIcon />
                <span className="sr-only">Next day</span>
              </button>
              <button
                type="button"
                className="appt-today"
                onClick={() => goToDay(localDate())}
                disabled={day === localDate(now)}
              >
                Today
              </button>
              <span className="appt-day-label">{formatLongDate(day)}</span>
            </div>

            <div className="appt-filters">
              <select
                className="appt-select"
                value={specialist}
                onChange={(event) => setSpecialist(event.target.value)}
                aria-label="Filter by specialist"
              >
                <option value="all">All specialists ({allColumns.length})</option>
                {allColumns.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              <label className="appt-check">
                <input
                  type="checkbox"
                  checked={showCancelled}
                  onChange={(event) => setShowCancelled(event.target.checked)}
                />
                Show cancelled{cancelledCount > 0 ? ` (${cancelledCount})` : ''}
              </label>
            </div>
          </div>

          <ul className="appt-legend" aria-label="Status colours">
            {LEGEND.map((status) => (
              <li key={status}>
                <i className={`is-${STATUS[status].tone}`} />
                {STATUS[status].label}
              </li>
            ))}
          </ul>

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

          <div className="appt-grid-wrap" ref={gridRef}>
            {columns.length === 0 ? (
              <p className="appt-empty">
                {config ? 'No active specialists. Add employees in Employee Master to start booking.' : 'Loading timetable…'}
              </p>
            ) : (
              <div
                className="appt-grid"
                style={{
                  gridTemplateColumns: `72px repeat(${columns.length}, minmax(160px, 1fr))`,
                  minWidth: 72 + columns.length * 160,
                  '--slot-h': `${SLOT_HEIGHT}px`,
                }}
              >
                <div className="appt-corner">Time</div>
                {columns.map((e) => (
                  <div key={e.id} className="appt-col-head">
                    <strong>{e.name}</strong>
                    <span>{e.designation}</span>
                  </div>
                ))}

                <div className="appt-times" style={{ height: gridHeight }}>
                  {slots
                    .filter((m) => m % 60 === 0)
                    .map((m) => (
                      <span key={m} style={{ top: offsetOf(m) }}>
                        {formatClock(m)}
                      </span>
                    ))}
                  {showNow && (
                    <span className="appt-now-label" style={{ top: offsetOf(nowMinutes) }}>
                      Now
                    </span>
                  )}
                </div>

                {columns.map((e) => (
                  <div key={e.id} className="appt-col" style={{ height: gridHeight }}>
                    {slots.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className="appt-slot"
                        style={{ top: offsetOf(m), height: SLOT_HEIGHT }}
                        onClick={() => setBooking({ date: day, employeeId: e.id, startTime: toClock(m) })}
                        disabled={!config}
                      >
                        <span>+ {formatClock(m)}</span>
                        <span className="sr-only">Book {e.name}</span>
                      </button>
                    ))}

                    {visible
                      .filter((a) => a.employeeId === e.id)
                      .map((a) => {
                        const start = toMinutes(a.startTime)
                        const end = toMinutes(a.endTime)
                        return (
                          <button
                            key={a.id}
                            type="button"
                            className={[
                              'appt-block',
                              `is-${STATUS[a.status].tone}`,
                              end - start <= 45 && 'is-short',
                              a.id === selectedId && 'is-selected',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            style={{ top: offsetOf(start) + 2, height: offsetOf(end) - offsetOf(start) - 4 }}
                            onClick={() => setSelectedId(a.id)}
                            aria-pressed={a.id === selectedId}
                          >
                            <span className="appt-block-top">
                              <StatusChip status={a.status} />
                              <span className="appt-block-price">{formatINRWhole(a.servicePrice)}</span>
                            </span>
                            <span className="appt-block-service">{a.serviceName}</span>
                            <span className="appt-block-line">{a.clientName}</span>
                            <span className="appt-block-line appt-block-time">
                              {formatClock(a.startTime)} – {formatClock(a.endTime)}
                            </span>
                          </button>
                        )
                      })}
                  </div>
                ))}

                {showNow && <div className="appt-now" style={{ top: `calc(var(--head-h) + ${offsetOf(nowMinutes)}px)` }} />}
              </div>
            )}
          </div>
        </main>

        <aside className="appt-side">
          <section className="appt-card">
            <h2 className="appt-card-title">Day summary</h2>
            <dl className="appt-stats">
              <div>
                <dt>Bookings</dt>
                <dd>{live.length}</dd>
              </div>
              <div>
                <dt>Completed</dt>
                <dd>{countOf('completed')}</dd>
              </div>
              <div>
                <dt>Checked-in</dt>
                <dd>{countOf('checked_in')}</dd>
              </div>
              <div>
                <dt>In service</dt>
                <dd>{countOf('in_service')}</dd>
              </div>
              <div className="is-wide">
                <dt>Expected revenue</dt>
                <dd>{formatINRWhole(expectedRevenue)}</dd>
              </div>
            </dl>
          </section>

          {selected ? (
            <AppointmentDetails
              appointment={selected}
              busy={busy}
              onStatus={changeStatus}
              onEdit={() => setBooking(selected)}
              onCheckout={() => onCheckout(selected)}
            />
          ) : (
            <p className="appt-card appt-hint">
              Select a booking to see its details, or click an empty slot in the timetable to book that
              specialist.
            </p>
          )}
        </aside>
      </div>

      {booking && (
        <BookingForm
          key={booking.id ?? 'new'}
          initial={booking}
          employees={employees}
          services={services}
          opensAt={opensAt}
          closesAt={closesAt}
          onClose={() => setBooking(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
export default AppointmentsPage
