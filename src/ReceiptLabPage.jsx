import { useEffect, useRef, useState } from 'react'
import { BRAND } from './brand.js'
import { PrintIcon, ReceiptIcon, ScissorsIcon, SparklesIcon } from './Icons.jsx'
import './ReceiptLabPage.css'

const TEMPLATES = {
  cafe: {
    id: 'cafe',
    label: 'Cafe',
    banner: 'CAFE & ROASTERY',
    accent: '#c62828',
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
  },
  spa: {
    id: 'spa',
    label: 'Salon',
    banner: 'UNISEX SALON',
    accent: '#5a5c22',
    name: BRAND.shortName.toUpperCase(),
    tagline: BRAND.tagline,
    phone: '+91 90000 11223',
    gstin: '29AABCT1332L000',
    order: '#PS-2104',
    date: 'Oct 29, 6:40 PM',
    cashier: 'Priya S.',
    status: 'PAID ✓',
    items: [
      { qty: 1, name: 'Haircut & Style', amount: '₹799' },
      { qty: 1, name: 'Keratin Shine Add-on', amount: '₹499' },
      { qty: 1, name: 'Beard Trim', amount: '₹249' },
    ],
    subtotal: '₹1,547',
    tax: '₹278',
    total: '₹1,825',
    footer: 'Your look, our signature',
  },
  refund: {
    id: 'refund',
    label: 'Refund',
    banner: 'CREDIT NOTE',
    accent: '#1d4ed8',
    name: BRAND.shortName.toUpperCase(),
    tagline: 'Refund voucher · sample',
    phone: '+91 90000 11223',
    gstin: '29AABCT1332L000',
    order: '#RF-0311',
    date: 'Oct 29, 6:42 PM',
    cashier: 'Alex R.',
    status: 'REFUNDED',
    items: [{ qty: 1, name: 'Cancelled Facial Package', amount: '-₹1,200' }],
    subtotal: '-₹1,200',
    tax: '-₹216',
    total: '-₹1,416',
    footer: 'Amount credited to original tender',
  },
}

const STATUS_COPY = {
  idle: 'READY',
  warming: 'WARMING',
  printing: 'PRINTING',
  done: 'DONE',
  low: 'PAPER LOW',
  jam: 'PAPER JAM',
  cutting: 'CUTTING',
  tearing: 'TEAR',
  torn: 'READY',
  lid: 'LID OPEN',
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

function AlertIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function MoonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SunIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function playTone(audioOn, freq = 880, ms = 0.08) {
  if (!audioOn) return
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = freq
    gain.gain.value = 0.035
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms)
    osc.stop(ctx.currentTime + ms + 0.01)
    setTimeout(() => ctx.close(), 180)
  } catch {
    /* sample only */
  }
}

