import { useEffect, useRef, useState } from 'react'
import { PrintIcon, ReceiptIcon, ScissorsIcon } from './Icons.jsx'
import './ReceiptPage.css'

const SAMPLE = {
  banner: 'CAFE & ROASTERY',
  name: 'THE ROAST & BEAN',
  tagline: 'Artisan Coffee Roasters',
  phone: '+91 98765 43210',
  gstin: '29AABCT1332L000',
  order: '#CR-8429',
  date: 'Oct 07, 12:36 PM',
  cashier: 'Alex R.',
  status: 'PAID ✓',
  items: [
    { qty: 2, name: 'Iced Caramel Oat Macchiato', amount: '$13.00' },
    { qty: 1, name: 'Butter Croissant', amount: '$4.50' },
    { qty: 1, name: 'House Filter Coffee', amount: '$3.25' },
  ],
  subtotal: '$20.75',
  tax: '$1.66',
  total: '$22.41',
  footer: 'Thank you — see you next brew',
}

function ArrowDownIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  )
}

function RefreshIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

function VolumeIcon({ muted = false, ...props }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      {muted ? (
        <>
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </>
      ) : (
        <>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </>
      )}
    </svg>
  )
}

function playClick(audioOn) {
  if (!audioOn) return
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 880
    gain.gain.value = 0.04
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
    osc.stop(ctx.currentTime + 0.09)
    setTimeout(() => ctx.close(), 150)
  } catch {
    /* sample only — ignore audio errors */
  }
}

function ReceiptPage() {
  const [phase, setPhase] = useState('idle')
  const [feedExtra, setFeedExtra] = useState(0)
  const [audioOn, setAudioOn] = useState(true)
  const [printKey, setPrintKey] = useState(0)
  const timers = useRef([])

  function clearTimers() {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  function schedule(fn, ms) {
    timers.current.push(setTimeout(fn, ms))
  }

  useEffect(() => () => clearTimers(), [])

  useEffect(() => {
    schedule(() => setPhase('printing'), 350)
    schedule(() => setPhase('ready'), 3200)
  }, [printKey])

  function reprint() {
    playClick(audioOn)
    clearTimers()
    setFeedExtra(0)
    setPhase('idle')
    setPrintKey((k) => k + 1)
  }

  function tear() {
    if (phase !== 'ready' && phase !== 'fed') return
    playClick(audioOn)
    setPhase('tearing')
    schedule(() => setPhase('torn'), 900)
  }

  function feed() {
    if (phase !== 'ready' && phase !== 'fed') return
    playClick(audioOn)
    setFeedExtra((n) => Math.min(n + 36, 140))
    setPhase('fed')
  }

  function reset() {
    playClick(audioOn)
    clearTimers()
    setFeedExtra(0)
    setPhase('idle')
    setPrintKey((k) => k + 1)
  }

  function toggleAudio() {
    setAudioOn((v) => !v)
  }

  const receiptStyle =
    phase === 'printing' || phase === 'ready' || phase === 'fed'
      ? { '--feed-extra': `${feedExtra}px` }
      : undefined

  return (
    <div className="receipt-demo">
      <div className="receipt-demo-badge">
        <ReceiptIcon />
        <span>Receipt preview · sample only</span>
      </div>

      <div className="receipt-stage">
        <div className={`printer-machine is-${phase}`} aria-hidden="true">
          <div className="printer-shell">
            <div className="printer-lid">
              <span className="printer-lid-grip" />
              <span className="printer-brand-plate">80mm</span>
              <span
                className={`printer-led ${
                  phase === 'printing' ? 'is-busy' : phase === 'torn' || phase === 'idle' ? 'is-idle' : 'is-ready'
                }`}
              />
            </div>
            <div className="printer-window">
              <div className="printer-roll" />
            </div>
            <div className="printer-exit">
              <div className="printer-slot" />
              <div className="printer-cutter" />
            </div>
          </div>
        </div>

        <div className="receipt-chute">
          <div
            key={printKey}
            className={`receipt-paper is-${phase}`}
            style={receiptStyle}
          >
            <div className="receipt-serration" aria-hidden="true" />

            <div className="receipt-banner">{SAMPLE.banner}</div>

            <header className="receipt-brand">
              <h1>{SAMPLE.name}</h1>
              <p className="receipt-tagline">{SAMPLE.tagline}</p>
              <p className="receipt-meta mono">{SAMPLE.phone}</p>
              <p className="receipt-meta mono">GSTIN: {SAMPLE.gstin}</p>
            </header>

            <div className="receipt-rule is-dashed" />

            <dl className="receipt-meta-grid mono">
              <div>
                <dt>ORDER</dt>
                <dd>{SAMPLE.order}</dd>
              </div>
              <div>
                <dt>DATE</dt>
                <dd>{SAMPLE.date}</dd>
              </div>
              <div>
                <dt>CASHIER</dt>
                <dd>{SAMPLE.cashier}</dd>
              </div>
              <div>
                <dt>STATUS</dt>
                <dd className="is-paid">{SAMPLE.status}</dd>
              </div>
            </dl>

            <div className="receipt-rule is-dashed" />

            <div className="receipt-cols mono">
              <span>QTY</span>
              <span>ITEM DESCRIPTION</span>
              <span>AMT</span>
            </div>

            <ul className="receipt-items mono">
              {SAMPLE.items.map((item) => (
                <li key={item.name}>
                  <span className="qty">{item.qty}×</span>
                  <span className="name">{item.name}</span>
                  <span className="amt">{item.amount}</span>
                </li>
              ))}
            </ul>

            <div className="receipt-perfs" aria-hidden="true">
              {Array.from({ length: 14 }, (_, i) => (
                <span key={i} />
              ))}
            </div>

            <div className="receipt-totals mono">
              <div>
                <span>Subtotal</span>
                <span>{SAMPLE.subtotal}</span>
              </div>
              <div>
                <span>Tax</span>
                <span>{SAMPLE.tax}</span>
              </div>
              <div className="is-total">
                <span>Total</span>
                <span>{SAMPLE.total}</span>
              </div>
            </div>

            <div className="receipt-rule is-dashed" />
            <p className="receipt-footer">{SAMPLE.footer}</p>
            <p className="receipt-barcode mono">||||| |||| | |||| |||||</p>
          </div>
          <div className="receipt-slot-shade" aria-hidden="true" />
        </div>
      </div>

      <div className="receipt-toolbar" role="toolbar" aria-label="Receipt sample controls">
        <button type="button" className="rt-btn is-primary" onClick={reprint}>
          <PrintIcon />
          RE-PRINT
        </button>
        <button type="button" className="rt-btn" onClick={tear} disabled={phase !== 'ready' && phase !== 'fed'}>
          <ScissorsIcon />
          TEAR
        </button>
        <button type="button" className="rt-btn" onClick={feed} disabled={phase !== 'ready' && phase !== 'fed'}>
          <ArrowDownIcon />
          FEED
        </button>
        <button type="button" className="rt-btn" onClick={reset}>
          <RefreshIcon />
          RESET
        </button>
        <button
          type="button"
          className={`rt-btn ${audioOn ? '' : 'is-muted'}`}
          onClick={toggleAudio}
          aria-pressed={audioOn}
        >
          <VolumeIcon muted={!audioOn} />
          AUDIO
        </button>
      </div>

      <p className="receipt-hint">Demo animation only — no printer hardware or API integration.</p>
    </div>
  )
}

export default ReceiptPage
