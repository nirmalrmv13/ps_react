import { useEffect, useRef, useState } from 'react'
import { apiGet, apiPost, apiPut } from './api.js'
import { addDays, localDate } from './appointmentUtils.js'
import { formatDate, formatINR, formatINRWhole } from './format.js'
import { PlusIcon, SearchIcon, TrashIcon, XIcon } from './Icons.jsx'
import './MasterPage.css'
import './BillingHistoryPage.css'
import './PurchasesPage.css'

const RANGES = [
  { id: 'month', label: '30 days', days: 29 },
  { id: 'quarter', label: '90 days', days: 89 },
  { id: 'year', label: '1 year', days: 364 },
]

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100
const dayDate = (day) => formatDate(`${day}T00:00`)
let lastLineKey = 0
const emptyLine = () => ({ key: ++lastLineKey, productId: '', quantity: '1', unitCost: '' })

function PaymentBadge({ status }) {
  return <span className={`pur-status is-${status}`}>{status === 'paid' ? 'Paid' : 'Unpaid'}</span>
}

function PurchaseForm({ suppliers, products, onClose, onSaved }) {
  const dialogRef = useRef(null)
  const [supplierId, setSupplierId] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(localDate)
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('')
  const [lines, setLines] = useState(() => [emptyLine()])
  const [taxAmount, setTaxAmount] = useState('')
  const [note, setNote] = useState('')
  const [paid, setPaid] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    dialog.querySelector('select')?.focus()
    return () => dialog.close()
  }, [])

  const updateLine = (key, field, value) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, [field]: value } : line)))
  const removeLine = (key) => setLines((current) => current.filter((line) => line.key !== key))

  const lineTotal = (line) => round2((Number(line.quantity) || 0) * (Number(line.unitCost) || 0))
  const subtotal = round2(lines.reduce((sum, line) => sum + lineTotal(line), 0))
  const total = round2(subtotal + (Number(taxAmount) || 0))
  const chosen = new Set(lines.map((line) => line.productId).filter(Boolean))
  const units = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0)

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const data = await apiPost('/api/purchases', {
        supplierId: Number(supplierId),
        purchaseDate,
        supplierInvoiceNo,
        taxAmount: taxAmount === '' ? 0 : Number(taxAmount),
        note,
        paid,
        items: lines.map((line) => ({
          productId: Number(line.productId),
          quantity: Number(line.quantity),
          unitCost: Number(line.unitCost),
        })),
      })
      onSaved(data.purchase)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="master-dialog pur-dialog"
      aria-labelledby="purchase-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!saving) onClose()
      }}
    >
      <form className="master-form" onSubmit={handleSubmit}>
        <header className="master-form-header">
          <p className="master-form-eyebrow">Purchases</p>
          <h2 id="purchase-dialog-title">Record purchase</h2>
          <button type="button" className="master-dialog-close" onClick={onClose} disabled={saving} aria-label="Close">
            <XIcon />
          </button>
        </header>

        <div className="master-form-body">
          <div className="master-form-grid pur-form-grid">
            <div className="master-field">
              <label htmlFor="purchase-supplier">
                Supplier<span className="master-required" aria-hidden="true">*</span>
              </label>
              <select id="purchase-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                <option value="">Select a supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="master-field">
              <label htmlFor="purchase-date">
                Purchase date<span className="master-required" aria-hidden="true">*</span>
              </label>
              <input
                id="purchase-date"
                type="date"
                value={purchaseDate}
                max={localDate()}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />
            </div>
            <div className="master-field">
              <label htmlFor="purchase-invoice">Supplier invoice no.</label>
              <input
                id="purchase-invoice"
                value={supplierInvoiceNo}
                onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                maxLength={50}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="pur-lines">
            <table className="pur-lines-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="is-right">Qty</th>
                  <th className="is-right">Unit cost (₹)</th>
                  <th className="is-right">Amount</th>
                  <th>
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={line.key}>
                    <td>
                      <select
                        value={line.productId}
                        onChange={(e) => updateLine(line.key, 'productId', e.target.value)}
                        aria-label={`Product on line ${index + 1}`}
                        required
                      >
                        <option value="">Select product…</option>
                        {products.map((p) => (
                          <option
                            key={p.id}
                            value={p.id}
                            disabled={chosen.has(String(p.id)) && line.productId !== String(p.id)}
                          >
                            {p.name}
                            {p.size ? ` (${p.size})` : ''} — {p.stock} in stock
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="is-right">
                      <input
                        type="number"
                        min="1"
                        max="100000"
                        step="1"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.key, 'quantity', e.target.value)}
                        aria-label={`Quantity on line ${index + 1}`}
                        required
                      />
                    </td>
                    <td className="is-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitCost}
                        onChange={(e) => updateLine(line.key, 'unitCost', e.target.value)}
                        aria-label={`Unit cost on line ${index + 1}`}
                        required
                      />
                    </td>
                    <td className="is-right mono">{formatINR(lineTotal(line))}</td>
                    <td className="is-right">
                      <button
                        type="button"
                        className="master-icon-button"
                        onClick={() => removeLine(line.key)}
                        disabled={lines.length === 1}
                        title="Remove line"
                      >
                        <TrashIcon />
                        <span className="sr-only">Remove line {index + 1}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className="master-text-button pur-add-line"
              onClick={() => setLines((current) => [...current, emptyLine()])}
              disabled={lines.length >= products.length}
            >
              <PlusIcon />
              Add line
            </button>
          </div>

          <div className="master-form-grid pur-form-grid">
            <div className="master-field">
              <label htmlFor="purchase-tax">GST on supplier invoice (₹)</label>
              <input
                id="purchase-tax"
                type="number"
                min="0"
                step="0.01"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="master-field pur-span-2">
              <label htmlFor="purchase-note">Note</label>
              <input
                id="purchase-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={255}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="pur-summary">
            <label className="pur-paid">
              <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
              Already paid to supplier
            </label>
            <dl>
              <div>
                <dt>{units} units · Subtotal</dt>
                <dd className="mono">{formatINR(subtotal)}</dd>
              </div>
              <div>
                <dt>GST</dt>
                <dd className="mono">{formatINR(Number(taxAmount) || 0)}</dd>
              </div>
              <div className="is-total">
                <dt>Total</dt>
                <dd className="mono">{formatINR(total)}</dd>
              </div>
            </dl>
          </div>

          <p className="pur-hint">Saving adds these quantities to stock straight away. Purchases cannot be edited later.</p>

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
            {saving ? 'Saving…' : 'Save purchase'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}

function PurchaseDetail({ id, onClose, onPaymentChange }) {
  const dialogRef = useRef(null)
  const [purchase, setPurchase] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    apiGet(`/api/purchases/${id}`, { signal: controller.signal })
      .then((data) => setPurchase(data.purchase))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
    return () => controller.abort()
  }, [id])

  async function togglePayment() {
    setBusy(true)
    setError('')
    try {
      const data = await apiPut(`/api/purchases/${id}/payment`, {
        status: purchase.paymentStatus === 'paid' ? 'unpaid' : 'paid',
      })
      setPurchase(data.purchase)
      onPaymentChange(data.purchase)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="master-dialog pur-dialog"
      aria-labelledby="purchase-detail-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <header className="master-form-header">
        <p className="master-form-eyebrow">Purchase</p>
        <h2 id="purchase-detail-title">{purchase?.purchaseNumber ?? 'Loading…'}</h2>
        <button type="button" className="master-dialog-close" onClick={onClose} aria-label="Close">
          <XIcon />
        </button>
      </header>

      <div className="master-form-body">
        {purchase && (
          <div className="pur-detail">
            <dl className="pur-detail-meta">
              <div>
                <dt>Supplier</dt>
                <dd>
                  {purchase.supplierName}
                  {purchase.supplierGstin && <span className="mono"> · {purchase.supplierGstin}</span>}
                </dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{dayDate(purchase.purchaseDate)}</dd>
              </div>
              <div>
                <dt>Supplier invoice</dt>
                <dd className="mono">{purchase.supplierInvoiceNo || '—'}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>
                  <PaymentBadge status={purchase.paymentStatus} />
                </dd>
              </div>
            </dl>

            <table className="pur-lines-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="is-right">Qty</th>
                  <th className="is-right">Unit cost</th>
                  <th className="is-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {purchase.items.map((item) => (
                  <tr key={item.productId}>
                    <td>{item.productName}</td>
                    <td className="is-right mono">{item.quantity}</td>
                    <td className="is-right mono">{formatINR(item.unitCost)}</td>
                    <td className="is-right mono">{formatINR(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Subtotal</td>
                  <td className="is-right mono">{formatINR(purchase.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3}>GST</td>
                  <td className="is-right mono">{formatINR(purchase.taxAmount)}</td>
                </tr>
                <tr className="is-total">
                  <td colSpan={3}>Total</td>
                  <td className="is-right mono">{formatINR(purchase.total)}</td>
                </tr>
              </tfoot>
            </table>

            {purchase.note && <p className="pur-hint">Note: {purchase.note}</p>}
            <p className="pur-hint">
              Recorded {formatDate(purchase.createdAt)}
              {purchase.userName && ` by ${purchase.userName}`}.
            </p>
          </div>
        )}

        {error && (
          <p className="master-alert is-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <footer className="master-form-actions">
        {purchase && (
          <button type="button" className="master-button is-secondary" onClick={togglePayment} disabled={busy}>
            {purchase.paymentStatus === 'paid' ? 'Mark as unpaid' : 'Mark as paid'}
          </button>
        )}
        <button type="button" className="master-button is-primary" onClick={onClose}>
          Close
        </button>
      </footer>
    </dialog>
  )
}

function PurchasesPage() {
  const today = localDate()
  const [from, setFrom] = useState(() => addDays(today, -29))
  const [to, setTo] = useState(today)
  const [supplierId, setSupplierId] = useState('')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [data, setData] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [creating, setCreating] = useState(false)
  const [viewingId, setViewingId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    Promise.all([apiGet('/api/suppliers'), apiGet('/api/products')])
      .then(([suppliersData, productsData]) => {
        setSuppliers(suppliersData.suppliers)
        setProducts(productsData.products)
      })
      .catch((err) => setError(err.message))
  }, [reloadKey])

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (supplierId) params.set('supplierId', supplierId)
    if (search) params.set('q', search)
    apiGet(`/api/purchases?${params}`, { signal: controller.signal })
      .then((result) => {
        setData(result)
        setError('')
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
    return () => controller.abort()
  }, [from, to, supplierId, search, reloadKey])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  const summary = data?.summary
  const purchases = data?.purchases ?? []
  const activeRange = to === today ? RANGES.find((r) => from === addDays(today, -r.days))?.id : null

  function handleSaved(purchase) {
    setCreating(false)
    const units = purchase.items.reduce((sum, item) => sum + item.quantity, 0)
    setNotice(`${purchase.purchaseNumber} saved. ${units} units added to stock.`)
    setReloadKey((key) => key + 1)
  }

  return (
    <div className="master-page bh-page">
      <header className="master-header">
        <h1 className="master-title">Purchases</h1>
        <button
          type="button"
          className="master-add"
          onClick={() => setCreating(true)}
          disabled={suppliers.length === 0 || products.length === 0}
          title={suppliers.length === 0 ? 'Add a supplier in Supplier Master first' : undefined}
        >
          <PlusIcon />
          New Purchase
        </button>
      </header>

      <div className="bh-body">
        <dl className="bh-stats">
          <div>
            <dt>Purchases</dt>
            <dd>{summary ? summary.count.toLocaleString('en-IN') : '—'}</dd>
          </div>
          <div>
            <dt>Total spend</dt>
            <dd>{summary ? formatINRWhole(summary.total) : '—'}</dd>
          </div>
          <div>
            <dt>GST paid (input)</dt>
            <dd>{summary ? formatINRWhole(summary.tax) : '—'}</dd>
          </div>
          <div className={summary?.unpaid > 0 ? 'pur-due' : ''}>
            <dt>Unpaid to suppliers</dt>
            <dd>{summary ? formatINRWhole(summary.unpaid) : '—'}</dd>
          </div>
        </dl>

        <div className="master-toolbar">
          <label className="master-search">
            <SearchIcon />
            <span className="sr-only">Search purchases</span>
            <input
              type="search"
              placeholder="Purchase, supplier or invoice number…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="bh-filters">
            <select
              className="pur-select"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              aria-label="Filter by supplier"
            >
              <option value="">All suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="master-filter" role="group" aria-label="Quick date range">
              {RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={activeRange === r.id}
                  onClick={() => {
                    setFrom(addDays(today, -r.days))
                    setTo(today)
                  }}
                >
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
        {notice && (
          <p className="master-alert is-success" role="status">
            {notice}
          </p>
        )}

        <div className="master-table-wrap">
          <table className="master-table bh-table">
            <thead>
              <tr>
                <th>Purchase</th>
                <th>Date</th>
                <th>Supplier</th>
                <th className="is-right">Items</th>
                <th className="is-right">Total</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {!data ? (
                <tr>
                  <td colSpan={6} className="master-empty">
                    Loading purchases…
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="master-empty">
                    No purchases {search || supplierId ? 'match your filters' : 'in this date range'}. Use “New
                    Purchase” to receive stock from a supplier.
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="bh-row" onClick={() => setViewingId(p.id)} title="View purchase">
                    <td>
                      <span className="master-cell-value is-mono">{p.purchaseNumber}</span>
                      {p.supplierInvoiceNo && (
                        <span className="master-cell-detail">Supplier inv. {p.supplierInvoiceNo}</span>
                      )}
                    </td>
                    <td>{dayDate(p.purchaseDate)}</td>
                    <td>
                      <span className="master-cell-value">{p.supplierName}</span>
                      {p.note && <span className="master-cell-detail">{p.note}</span>}
                    </td>
                    <td className="is-right">
                      <span className="master-cell-value is-mono">{p.units}</span>
                      <span className="master-cell-detail">
                        {p.lineCount} {p.lineCount === 1 ? 'product' : 'products'}
                      </span>
                    </td>
                    <td className="is-right">
                      <span className="master-cell-value is-mono">{formatINR(p.total)}</span>
                      {p.taxAmount > 0 && <span className="master-cell-detail">GST {formatINR(p.taxAmount)}</span>}
                    </td>
                    <td>
                      <PaymentBadge status={p.paymentStatus} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && purchases.length >= data.limit && (
          <p className="bh-note">Showing the latest {data.limit} purchases. Narrow the date range to see older ones.</p>
        )}
      </div>

      {creating && (
        <PurchaseForm
          suppliers={suppliers}
          products={products}
          onClose={() => setCreating(false)}
          onSaved={handleSaved}
        />
      )}
      {viewingId && (
        <PurchaseDetail
          id={viewingId}
          onClose={() => setViewingId(null)}
          onPaymentChange={(purchase) => {
            setNotice(`${purchase.purchaseNumber} marked as ${purchase.paymentStatus}.`)
            setReloadKey((key) => key + 1)
          }}
        />
      )}
    </div>
  )
}

export default PurchasesPage
