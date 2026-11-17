import { useEffect, useMemo, useRef, useState } from 'react'
import { apiGet } from './api.js'
import heroImg from './assets/hero.png'
import logo from './assets/logo.png'
import groomingImg from './assets/salon-grooming.jpg'
import hairImg from './assets/salon-hair.jpg'
import spaImg from './assets/salon-spa.jpg'
import spaRoom from './assets/spa-room.png'
import { BRAND } from './brand.js'
import './LandingPage.css'

const DEFAULT_SERVICES = [
  {
    title: 'Hair studio',
    copy: 'Cuts, colour, and styling for every guest — precise, modern, unisex.',
    image: hairImg,
    alt: 'Modern unisex hair salon with styling chairs',
  },
  {
    title: 'Spa rituals',
    copy: 'Massage, facials, and restorative treatments in a calm private suite.',
    image: spaImg,
    alt: 'Serene spa treatment room',
  },
  {
    title: 'Grooming & finish',
    copy: 'Beard work, nails, and detailing so every visit ends with polish.',
    image: groomingImg,
    alt: 'Premium grooming station',
  },
]

const DEFAULT_GALLERY = [
  { src: spaRoom, alt: 'Spa suite with massage table and soft light' },
  { src: hairImg, alt: 'Hair studio floor' },
  { src: spaImg, alt: 'Spa room prepared for treatment' },
  { src: groomingImg, alt: 'Grooming tools at the station' },
  { src: heroImg, alt: 'Salon atmosphere' },
]

function bySection(images, section) {
  return images.filter((img) => img.section === section)
}

/** Resolve backend-relative media paths when VITE_API_URL points at a remote API. */
function mediaUrl(url) {
  if (!url) return url
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  if (!base) return url
  return `${base}${url.startsWith('/') ? url : `/${url}`}`
}

const HOURS = [
  { day: 'Monday – Friday', time: '9:00 AM – 9:00 PM' },
  { day: 'Saturday', time: '9:00 AM – 8:00 PM' },
  { day: 'Sunday', time: '10:00 AM – 6:00 PM' },
]

const JOURNEY = ['Arrive', 'Consult', 'Create', 'Care', 'Depart']

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return reduced
}

function Reveal({ children, className = '' }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) {
      setVisible(true)
      return
    }
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [reduced])

  return (
    <div ref={ref} className={`ps-reveal ${visible ? 'is-visible' : ''} ${className}`.trim()}>
      {children}
    </div>
  )
}

function MagneticButton({ children, className = '', href, onClick, type = 'button' }) {
  const ref = useRef(null)
  const reduced = usePrefersReducedMotion()

  function onMove(event) {
    if (reduced) return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = event.clientX - rect.left - rect.width / 2
    const y = event.clientY - rect.top - rect.height / 2
    el.style.transform = `translate(${x * 0.22}px, ${y * 0.22}px)`
  }

  function onLeave() {
    if (ref.current) ref.current.style.transform = ''
  }

  const shared = {
    ref,
    className: `ps-btn ${className}`.trim(),
    onMouseMove: onMove,
    onMouseLeave: onLeave,
    'data-magnetic': true,
  }

  if (href) {
    return (
      <a {...shared} href={href} onClick={onClick}>
        {children}
      </a>
    )
  }

  return (
    <button {...shared} type={type} onClick={onClick}>
      {children}
    </button>
  )
}

