import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from './api.js'
import { formatClock } from './appointmentUtils.js'
import { BRAND } from './brand.js'
import { formatDate, formatINR } from './format.js'
import {
  CalendarIcon,
  CheckIcon,
  DownloadIcon,
  GiftIcon,
  MinusIcon,
  PlusIcon,
  PrintIcon,
  ShieldIcon,
  StarIcon,
  TrashIcon,
} from './Icons.jsx'
import './BillingPage.css'

const MAX_QUANTITY = 99

const itemKey = (type, id) => `${type}:${id}`
const usageKey = (productId, serviceId) => `${productId}:${serviceId ?? 0}`
const toRequestItems = (items) => items.map(({ type, id, quantity }) => ({ type, id, quantity }))

function mergeUsage(list) {
  const merged = new Map()
  for (const entry of list) {
    const key = usageKey(entry.productId, entry.serviceId)
    const existing = merged.get(key)
    merged.set(key, existing ? { ...existing, quantity: existing.quantity + entry.quantity } : entry)
  }
  return [...merged.values()]
}

function groupByCategory(list) {
  return list.reduce((groups, item) => {
    ;(groups[item.category] ??= []).push(item)
    return groups
  }, {})
}

function maxQuantityFor(entry, reserved = 0) {
  return entry?.type === 'product' ? Math.min(entry.stock - reserved, MAX_QUANTITY) : MAX_QUANTITY
}

function StarRow({ stars, total }) {
  const extra = Math.max(stars - total, 0)
  return (
    <span className="loyalty-stars" aria-label={`${stars} of ${total} stars`}>
      {Array.from({ length: total }, (_, index) => (
        <StarIcon key={index} filled={index < stars} />
      ))}
      {extra > 0 && <span className="loyalty-extra">+{extra}</span>}
    </span>
  )
}

