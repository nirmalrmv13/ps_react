import { useEffect, useMemo, useRef, useState } from 'react'
import { apiGet, apiPost } from './api.js'
import { formatINRWhole } from './format.js'
import { PlusIcon, SearchIcon } from './Icons.jsx'
import './MasterPage.css'
import './InventoryPage.css'

const ADJUSTMENTS = [
  { value: 'received', label: 'Stock received (+)' },
  { value: 'returned', label: 'Customer return (+)' },
  { value: 'damaged', label: 'Damaged (−)' },
  { value: 'expired', label: 'Expired (−)' },
  { value: 'count', label: 'Stock count (set exact quantity)' },
]

const MOVEMENT_LABELS = {
  sale: 'Sold',
  usage: 'Used in service',
  opening: 'Opening stock',
  received: 'Stock received',
  returned: 'Customer return',
  damaged: 'Damaged',
  expired: 'Expired',
  count: 'Stock count',
}

const stockFilters = [
  { id: 'all', label: 'All' },
  { id: 'low', label: 'Low stock' },
  { id: 'out', label: 'Out of stock' },
]

function stockLevel(product, threshold) {
  if (product.stock === 0) return 'out'
  if (product.stock <= threshold) return 'low'
  return 'ok'
}

function daysLeft(product) {
  const perDay = (product.sold30 + product.used30) / 30
  return perDay > 0 ? Math.floor(product.stock / perDay) : null
}

function formatWhen(value) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function applyAdjustment(stock, reason, quantity) {
  if (reason === 'count') return quantity
  return reason === 'received' || reason === 'returned' ? stock + quantity : stock - quantity
}

