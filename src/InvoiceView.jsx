import { useEffect, useState } from 'react'
import { apiGet } from './api.js'
import { formatClock, formatLongDate } from './appointmentUtils.js'
import logo from './assets/logo.png'
import { BRAND } from './brand.js'
import { formatINR } from './format.js'
import { DownloadIcon, GiftIcon, StarIcon } from './Icons.jsx'
import './InvoiceView.css'

function formatDateTime(value) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function closeTab() {
  window.close()
  setTimeout(() => window.location.assign(window.location.pathname), 200)
}

function InvoiceView({ id }) {
  const [invoice, setInvoice] = useState(null)
  const [config, setConfig] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([apiGet(`/api/invoices/${encodeURIComponent(id)}`), apiGet('/api/config')])
      .then(([invoiceData, configData]) => {
        setInvoice(invoiceData.invoice)
        setConfig(configData)
      })
      .catch((err) => setError(err.message))
  }, [id])

  const shopName = config?.businessName || BRAND.name

  useEffect(() => {
    if (invoice) document.title = `${invoice.invoiceNumber} · ${shopName}`
  }, [invoice, shopName])

  if (error || !invoice) {
    return (
      <div className="iv-page">
        <div className="iv-sheet iv-message">
          {error ? (
            <>
              <p>{error}</p>
              <button type="button" className="iv-button" onClick={closeTab}>
                Close tab
              </button>
            </>
          ) : (
            <p>Loading invoice…</p>
          )}
        </div>
      </div>
    )
  }

  const t = invoice.totals
  const halfRate = t.gstRate / 2
  const freeServiceId = invoice.freeService?.id
  const usageValue = invoice.usage.reduce((sum, u) => sum + u.unitValue * u.quantity, 0)

  return (
    <div className="iv-page">
      <div className="iv-toolbar no-print">
        <button type="button" className="iv-button is-ghost" onClick={closeTab}>
          Close tab
        </button>
        <button
          type="button"
          className="iv-button is-primary"
          onClick={() => window.print()}
          title='Opens the print dialog. Choose "Save as PDF" as the printer.'
        >
          <DownloadIcon />
          Print / Download PDF
        </button>
      </div>

      <article className="iv-sheet">
        <header className="iv-head">
          <div className="iv-brand">
            <img src={logo} alt="" />
            <div>
              <h1>{shopName}</h1>
              <p>{config?.tagline || BRAND.tagline}</p>
              {config?.gstin && <p className="mono">GSTIN: {config.gstin}</p>}
            </div>
          </div>
          <div className="iv-meta">
            <span className="iv-eyebrow">Tax Invoice</span>
            <strong className="mono">#{invoice.invoiceNumber}</strong>
            <span>{formatDateTime(invoice.createdAt)}</span>
          </div>
        </header>

        <section className="iv-parties">
          <div>
            <span className="iv-eyebrow">Billed to</span>
            {invoice.customer ? (
              <>
                <strong>{invoice.customer.name}</strong>
                <span className="mono">{invoice.customer.phone}</span>
              </>
            ) : (
              <strong>Walk-in customer</strong>
            )}
          </div>
          {invoice.appointment && (
            <div>
              <span className="iv-eyebrow">Appointment</span>
              <strong>{invoice.appointment.employeeName}</strong>
              <span>
                {formatLongDate(invoice.appointment.date)} · {formatClock(invoice.appointment.startTime)}
              </span>
            </div>
          )}
        </section>

        <table className="iv-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Description</th>
              <th className="num">Qty</th>
              <th className="num">Rate</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={`${item.type}:${item.id}`}>
                <td className="muted mono">{index + 1}</td>
                <td>
                  <span className="iv-item">{item.name}</span>
                  <span className="iv-item-type">
                    {item.type === 'service' ? 'Service' : 'Product'}
                    {item.type === 'service' && item.id === freeServiceId && (
                      <span className="iv-free">Free · loyalty reward</span>
                    )}
                  </span>
                </td>
                <td className="num mono">{item.quantity}</td>
                <td className="num mono">{formatINR(item.rate)}</td>
                <td className="num mono">{formatINR(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="iv-bottom">
          <div className="iv-notes">
            {invoice.customer && (invoice.starsEarned > 0 || invoice.freeService) && (
              <div className="iv-loyalty">
                {invoice.freeService && (
                  <p>
                    <GiftIcon />
                    Free {invoice.freeService.name} redeemed with loyalty stars.
                  </p>
                )}
                {invoice.starsEarned > 0 && (
                  <p>
                    <StarIcon filled />
                    {invoice.starsEarned} loyalty {invoice.starsEarned === 1 ? 'star' : 'stars'} earned on this bill.
                  </p>
                )}
                <p className="iv-loyalty-balance no-print">
                  Current balance: {invoice.customer.stars} of {config?.loyaltyStarsForFree ?? 5} stars.
                </p>
              </div>
            )}
            <p className="iv-thanks">Thank you for visiting. {config?.tagline || BRAND.tagline}</p>
          </div>

          <dl className="iv-totals">
            <div>
              <dt>Subtotal</dt>
              <dd className="mono">{formatINR(t.subtotal)}</dd>
            </div>
            {t.loyaltyDiscount > 0 && (
              <div className="is-discount">
                <dt>Loyalty free service</dt>
                <dd className="mono">−{formatINR(t.loyaltyDiscount)}</dd>
              </div>
            )}
            {t.discount > 0 && (
              <div className="is-discount">
                <dt>Coupon {invoice.couponCode}</dt>
                <dd className="mono">−{formatINR(t.discount)}</dd>
              </div>
            )}
            <div>
              <dt>Taxable value</dt>
              <dd className="mono">{formatINR(t.taxableValue)}</dd>
            </div>
            <div className="is-tax">
              <dt>CGST {halfRate}%</dt>
              <dd className="mono">{formatINR(t.cgst)}</dd>
            </div>
            <div className="is-tax">
              <dt>SGST {halfRate}%</dt>
              <dd className="mono">{formatINR(t.sgst)}</dd>
            </div>
            <div className="is-total">
              <dt>Total paid</dt>
              <dd className="mono">{formatINR(t.total)}</dd>
            </div>
          </dl>
        </div>

        {invoice.usage.length > 0 && (
          <section className="iv-usage no-print">
            <h2>Products used during service</h2>
            <p>Deducted from stock and not charged to the customer. Not printed on the invoice.</p>
            <table className="iv-table is-compact">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Used for</th>
                  <th className="num">Qty</th>
                  <th className="num">Retail value</th>
                </tr>
              </thead>
              <tbody>
                {invoice.usage.map((u) => (
                  <tr key={`${u.productId}:${u.serviceId ?? 0}`}>
                    <td>{u.productName}</td>
                    <td className={u.serviceName ? '' : 'muted'}>{u.serviceName ?? 'General use'}</td>
                    <td className="num mono">{u.quantity}</td>
                    <td className="num mono">{formatINR(u.unitValue * u.quantity)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Total retail value used</td>
                  <td className="num mono">{formatINR(usageValue)}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        )}
      </article>
    </div>
  )
}

export default InvoiceView
