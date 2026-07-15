import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { photoReviews, product, reviews } from '../data/product'
import { MORPH_NAME, claimMorph, getMorphSource, setMorphSource } from '../lib/morph'
import './ImageView.css'

function initialReviewIndex(reviewId: string | null): number {
  const idx = reviews.findIndex((r) => r.id === reviewId)
  return idx === -1 ? 0 : idx
}

const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v))

/**
 * Image-first view ("Single Review") — reached by tapping any review photo
 * on the PDP or PRP. Feed-style navigation:
 *  - horizontal swipe → other photos of the SAME review (copy and product
 *    tray stay put, progress bars in the header track the position)
 *  - vertical swipe → next/previous reviewer, full-screen snap like reels
 */
export default function ImageView() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [activeReview, setActiveReview] = useState(() => initialReviewIndex(params.get('review')))
  // one photo cursor per review, so scrolling back restores where you were
  const [photoIndexes, setPhotoIndexes] = useState<number[]>(() =>
    reviews.map((r) =>
      r.id === params.get('review') ? clamp(Number(params.get('photo') ?? 0), r.photos.length - 1) : 0,
    ),
  )
  const [expanded, setExpanded] = useState(false)
  // tap anywhere on the image toggles an immersive view: all chrome (header,
  // product card, review block, actions) fades away so only the photo remains
  const [chromeHidden, setChromeHidden] = useState(false)
  // FTUX: nudge that swiping down reveals other people's reviews (once per session)
  const [hintVisible, setHintVisible] = useState(() => !sessionStorage.getItem('iv-vhint-seen'))
  const vtrackRef = useRef<HTMLDivElement>(null)
  const htracks = useRef<(HTMLDivElement | null)[]>([])
  const drag = useRef({
    startX: 0,
    startY: 0,
    fromTop: 0,
    fromLeft: 0,
    active: false,
    axis: '' as '' | 'h' | 'v',
    moved: false,
  })

  const review = reviews[activeReview]
  const photoIndex = photoIndexes[activeReview]

  /* the morph name stays on the ENTRY image only — moving it between images
     on every scroll re-render makes Chrome re-snap the carousels mid-scroll
     (snap-target memory). At close time it's claimed imperatively instead. */
  const morphTarget = useRef({ review: activeReview, photo: photoIndexes[activeReview] })

  // position both axes on the entry review/photo (before paint; snap disabled
  // so Chrome doesn't animate the initial jump)
  useLayoutEffect(() => {
    const v = vtrackRef.current
    if (!v) return
    const h = htracks.current[activeReview]
    v.style.scrollSnapType = 'none'
    if (h) h.style.scrollSnapType = 'none'
    const position = () => {
      v.scrollTop = activeReview * v.clientHeight
      if (h) h.scrollLeft = photoIndexes[activeReview] * h.clientWidth
    }
    position()
    requestAnimationFrame(() => {
      position()
      requestAnimationFrame(() => {
        v.style.scrollSnapType = ''
        if (h) h.style.scrollSnapType = ''
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // keep both tracks aligned when the viewport resizes (rotation, keyboard);
  // scroll events fired during the relayout carry transient positions, so
  // scroll-derived state changes are suppressed for a beat afterwards
  const resizedAt = useRef(0)
  useEffect(() => {
    const onResize = () => {
      resizedAt.current = Date.now()
      const v = vtrackRef.current
      if (v) v.scrollTop = activeReview * v.clientHeight
      const h = htracks.current[activeReview]
      if (h) h.scrollLeft = photoIndexes[activeReview] * h.clientWidth
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [activeReview, photoIndexes])

  /* scroll-derived state commits are DEBOUNCED to scroll settle: a React
     re-render mid-scroll makes Chrome re-snap both tracks to their remembered
     snap targets, cancelling the in-flight scroll (snap-target memory). */
  const activeRef = useRef(activeReview)
  const vTimer = useRef(0)
  const hTimers = useRef<number[]>([])

  const setReview = (idx: number) => {
    if (idx === activeRef.current) return
    activeRef.current = idx
    setActiveReview(idx)
    setExpanded(false)
  }

  const dismissHint = () => {
    setHintVisible((visible) => {
      if (visible) sessionStorage.setItem('iv-vhint-seen', '1')
      return false
    })
  }

  /* tap on the stage (not a button, not a drag) toggles the immersive view */
  const onStageTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drag.current.moved) {
      drag.current.moved = false
      return
    }
    if ((e.target as HTMLElement).closest('button')) return
    setChromeHidden((prev) => !prev)
  }

  const onVScroll = () => {
    if (drag.current.active || Date.now() - resizedAt.current < 300) return
    window.clearTimeout(vTimer.current)
    vTimer.current = window.setTimeout(() => {
      const v = vtrackRef.current
      if (!v || drag.current.active) return
      const idx = Math.round(v.scrollTop / v.clientHeight)
      if (idx >= 0 && idx < reviews.length) setReview(idx)
    }, 90)
  }

  const onHScroll = (i: number) => {
    // only the on-screen page can move its cursor — Chrome sometimes re-snaps
    // offscreen nested snap containers to 0, which must not clobber state
    if (drag.current.active || i !== activeRef.current || Date.now() - resizedAt.current < 300) return
    window.clearTimeout(hTimers.current[i])
    hTimers.current[i] = window.setTimeout(() => {
      const h = htracks.current[i]
      if (!h || drag.current.active || i !== activeRef.current) return
      const idx = clamp(Math.round(h.scrollLeft / h.clientWidth), reviews[i].photos.length - 1)
      setPhotoIndexes((prev) => (prev[i] === idx ? prev : prev.map((p, j) => (j === i ? idx : p))))
    }, 90)
  }

  // when the active review changes, re-align every photo carousel with its
  // remembered cursor (undoes any spurious browser re-snap of offscreen pages)
  useEffect(() => {
    htracks.current.forEach((h, i) => {
      if (!h) return
      const want = photoIndexes[i] * h.clientWidth
      if (Math.abs(h.scrollLeft - want) > 2) h.scrollLeft = want
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReview])

  /* mouse drag-to-swipe (touch is native via scroll-snap): the gesture locks
     to its dominant axis — horizontal flips photos, vertical flips reviews */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dismissHint()
    if (e.pointerType !== 'mouse') return
    if ((e.target as HTMLElement).closest('button')) return
    const v = vtrackRef.current
    const h = htracks.current[activeReview]
    if (!v || !h) return
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      fromTop: v.scrollTop,
      fromLeft: h.scrollLeft,
      active: true,
      axis: '',
      moved: false,
    }
    v.style.scrollSnapType = 'none'
    h.style.scrollSnapType = 'none'
    try {
      v.setPointerCapture(e.pointerId)
    } catch {
      /* inactive pointer (synthetic events) — drag still works without capture */
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return
    const dx = e.clientX - drag.current.startX
    const dy = e.clientY - drag.current.startY
    if (!drag.current.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
      drag.current.axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      drag.current.moved = true
    }
    if (drag.current.axis === 'h') {
      const h = htracks.current[activeReview]
      if (h) h.scrollLeft = drag.current.fromLeft - dx
    } else if (drag.current.axis === 'v') {
      const v = vtrackRef.current
      if (v) v.scrollTop = drag.current.fromTop - dy
    }
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return
    drag.current.active = false
    const v = vtrackRef.current
    const h = htracks.current[activeReview]
    try {
      v?.releasePointerCapture(e.pointerId)
    } catch {
      /* capture may not have been taken */
    }
    const dx = e.clientX - drag.current.startX
    const dy = e.clientY - drag.current.startY
    // snap to the nearest slide, biased by drag direction
    if (drag.current.axis === 'h' && h) {
      const raw = h.scrollLeft / h.clientWidth
      const target = clamp(
        Math.abs(dx) > 40 ? (dx < 0 ? Math.ceil(raw) : Math.floor(raw)) : Math.round(raw),
        review.photos.length - 1,
      )
      setPhotoIndexes((prev) => prev.map((p, j) => (j === activeReview ? target : p)))
      h.scrollTo({ left: target * h.clientWidth, behavior: 'smooth' })
    } else if (drag.current.axis === 'v' && v) {
      const raw = v.scrollTop / v.clientHeight
      const target = clamp(
        Math.abs(dy) > 40 ? (dy < 0 ? Math.ceil(raw) : Math.floor(raw)) : Math.round(raw),
        reviews.length - 1,
      )
      setReview(target)
      v.scrollTo({ top: target * v.clientHeight, behavior: 'smooth' })
    }
    // keep snap disabled until the settle animation is fully done — re-enabling
    // mid-scroll lets Chrome re-snap to the previous slide
    window.setTimeout(() => {
      if (v) v.style.scrollSnapType = ''
      if (h) h.style.scrollSnapType = ''
    }, 600)
  }

  /* expand / collapse with an animated height change — the copy block (and
     the gradient overlay above it) grows/shrinks instead of jumping */
  const collapseRefs = useRef<(HTMLDivElement | null)[]>([])
  const toggleExpanded = (next: boolean) => {
    const el = collapseRefs.current[activeRef.current]
    if (!el) {
      setExpanded(next)
      return
    }
    const from = el.offsetHeight
    flushSync(() => setExpanded(next))
    const to = el.offsetHeight
    if (from !== to) {
      el.style.overflow = 'hidden'
      const anim = el.animate([{ height: `${from}px` }, { height: `${to}px` }], {
        duration: 320,
        easing: 'cubic-bezier(0.22, 0.9, 0.26, 1)',
      })
      anim.onfinish = () => {
        el.style.overflow = ''
      }
    }
  }

  const share = async () => {
    const url = window.location.origin + `/image-view?review=${review.id}&photo=${photoIndex}`
    try {
      if (navigator.share) {
        await navigator.share({ title: product.shortName, text: review.title, url })
      } else {
        await navigator.clipboard.writeText(url)
      }
    } catch {
      /* user dismissed the share sheet */
    }
  }

  const close = () => {
    const source = getMorphSource()
    if (!source) {
      navigate('/', { viewTransition: true })
      return
    }
    // retarget the reverse morph at the photo currently on screen, so the
    // image scales back down into that photo's thumbnail on the source page
    const img = htracks.current[activeReview]?.querySelectorAll('img')[photoIndex]
    if (img) claimMorph(img as HTMLElement)
    const photo = review.photos[photoIndex]
    if (source.key.startsWith('strip-')) {
      const strip = photoReviews.find((p) => p.reviewId === review.id && p.photoIndex === photoIndex)
      if (strip) setMorphSource(`strip-${strip.id}`, source.path)
    } else {
      setMorphSource(`card-${photo.id}`, source.path)
    }
    navigate(source.path, { viewTransition: true, state: { fromImageView: true } })
  }

  return (
    <div className={chromeHidden ? 'app-shell iv iv--clean' : 'app-shell iv'}>
      {/* vertical feed of full-screen review pages; each page carries its own
          horizontal photo carousel plus its copy and product tray */}
      <div
        className="iv-vtrack"
        ref={vtrackRef}
        onScroll={onVScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={onStageTap}
      >
        {reviews.map((r, i) => {
          const pIdx = photoIndexes[i]
          const isActive = i === activeReview
          const isExpanded = isActive && expanded
          return (
            <section key={r.id} className="iv-page">
              <div
                className="iv-htrack"
                ref={(el) => {
                  htracks.current[i] = el
                }}
                onScroll={() => onHScroll(i)}
              >
                {r.photos.map((photo, pi) => (
                  <div key={photo.id} className="iv-hslide">
                    <img
                      className="iv-hslide__img"
                      src={photo.src}
                      alt={`${r.title} — photo ${pi + 1} of ${r.photos.length}`}
                      draggable={false}
                      style={
                        i === morphTarget.current.review && pi === morphTarget.current.photo
                          ? { viewTransitionName: MORPH_NAME }
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>

              {/* top overlay: page header (close + progress bars) + product card */}
              <div className="iv-top">
                <div className="iv-header">
                  <button className="iv-close" aria-label="Close" onClick={close}>
                    <img src="/assets/iv3-cross.svg" width={20} height={20} alt="" />
                  </button>
                  <div className="iv-bars">
                    {r.photos.map((p, bi) => (
                      <span key={p.id} className={bi <= pIdx ? 'iv-bar' : 'iv-bar iv-bar--upcoming'} />
                    ))}
                  </div>
                </div>
                <div className="iv-product">
                  <img className="iv-product__thumb" src={product.thumb} alt="" />
                  <div className="iv-product__info">
                    <p className="iv-product__name">{product.shortName}</p>
                    <p className="iv-product__price">
                      <b>Đ{product.price}</b> <s>{product.oldPrice}</s> <span>47%</span>
                    </p>
                  </div>
                  <button className="iv-product__atc">Add to cart</button>
                </div>
              </div>

              {/* bottom overlay: reviewer, stars, review copy + share/like */}
              <div className="iv-bottom">
                <div className="iv-user">
                  <span className="iv-avatar">{r.userName.charAt(0)}</span>
                  <div className="iv-user__text">
                    <p className="iv-user__name">
                      {r.userName}
                      <img src="/assets/iv-check.svg" width={16} height={16} alt="Verified" />
                    </p>
                    <p className="iv-user__time">{r.timeAgo}</p>
                  </div>
                </div>
                <div className="iv-actions">
                  <button className="iv-action" aria-label="Share" onClick={share}>
                    <img src="/assets/iv3-share.svg" width={24} height={24} alt="" />
                  </button>
                  <button className="iv-action" aria-label="Like">
                    <img src="/assets/iv3-like.svg" width={24} height={24} alt="" />
                  </button>
                </div>
                <div className="iv-stars" aria-label={`${r.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <img
                      key={s}
                      src={s <= Math.round(r.rating) ? '/assets/iv3-star.svg' : '/assets/star-22-empty.svg'}
                      width={20}
                      height={20}
                      alt=""
                    />
                  ))}
                </div>
                <h2 className="iv-review__title">{r.title}</h2>
                <div
                  className="iv-collapse"
                  ref={(el) => {
                    collapseRefs.current[i] = el
                  }}
                >
                  {isExpanded ? (
                    <>
                      <p className="iv-review__body">{r.fullBody}</p>
                      {r.boughtChips && (
                        <div className="iv-bought">
                          <span className="iv-bought__label">Bought:</span>
                          {r.boughtChips.map((chip) => (
                            <span key={chip} className="iv-bought__chip">
                              {chip}
                            </span>
                          ))}
                        </div>
                      )}
                      <button
                        className="iv-review__toggle iv-review__toggle--less"
                        onClick={() => toggleExpanded(false)}
                      >
                        show less
                      </button>
                    </>
                  ) : (
                    <p className="iv-review__body">
                      {r.body}.{' '}
                      <button className="iv-review__toggle" onClick={() => toggleExpanded(true)}>
                        show more
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </section>
          )
        })}
      </div>

      {/* FTUX: swipe-down affordance — scroll to see other people's reviews */}
      {hintVisible && (
        <div className="iv-vhint" aria-hidden>
          <img src="/assets/iv3-hand-vscroll.svg" width={68} height={94} alt="" />
        </div>
      )}
    </div>
  )
}
