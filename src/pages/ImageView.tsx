import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { photoReviews, product, reviews } from '../data/product'
import type { StripPhoto } from '../data/product'
import { MORPH_NAME, claimMorph, getMorphSource, setMorphSource } from '../lib/morph'
import './ImageView.css'

function initialReviewIndex(reviewId: string | null): number {
  const idx = reviews.findIndex((r) => r.id === reviewId)
  return idx === -1 ? 0 : idx
}

const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v))

const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')

/**
 * Image-first view ("Approach 3") — a vertical feed of rounded review cards,
 * reached by tapping any review photo on the PDP or PRP.
 *  - vertical swipe → next/previous reviewer's card (the next card peeks in
 *    below), full-card snap
 *  - horizontal swipe → other photos of the SAME review (dots track position)
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
  // shows the full product photo-gallery grid (all reviews' images)
  const [galleryOpen, setGalleryOpen] = useState(false)
  // per-review like state (seeded from the review's helpful data)
  const [likes, setLikes] = useState(() =>
    reviews.map((r) => ({ liked: r.helpfulSelected, count: r.helpfulCount })),
  )
  // "report this feedback" bottom sheet — holds the review index or null
  const [reportFor, setReportFor] = useState<number | null>(null)
  // FTUX: swipe-up gesture Lottie, shown once per session until the user scrolls
  const [ftuxVisible, setFtuxVisible] = useState(() => !sessionStorage.getItem('iv-ftux-seen'))

  // dismissed by real user input (touch / wheel / pointer), never by the
  // scroll events that mount positioning and browser scroll-restore fire
  const dismissFtux = () => {
    setFtuxVisible((visible) => {
      if (visible) sessionStorage.setItem('iv-ftux-seen', '1')
      return false
    })
  }

  const toggleLike = (i: number) =>
    setLikes((prev) =>
      prev.map((l, j) =>
        j === i ? { liked: !l.liked, count: l.count + (l.liked ? -1 : 1) } : l,
      ),
    )
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

  // vertical distance between consecutive cards (card height + gap)
  const vStep = (v: HTMLDivElement) => {
    const kids = v.children
    if (kids.length > 1) {
      return (kids[1] as HTMLElement).offsetTop - (kids[0] as HTMLElement).offsetTop
    }
    return v.clientHeight
  }
  const cardTop = (v: HTMLDivElement, i: number) => {
    const kid = v.children[i] as HTMLElement | undefined
    return kid ? kid.offsetTop : i * vStep(v)
  }

  // position both axes on the entry review/photo (before paint; snap disabled
  // so Chrome doesn't animate the initial jump)
  useLayoutEffect(() => {
    const v = vtrackRef.current
    if (!v) return
    const h = htracks.current[activeReview]
    v.style.scrollSnapType = 'none'
    if (h) h.style.scrollSnapType = 'none'
    const position = () => {
      v.scrollTop = cardTop(v, activeReview)
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
      if (v) v.scrollTop = cardTop(v, activeReview)
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

  const expandedRef = useRef(false)
  const setReview = (idx: number) => {
    if (idx === activeRef.current) return
    activeRef.current = idx
    setActiveReview(idx)
    setExpanded(false)
    expandedRef.current = false
  }

  /* jump interaction: after 5s without activity, the card below nudges up
     into view and settles back — an affordance that there's more to swipe */
  const idleTimer = useRef(0)
  const jumping = useRef(false)

  const runJump = () => {
    const v = vtrackRef.current
    // skip while interacting, reading an expanded review, or on the last card
    if (!v || drag.current.active || expandedRef.current || activeRef.current >= reviews.length - 1) {
      armIdleJump()
      return
    }
    jumping.current = true
    v.style.scrollSnapType = 'none'
    const from = v.scrollTop
    const peek = 72
    const up = 420 // ms rise
    const hold = 160
    const down = 420
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
    const start = performance.now()
    const tick = (now: number) => {
      const t = now - start
      if (t < up) {
        v.scrollTop = from + peek * easeOut(t / up)
      } else if (t < up + hold) {
        v.scrollTop = from + peek
      } else if (t < up + hold + down) {
        v.scrollTop = from + peek * (1 - easeOut((t - up - hold) / down))
      } else {
        v.scrollTop = from
        v.style.scrollSnapType = ''
        jumping.current = false
        armIdleJump()
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  const armIdleJump = () => {
    window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(runJump, 5000)
  }

  useEffect(() => {
    armIdleJump()
    return () => window.clearTimeout(idleTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onVScroll = () => {
    if (drag.current.active || jumping.current || Date.now() - resizedAt.current < 300) return
    armIdleJump()
    window.clearTimeout(vTimer.current)
    vTimer.current = window.setTimeout(() => {
      const v = vtrackRef.current
      if (!v || drag.current.active || jumping.current) return
      const idx = Math.round(v.scrollTop / vStep(v))
      if (idx >= 0 && idx < reviews.length) setReview(idx)
    }, 90)
  }

  const onHScroll = (i: number) => {
    // only the on-screen card can move its cursor — Chrome sometimes re-snaps
    // offscreen nested snap containers to 0, which must not clobber state
    if (drag.current.active || i !== activeRef.current || Date.now() - resizedAt.current < 300) return
    armIdleJump()
    window.clearTimeout(hTimers.current[i])
    hTimers.current[i] = window.setTimeout(() => {
      const h = htracks.current[i]
      if (!h || drag.current.active || i !== activeRef.current) return
      const idx = clamp(Math.round(h.scrollLeft / h.clientWidth), reviews[i].photos.length - 1)
      setPhotoIndexes((prev) => (prev[i] === idx ? prev : prev.map((p, j) => (j === i ? idx : p))))
    }, 90)
  }

  // when the active review changes, re-align every photo carousel with its
  // remembered cursor (undoes any spurious browser re-snap of offscreen cards)
  useEffect(() => {
    htracks.current.forEach((h, i) => {
      if (!h) return
      const want = photoIndexes[i] * h.clientWidth
      if (Math.abs(h.scrollLeft - want) > 2) h.scrollLeft = want
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReview])

  /* mouse drag-to-swipe (touch is native via scroll-snap): the gesture locks
     to its dominant axis — horizontal flips photos, vertical flips cards */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dismissFtux()
    armIdleJump()
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
      const raw = v.scrollTop / vStep(v)
      const target = clamp(
        Math.abs(dy) > 40 ? (dy < 0 ? Math.ceil(raw) : Math.floor(raw)) : Math.round(raw),
        reviews.length - 1,
      )
      setReview(target)
      v.scrollTo({ top: cardTop(v, target), behavior: 'smooth' })
    }
    // keep snap disabled until the settle animation is fully done — re-enabling
    // mid-scroll lets Chrome re-snap to the previous slide
    window.setTimeout(() => {
      if (v) v.style.scrollSnapType = ''
      if (h) h.style.scrollSnapType = ''
    }, 600)
  }

  /* expand / collapse with an animated height change */
  const collapseRefs = useRef<(HTMLDivElement | null)[]>([])
  const toggleExpanded = (next: boolean) => {
    const el = collapseRefs.current[activeRef.current]
    if (!el) {
      expandedRef.current = next
      setExpanded(next)
      return
    }
    expandedRef.current = next
    armIdleJump()
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

  // jump to the review + photo the tapped gallery image belongs to
  const pickGalleryPhoto = (photo: StripPhoto) => {
    const reviewIdx = reviews.findIndex((r) => r.id === photo.reviewId)
    if (reviewIdx < 0) {
      setGalleryOpen(false)
      return
    }
    setPhotoIndexes((prev) => prev.map((p, j) => (j === reviewIdx ? photo.photoIndex : p)))
    activeRef.current = reviewIdx
    setActiveReview(reviewIdx)
    setExpanded(false)
    expandedRef.current = false
    setGalleryOpen(false)
    // defer the scroll until after the overlay unmounts and the feed re-renders,
    // otherwise the commit clobbers the programmatic scrollTop
    requestAnimationFrame(() => {
      const v = vtrackRef.current
      if (v) {
        v.style.scrollSnapType = 'none'
        v.scrollTop = cardTop(v, reviewIdx)
        requestAnimationFrame(() => {
          v.style.scrollSnapType = ''
        })
      }
      const h = htracks.current[reviewIdx]
      if (h) h.scrollLeft = photo.photoIndex * h.clientWidth
    })
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
    <div className="app-shell iv">
      {/* vertical feed of rounded review cards; the next card peeks in below */}
      <div
        className="iv-feed"
        ref={vtrackRef}
        onScroll={onVScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={dismissFtux}
        onTouchStart={dismissFtux}
      >
        {reviews.map((r, i) => {
          const pIdx = photoIndexes[i]
          const isActive = i === activeReview
          const isExpanded = isActive && expanded
          return (
            <section key={r.id} className="iv-card">
              {/* blurred backdrop of the current photo behind the contained one */}
              <img className="iv-card__bg" src={r.photos[pIdx].src} alt="" draggable={false} />
              <div className="iv-card__scrim" />

              {/* horizontal photo carousel */}
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

              {/* card header: reviewer identity + close */}
              <div className="iv-card__header">
                <span className="iv-avatar">{initials(r.userName)}</span>
                <div className="iv-card__user">
                  <p className="iv-card__name">
                    {r.userName}
                    <img src="/assets/iv-check.svg" width={16} height={16} alt="Verified" />
                  </p>
                  <p className="iv-card__time">{r.timeAgo}</p>
                </div>
                <button className="iv-card__close" aria-label="Close" onClick={close}>
                  <img src="/assets/iv5-cross.svg" width={15} height={15} alt="" />
                </button>
              </div>

              {/* bottom overlay: dots, review copy + action rail, ATC */}
              <div className="iv-card__bottom">
                {r.photos.length > 1 && (
                  <div className={isExpanded ? 'iv-dots iv-dots--hidden' : 'iv-dots'} aria-hidden>
                    {r.photos.map((p, di) => (
                      <span key={p.id} className={di === pIdx ? 'iv-dot iv-dot--active' : 'iv-dot'} />
                    ))}
                  </div>
                )}
                <div className="iv-card__row">
                  <div className="iv-card__copy">
                    <div className="iv-card__titlerow">
                      <span className={r.rating >= 3 ? 'iv-pill iv-pill--positive' : 'iv-pill iv-pill--negative'}>
                        {r.rating}
                        <img src="/assets/iv-star-white.svg" width={12} height={12} alt="" />
                      </span>
                      <h2 className="iv-card__title">{r.title}</h2>
                    </div>
                    <div
                      className="iv-collapse"
                      ref={(el) => {
                        collapseRefs.current[i] = el
                      }}
                    >
                      {isExpanded ? (
                        <>
                          <p className="iv-card__body">{r.fullBody}</p>
                          <div className="iv-chips">
                            {r.chips.map((chip) => (
                              <span key={chip} className="iv-chips__chip">
                                {chip}
                              </span>
                            ))}
                          </div>
                          <button className="iv-card__toggle" onClick={() => toggleExpanded(false)}>
                            show less
                            <img className="iv-card__toggle-flip" src="/assets/iv5-chevron-down.svg" width={16} height={16} alt="" />
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="iv-card__body iv-card__body--clamp">{r.fullBody}</p>
                          <button className="iv-card__toggle" onClick={() => toggleExpanded(true)}>
                            show more
                            <img src="/assets/iv5-chevron-down.svg" width={16} height={16} alt="" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="iv-rail">
                    <button
                      className={likes[i].liked ? 'iv-rail__btn iv-rail__btn--liked' : 'iv-rail__btn'}
                      aria-label="Like"
                      aria-pressed={likes[i].liked}
                      onClick={() => toggleLike(i)}
                    >
                      <img
                        src={likes[i].liked ? '/assets/iv5-like-filled.svg' : '/assets/iv5-like.svg'}
                        width={28}
                        height={28}
                        alt=""
                      />
                      <span>{likes[i].count}</span>
                    </button>
                    <button className="iv-rail__btn" aria-label="Share" onClick={share}>
                      <img src="/assets/iv5-share.svg" width={28} height={28} alt="" />
                    </button>
                    <button className="iv-rail__btn" aria-label="More options" onClick={() => setReportFor(i)}>
                      <img src="/assets/iv5-dots-menu.svg" width={24} height={24} alt="" />
                    </button>
                    <button
                      className="iv-rail__gallery"
                      aria-label={`View all ${photoReviews.length} product photos`}
                      onClick={() => setGalleryOpen(true)}
                    >
                      <span
                        className="iv-rail__gallery-card iv-rail__gallery-card--back"
                        style={{ backgroundImage: `url(${photoReviews[1].src})` }}
                      />
                      <span
                        className="iv-rail__gallery-card iv-rail__gallery-card--front"
                        style={{ backgroundImage: `url(${photoReviews[0].src})` }}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )
        })}
      </div>

      {/* full product photo gallery — every review's images */}
      {galleryOpen && (
        <div className="iv-gallery" role="dialog" aria-label="All product photos">
          <div className="iv-gallery__header">
            <h2 className="iv-gallery__title">All photos ({photoReviews.length})</h2>
            <button className="iv-gallery__close" aria-label="Close gallery" onClick={() => setGalleryOpen(false)}>
              <img src="/assets/iv5-cross.svg" width={15} height={15} alt="" />
            </button>
          </div>
          <div className="iv-gallery__grid">
            {photoReviews.map((photo, pi) => (
              <button key={photo.id} className="iv-gallery__cell" onClick={() => pickGalleryPhoto(photo)}>
                <img src={photo.src} alt={`Photo ${pi + 1}`} draggable={false} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* report bottom sheet — opened from a review's three-dot menu */}
      {reportFor !== null && (
        <div className="iv-sheet" role="dialog" aria-label="Review options">
          <button className="iv-sheet__scrim" aria-label="Dismiss" onClick={() => setReportFor(null)} />
          <div className="iv-sheet__panel">
            <span className="iv-sheet__grabber" />
            <button className="iv-sheet__item" onClick={() => setReportFor(null)}>
              <img src="/assets/iv5-report.svg" width={24} height={24} alt="" />
              Report this feedback
            </button>
          </div>
        </div>
      )}

      {/* FTUX: swipe-up gesture hint — plays until the user scrolls */}
      {ftuxVisible && (
        <div className="iv-ftux" aria-hidden>
          <DotLottieReact src="/assets/swipe-up.lottie" autoplay loop className="iv-ftux__lottie" />
          <p className="iv-ftux__label">Swipe up to see more</p>
        </div>
      )}
    </div>
  )
}