function BillingPage({ appointment = null }) {
  const [config, setConfig] = useState(null)
  const [catalog, setCatalog] = useState({ services: [], products: [] })
  const [coupons, setCoupons] = useState([])
  const [loadError, setLoadError] = useState('')

  const [linkedAppointment, setLinkedAppointment] = useState(appointment)
  const [customerPhone, setCustomerPhone] = useState(appointment?.clientPhone ?? '')
  const [customerName, setCustomerName] = useState(appointment?.clientName ?? '')
  const [lookup, setLookup] = useState(null)
  const [lookupError, setLookupError] = useState('')
  const [redeemFree, setRedeemFree] = useState(false)
  const [freeServiceId, setFreeServiceId] = useState('')
  const [items, setItems] = useState(() =>
    appointment ? [{ type: 'service', id: appointment.serviceId, quantity: 1, date: new Date() }] : [],
  )
  const [selectedKey, setSelectedKey] = useState('')
  const [usage, setUsage] = useState([])
  const [usageProductId, setUsageProductId] = useState('')
  const [usageServiceId, setUsageServiceId] = useState('')
  const [usageQuantity, setUsageQuantity] = useState('1')
  const [couponInput, setCouponInput] = useState('')
  const [appliedCode, setAppliedCode] = useState('')
  const [quote, setQuote] = useState(null)
  const [quoteError, setQuoteError] = useState('')
  const [settling, setSettling] = useState(false)
  const [settleError, setSettleError] = useState('')
  const [invoice, setInvoice] = useState(null)

  useEffect(() => {
    Promise.all([
      apiGet('/api/config'),
      apiGet('/api/services'),
      apiGet('/api/products'),
      apiGet('/api/coupons'),
    ])
      .then(([configData, servicesData, productsData, couponsData]) => {
        setConfig(configData)
        setCatalog({ services: servicesData.services, products: productsData.products })
        setCoupons(couponsData.coupons)
      })
      .catch((err) => setLoadError(err.message))
  }, [])

  const phoneDigits = customerPhone.replace(/\D/g, '')
  const phoneComplete = phoneDigits.length >= 10

  useEffect(() => {
    if (!phoneComplete) return
    const controller = new AbortController()
    apiGet(`/api/customers/lookup?phone=${phoneDigits}`, { signal: controller.signal })
      .then((data) => {
        setLookup({ phone: phoneDigits, customer: data.customer })
        setLookupError('')
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setLookupError(err.message)
      })
    return () => controller.abort()
  }, [phoneDigits, phoneComplete])

  const starsForFree = config?.loyaltyStarsForFree ?? 5
  const lookupDone = phoneComplete && lookup?.phone === phoneDigits
  const knownCustomer = lookupDone ? lookup.customer : null
  const isNewCustomer = lookupDone && !lookup.customer
  const canRedeem = Boolean(knownCustomer && knownCustomer.stars >= starsForFree)
  const billServiceIds = items.filter((i) => i.type === 'service').map((i) => i.id)
  const effectiveFreeServiceId =
    redeemFree && canRedeem && billServiceIds.length > 0
      ? billServiceIds.includes(Number(freeServiceId))
        ? Number(freeServiceId)
        : billServiceIds[0]
      : null

  useEffect(() => {
    const controller = new AbortController()
    apiPost(
      '/api/invoices/quote',
      {
        items: toRequestItems(items),
        couponCode: appliedCode || undefined,
        freeServiceId: effectiveFreeServiceId ?? undefined,
      },
      { signal: controller.signal },
    )
      .then((data) => {
        setQuote(data)
        setQuoteError('')
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setQuoteError(err.message)
      })
    return () => controller.abort()
  }, [items, appliedCode, effectiveFreeServiceId])

  const catalogByKey = useMemo(() => {
    const map = new Map()
    for (const s of catalog.services) {
      map.set(itemKey('service', s.id), {
        ...s,
        type: 'service',
        detail: `${s.category} • ${s.durationMinutes} min`,
      })
    }
    for (const p of catalog.products) {
      map.set(itemKey('product', p.id), {
        ...p,
        type: 'product',
        detail: [p.brand, p.size].filter(Boolean).join(' • '),
      })
    }
    return map
  }, [catalog])

  const locked = Boolean(invoice)
  const totals = invoice?.totals ?? quote?.totals
  const gstHalfRate = (totals?.gstRate ?? config?.gstRate ?? 0) / 2
  const couponApplied = appliedCode && quote?.coupon?.code === appliedCode ? quote.coupon : null
  const couponError = appliedCode && !couponApplied ? quote?.couponError : ''
  const discountCode = invoice ? invoice.couponCode : couponApplied?.code
  const billingDate = invoice?.createdAt ?? new Date()

  const soldQuantity = (productId) =>
    items.find((i) => i.type === 'product' && i.id === productId)?.quantity ?? 0
  const usedQuantity = (productId) =>
    usage.filter((u) => u.productId === productId).reduce((sum, u) => sum + u.quantity, 0)
  const availableForUsage = (productId) => {
    const product = catalogByKey.get(itemKey('product', productId))
    return product ? product.stock - soldQuantity(productId) - usedQuantity(productId) : 0
  }

  const billServices = items
    .filter((i) => i.type === 'service')
    .map((i) => catalogByKey.get(itemKey('service', i.id)))
    .filter(Boolean)

  function addItem() {
    const entry = catalogByKey.get(selectedKey)
    if (!entry) return
    const reserved = entry.type === 'product' ? usedQuantity(entry.id) : 0
    const max = maxQuantityFor(entry, reserved)
    if (max < 1) return

    setItems((current) => {
      const existing = current.find((i) => itemKey(i.type, i.id) === selectedKey)
      if (existing) {
        return current.map((i) =>
          i === existing ? { ...i, quantity: Math.min(i.quantity + 1, max) } : i,
        )
      }
      return [...current, { type: entry.type, id: entry.id, quantity: 1, date: new Date() }]
    })
    setSelectedKey('')
  }

  function changeQuantity(key, delta) {
    const entry = catalogByKey.get(key)
    const max = maxQuantityFor(entry, entry?.type === 'product' ? usedQuantity(entry.id) : 0)
    setItems((current) =>
      current.map((i) =>
        itemKey(i.type, i.id) === key
          ? { ...i, quantity: Math.min(Math.max(i.quantity + delta, 1), max) }
          : i,
      ),
    )
  }

  function removeItem(key) {
    const removed = items.find((i) => itemKey(i.type, i.id) === key)
    setItems((current) => current.filter((i) => itemKey(i.type, i.id) !== key))
    if (removed?.type === 'service') {
      setUsage((current) =>
        mergeUsage(current.map((u) => (u.serviceId === removed.id ? { ...u, serviceId: null } : u))),
      )
      if (usageServiceId === String(removed.id)) setUsageServiceId('')
    }
  }

  function addUsage(event) {
    event.preventDefault()
    const productId = Number(usageProductId)
    const quantity = Math.min(Number(usageQuantity), availableForUsage(productId), MAX_QUANTITY)
    if (!productId || !Number.isInteger(quantity) || quantity < 1) return

    const serviceId = usageServiceId ? Number(usageServiceId) : null
    setUsage((current) => mergeUsage([...current, { productId, serviceId, quantity }]))
    setUsageProductId('')
    setUsageQuantity('1')
  }

  function changeUsageQuantity(key, delta) {
    setUsage((current) =>
      current.map((u) => {
        if (usageKey(u.productId, u.serviceId) !== key) return u
        const max = Math.min(u.quantity + availableForUsage(u.productId), MAX_QUANTITY)
        return { ...u, quantity: Math.min(Math.max(u.quantity + delta, 1), max) }
      }),
    )
  }

  function removeUsage(key) {
    setUsage((current) => current.filter((u) => usageKey(u.productId, u.serviceId) !== key))
  }

  function applyCoupon(event) {
    event.preventDefault()
    setAppliedCode(couponInput.trim().toUpperCase())
  }

  function clearCoupon() {
    setAppliedCode('')
    setCouponInput('')
  }

  async function settle() {
    setSettling(true)
    setSettleError('')
    try {
      const data = await apiPost('/api/invoices', {
        items: toRequestItems(items),
        couponCode: couponApplied?.code,
        usage: usage.map(({ productId, serviceId, quantity }) => ({ productId, serviceId, quantity })),
        appointmentId: linkedAppointment?.id,
        customer: phoneComplete
          ? { phone: phoneDigits, name: isNewCustomer ? customerName : undefined }
          : undefined,
        freeServiceId: effectiveFreeServiceId ?? undefined,
      })
      setInvoice(data.invoice)
      apiGet('/api/products')
        .then((productsData) => setCatalog((c) => ({ ...c, products: productsData.products })))
        .catch(() => {})
    } catch (err) {
      setSettleError(err.message)
    } finally {
      setSettling(false)
    }
  }

  function startNewFolio() {
    setItems([])
    setUsage([])
    setUsageProductId('')
    setUsageServiceId('')
    setUsageQuantity('1')
    setInvoice(null)
    setLinkedAppointment(null)
    setCustomerPhone('')
    setCustomerName('')
    setLookup(null)
    setRedeemFree(false)
    setFreeServiceId('')
    clearCoupon()
    setSettleError('')
  }

  const serviceGroups = groupByCategory(catalog.services)
  const productGroups = groupByCategory(catalog.products)

  const usageRows = invoice
    ? invoice.usage.map((u) => ({ ...u, key: usageKey(u.productId, u.serviceId) }))
    : usage.map((u) => {
        const product = catalogByKey.get(itemKey('product', u.productId))
        const service = u.serviceId && catalogByKey.get(itemKey('service', u.serviceId))
        return {
          ...u,
          key: usageKey(u.productId, u.serviceId),
          productName: product?.name ?? 'Unknown product',
          detail: product?.detail,
          serviceName: service?.name ?? null,
          unitValue: product?.price ?? 0,
          stockLeft: availableForUsage(u.productId),
        }
      })
  const usageUnits = usageRows.reduce((sum, u) => sum + u.quantity, 0)
  const usageValue = usageRows.reduce((sum, u) => sum + u.unitValue * u.quantity, 0)
  const selectedUsageAvailable = usageProductId ? availableForUsage(Number(usageProductId)) : 0

  return (
    <div className="billing-page">
      <header className="pos-header no-print">
        <h1 className="pos-title">Billing &amp; POS</h1>
        <button
          type="button"
          className="pos-download"
          onClick={() => window.print()}
          title='Opens the print dialog. Choose "Save as PDF" as the printer.'
        >
          <DownloadIcon />
          Download PDF Invoice
        </button>
      </header>

      <div className="print-only pos-print-head">
        <div>
          <h1 className="pos-print-shop">{config?.businessName || BRAND.name}</h1>
          <p>{config?.tagline || BRAND.tagline}</p>
          {config?.gstin && <p className="mono">GSTIN: {config.gstin}</p>}
        </div>
        <dl>
          <div>
            <dt>Tax Invoice</dt>
            <dd className="mono">{invoice ? `#${invoice.invoiceNumber}` : 'Draft · not yet settled'}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd className="mono">{formatDate(billingDate)}</dd>
          </div>
          {(invoice?.customer || linkedAppointment) && (
            <div>
              <dt>Client</dt>
              <dd>{invoice?.customer?.name ?? linkedAppointment.clientName}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="billing-layout">
        <main className="billing-main">
          {loadError && <p className="pos-alert pos-alert-error">{loadError}</p>}
          {invoice && (
            <p className="pos-alert pos-alert-success" role="status">
              <CheckIcon />
              Invoice #{invoice.invoiceNumber} settled for {formatINR(invoice.totals.total)}.
              {usageUnits > 0 &&
                ` ${usageUnits} product ${usageUnits === 1 ? 'unit' : 'units'} deducted as usage.`}
              {invoice.appointmentId && linkedAppointment && ` ${linkedAppointment.clientName}'s appointment is marked completed.`}
            </p>
          )}
          {linkedAppointment && !invoice && (
            <div className="pos-alert pos-alert-info no-print">
              <CalendarIcon />
              <span>
                Checking out <strong>{linkedAppointment.clientName}</strong>'s appointment ·{' '}
                {linkedAppointment.serviceName} with {linkedAppointment.employeeName} at{' '}
                {formatClock(linkedAppointment.startTime)}. It is marked completed when this bill is settled.
              </span>
              <button type="button" className="pos-alert-action" onClick={() => setLinkedAppointment(null)}>
                Bill as walk-in
              </button>
            </div>
          )}

          <section className="pos-card">
            <div className="pos-card-head">
              <div>
                <h2 className="pos-card-title">Services &amp; Products</h2>
                <p className="pos-card-subtitle">
                  Salon services performed and retail products sold on this bill
                </p>
              </div>
              <span className="pos-badge">
                {items.length} Billable {items.length === 1 ? 'Item' : 'Items'}
              </span>
            </div>

            <div className="pos-table-wrap">
              <table className="pos-table">
                <thead>
                  <tr>
                    <th>Service Date</th>
                    <th>Description</th>
                    <th className="center">Quantity</th>
                    <th className="num">Rate (₹)</th>
                    <th className="num">Total (₹)</th>
                    {!locked && (
                      <th className="no-print">
                        <span className="sr-only">Remove</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="pos-empty">
                        No items yet. Add a service or product from the quick catalog.
                      </td>
                    </tr>
                  )}
                  {items.map((item) => {
                    const key = itemKey(item.type, item.id)
                    const entry = catalogByKey.get(key)
                    if (!entry) return null

                    return (
                      <tr key={key}>
                        <td className="mono muted">{formatDate(item.date)}</td>
                        <td>
                          <div className="pos-item-name">{entry.name}</div>
                          <div className="pos-item-detail">
                            <span className={`pos-dot pos-dot-${item.type}`} />
                            {entry.detail}
                          </div>
                        </td>
                        <td className="center">
                          {locked ? (
                            <span className="mono">{item.quantity}</span>
                          ) : (
                            <div className="qty-control">
                              <button
                                type="button"
                                onClick={() => changeQuantity(key, -1)}
                                disabled={item.quantity <= 1}
                                aria-label={`Decrease ${entry.name}`}
                              >
                                <MinusIcon />
                              </button>
                              <span className="mono">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => changeQuantity(key, 1)}
                                disabled={item.quantity >= maxQuantityFor(entry)}
                                aria-label={`Increase ${entry.name}`}
                              >
                                <PlusIcon />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="num mono">{formatINR(entry.price)}</td>
                        <td className="num mono strong">{formatINR(entry.price * item.quantity)}</td>
                        {!locked && (
                          <td className="no-print">
                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => removeItem(key)}
                              aria-label={`Remove ${entry.name}`}
                            >
                              <TrashIcon />
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="pos-card-foot">
              <span className="pos-dot pos-dot-gold" />
              Rates exclude GST. CGST and SGST are applied on the net taxable value after discounts.
            </p>
          </section>

          <section className="pos-card no-print">
            <div className="pos-card-head">
              <div>
                <h2 className="pos-card-title">Product Usage</h2>
                <p className="pos-card-subtitle">
                  Products used while performing services. Deducted from stock, not charged to the
                  customer.
                </p>
              </div>
              <span className="pos-badge usage-badge">
                {usageUnits} {usageUnits === 1 ? 'Unit' : 'Units'} Used
              </span>
            </div>

            {!locked && (
              <form className="usage-form" onSubmit={addUsage}>
                <select
                  className="pos-select"
                  value={usageProductId}
                  onChange={(e) => {
                    setUsageProductId(e.target.value)
                    setUsageQuantity('1')
                  }}
                  aria-label="Product used"
                >
                  <option value="">Select product used…</option>
                  {Object.entries(productGroups).map(([category, list]) => (
                    <optgroup key={category} label={category}>
                      {list.map((p) => {
                        const available = availableForUsage(p.id)
                        return (
                          <option key={p.id} value={p.id} disabled={available < 1}>
                            {p.name} ({available > 0 ? `${available} in stock` : 'out of stock'})
                          </option>
                        )
                      })}
                    </optgroup>
                  ))}
                </select>
                <select
                  className="pos-select"
                  value={usageServiceId}
                  onChange={(e) => setUsageServiceId(e.target.value)}
                  aria-label="Used for service"
                >
                  <option value="">Not linked to a service</option>
                  {billServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      For: {s.name}
                    </option>
                  ))}
                </select>
                <input
                  className="pos-input mono usage-qty"
                  type="number"
                  min="1"
                  max={Math.max(selectedUsageAvailable, 1)}
                  step="1"
                  value={usageQuantity}
                  onChange={(e) => setUsageQuantity(e.target.value)}
                  aria-label="Quantity used"
                />
                <button
                  type="submit"
                  className="usage-add"
                  disabled={!usageProductId || selectedUsageAvailable < 1 || Number(usageQuantity) < 1}
                >
                  <PlusIcon />
                  Add Usage
                </button>
              </form>
            )}

            <div className="pos-table-wrap">
              <table className="pos-table usage-table">
                <thead>
                  <tr>
                    <th>Product Used</th>
                    <th>Used For</th>
                    <th className="center">Quantity</th>
                    {!locked && <th className="num">Stock Left</th>}
                    <th className="num">Retail Value (₹)</th>
                    {!locked && (
                      <th>
                        <span className="sr-only">Remove</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {usageRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="pos-empty">
                        No product usage recorded{locked ? ' on this bill.' : ' yet.'}
                      </td>
                    </tr>
                  )}
                  {usageRows.map((u) => (
                    <tr key={u.key}>
                      <td>
                        <div className="pos-item-name">{u.productName}</div>
                        {u.detail && (
                          <div className="pos-item-detail">
                            <span className="pos-dot pos-dot-product" />
                            {u.detail}
                          </div>
                        )}
                      </td>
                      <td className={u.serviceName ? '' : 'muted'}>{u.serviceName ?? 'General use'}</td>
                      <td className="center">
                        {locked ? (
                          <span className="mono">{u.quantity}</span>
                        ) : (
                          <div className="qty-control">
                            <button
                              type="button"
                              onClick={() => changeUsageQuantity(u.key, -1)}
                              disabled={u.quantity <= 1}
                              aria-label={`Use less ${u.productName}`}
                            >
                              <MinusIcon />
                            </button>
                            <span className="mono">{u.quantity}</span>
                            <button
                              type="button"
                              onClick={() => changeUsageQuantity(u.key, 1)}
                              disabled={u.stockLeft < 1 || u.quantity >= MAX_QUANTITY}
                              aria-label={`Use more ${u.productName}`}
                            >
                              <PlusIcon />
                            </button>
                          </div>
                        )}
                      </td>
                      {!locked && (
                        <td className={`num mono ${u.stockLeft <= 5 ? 'usage-low' : ''}`}>{u.stockLeft}</td>
                      )}
                      <td className="num mono">{formatINR(u.unitValue * u.quantity)}</td>
                      {!locked && (
                        <td>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => removeUsage(u.key)}
                            aria-label={`Remove ${u.productName} usage`}
                          >
                            <TrashIcon />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="pos-card-foot">
              <span className="pos-dot pos-dot-product" />
              Retail value of products used: <strong className="mono">{formatINR(usageValue)}</strong>
              · not added to the bill total.
            </p>
          </section>
        </main>

        <aside className="billing-side">
          <section className="pos-card pos-side-card no-print">
            <div className="pos-side-head">
              <h3 className="pos-side-title">Customer Loyalty</h3>
              <span className="pos-side-tag">
                {starsForFree} ★ = 1 Free
              </span>
            </div>

            {locked ? (
              invoice.customer ? (
                <div className="loyalty-customer">
                  <strong>{invoice.customer.name}</strong>
                  <span className="mono">{invoice.customer.phone}</span>
                  <StarRow stars={invoice.customer.stars} total={starsForFree} />
                  <p className="loyalty-note">
                    {invoice.freeService && `Redeemed a free ${invoice.freeService.name}. `}
                    {invoice.starsEarned > 0 &&
                      `Earned ${invoice.starsEarned} ${invoice.starsEarned === 1 ? 'star' : 'stars'} on this bill. `}
                    Now {invoice.customer.stars} of {starsForFree} stars.
                  </p>
                </div>
              ) : (
                <p className="pos-side-desc">No customer was added to this bill.</p>
              )
            ) : (
              <>
                <p className="pos-side-desc">
                  Every paid service earns a star. {starsForFree} stars give the customer one free service.
                </p>
                <input
                  className="pos-input mono"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value)
                    setRedeemFree(false)
                  }}
                  placeholder="Customer mobile number"
                  maxLength={20}
                  aria-label="Customer mobile number"
                />
                {phoneDigits.length > 0 && !phoneComplete && (
                  <p className="loyalty-note">Enter the full 10-digit mobile number.</p>
                )}
                {lookupError && phoneComplete && <p className="coupon-status coupon-error">{lookupError}</p>}
                {phoneComplete && !lookupDone && !lookupError && <p className="loyalty-note">Looking up…</p>}

                {isNewCustomer && (
                  <>
                    <p className="loyalty-note">New customer. They start collecting stars from this bill.</p>
                    <input
                      className="pos-input"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer name"
                      maxLength={100}
                      aria-label="Customer name"
                    />
                  </>
                )}

                {knownCustomer && (
                  <div className="loyalty-customer">
                    <strong>{knownCustomer.name}</strong>
                    <span className="loyalty-visits">
                      {knownCustomer.visits} {knownCustomer.visits === 1 ? 'visit' : 'visits'}
                      {knownCustomer.freeServicesRedeemed > 0 &&
                        ` · ${knownCustomer.freeServicesRedeemed} free ${knownCustomer.freeServicesRedeemed === 1 ? 'service' : 'services'} used`}
                    </span>
                    <StarRow stars={knownCustomer.stars} total={starsForFree} />
                    {canRedeem ? (
                      <p className="loyalty-ready">
                        <GiftIcon />
                        Free service ready!
                      </p>
                    ) : (
                      <p className="loyalty-note">
                        {knownCustomer.stars} of {starsForFree} stars ·{' '}
                        {starsForFree - knownCustomer.stars} more{' '}
                        {starsForFree - knownCustomer.stars === 1 ? 'service' : 'services'} to a free one.
                      </p>
                    )}
                  </div>
                )}

                {canRedeem && (
                  <div className="loyalty-redeem">
                    <label className="loyalty-check">
                      <input
                        type="checkbox"
                        checked={redeemFree}
                        onChange={(e) => setRedeemFree(e.target.checked)}
                        disabled={billServices.length === 0}
                      />
                      Redeem free service on this bill
                    </label>
                    {billServices.length === 0 ? (
                      <p className="loyalty-note">Add a service to the bill to redeem it.</p>
                    ) : (
                      redeemFree && (
                        <select
                          className="pos-select"
                          value={effectiveFreeServiceId ?? ''}
                          onChange={(e) => setFreeServiceId(e.target.value)}
                          aria-label="Service to give free"
                        >
                          {billServices.map((s) => (
                            <option key={s.id} value={s.id}>
                              Free: {s.name} ({formatINR(s.price)})
                            </option>
                          ))}
                        </select>
                      )
                    )}
                  </div>
                )}

                {phoneComplete && lookupDone && quote?.starsEarned > 0 && (
                  <p className="loyalty-earn">
                    <StarIcon filled />
                    This bill adds {quote.starsEarned} {quote.starsEarned === 1 ? 'star' : 'stars'}
                    {effectiveFreeServiceId ? ` and uses ${starsForFree} for the free service` : ''}.
                  </p>
                )}
              </>
            )}
          </section>

          <section className="pos-card pos-side-card no-print">
            <div className="pos-side-head">
              <h3 className="pos-side-title">Add Line Item</h3>
              <span className="pos-side-tag">Quick Catalog</span>
            </div>
            <p className="pos-side-desc">
              Add a salon service or a retail product to the bill.
            </p>
            <select
              className="pos-select"
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              disabled={locked}
              aria-label="Select product or service"
            >
              <option value="">Select Product/Service…</option>
              {Object.entries(serviceGroups).map(([category, list]) => (
                <optgroup key={`service-${category}`} label={`Services · ${category}`}>
                  {list.map((s) => (
                    <option key={s.id} value={itemKey('service', s.id)}>
                      {s.name} — {formatINR(s.price)}
                    </option>
                  ))}
                </optgroup>
              ))}
              {Object.entries(productGroups).map(([category, list]) => (
                <optgroup key={`product-${category}`} label={`Products · ${category}`}>
                  {list.map((p) => {
                    const inStock = availableForUsage(p.id) > 0
                    return (
                      <option key={p.id} value={itemKey('product', p.id)} disabled={!inStock}>
                        {p.name} — {formatINR(p.price)}
                        {inStock ? '' : ' (out of stock)'}
                      </option>
                    )
                  })}
                </optgroup>
              ))}
            </select>
            <button
              type="button"
              className="pos-outline-button"
              onClick={addItem}
              disabled={!selectedKey || locked}
            >
              <PlusIcon />
              Add Item to Folio
            </button>
          </section>

          <section className="pos-card pos-side-card no-print">
            <div className="pos-side-head">
              <h3 className="pos-side-title">Apply Coupon Code</h3>
              {couponApplied && <span className="pos-badge">Promo Active</span>}
            </div>
            <form className="coupon-row" onSubmit={applyCoupon}>
              <input
                className="pos-input mono"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Enter code"
                disabled={locked || Boolean(appliedCode)}
                aria-label="Coupon code"
              />
              {appliedCode ? (
                <button type="button" className="coupon-clear" onClick={clearCoupon} disabled={locked}>
                  Clear
                </button>
              ) : (
                <button type="submit" className="coupon-apply" disabled={!couponInput.trim() || locked}>
                  Apply
                </button>
              )}
            </form>
            {couponApplied && (
              <div className="coupon-status coupon-success">
                <CheckIcon />
                <div>
                  <strong>Code {couponApplied.code} validated successfully.</strong>
                  <span>{couponApplied.description}</span>
                </div>
              </div>
            )}
            {couponError && <div className="coupon-status coupon-error">{couponError}</div>}
            {coupons.length > 0 && (
              <p className="coupon-available">
                Available:
                {coupons.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    className="coupon-chip"
                    onClick={() => setCouponInput(c.code)}
                    disabled={locked || Boolean(appliedCode)}
                    title={c.description}
                  >
                    {c.code}
                  </button>
                ))}
              </p>
            )}
          </section>

          <section className="pos-card pos-totals">
            <dl className="totals-list">
              <div>
                <dt>Gross Folio Subtotal</dt>
                <dd className="mono">{formatINR(totals?.subtotal)}</dd>
              </div>
              {totals?.loyaltyDiscount > 0 && (
                <div>
                  <dt>
                    Loyalty Free Service
                    <span className="discount-chip">
                      <StarIcon filled className="discount-chip-star" />
                      {invoice?.freeService?.name ?? quote?.freeService?.name}
                    </span>
                  </dt>
                  <dd className="mono discount">−{formatINR(totals.loyaltyDiscount)}</dd>
                </div>
              )}
              <div>
                <dt>
                  Privilege Discount
                  {discountCode && <span className="discount-chip">{discountCode}</span>}
                </dt>
                <dd className="mono discount">
                  {totals?.discount ? `−${formatINR(totals.discount)}` : formatINR(0)}
                </dd>
              </div>
              <div>
                <dt>Net Taxable Value</dt>
                <dd className="mono">{formatINR(totals?.taxableValue)}</dd>
              </div>
              <div className="totals-gst">
                <dt>
                  GST (CGST {gstHalfRate}% + SGST {gstHalfRate}%)
                </dt>
                <dd className="mono">{formatINR((totals?.cgst ?? 0) + (totals?.sgst ?? 0))}</dd>
              </div>
            </dl>

            <div className="total-due">
              <div>
                <span className="total-due-label">Total Amount Due</span>
                <span className="total-due-note">INR inclusive of all taxes</span>
              </div>
              <strong className="total-due-amount">{formatINR(totals?.total)}</strong>
            </div>

            <div className="totals-actions no-print">
              {quoteError && <p className="pos-alert pos-alert-error">{quoteError}</p>}
              {settleError && <p className="pos-alert pos-alert-error">{settleError}</p>}
              {!locked && isNewCustomer && !customerName.trim() && (
                <p className="loyalty-note">Enter the customer&apos;s name to settle, or clear the mobile number.</p>
              )}
              {locked ? (
                <button type="button" className="pos-primary" onClick={startNewFolio}>
                  Start New Folio
                </button>
              ) : (
                <button
                  type="button"
                  className="pos-primary"
                  onClick={settle}
                  disabled={
                    items.length === 0 ||
                    settling ||
                    (isNewCustomer && !customerName.trim()) ||
                    (phoneDigits.length > 0 && !lookupDone)
                  }
                >
                  {settling ? 'Settling…' : 'Proceed to POS Settlement'}
                </button>
              )}
              <button type="button" className="pos-outline-button" onClick={() => window.print()}>
                <PrintIcon />
                Print Tax Folio Receipt
              </button>
            </div>
          </section>

          <p className="pos-sync no-print">
            <ShieldIcon />
            {loadError ? 'POS server unavailable' : 'Synced with salon POS server'}
          </p>
        </aside>
      </div>

      <footer className="pos-footer">
        <span>
          <span className={`pos-status-dot ${loadError ? 'is-down' : ''}`} />
          Billing Server ({loadError ? 'Unavailable' : 'Operational'})
        </span>
        <span>
          © {new Date().getFullYear()} {config?.businessName || BRAND.name} • All rights reserved
        </span>
      </footer>
    </div>
  )
}

export default BillingPage
