import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { photoReviews, product, reviews } from '../data/product'
import { MORPH_NAME, getMorphSource, setMorphSource, withLocalTransition } from '../lib/morph'
import './ImageView.css'

function initialReviewIndex(reviewId: string | null): number {
  const idx = reviews.findIndex((r) => r.id === reviewId)
  return idx === -1 ? 0 : idx
}

/**
 * Image-first view ("Single Review") — reached by tapping any review photo
 * on the PDP or PRP. Story-style navigation:
 *  - tap right/left half of the image → next/previous photo of the SAME
 *    review (progress bars in the header track the position)
 *  - horizontal drag/swipe → next/previous REVIEW
 */
export default function ImageView() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [activeReview, setActiveReview] = useState(() => initialReviewIndex(params.get('review')))
  // one photo cursor per review, so swiping back restores where you were
  const [photoIndexes, setPhotoIndexes] = useState<number[]>(() =>
    reviews.map((r) => {
      if (r.id !== params.get('review')) return 0
      return Math.max(0, Math.min(r.photos.length - 1, Number(params.get('photo') ?? 0)))
    }),
  )
  const [expanded, setExpanded] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ startX: 0, startLeft: 0, active: false, moved: false })

  const review = reviews[activeReview]
  const photoIndex = photoIndexes[activeReview]

  // position the carousel on the entry review (before paint; snap disabled so
  // Chrome doesn't animate the initial jump)
  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el) return
    el.style.scrollSnapType = 'none'
    const position = () => {
      el.scrollLeft = activeReview * el.clientWidth
    }
    position()
    requestAnimationFrame(() => {
      position()
      requestAnimationFrame(() => {
        el.style.scrollSnapType = ''
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // keep the carousel aligned with the active review when the viewport
  // resizes (rotation, keyboard) — otherwise scrollLeft/clientWidth briefly
  // maps to a different review and resets the UI
  useEffect(() => {
    const onResize = () => {
      const el = trackRef.current
      if (el) el.scrollLeft = activeReview * el.clientWidth
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [activeReview])

  const setReview = (idx: number) => {
    if (idx === activeReview) return
    setActiveReview(idx)
    setExpanded(false)
  }

  const onScroll = () => {
    const el = trackRef.current
    if (!el || drag.current.active) return
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    if (idx >= 0 && idx < reviews.length) setReview(idx)
  }

  const goToReview = (i: number) => {
    const el = trackRef.current
    const idx = Math.max(0, Math.min(reviews.length - 1, i))
    if (el) el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' })
  }

  /* tap-tap: right side → next photo, left side → previous photo.
     Past either end of a review's photos, roll over to the adjacent review. */
  const changePhoto = (delta: number) => {
    const next = photoIndex + delta
    if (next < 0) {
      goToReview(activeReview - 1)
      return
    }
    if (next >= review.photos.length) {
      goToReview(activeReview + 1)
      return
    }
    setPhotoIndexes((prev) => prev.map((p, i) => (i === activeReview ? next : p)))
  }

  /* tap anywhere on the stage (photo or the empty black areas) — attached to
     the carousel itself because mouse pointer-capture retargets clicks to it */
  const onCarouselTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drag.current.moved) {
      drag.current.moved = false
      return
    }
    const el = trackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    changePhoto(e.clientX - rect.left < rect.width * 0.35 ? -1 : 1)
  }

  // mouse drag-to-swipe between reviews (touch swiping is native via scroll-snap)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const el = trackRef.current
    if (!el) return
    drag.current = { startX: e.clientX, startLeft: el.scrollLeft, active: true, moved: false }
    el.style.scrollSnapType = 'none'
    el.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = trackRef.current
    if (!el || !drag.current.active) return
    const dx = e.clientX - drag.current.startX
    if (Math.abs(dx) > 5) drag.current.moved = true
    el.scrollLeft = drag.current.startLeft - dx
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = trackRef.current
    if (!el || !drag.current.active) return
    drag.current.active = false
    el.releasePointerCapture(e.pointerId)
    // snap to the nearest review, biased by drag direction
    const dx = e.clientX - drag.current.startX
    const raw = el.scrollLeft / el.clientWidth
    const target = Math.abs(dx) > 40 ? (dx < 0 ? Math.ceil(raw) : Math.floor(raw)) : Math.round(raw)
    const idx = Math.max(0, Math.min(reviews.length - 1, target))
    setReview(idx)
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' })
    window.setTimeout(() => {
      el.style.scrollSnapType = ''
    }, 350)
  }

  /* expand / collapse inside a view transition so the gradient and text
     morph instead of jumping */
  const toggleExpanded = (next: boolean) => {
    withLocalTransition(() => flushSync(() => setExpanded(next)))
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
      {/* review carousel — one slide per review, drag/swipe moves between reviews.
          Every photo of a review stays mounted so taps crossfade smoothly. */}
      <div
        className="iv-carousel"
        ref={trackRef}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={onCarouselTap}
      >
        {reviews.map((r, i) => (
          <div key={r.id} className="iv-slide">
            {r.photos.map((photo, pi) => (
              <img
                key={photo.id}
                className={pi === photoIndexes[i] ? 'iv-slide__img' : 'iv-slide__img iv-slide__img--hidden'}
                src={photo.src}
                alt={`${r.title} — photo ${pi + 1} of ${r.photos.length}`}
                draggable={false}
                style={
                  i === activeReview && pi === photoIndexes[i] ? { viewTransitionName: MORPH_NAME } : undefined
                }
              />
            ))}
          </div>
        ))}
      </div>

      {/* top overlay: page header (close + centered progress bars) + review */}
      <div className={expanded ? 'iv-top iv-top--expanded' : 'iv-top'}>
        <div className="iv-header">
          <button className="iv-close" aria-label="Close" onClick={close}>
            <img src="/assets/iv3-cross.svg" width={20} height={20} alt="" />
          </button>
          <div className="iv-bars">
            {review.photos.map((p, i) => (
              <span key={p.id} className={i <= photoIndex ? 'iv-bar' : 'iv-bar iv-bar--upcoming'} />
            ))}
          </div>
        </div>
        <div className="iv-review" key={review.id}>
          <div className="iv-review__meta">
            <span className={review.rating >= 3 ? 'iv-pill iv-pill--positive' : 'iv-pill iv-pill--negative'}>
              {review.rating}
              <img src="/assets/iv-star-white.svg" width={12} height={12} alt="" />
            </span>
            <span className="iv-review__time">{review.timeAgo}</span>
          </div>
          <h2 className="iv-review__title">{review.title}</h2>
          {expanded ? (
            <>
              <p className="iv-review__body">
                {review.fullBody}{' '}
                <button className="iv-review__toggle" onClick={() => toggleExpanded(false)}>
                  show less
                </button>
              </p>
              {review.sizeBought && (
                <span className="iv-size-chip">
                  <b>Size bought:</b> {review.sizeBought}
                </span>
              )}
            </>
          ) : (
            <p className="iv-review__body">
              {review.body}.{' '}
              <button className="iv-review__toggle" onClick={() => toggleExpanded(true)}>
                show more
              </button>
            </p>
          )}
          <p className="iv-review__user">
            {review.userName}
            <img src="/assets/iv-check.svg" width={16} height={16} alt="Verified" />
          </p>
        </div>
      </div>

      {/* bottom overlay: floating actions + product quick view tray */}
      <div className="iv-bottom">
        <div className="iv-actions">
          <button className="iv-action" aria-label="Like">
            <img src="/assets/iv3-like.svg" width={24} height={24} alt="" />
          </button>
          <button className="iv-action" aria-label="Share" onClick={share}>
            <img src="/assets/iv3-share.svg" width={24} height={24} alt="" />
          </button>
          <button className="iv-action" aria-label="Zoom">
            <img src="/assets/iv3-search.svg" width={24} height={24} alt="" />
          </button>
        </div>
        <div className="iv-quickview">
          <img className="iv-quickview__thumb" src={product.thumb} alt="" />
          <div className="iv-quickview__info">
            <p className="iv-quickview__name">{product.shortName}</p>
            <p className="iv-quickview__price">
              <b>Đ{product.price}</b> <s>{product.oldPrice}</s> <span>47%</span>
            </p>
          </div>
          <button className="iv-quickview__atc" aria-label="Add to cart">
            <img src="/assets/iv3-cart.svg" width={20} height={20} alt="" />
          </button>
        </div>
      </div>
    </div>
  )
}