function AdjustStockForm({ products, initialProductId, onClose, onSaved }) {
  const dialogRef = useRef(null)
  const [productId, setProductId] = useState(initialProductId ? String(initialProductId) : '')
  const [reason, setReason] = useState('received')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    dialog.querySelector(initialProductId ? '#adjust-reason' : '#adjust-product')?.focus()
    return () => dialog.close()
  }, [initialProductId])

  const product = products.find((p) => String(p.id) === productId)
  const isCount = reason === 'count'
  const amount = Number(quantity)
  const validAmount = quantity !== '' && Number.isInteger(amount) && amount >= (isCount ? 0 : 1)
  const after = product && validAmount ? applyAdjustment(product.stock, reason, amount) : null

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const data = await apiPost('/api/inventory/adjustments', {
        productId: Number(productId),
        reason,
        quantity: amount,
        note,
      })
      onSaved(data.product)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="master-dialog"
      aria-labelledby="adjust-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!saving) onClose()
      }}
    >
      <form className="master-form" onSubmit={handleSubmit}>
        <header className="master-form-header">
          <p className="master-form-eyebrow">Inventory</p>
          <h2 id="adjust-dialog-title">Adjust stock</h2>
        </header>

        <div className="master-form-grid">
          <div className="master-field is-wide">
            <label htmlFor="adjust-product">
              Product<span className="master-required" aria-hidden="true">*</span>
            </label>
            <select id="adjust-product" value={productId} onChange={(e) => setProductId(e.target.value)} required>
              <option value="">Select a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.stock} in stock{p.isActive ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
          </div>
          <div className="master-field">
            <label htmlFor="adjust-reason">
              Adjustment<span className="master-required" aria-hidden="true">*</span>
            </label>
            <select id="adjust-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              {ADJUSTMENTS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className="master-field">
            <label htmlFor="adjust-quantity">
              {isCount ? 'Counted quantity' : 'Quantity'}
              <span className="master-required" aria-hidden="true">*</span>
            </label>
            <input
              id="adjust-quantity"
              type="number"
              min={isCount ? 0 : 1}
              max={!isCount && reason !== 'received' && reason !== 'returned' ? product?.stock : undefined}
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div className="master-field is-wide">
            <label htmlFor="adjust-note">Note</label>
            <input
              id="adjust-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={255}
              placeholder="e.g. Supplier invoice #1042"
              autoComplete="off"
            />
          </div>
        </div>

        {product && (
          <p className="inv-preview">
            Stock: <strong className="mono">{product.stock}</strong>
            {after !== null && (
              <>
                {' '}→{' '}
                <strong className={`mono ${after < 0 ? 'is-negative' : ''}`}>{after}</strong>
                {after !== product.stock && (
                  <span className={after > product.stock ? 'is-in' : 'is-out'}>
                    {after > product.stock ? '+' : '−'}
                    {Math.abs(after - product.stock)}
                  </span>
                )}
              </>
            )}
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
          <button type="submit" className="master-button is-primary" disabled={saving || (after !== null && after < 0)}>
            {saving ? 'Saving…' : 'Save adjustment'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}

function InventoryPage() {
  const [products, setProducts] = useState([])
  const [threshold, setThreshold] = useState(5)
  const [loading, setLoading] = useState(true)
  const [movements, setMovements] = useState([])
  const [movementsFor, setMovementsFor] = useState(undefined)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('all')
  const [category, setCategory] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [adjusting, setAdjusting] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    apiGet('/api/inventory', { signal: controller.signal })
      .then((data) => {
        setProducts(data.products)
        setThreshold(data.lowStockThreshold)
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
    const controller = new AbortController()
    const params = selectedId ? `?productId=${selectedId}` : '?limit=50'
    apiGet(`/api/inventory/movements${params}`, { signal: controller.signal })
      .then((data) => {
        setMovements(data.movements)
        setMovementsFor(selectedId)
      })
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

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))].sort(), [products])
  const tracked = products.filter((p) => showInactive || p.isActive)
  const summary = {
    products: tracked.length,
    units: tracked.reduce((sum, p) => sum + p.stock, 0),
    value: tracked.reduce((sum, p) => sum + p.stock * p.price, 0),
    low: tracked.filter((p) => stockLevel(p, threshold) === 'low').length,
    out: tracked.filter((p) => stockLevel(p, threshold) === 'out').length,
  }

  const term = query.trim().toLowerCase()
  const visible = tracked.filter(
    (p) =>
      (level === 'all' || stockLevel(p, threshold) === level) &&
      (!category || p.category === category) &&
      (!term || [p.name, p.brand, p.category].some((v) => String(v ?? '').toLowerCase().includes(term))),
  )
  const selected = products.find((p) => p.id === selectedId) ?? null
  const movementsLoading = movementsFor !== selectedId

  function handleSaved(product) {
    setAdjusting(null)
    setError('')
    setNotice(
      `${product.name}: ${product.change > 0 ? '+' : '−'}${Math.abs(product.change)}, now ${product.stock} in stock.`,
    )
    setSelectedId(product.id)
    setReloadKey((key) => key + 1)
  }

  return (
    <div className="master-page inv-page">
      <header className="master-header">
        <h1 className="master-title">Inventory</h1>
        <button
          type="button"
          className="master-add"
          onClick={() => setAdjusting({ productId: selectedId })}
          disabled={loading}
        >
          <PlusIcon />
          Adjust Stock
        </button>
      </header>

      <div className="inv-body">
        <dl className="inv-stats">
          <div>
            <dt>Products</dt>
            <dd>{summary.products}</dd>
          </div>
          <div>
            <dt>Units in stock</dt>
            <dd>{summary.units.toLocaleString('en-IN')}</dd>
          </div>
          <div>
            <dt>Stock value (retail)</dt>
            <dd>{formatINRWhole(summary.value)}</dd>
          </div>
          <div className={summary.low ? 'is-warn' : ''}>
            <dt>Low stock (≤ {threshold})</dt>
            <dd>{summary.low}</dd>
          </div>
          <div className={summary.out ? 'is-danger' : ''}>
            <dt>Out of stock</dt>
            <dd>{summary.out}</dd>
          </div>
        </dl>

        <div className="inv-panels">
          <section className="inv-main">
            <div className="master-toolbar">
              <label className="master-search">
                <SearchIcon />
                <span className="sr-only">Search products</span>
                <input
                  type="search"
                  placeholder="Search products…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="inv-filters">
                <select
                  className="inv-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  aria-label="Filter by category"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <div className="master-filter" role="group" aria-label="Filter by stock level">
                  {stockFilters.map((f) => (
                    <button key={f.id} type="button" aria-pressed={level === f.id} onClick={() => setLevel(f.id)}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <label className="inv-check">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                  />
                  Inactive
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
              <table className="master-table inv-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="is-right">Stock</th>
                    <th className="is-right">Last 30 days</th>
                    <th className="is-right">Days left</th>
                    <th className="is-right">Stock value</th>
                    <th className="is-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="master-empty">
                        Loading inventory…
                      </td>
                    </tr>
                  ) : visible.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="master-empty">
                        No products match your filters.
                      </td>
                    </tr>
                  ) : (
                    visible.map((p) => {
                      const stockState = stockLevel(p, threshold)
                      const days = daysLeft(p)
                      return (
                        <tr
                          key={p.id}
                          className={[
                            'inv-row',
                            p.id === selectedId && 'is-selected',
                            !p.isActive && 'is-inactive',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
                          aria-selected={p.id === selectedId}
                        >
                          <td>
                            <span className="master-cell-value">{p.name}</span>
                            <span className="master-cell-detail">
                              {[p.category, p.brand, p.size].filter(Boolean).join(' · ')}
                            </span>
                          </td>
                          <td className="is-right">
                            <span className="inv-stock">
                              {stockState !== 'ok' && (
                                <span className={`inv-level is-${stockState}`}>
                                  {stockState === 'out' ? 'Out' : 'Low'}
                                </span>
                              )}
                              <span className="mono">{p.stock}</span>
                            </span>
                          </td>
                          <td className="is-right">
                            <span className="master-cell-value is-mono">{p.sold30 + p.used30}</span>
                            <span className="master-cell-detail">
                              {p.sold30} sold · {p.used30} used
                            </span>
                          </td>
                          <td className={`is-right mono ${days !== null && days <= 14 ? 'inv-warn' : ''}`}>
                            {days === null ? '—' : `~${days}`}
                          </td>
                          <td className="is-right mono">{formatINRWhole(p.stock * p.price)}</td>
                          <td className="is-right">
                            <button
                              type="button"
                              className="master-text-button"
                              onClick={(event) => {
                                event.stopPropagation()
                                setAdjusting({ productId: p.id })
                              }}
                            >
                              Adjust
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="inv-side">
            <div className="inv-side-head">
              <div>
                <h2 className="inv-side-title">Stock movements</h2>
                <p className="inv-side-subtitle">{selected ? selected.name : 'Latest across all products'}</p>
              </div>
              {selected && (
                <button type="button" className="inv-link" onClick={() => setSelectedId(null)}>
                  Show all
                </button>
              )}
            </div>

            <ol className="inv-movements">
              {movementsLoading ? (
                <li className="inv-movements-empty">Loading…</li>
              ) : movements.length === 0 ? (
                <li className="inv-movements-empty">
                  No stock movements yet. Sales, service usage and adjustments appear here.
                </li>
              ) : (
                movements.map((m) => (
                  <li key={m.id} className="inv-movement">
                    <div className="inv-movement-top">
                      <span className={`inv-kind is-${m.kind}`}>{MOVEMENT_LABELS[m.kind] ?? m.kind}</span>
                      <span className={`inv-change mono ${m.quantityChange > 0 ? 'is-in' : 'is-out'}`}>
                        {m.quantityChange > 0 ? '+' : '−'}
                        {Math.abs(m.quantityChange)}
                      </span>
                    </div>
                    {!selected && <p className="inv-movement-product">{m.productName}</p>}
                    {(m.reference || m.note) && (
                      <p className="inv-movement-note">
                        {m.reference && <span className="mono">{m.reference}</span>}
                        {m.reference && m.note && ' · '}
                        {m.kind === 'usage' && m.note ? `For ${m.note}` : m.note}
                      </p>
                    )}
                    <p className="inv-movement-meta">
                      {formatWhen(m.createdAt)}
                      {m.userName && ` · ${m.userName}`}
                      {m.stockAfter !== null && ` · ${m.stockAfter} left`}
                    </p>
                  </li>
                ))
              )}
            </ol>
          </aside>
        </div>
      </div>

      {adjusting && (
        <AdjustStockForm
          products={products}
          initialProductId={adjusting.productId}
          onClose={() => setAdjusting(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

export default InventoryPage
