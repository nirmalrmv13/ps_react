import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from './api.js'
import { addDays, formatClock, formatLongDate, initials, toMinutes } from './appointmentUtils.js'
import logo from './assets/logo.png'
import spaRoom from './assets/spa-room.png'
import { BRAND } from './brand.js'
import { formatINRWhole } from './format.js'
import {
  CalendarIcon,
  CardIcon,
  CheckIcon,
  ChevronLeftIcon,
  ClockIcon,
  DropletIcon,
  GridIcon,
  LeafBranch,
  LotusIcon,
  PlusIcon,
  ScissorsIcon,
  SearchIcon,
  SparklesIcon,
  StarIcon,
  UserIcon,
  UsersIcon,
  WavesIcon,
} from './Icons.jsx'
import './BookingPage.css'

const STEPS = ['Treatments', 'Specialist', 'Date & time', 'Your details']
const DATE_CHIPS = 14
const DAY_PARTS = [
  { id: 'morning', label: 'Morning', until: 12 * 60 },
  { id: 'afternoon', label: 'Afternoon', until: 17 * 60 },
  { id: 'evening', label: 'Evening', until: 24 * 60 },
]
const CATEGORY_LOOKS = [
  { match: /hair|cut|colou?r/i, tone: 'green', Icon: ScissorsIcon },
  { match: /massage|body/i, tone: 'terracotta', Icon: WavesIcon },
  { match: /nail|mani|pedi/i, tone: 'rose', Icon: SparklesIcon },
  { match: /skin|facial|face/i, tone: 'gold', Icon: DropletIcon },
  { match: /spa|ritual/i, tone: 'teal', Icon: LotusIcon },
]
const AVATAR_TONES = ['green', 'gold', 'terracotta', 'teal', 'rose']

const lookFor = (category) =>
  CATEGORY_LOOKS.find((look) => look.match.test(category)) ?? { tone: 'green', Icon: SparklesIcon }

const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return [hours && `${hours} hr`, rest && `${rest} min`].filter(Boolean).join(' ')
}

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

function dayChip(day, today) {
  const date = new Date(`${day}T00:00`)
  return {
    top:
      day === today
        ? 'Today'
        : day === addDays(today, 1)
          ? 'Tomorrow'
          : date.toLocaleDateString('en-IN', { weekday: 'short' }),
    date: date.getDate(),
    month: date.toLocaleDateString('en-IN', { month: 'short' }),
  }
}

/** Start and end of each treatment when they run back-to-back from `start`. */
function visitPlan(services, start) {
  let at = toMinutes(start)
  return services.map((s) => {
    const part = { ...s, from: at, to: at + s.duration }
    at += s.duration
    return part
  })
}

function CategoryIcon({ category, className = '' }) {
  const { tone, Icon } = lookFor(category)
  return (
    <span className={`bk-cat-icon is-${tone} ${className}`}>
      <Icon />
    </span>
  )
}

