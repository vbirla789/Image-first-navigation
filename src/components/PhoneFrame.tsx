import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import './PhoneFrame.css'

/**
 * iPhone mockup shell around every route — status bar on top, home
 * indicator below, app scrolling inside the "screen". Collapses to a
 * plain full-bleed app on small (real phone) viewports.
 */
export default function PhoneFrame() {
  const dark = useLocation().pathname.startsWith('/image-view')

  // color the real browser chrome (iOS status bar area) to match the route
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (meta) meta.content = dark ? '#000000' : '#ffffff'
  }, [dark])

  return (
    <div className={dark ? 'phone-stage phone-stage--dark' : 'phone-stage'}>
      <div className={dark ? 'phone-shell phone-shell--dark' : 'phone-shell'}>
        <div className="phone-status">
          <span className="phone-status__time">9:41</span>
          <span className="phone-status__icons">
            {/* cellular */}
            <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" aria-hidden>
              <rect x="0" y="7.5" width="3" height="4.5" rx="1" />
              <rect x="5" y="5" width="3" height="7" rx="1" />
              <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
              <rect x="15" y="0" width="3" height="12" rx="1" />
            </svg>
            {/* wifi */}
            <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor" aria-hidden>
              <path d="M8 9.6a1.7 1.7 0 0 1 1.7 1.7c0 .2-.06.36-.18.47l-1.1 1.06a.6.6 0 0 1-.84 0l-1.1-1.06a.63.63 0 0 1-.18-.47A1.7 1.7 0 0 1 8 9.6Z" />
              <path d="M8 5.4c1.72 0 3.28.66 4.45 1.74a.62.62 0 0 1 .02.9l-.9.88a.6.6 0 0 1-.82.02A4.06 4.06 0 0 0 8 7.9c-1.05 0-2 .39-2.75 1.04a.6.6 0 0 1-.82-.02l-.9-.88a.62.62 0 0 1 .02-.9A6.55 6.55 0 0 1 8 5.4Z" />
              <path d="M8 1.2c2.87 0 5.48 1.1 7.44 2.9.25.24.26.64.02.88l-.9.89a.6.6 0 0 1-.83.01A8.9 8.9 0 0 0 8 3.7c-2.2 0-4.2.8-5.73 2.18a.6.6 0 0 1-.83-.01l-.9-.89a.62.62 0 0 1 .02-.88A11.02 11.02 0 0 1 8 1.2Z" />
            </svg>
            {/* battery */}
            <svg width="25" height="12" viewBox="0 0 25 12" fill="none" aria-hidden>
              <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" opacity="0.35" />
              <rect x="2" y="2" width="18" height="8" rx="1.5" fill="currentColor" />
              <path d="M23 4v4a2.2 2.2 0 0 0 0-4Z" fill="currentColor" opacity="0.4" />
            </svg>
          </span>
        </div>
        <div className="phone-screen">
          <Outlet />
        </div>
        <div className="phone-home">
          <span className="phone-home__bar" />
        </div>
      </div>
    </div>
  )
}
