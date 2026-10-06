import { useEffect, useRef, useState } from 'react'
import { apiPost, apiPut } from './api.js'
import { formatClock, toClock, toMinutes } from './appointmentUtils.js'
import { formatINRWhole } from './format.js'

const TIME_STEP = 15

function groupByCategory(list) {
  return list.reduce((groups, item) => {
    ;(groups[item.category] ??= []).push(item)
    return groups
  }, {})
}

function BookingForm({ initial, employees, services, opensAt, closesAt, onClose, onSaved }) {
  const dialogRef = useRef(null)
  const isNew = initial.id == null
  const [values, setValues] = useState(() => ({
    clientName: initial.clientName ?? '',
    clientPhone: initial.clientPhone ?? '',
    serviceId: initial.serviceId ? String(initial.serviceId) : '',
    employeeId: initial.employeeId ? String(initial.employeeId) : '',
    date: initial.date,
    startTime: initial.startTime ?? toClock(opensAt),
    status: 'confirmed',
    notes: initial.notes ?? '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    dialog.querySelector('input')?.focus()
    return () => dialog.close()
  }, [])

  const service = services.find((s) => String(s.id) === values.serviceId)
  const duration = service?.durationMinutes ?? 0
  const start = toMinutes(values.startTime)
  const lastStart = closesAt - Math.max(duration, TIME_STEP)

  const timeOptions = []
  for (let m = opensAt; m <= lastStart; m += TIME_STEP) timeOptions.push(m)
  if (!timeOptions.includes(start)) timeOptions.push(start)
  timeOptions.sort((a, b) => a - b)

  const specialistOptions = employees.some((e) => String(e.id) === values.employeeId) || !initial.employeeName
    ? employees
    : [...employees, { id: initial.employeeId, name: `${initial.employeeName} (inactive)` }]

  const set = (name) => (event) => setValues((current) => ({ ...current, [name]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body = { ...values, employeeId: Number(values.employeeId), serviceId: Number(values.serviceId) }
      const data = isNew
        ? await apiPost('/api/appointments', body)
        : await apiPut(`/api/appointments/${initial.id}`, body)
      onSaved(data.appointment, isNew)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="master-dialog"
      aria-labelledby="booking-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!saving) onClose()
      }}
    >
      <form className="master-form" onSubmit={handleSubmit}>
        <header className="master-form-header">
          <p className="master-form-eyebrow">Appointments</p>
          <h2 id="booking-dialog-title">{isNew ? 'Book appointment' : `Edit ${initial.clientName}'s booking`}</h2>
        </header>

        <div className="master-form-grid">
          <div className="master-field">
            <label htmlFor="booking-client">
              Client name<span className="master-required" aria-hidden="true">*</span>
            </label>
            <input
              id="booking-client"
              value={values.clientName}
              onChange={set('clientName')}
              maxLength={100}
              required
              autoComplete="off"
            />
          </div>
          <div className="master-field">
            <label htmlFor="booking-phone">Mobile number</label>
            <input
              id="booking-phone"
              type="tel"
              value={values.clientPhone}
              onChange={set('clientPhone')}
              maxLength={20}
              pattern="\+?[0-9 \-]{10,19}"
              placeholder="e.g. 98765 43210"
              autoComplete="off"
            />
          </div>

          <div className="master-field is-wide">
            <label htmlFor="booking-service">
              Service<span className="master-required" aria-hidden="true">*</span>
            </label>
            <select id="booking-service" value={values.serviceId} onChange={set('serviceId')} required>
              <option value="">Select a service…</option>
              {Object.entries(groupByCategory(services)).map(([category, list]) => (
                <optgroup key={category} label={category}>
                  {list.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.durationMinutes} min · {formatINRWhole(s.price)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="master-field is-wide">
            <label htmlFor="booking-specialist">
              Specialist<span className="master-required" aria-hidden="true">*</span>
            </label>
            <select id="booking-specialist" value={values.employeeId} onChange={set('employeeId')} required>
              <option value="">Select a specialist…</option>
              {specialistOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.designation ? ` — ${e.designation}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="master-field">
            <label htmlFor="booking-date">
              Date<span className="master-required" aria-hidden="true">*</span>
            </label>
            <input id="booking-date" type="date" value={values.date} onChange={set('date')} required />
          </div>
          <div className="master-field">
            <label htmlFor="booking-time">
              Start time<span className="master-required" aria-hidden="true">*</span>
            </label>
            <select id="booking-time" value={values.startTime} onChange={set('startTime')} required>
              {timeOptions.map((m) => (
                <option key={m} value={toClock(m)}>
                  {formatClock(m)}
                </option>
              ))}
            </select>
          </div>

          {isNew && (
            <div className="master-field">
              <label htmlFor="booking-status">Booking status</label>
              <select id="booking-status" value={values.status} onChange={set('status')}>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending confirmation</option>
              </select>
            </div>
          )}

          <div className="master-field is-wide">
            <label htmlFor="booking-notes">Notes &amp; preferences</label>
            <textarea
              id="booking-notes"
              rows={2}
              maxLength={1000}
              value={values.notes}
              onChange={set('notes')}
              placeholder="e.g. Prefers low heat, sensitive scalp"
            />
          </div>
        </div>

        {service && (
          <p className="booking-summary">
            <span>
              <strong>{formatClock(start)}</strong> – <strong>{formatClock(start + duration)}</strong>
            </span>
            <span>{duration} min</span>
            <span className="mono">{formatINRWhole(service.price)}</span>
          </p>
        )}

        {error && (
          <p className="master-alert is-error" role="alert">
            {error}
          </p>
        )}

        <footer className="master-form-actions">
          <button type="button" className="master-button is-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="master-button is-primary" disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Book appointment' : 'Save changes'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}

export default BookingForm