function ReceiptLabPage() {
  const [templateId, setTemplateId] = useState('cafe')
  const [phase, setPhase] = useState('idle')
  const [feedExtra, setFeedExtra] = useState(0)
  const [audioOn, setAudioOn] = useState(true)
  const [printKey, setPrintKey] = useState(0)
  const [copyLabel, setCopyLabel] = useState('CUSTOMER COPY')
  const [paperLow, setPaperLow] = useState(false)
  const [darkStage, setDarkStage] = useState(false)
  const [lidOpen, setLidOpen] = useState(false)
  const [revealStep, setRevealStep] = useState(0)
  const [showPaidStamp, setShowPaidStamp] = useState(false)
  const timers = useRef([])

  const sample = TEMPLATES[templateId]
  const totalRevealLines = 10

  function clearTimers() {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  function schedule(fn, ms) {
    timers.current.push(setTimeout(fn, ms))
  }

  useEffect(() => () => clearTimers(), [])

  function runPrintSequence(copy = 'CUSTOMER COPY') {
    clearTimers()
    setCopyLabel(copy)
    setFeedExtra(0)
    setRevealStep(0)
    setShowPaidStamp(false)
    setLidOpen(false)
    setPhase('warming')
    setPrintKey((k) => k + 1)
    playTone(audioOn, 520, 0.05)

    schedule(() => {
      setPhase('printing')
      playTone(audioOn, 760, 0.04)
    }, 450)

    for (let i = 1; i <= totalRevealLines; i += 1) {
      schedule(() => setRevealStep(i), 450 + i * 220)
    }

    schedule(() => {
      setPhase('done')
      setShowPaidStamp(true)
      playTone(audioOn, 980, 0.07)
    }, 450 + totalRevealLines * 220 + 200)

    schedule(() => setPhase('ready'), 450 + totalRevealLines * 220 + 700)
  }

  useEffect(() => {
    runPrintSequence('CUSTOMER COPY')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.target.matches('input, textarea, select, button')) return
      const key = e.key.toLowerCase()
      if (key === 'p') {
        e.preventDefault()
        reprint()
      } else if (key === 't') {
        e.preventDefault()
        tear()
      } else if (key === 'f') {
        e.preventDefault()
        feed()
      } else if (key === 'r') {
        e.preventDefault()
        reset()
      } else if (key === 'j') {
        e.preventDefault()
        triggerJam()
      } else if (key === 'l') {
        e.preventDefault()
        togglePaperLow()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function reprint() {
    if (phase === 'jam' || lidOpen) return
    runPrintSequence(copyLabel === 'CUSTOMER COPY' ? 'MERCHANT COPY' : 'CUSTOMER COPY')
  }

  function tear() {
    if (phase !== 'ready' && phase !== 'fed' && phase !== 'done') return
    playTone(audioOn, 420, 0.05)
    setPhase('cutting')
    schedule(() => {
      setPhase('tearing')
      playTone(audioOn, 300, 0.08)
    }, 380)
    schedule(() => setPhase('torn'), 1200)
  }

  function feed() {
    if (phase !== 'ready' && phase !== 'fed' && phase !== 'done') return
    playTone(audioOn, 640, 0.04)
    setFeedExtra((n) => Math.min(n + 36, 140))
    setPhase('fed')
  }

  function reset() {
    playTone(audioOn, 500, 0.05)
    clearTimers()
    setLidOpen(false)
    setPhase('idle')
    setRevealStep(0)
    setShowPaidStamp(false)
    setFeedExtra(0)
    schedule(() => runPrintSequence('CUSTOMER COPY'), 200)
  }

  function triggerJam() {
    playTone(audioOn, 180, 0.12)
    clearTimers()
    setPhase('jam')
    setLidOpen(false)
  }

  function clearJam() {
    playTone(audioOn, 700, 0.06)
    setPhase('idle')
    schedule(() => runPrintSequence(copyLabel), 250)
  }

  function togglePaperLow() {
    setPaperLow((v) => !v)
    playTone(audioOn, 540, 0.04)
  }

  function openLid() {
    clearTimers()
    setLidOpen(true)
    setPhase('lid')
    playTone(audioOn, 360, 0.06)
  }

  function closeLid() {
    setLidOpen(false)
    setPaperLow(false)
    playTone(audioOn, 620, 0.05)
    schedule(() => runPrintSequence(copyLabel), 300)
  }

  function switchTemplate(id) {
    setTemplateId(id)
    schedule(() => runPrintSequence('CUSTOMER COPY'), 80)
  }

  const ledClass =
    phase === 'jam'
      ? 'is-error'
      : phase === 'printing' || phase === 'warming' || phase === 'cutting'
        ? 'is-busy'
        : paperLow
          ? 'is-warn'
          : phase === 'idle' || phase === 'torn' || phase === 'lid'
            ? 'is-idle'
            : 'is-ready'

  const statusText = paperLow && phase === 'ready' ? STATUS_COPY.low : STATUS_COPY[phase] || 'ONLINE'

  const receiptStyle = {
    '--feed-extra': `${feedExtra}px`,
    '--accent': sample.accent,
    '--reveal': revealStep,
  }

  const canControl = phase === 'ready' || phase === 'fed' || phase === 'done'

  return (
    <div className={`receipt-lab ${darkStage ? 'is-dark' : ''}`}>
      <header className="rl-header">
        <div className="rl-title-block">
          <SparklesIcon />
          <div>
            <h1>Receipt Lab</h1>
            <p>Sample effects only — line reveal, cutter, jam, templates, shortcuts</p>
          </div>
        </div>
        <div className="rl-templates" role="tablist" aria-label="Receipt template">
          {Object.values(TEMPLATES).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={templateId === t.id}
              className={`rl-chip ${templateId === t.id ? 'is-active' : ''}`}
              onClick={() => switchTemplate(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <aside className="rl-features">
        <p className="rl-features-title">Demo features</p>
        <ul>
          <li>Line-by-line + heat fade</li>
          <li>Cutter swipe + tear</li>
          <li>Paper-low / jam states</li>
          <li>Template switcher</li>
          <li>Customer / merchant copy</li>
          <li>Status ticker + bounce</li>
          <li>Lid open · paper swap</li>
          <li>Dark stage · keys P T F R J L</li>
        </ul>
      </aside>

      <div className="rl-stage">
        <div className={`rl-printer is-${phase} ${paperLow ? 'is-paper-low' : ''} ${lidOpen ? 'is-lid-open' : ''}`} aria-hidden="true">
          <div className="rl-shell">
            <div className={`rl-lid ${lidOpen ? 'is-open' : ''}`}>
              <span className="rl-grip" />
              <span className="rl-plate">LAB · 80mm</span>
              <span className={`rl-led ${ledClass}`} />
            </div>

            <div className="rl-ticker mono">
              <span key={`${phase}-${paperLow}-${copyLabel}`}>{statusText}</span>
            </div>

            <div className="rl-window">
              <div className={`rl-roll ${paperLow ? 'is-thin' : ''}`} />
            </div>

            <div className="rl-exit">
              <div className="rl-slot" />
              <div className={`rl-blade ${phase === 'cutting' ? 'is-swipe' : ''}`} />
              <div className="rl-cutter" />
            </div>
          </div>
        </div>

        <div className="rl-chute">
          <div
            key={`${printKey}-${templateId}`}
            className={`rl-paper is-${phase}`}
            style={receiptStyle}
            data-reveal={revealStep}
          >
            <div className="rl-serration" />
            <div className="rl-line" data-line="1">
              <div className="rl-banner">{sample.banner}</div>
            </div>
            <div className="rl-line" data-line="2">
              <header className="rl-brand">
                <h2>{sample.name}</h2>
                <p className="rl-tagline">{sample.tagline}</p>
              </header>
            </div>
            <div className="rl-line" data-line="3">
              <p className="rl-meta mono">{sample.phone}</p>
              <p className="rl-meta mono">GSTIN: {sample.gstin}</p>
              <p className="rl-copy mono">{copyLabel}</p>
            </div>
            <div className="rl-line" data-line="4">
              <div className="rl-rule" />
              <dl className="rl-meta-grid mono">
                <div>
                  <dt>ORDER</dt>
                  <dd>{sample.order}</dd>
                </div>
                <div>
                  <dt>DATE</dt>
                  <dd>{sample.date}</dd>
                </div>
                <div>
                  <dt>CASHIER</dt>
                  <dd>{sample.cashier}</dd>
                </div>
                <div>
                  <dt>STATUS</dt>
                  <dd className="is-paid">{sample.status}</dd>
                </div>
              </dl>
            </div>
            <div className="rl-line" data-line="5">
              <div className="rl-rule" />
              <div className="rl-cols mono">
                <span>QTY</span>
                <span>ITEM DESCRIPTION</span>
                <span>AMT</span>
              </div>
            </div>
            <div className="rl-line" data-line="6">
              <ul className="rl-items mono">
                {sample.items.map((item) => (
                  <li key={item.name}>
                    <span className="qty">{item.qty}×</span>
                    <span className="name">{item.name}</span>
                    <span className="amt">{item.amount}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rl-line" data-line="7">
              <div className="rl-perfs">
                {Array.from({ length: 12 }, (_, i) => (
                  <span key={i} />
                ))}
              </div>
            </div>
            <div className="rl-line" data-line="8">
              <div className="rl-totals mono">
                <div>
                  <span>Subtotal</span>
                  <span>{sample.subtotal}</span>
                </div>
                <div>
                  <span>Tax</span>
                  <span>{sample.tax}</span>
                </div>
                <div className="is-total">
                  <span>Total</span>
                  <span>{sample.total}</span>
                </div>
              </div>
            </div>
            <div className="rl-line" data-line="9">
              <div className="rl-rule" />
              <p className="rl-footer">{sample.footer}</p>
            </div>
            <div className="rl-line" data-line="10">
              <p className="rl-barcode mono">||||| |||| | |||| |||||</p>
            </div>

            {showPaidStamp && sample.status.includes('PAID') && (
              <div className="rl-stamp" aria-hidden="true">
                PAID
              </div>
            )}
            <div className="rl-curl" aria-hidden="true" />
          </div>
          <div className="rl-slot-shade" />
        </div>

        {phase === 'jam' && (
          <div className="rl-jam-card">
            <AlertIcon />
            <div>
              <strong>Paper jam</strong>
              <p>Sample error state — clear to retry print.</p>
            </div>
            <button type="button" onClick={clearJam}>
              Clear jam
            </button>
          </div>
        )}

        {lidOpen && (
          <div className="rl-jam-card is-lid">
            <ReceiptIcon />
            <div>
              <strong>Lid open</strong>
              <p>Swap roll, then close lid to resume.</p>
            </div>
            <button type="button" onClick={closeLid}>
              Close lid
            </button>
          </div>
        )}
      </div>

      <div className="rl-toolbar" role="toolbar" aria-label="Receipt lab controls">
        <button type="button" className="rl-btn is-primary" onClick={reprint} disabled={phase === 'jam' || lidOpen}>
          <PrintIcon />
          RE-PRINT
        </button>
        <button type="button" className="rl-btn" onClick={tear} disabled={!canControl}>
          <ScissorsIcon />
          TEAR
        </button>
        <button type="button" className="rl-btn" onClick={feed} disabled={!canControl}>
          <ArrowDownIcon />
          FEED
        </button>
        <button type="button" className="rl-btn" onClick={reset}>
          <RefreshIcon />
          RESET
        </button>
        <button type="button" className={`rl-btn ${paperLow ? 'is-warn' : ''}`} onClick={togglePaperLow}>
          <AlertIcon />
          PAPER
        </button>
        <button type="button" className="rl-btn" onClick={phase === 'jam' ? clearJam : triggerJam}>
          {phase === 'jam' ? 'CLEAR' : 'JAM'}
        </button>
        <button type="button" className="rl-btn" onClick={lidOpen ? closeLid : openLid}>
          LID
        </button>
        <button type="button" className="rl-btn" onClick={() => setDarkStage((v) => !v)}>
          {darkStage ? <SunIcon /> : <MoonIcon />}
          STAGE
        </button>
        <button type="button" className={`rl-btn ${audioOn ? '' : 'is-muted'}`} onClick={() => setAudioOn((v) => !v)}>
          AUDIO
        </button>
      </div>
    </div>
  )
}

export default ReceiptLabPage