function ServiceStep({ services, selectedIds, maxServices, onToggle }) {
  const categories = useMemo(() => [...new Set(services.map((s) => s.category))], [services])
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const shown = services.filter(
    (s) =>
      (category === 'all' || s.category === category) &&
      (!needle || `${s.name} ${s.description ?? ''} ${s.category}`.toLowerCase().includes(needle)),
  )
  const full = selectedIds.length >= maxServices
  const tiles = [
    { id: 'all', label: 'All', tone: 'green', Icon: GridIcon, items: services },
    ...categories.map((c) => ({ id: c, label: c, ...lookFor(c), items: services.filter((s) => s.category === c) })),
  ]

  return (
    <>
      <div className="bk-step-head bk-services-head">
        <div>
          <h2 className="bk-step-title">Choose your treatments</h2>
          <p>Mix and match — they&apos;ll be booked back-to-back in one visit.</p>
        </div>
        <div
          className={`bk-meter ${full ? 'is-full' : ''}`}
          aria-label={`${selectedIds.length} of ${maxServices} treatments added`}
        >
          <span className="bk-meter-dots" aria-hidden="true">
            {Array.from({ length: maxServices }, (_, i) => (
              <span key={i} className={i < selectedIds.length ? 'is-on' : ''} />
            ))}
          </span>
          <span>
            <strong>{selectedIds.length}</strong> of {maxServices} added
          </span>
        </div>
      </div>

      <label className="bk-search">
        <SearchIcon />
        <input
          type="search"
          placeholder="Search treatments, e.g. facial, haircut…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search treatments"
        />
      </label>

      <div className="bk-cats" role="group" aria-label="Treatment category">
        {tiles.map(({ id, label, tone, Icon, items }) => {
          const added = items.filter((s) => selectedIds.includes(s.id)).length
          const from = Math.min(...items.map((s) => Number(s.price)))
          return (
            <button
              key={id}
              type="button"
              className={`bk-cat is-${tone}`}
              aria-pressed={category === id}
              onClick={() => setCategory(id)}
            >
              {added > 0 && (
                <span className="bk-cat-badge" aria-label={`${added} added`}>
                  {added}
                </span>
              )}
              <span className={`bk-cat-icon is-${tone}`}>
                <Icon />
              </span>
              <strong>{label}</strong>
              <small>
                {items.length} · from {formatINRWhole(from)}
              </small>
            </button>
          )
        })}
      </div>

      {shown.length === 0 ? (
        <div className="bk-no-slots">
          <SearchIcon />
          <p>No treatments match “{query}”</p>
          <span>Try another word or category.</span>
        </div>
      ) : (
        <div className="bk-services">
          {shown.map((s) => {
            const selected = selectedIds.includes(s.id)
            const { tone } = lookFor(s.category)
            return (
              <button
                key={s.id}
                type="button"
                className={`bk-service is-${tone} ${selected ? 'is-selected' : ''}`}
                aria-pressed={selected}
                disabled={!selected && full}
                onClick={() => onToggle(s.id)}
              >
                {selected && (
                  <span className="bk-added">
                    <CheckIcon />
                    Added
                  </span>
                )}
                <span className="bk-service-top">
                  <CategoryIcon category={s.category} />
                  <span className="bk-service-cat">{s.category}</span>
                </span>
                <strong className="bk-service-name">{s.name}</strong>
                {s.description && <span className="bk-desc">{s.description}</span>}
                <span className="bk-service-foot">
                  <span className="bk-price">{formatINRWhole(s.price)}</span>
                  <span className="bk-chip">
                    <ClockIcon />
                    {formatDuration(s.duration)}
                  </span>
                  <span className="bk-add" aria-hidden="true">
                    {selected ? <CheckIcon /> : <PlusIcon />}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
      {full && <p className="bk-limit">You&apos;ve added the maximum of {maxServices} treatments for one visit.</p>}
    </>
  )
}

function SpecialistStep({ specialists, selectedId, onSelect }) {
  return (
    <>
      <div className="bk-step-head">
        <h2 className="bk-step-title">Who would you like to see?</h2>
        <p>Pick a favourite, or let us match you with whoever is free</p>
      </div>
      <div className="bk-people">
        <button
          type="button"
          className={`bk-person is-any ${selectedId === 'any' ? 'is-selected' : ''}`}
          aria-pressed={selectedId === 'any'}
          onClick={() => onSelect('any')}
        >
          <span className="bk-avatar is-any">
            <UsersIcon />
          </span>
          <strong>Any specialist</strong>
          <span className="bk-desc">Most available times</span>
          <span className="bk-badge">Recommended</span>
        </button>
        {specialists.map((p, index) => (
          <button
            key={p.id}
            type="button"
            className={`bk-person ${selectedId === p.id ? 'is-selected' : ''}`}
            aria-pressed={selectedId === p.id}
            onClick={() => onSelect(p.id)}
          >
            <span className={`bk-avatar is-${AVATAR_TONES[index % AVATAR_TONES.length]}`}>{initials(p.name)}</span>
            <strong>{p.name}</strong>
            <span className="bk-desc">{p.designation}</span>
          </button>
        ))}
      </div>
    </>
  )
}

function TimeStep({ options, duration, day, onDay, slots, loading, error, selectedTime, onTime }) {
  const days = []
  for (let d = options.today; d <= options.lastDay && days.length < DATE_CHIPS; d = addDays(d, 1)) days.push(d)

  return (
    <>
      <div className="bk-step-head">
        <h2 className="bk-step-title">When suits you?</h2>
        <p>Your visit lasts {formatDuration(duration)} · only times that are actually free are shown</p>
      </div>
      <div className="bk-days" role="group" aria-label="Date">
        {days.map((d) => {
          const chip = dayChip(d, options.today)
          return (
            <button key={d} type="button" aria-pressed={d === day} onClick={() => onDay(d)}>
              <span>{chip.top}</span>
              <strong>{chip.date}</strong>
              <span>{chip.month}</span>
            </button>
          )
        })}
      </div>
      <label className="bk-more-dates">
        <CalendarIcon />
        <span>Pick another date</span>
        <input
          type="date"
          value={day}
          min={options.today}
          max={options.lastDay}
          onChange={(e) => e.target.value && onDay(e.target.value)}
        />
      </label>

      <div className="bk-times">
        <p className="bk-day-heading">{formatLongDate(day)}</p>
        {error ? (
          <p className="bk-alert" role="alert">
            {error}
          </p>
        ) : loading ? (
          <div className="bk-slots is-loading" aria-label="Loading times">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <div className="bk-no-slots">
            <CalendarIcon />
            <p>Fully booked on this day</p>
            <span>Please try another date.</span>
          </div>
        ) : (
          DAY_PARTS.map((part, index) => {
            const from = index === 0 ? 0 : DAY_PARTS[index - 1].until
            const partSlots = slots.filter((s) => toMinutes(s.time) >= from && toMinutes(s.time) < part.until)
            if (partSlots.length === 0) return null
            return (
              <div key={part.id} className="bk-part">
                <p className="bk-part-label">
                  {part.label}
                  <span>{partSlots.length} free</span>
                </p>
                <div className="bk-slots">
                  {partSlots.map((s) => (
                    <button
                      key={s.time}
                      type="button"
                      aria-pressed={s.time === selectedTime}
                      onClick={() => onTime(s.time)}
                      title={`Visit ends at ${formatClock(toMinutes(s.time) + duration)}`}
                    >
                      {formatClock(s.time)}
                    </button>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}

function DetailsStep({ details, onChange, onSubmit }) {
  return (
    <form
      className="bk-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <div className="bk-step-head">
        <h2 className="bk-step-title">Almost done</h2>
        <p>Tell us who&apos;s coming so we can confirm your visit</p>
      </div>
      <label className="bk-field">
        <span>Full name</span>
        <input
          type="text"
          autoComplete="name"
          maxLength={100}
          placeholder="e.g., Asha Menon"
          value={details.name}
          onChange={(e) => onChange({ ...details, name: e.target.value })}
          required
        />
      </label>
      <label className="bk-field">
        <span>Mobile number</span>
        <div className="bk-phone">
          <span>+91</span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={10}
            placeholder="10-digit mobile number"
            value={details.phone}
            onChange={(e) => onChange({ ...details, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            required
          />
        </div>
      </label>
      <label className="bk-field">
        <span>
          Anything we should know? <em>(optional)</em>
        </span>
        <textarea
          rows={3}
          maxLength={500}
          placeholder="Allergies, preferences, or a special occasion"
          value={details.notes}
          onChange={(e) => onChange({ ...details, notes: e.target.value })}
        />
      </label>
      <p className="bk-note">
        <CheckIcon />
        We&apos;ll call you on this number to confirm. No advance payment needed.
      </p>
    </form>
  )
}

function Confirmation({ booking, onAgain }) {
  return (
    <div className="bk-confirm">
      <p className="bk-confirm-note">
        Thank you, {booking.clientName.split(' ')[0]}! We&apos;ll call <strong>{booking.clientPhone}</strong> shortly
        to confirm.
      </p>
      <section className="bk-ticket" aria-live="polite">
        <div className="bk-ticket-body">
          <div className="bk-ticket-ref">
            <span>Booking reference</span>
            <strong>{booking.reference}</strong>
          </div>

          <div className="bk-ticket-when">
            <span className="bk-summary-icon">
              <CalendarIcon />
            </span>
            <div>
              <strong>{formatLongDate(booking.date)}</strong>
              <span>
                {formatClock(booking.startTime)} – {formatClock(booking.endTime)} with {booking.specialistName}
              </span>
            </div>
          </div>

          <ol className="bk-timeline">
            {booking.services.map((s) => (
              <li key={`${s.startTime}-${s.name}`}>
                <span className="bk-timeline-time">{formatClock(s.startTime)}</span>
                <div>
                  <strong>{s.name}</strong>
                  <span>until {formatClock(s.endTime)}</span>
                </div>
                <span className="bk-timeline-price">{formatINRWhole(s.price)}</span>
              </li>
            ))}
          </ol>

          <p className="bk-total is-ticket">
            <span>
              Total
              <small>+ GST, pay at the salon</small>
            </span>
            <strong>{formatINRWhole(booking.total)}</strong>
          </p>

          <div className="bk-ticket-actions">
            <button type="button" className="bk-primary" onClick={onAgain}>
              Book another
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function BookingPage() {
  const [options, setOptions] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [step, setStep] = useState(0)
  const [serviceIds, setServiceIds] = useState([])
  const [specialistId, setSpecialistId] = useState('any')
  const [day, setDay] = useState(null)
  const [time, setTime] = useState(null)
  const [details, setDetails] = useState({ name: '', phone: '', notes: '' })

  const [availability, setAvailability] = useState({ key: null, slots: [], error: '' })
  const [slotsVersion, setSlotsVersion] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [booking, setBooking] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    apiGet('/api/public/options', { signal: controller.signal })
      .then((data) => {
        setOptions(data)
        setLoadError('')
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setLoadError(err.message)
      })
    return () => controller.abort()
  }, [reloadKey])

  const selectedDay = day ?? options?.today
  const slotsKey = serviceIds.length && selectedDay ? `${serviceIds.join(',')}|${selectedDay}|${slotsVersion}` : null

  useEffect(() => {
    if (!slotsKey || step < 2) return
    const [ids, date] = slotsKey.split('|')
    const controller = new AbortController()
    apiGet(`/api/public/availability?date=${date}&serviceIds=${ids}`, { signal: controller.signal })
      .then((data) => setAvailability({ key: slotsKey, slots: data.slots, error: '' }))
      .catch((err) => {
        if (err.name !== 'AbortError') setAvailability({ key: slotsKey, slots: [], error: err.message })
      })
    return () => controller.abort()
  }, [slotsKey, step])

  const chosen = options ? serviceIds.map((id) => options.services.find((s) => s.id === id)).filter(Boolean) : []
  const duration = chosen.reduce((sum, s) => sum + s.duration, 0)
  const total = chosen.reduce((sum, s) => sum + s.price, 0)
  const specialist = options?.specialists.find((p) => p.id === specialistId)
  const slots =
    availability.key === slotsKey
      ? availability.slots.filter((s) => specialistId === 'any' || s.specialistIds.includes(specialistId))
      : []
  const slotsLoading = availability.key !== slotsKey
  const phoneValid = /^[6-9]\d{9}$/.test(details.phone)
  const canContinue = [chosen.length > 0, true, Boolean(time), details.name.trim() && phoneValid][step]
  const plan = time ? visitPlan(chosen, time) : null

  function toggleService(id) {
    setServiceIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
    setTime(null)
  }

  function removeService(id) {
    const remaining = serviceIds.filter((x) => x !== id)
    setServiceIds(remaining)
    setTime(null)
    if (remaining.length === 0) setStep(0)
  }

  function chooseSpecialist(id) {
    setSpecialistId(id)
    setTime(null)
    setStep(2)
  }

  function chooseDay(d) {
    setDay(d)
    setTime(null)
  }

  async function submit() {
    if (!canContinue || submitting) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const data = await apiPost('/api/public/bookings', {
        serviceIds,
        specialistId: specialistId === 'any' ? null : specialistId,
        date: selectedDay,
        startTime: time,
        name: details.name,
        phone: details.phone,
        notes: details.notes,
      })
      setBooking(data.booking)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setSubmitError(err.message)
      if (/taken|no longer available|must start by/i.test(err.message)) {
        setTime(null)
        setSlotsVersion((v) => v + 1)
        setStep(2)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function startOver() {
    setBooking(null)
    setStep(0)
    setServiceIds([])
    setSpecialistId('any')
    setDay(null)
    setTime(null)
    setDetails((d) => ({ ...d, notes: '' }))
    setSubmitError('')
    setSlotsVersion((v) => v + 1)
  }

  function next() {
    if (step === 3) submit()
    else if (canContinue) {
      setStep(step + 1)
      setSubmitError('')
    }
  }

  return (
    <div className={`bk-page ${booking ? 'is-confirmed' : ''}`}>
      {!booking && (
        <header className="bk-hero">
          <img className="bk-hero-bg" src={spaRoom} alt="" />
          <LeafBranch className="bk-leaf" />
          <div className="bk-topbar">
            <div className="bk-brand">
              <img src={logo} alt="" />
              <div>
                <strong>{BRAND.name}</strong>
                <span>{BRAND.tagline}</span>
              </div>
            </div>
            <a className="bk-staff-link" href="./">
              Staff login
            </a>
          </div>

          <div className="bk-hero-body">
            <span className="bk-eyebrow">
              <LotusIcon />
              Online booking
            </span>
            <h1>
              Your moment of calm, <em>booked in a minute.</em>
            </h1>
            <p>Mix and match treatments, pick a time that suits you, and we&apos;ll take care of the rest.</p>
            <ul className="bk-facts">
              <li>
                <ClockIcon />
                <span>
                  <strong>
                    {options ? `${formatClock(options.opensAt)} – ${formatClock(options.closesAt)}` : 'Every day'}
                  </strong>
                  Open 7 days a week
                </span>
              </li>
              {options && (
                <li>
                  <SparklesIcon />
                  <span>
                    <strong>{options.services.length} treatments</strong>
                    Across {new Set(options.services.map((s) => s.category)).size} categories
                  </span>
                </li>
              )}
              {options && (
                <li>
                  <StarIcon />
                  <span>
                    <strong>{options.specialists.length} specialists</strong>
                    Choose yours or any
                  </span>
                </li>
              )}
              <li>
                <CardIcon />
                <span>
                  <strong>Pay at the salon</strong>
                  No advance payment
                </span>
              </li>
            </ul>
          </div>
        </header>
      )}

      <main className={`bk-main ${booking ? 'is-confirmed' : ''}`}>
        {loadError ? (
          <div className="bk-card bk-center">
            <p className="bk-alert" role="alert">
              {loadError}
            </p>
            <button type="button" className="bk-primary" onClick={() => setReloadKey((k) => k + 1)}>
              Try again
            </button>
          </div>
        ) : !options ? (
          <div className="bk-card bk-center">
            <p className="bk-empty">Loading treatments…</p>
          </div>
        ) : booking ? (
          <Confirmation booking={booking} onAgain={startOver} />
        ) : (
          <>
            <nav className="bk-steps" aria-label="Booking steps">
              <ol>
                {STEPS.map((label, index) => (
                  <li
                    key={label}
                    className={index === step ? 'is-current' : index < step ? 'is-done' : ''}
                    aria-current={index === step ? 'step' : undefined}
                  >
                    <button
                      type="button"
                      disabled={index > step}
                      onClick={() => setStep(index)}
                      aria-label={`Step ${index + 1}: ${label}`}
                    >
                      <span className="bk-step-no">{index < step ? <CheckIcon /> : index + 1}</span>
                      <span className="bk-step-label">{label}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <span className="bk-progress" aria-hidden="true">
                <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
              </span>
            </nav>

            <div className="bk-layout">
              <section className="bk-card bk-stage" key={step}>
                {step > 0 && (
                  <button type="button" className="bk-back" onClick={() => setStep(step - 1)}>
                    <ChevronLeftIcon />
                    Back
                  </button>
                )}
                {step === 0 && (
                  <ServiceStep
                    services={options.services}
                    selectedIds={serviceIds}
                    maxServices={options.maxServices}
                    onToggle={toggleService}
                  />
                )}
                {step === 1 && (
                  <SpecialistStep
                    specialists={options.specialists}
                    selectedId={specialistId}
                    onSelect={chooseSpecialist}
                  />
                )}
                {step === 2 && (
                  <TimeStep
                    options={options}
                    duration={duration}
                    day={selectedDay}
                    onDay={chooseDay}
                    slots={slots}
                    loading={slotsLoading}
                    error={availability.key === slotsKey ? availability.error : ''}
                    selectedTime={time}
                    onTime={setTime}
                  />
                )}
                {step === 3 && <DetailsStep details={details} onChange={setDetails} onSubmit={submit} />}
                {submitError && (
                  <p className="bk-alert" role="alert">
                    {submitError}
                  </p>
                )}
              </section>

              <aside className={`bk-summary ${chosen.length ? '' : 'is-empty'}`}>
                <div className="bk-summary-head">
                  <LotusIcon />
                  <h2>Your visit</h2>
                  {chosen.length > 0 && <span className="bk-summary-count">{plural(chosen.length, 'treatment')}</span>}
                </div>
                <div className="bk-summary-body">
                  {chosen.length > 0 ? (
                    <>
                      <ul className="bk-cart">
                        {(plan ?? chosen).map((s) => (
                          <li key={s.id}>
                            <CategoryIcon category={s.category} className="is-small" />
                            <div>
                              <strong>{s.name}</strong>
                              <span>
                                {plan
                                  ? `${formatClock(s.from)} – ${formatClock(s.to)}`
                                  : formatDuration(s.duration)}
                              </span>
                            </div>
                            <span className="bk-cart-price">{formatINRWhole(s.price)}</span>
                            <button
                              type="button"
                              className="bk-remove"
                              onClick={() => removeService(s.id)}
                              aria-label={`Remove ${s.name}`}
                              title="Remove"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                      {step === 0 && chosen.length < options.maxServices && (
                        <p className="bk-hint">
                          <PlusIcon />
                          Add more treatments, or continue
                        </p>
                      )}
                      <ul className="bk-summary-list">
                        <li>
                          <span className="bk-summary-icon">
                            <UserIcon />
                          </span>
                          <div>
                            <strong>{specialist ? specialist.name : 'Any specialist'}</strong>
                            <span>{specialist ? specialist.designation : 'First available'}</span>
                          </div>
                        </li>
                        <li className={step < 2 ? 'is-pending' : ''}>
                          <span className="bk-summary-icon">
                            <CalendarIcon />
                          </span>
                          <div>
                            <strong>{step < 2 ? 'Date & time' : formatLongDate(selectedDay)}</strong>
                            <span>
                              {time
                                ? `${formatClock(time)} – ${formatClock(toMinutes(time) + duration)}`
                                : `Choose a time · ${formatDuration(duration)}`}
                            </span>
                          </div>
                        </li>
                      </ul>
                    </>
                  ) : (
                    <div className="bk-summary-empty">
                      <SparklesIcon />
                      <p>Add treatments to build your visit.</p>
                    </div>
                  )}
                  {chosen.length > 0 && (
                    <p className="bk-total">
                      <span>
                        Total
                        <small>+ GST, pay at the salon</small>
                      </span>
                      <span className="bk-mini">
                        {plural(chosen.length, 'treatment')} · {formatDuration(duration)}
                      </span>
                      <strong>{formatINRWhole(total)}</strong>
                    </p>
                  )}
                  <button
                    type="button"
                    className="bk-primary"
                    disabled={!canContinue || submitting}
                    onClick={next}
                  >
                    {step === 3 ? (submitting ? 'Booking…' : 'Confirm booking') : 'Continue'}
                  </button>
                  <ul className="bk-assure">
                    <li>
                      <CheckIcon />
                      No advance payment
                    </li>
                    <li>
                      <CheckIcon />
                      Confirmation call from the salon
                    </li>
                  </ul>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      {!booking && (
        <footer className="bk-footer">
          © {new Date().getFullYear()} {BRAND.name} · {BRAND.tagline}
        </footer>
      )}
    </div>
  )
}

export default BookingPage