function LandingPage({ onStaffLogin }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('ps-landing-theme') || 'day')
  const [showIntro, setShowIntro] = useState(false)
  const [headerSolid, setHeaderSolid] = useState(false)
  const [remoteImages, setRemoteImages] = useState([])
  const [heroIndex, setHeroIndex] = useState(0)
  const heroRef = useRef(null)
  const heroMediaRef = useRef(null)
  const reduced = usePrefersReducedMotion()

  const heroSlides = useMemo(() => {
    const rows = bySection(remoteImages, 'hero')
    if (!rows.length) return [{ src: spaRoom, alt: 'Salon atmosphere' }]
    return rows.map((row) => ({
      src: mediaUrl(row.imageUrl),
      alt: row.altText || row.title || 'Salon atmosphere',
    }))
  }, [remoteImages])

  const services = useMemo(() => {
    const rows = bySection(remoteImages, 'service')
    if (!rows.length) return DEFAULT_SERVICES
    return rows.map((row, index) => ({
      title: row.title || DEFAULT_SERVICES[index % DEFAULT_SERVICES.length].title,
      copy:
        row.altText ||
        DEFAULT_SERVICES[index % DEFAULT_SERVICES.length].copy,
      image: mediaUrl(row.imageUrl),
      alt: row.altText || row.title || 'Salon service',
    }))
  }, [remoteImages])

  const gallery = useMemo(() => {
    const rows = bySection(remoteImages, 'gallery')
    if (!rows.length) return DEFAULT_GALLERY
    return rows.map((row) => ({
      src: mediaUrl(row.imageUrl),
      alt: row.altText || row.title || 'Salon gallery',
    }))
  }, [remoteImages])

  const experiencePhotos = useMemo(() => {
    const rows = bySection(remoteImages, 'experience')
    if (!rows.length) return [heroImg, spaImg]
    return rows.map((row) => mediaUrl(row.imageUrl))
  }, [remoteImages])

  const visitImage = useMemo(() => {
    const visit = bySection(remoteImages, 'visit')[0]
    return visit ? mediaUrl(visit.imageUrl) : groomingImg
  }, [remoteImages])

  useEffect(() => {
    let cancelled = false
    apiGet('/api/public/landing-images')
      .then((data) => {
        if (!cancelled) setRemoteImages(data.images || [])
      })
      .catch(() => {
        if (!cancelled) setRemoteImages([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setHeroIndex(0)
  }, [heroSlides.length])

  useEffect(() => {
    if (reduced || heroSlides.length < 2) return
    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroSlides.length)
    }, 5500)
    return () => window.clearInterval(timer)
  }, [reduced, heroSlides.length])

  useEffect(() => {
    if (reduced) return
    if (sessionStorage.getItem('ps-intro-done')) return
    setShowIntro(true)
    const timer = window.setTimeout(() => {
      sessionStorage.setItem('ps-intro-done', '1')
      setShowIntro(false)
    }, 2400)
    return () => window.clearTimeout(timer)
  }, [reduced])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    localStorage.setItem('ps-landing-theme', theme)
  }, [theme])

  useEffect(() => {
    const hero = heroRef.current
    const media = heroMediaRef.current

    function onScroll() {
      if (hero) {
        setHeaderSolid(hero.getBoundingClientRect().bottom <= 72)
      }
      if (reduced || !hero || !media) return
      const rect = hero.getBoundingClientRect()
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)))
      media.style.transform = `scale(${1 + progress * 0.12})`
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [reduced])

  function closeMenu() {
    setMenuOpen(false)
  }

  function goBilling() {
    closeMenu()
    onStaffLogin()
  }

  function toggleTheme() {
    setTheme((t) => (t === 'night' ? 'day' : 'night'))
  }

  return (
    <div className="ps-site" data-theme={theme === 'night' ? 'night' : undefined}>
      {showIntro && (
        <div className="ps-intro" aria-hidden="true">
          <p className="ps-intro-mark editorial">PS</p>
          <p className="ps-intro-brand editorial">{BRAND.shortName}</p>
          <p className="eyebrow ps-intro-tag">Your look. Our signature.</p>
        </div>
      )}

      <header className={`ps-header ${headerSolid ? 'is-solid' : 'is-over-hero'}`}>
        <a className="ps-brand" href="#top" onClick={closeMenu}>
          <img className="ps-logo" src={logo} alt="" />
          <span className="eyebrow ps-brand-word">{BRAND.shortName}</span>
        </a>

        <button
          type="button"
          className="ps-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="ps-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
          <span className="ps-menu-bars" data-open={menuOpen || undefined} />
        </button>

        <nav id="ps-nav" className={`ps-nav ${menuOpen ? 'is-open glass hairline' : ''}`}>
          <a className="eyebrow" href="#services" onClick={closeMenu}>
            Services
          </a>
          <a className="eyebrow" href="#gallery" onClick={closeMenu}>
            Gallery
          </a>
          <a className="eyebrow" href="#experience" onClick={closeMenu}>
            Experience
          </a>
          <a className="eyebrow" href="#hours" onClick={closeMenu}>
            Hours
          </a>
          <button type="button" className="eyebrow ps-nav-billing" onClick={goBilling}>
            Billing
          </button>
          <button type="button" className="eyebrow ps-theme-toggle" onClick={toggleTheme}>
            {theme === 'night' ? 'Day' : 'Night'}
          </button>
          <MagneticButton href="/book" className="ps-btn-solid" onClick={closeMenu}>
            Book now
          </MagneticButton>
        </nav>
      </header>

      <main id="top">
        <section ref={heroRef} className="ps-hero">
          <div className="ps-hero-media" aria-hidden="true">
            <div ref={heroMediaRef} className="ps-hero-scale">
              {heroSlides.map((slide, index) => (
                <img
                  key={`${slide.src}-${index}`}
                  className={`ps-hero-photo ${index === heroIndex % heroSlides.length ? 'is-active' : ''}`}
                  src={slide.src}
                  alt=""
                />
              ))}
            </div>
            <div className="ps-hero-scrim" />
          </div>
          {heroSlides.length > 1 && (
            <div className="ps-hero-dots" aria-label="Hero slides">
              {heroSlides.map((slide, index) => (
                <button
                  key={`${slide.src}-dot-${index}`}
                  type="button"
                  className={`ps-hero-dot ${index === heroIndex % heroSlides.length ? 'is-active' : ''}`}
                  aria-label={`Show slide ${index + 1}`}
                  onClick={() => setHeroIndex(index)}
                />
              ))}
            </div>
          )}

          <div className="ps-hero-copy">
            <p className="eyebrow ps-hero-eyebrow">Premium unisex salon &amp; spa</p>
            <h1 className="editorial ps-hero-brand">{BRAND.shortName}</h1>
            <p className="editorial ps-hero-line">Your look.</p>
            <p className="editorial ps-hero-line">Our signature.</p>
            <div className="ps-hero-actions">
              <MagneticButton href="/book" className="ps-btn-ivory">
                Book your experience
              </MagneticButton>
              <MagneticButton className="ps-btn-outline-light" onClick={goBilling}>
                Billing
              </MagneticButton>
            </div>
          </div>
        </section>

        <section id="services" className="ps-section">
          <div className="ps-wrap">
            <Reveal>
              <p className="eyebrow">Signature services</p>
              <h2 className="editorial ps-h2">Hair. Spa. Grooming.</h2>
              <p className="ps-lede">One house for every guest — nothing invented, everything considered.</p>
            </Reveal>
            <div className="ps-service-rail">
              {services.map((service, i) => (
                <article
                  key={`${service.title}-${i}`}
                  className="ps-service-item"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className="ps-visual">
                    <img src={service.image} alt={service.alt} loading="lazy" />
                  </div>
                  <h3 className="editorial ps-card-title">{service.title}</h3>
                  <p className="ps-soft">{service.copy}</p>
                </article>
              ))}
            </div>
            <MagneticButton href="/book" className="ps-btn-outline">
              Book a service
            </MagneticButton>
          </div>
        </section>

        <section id="gallery" className="ps-section ps-section-elev">
          <div className="ps-wrap">
            <Reveal>
              <p className="eyebrow">Inside the house</p>
              <h2 className="editorial ps-h2">Spaces &amp; atmosphere</h2>
              <p className="ps-lede">Soft light, quiet rooms, and a floor ready for colour, cuts, and care.</p>
            </Reveal>
            <div className="ps-gallery">
              {gallery.map((shot, index) => (
                <figure key={`${shot.src}-${index}`} className="ps-gallery-item">
                  <img src={shot.src} alt={shot.alt} loading="lazy" />
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section id="experience" className="ps-section">
          <div className="ps-wrap">
            <Reveal>
              <p className="eyebrow">The PS experience</p>
              <h2 className="editorial ps-h2">Arrive as you are. Leave as a signature.</h2>
            </Reveal>
            <ol className="ps-journey">
              {JOURNEY.map((step, i) => (
                <li key={step}>
                  <p className="eyebrow">{String(i + 1).padStart(2, '0')}</p>
                  <p className="editorial ps-card-title">{step}</p>
                </li>
              ))}
            </ol>
            <div className="ps-experience-split">
              <Reveal>
                <p className="ps-lede ps-lede-wide">
                  Unhurried chairs, clear front-desk billing for staff, and online booking so guests never wait on a
                  spreadsheet.
                </p>
              </Reveal>
              <div className="ps-experience-photos">
                {experiencePhotos.map((src, index) => (
                  <img key={`${src}-${index}`} src={src} alt="" loading="lazy" />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="hours" className="ps-section ps-hours">
          <div className="ps-wrap ps-hours-grid">
            <Reveal>
              <p className="eyebrow">Open hours</p>
              <h2 className="editorial ps-h2">When we welcome you</h2>
              <p className="ps-lede">Walk-ins when chairs are free. Booking recommended for colour and spa.</p>
            </Reveal>
            <ul className="ps-hours-list">
              {HOURS.map((row) => (
                <li key={row.day}>
                  <span>{row.day}</span>
                  <span>{row.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="visit" className="ps-section">
          <div className="ps-wrap">
            <div className="ps-visit">
              <img src={visitImage} alt="" aria-hidden="true" />
              <div className="ps-visit-scrim" />
              <div className="ps-visit-copy">
                <p className="eyebrow">Plan your visit</p>
                <h2 className="editorial ps-h2">Ready when you are</h2>
                <p className="ps-lede ps-lede-on-dark">
                  Reserve online, or ask at the desk. Staff open Billing to run the salon POS.
                </p>
                <div className="ps-hero-actions">
                  <MagneticButton href="/book" className="ps-btn-ivory">
                    Book now
                  </MagneticButton>
                  <MagneticButton className="ps-btn-outline-light" onClick={goBilling}>
                    Go to Billing
                  </MagneticButton>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="ps-footer">
        <div className="ps-wrap ps-footer-grid">
          <div>
            <p className="editorial ps-footer-brand">{BRAND.name}</p>
            <p className="ps-soft">Your look. Our signature.</p>
          </div>
          <div className="ps-footer-col">
            <p className="eyebrow">Visit</p>
            <a href="/book">Book appointment</a>
            <button type="button" onClick={goBilling}>
              Staff billing
            </button>
          </div>
          <div className="ps-footer-col">
            <p className="eyebrow">Explore</p>
            <a href="#services">Services</a>
            <a href="#gallery">Gallery</a>
            <a href="#hours">Hours</a>
          </div>
          <div className="ps-footer-col">
            <p className="eyebrow">Contact</p>
            <p className="ps-soft">Front desk open during salon hours.</p>
            <p className="ps-soft">Unisex salon &amp; spa</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
