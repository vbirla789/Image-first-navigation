import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { galleryPhotos, photoReviews, reviews, totalPhotos, type StripPhoto } from '../data/product'
import { MORPH_NAME, claimMorph, getMorphSource, setMorphSource } from '../lib/morph'
import './PhotoReviews.css'

interface PhotoReviewsProps {
  /** which page the strip lives on (kept for analytics/debugging) */
  source: 'pdp' | 'prp'
}

const FILTERS = ['Most relevant', 'Variant', `Positive (${totalPhotos})`, 'Critical (12)']

/**
 * Photo reviews mosaic — one large photo + a 2×2 grid; the last cell is a
 * "64+ / View all" overlay that opens the full customer-photos gallery.
 * Any photo is an entry point into the image-first view.
 */
export default function PhotoReviews({ source }: PhotoReviewsProps) {
  const navigate = useNavigate()
  const morphKey = getMorphSource()?.key
  const [galleryOpen, setGalleryOpen] = useState(false)

  const openImage = (e: React.MouseEvent<HTMLElement>, photo: StripPhoto) => {
    setMorphSource(`strip-${photo.id}`)
    // claim the morph name exclusively before the snapshot — duplicates abort the transition
    claimMorph(e.currentTarget)
    navigate(`/image-view?review=${photo.reviewId}&photo=${photo.photoIndex}&from=${source}`, {
      viewTransition: true,
    })
  }

  // large photo + first four of the grid (the 4th sits under the overlay)
  const mosaic = photoReviews.slice(0, 5)
  const [hero, ...grid] = mosaic

  return (
    <section className="photo-reviews">
      <h3 className="section-title">Photo Reviews ({totalPhotos})</h3>

      <div className="photo-reviews__mosaic">
        <button
          className="photo-reviews__hero"
          data-morph-key={`strip-${hero.id}`}
          style={morphKey === `strip-${hero.id}` ? { viewTransitionName: MORPH_NAME } : undefined}
          onClick={(e) => openImage(e, hero)}
          aria-label="Open photo review 1"
        >
          <img src={hero.src} alt="" loading="lazy" />
        </button>

        <div className="photo-reviews__grid">
          {grid.map((photo, i) => {
            const isLast = i === grid.length - 1
            return (
              <button
                key={photo.id}
                className="photo-reviews__cell"
                data-morph-key={isLast ? undefined : `strip-${photo.id}`}
                style={
                  !isLast && morphKey === `strip-${photo.id}`
                    ? { viewTransitionName: MORPH_NAME }
                    : undefined
                }
                onClick={(e) => (isLast ? setGalleryOpen(true) : openImage(e, photo))}
                aria-label={isLast ? `View all ${totalPhotos} photos` : `Open photo review ${i + 2}`}
              >
                <img src={photo.src} alt="" loading="lazy" />
                {isLast && (
                  <span className="photo-reviews__more">
                    <b>{totalPhotos}+</b>
                    View all
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* full customer-photos gallery */}
      {galleryOpen && (
        <div className="cust-gallery" role="dialog" aria-label="Customer photos">
          <header className="cust-gallery__header">
            <button className="cust-gallery__back" aria-label="Back" onClick={() => setGalleryOpen(false)}>
              <img src="/assets/back-arrow.svg" width={20} height={20} alt="" />
            </button>
            <h2 className="cust-gallery__title">Customer photos ({totalPhotos})</h2>
          </header>
          <div className="cust-gallery__filters h-scroll">
            {FILTERS.map((f, i) => (
              <button key={f} className="cust-gallery__chip">
                {f}
                {i < 2 && <img src="/assets/iv6-chevron-down.svg" width={20} height={20} alt="" />}
              </button>
            ))}
          </div>
          <div className="cust-gallery__scroll">
            <div className="cust-gallery__grid">
              {galleryPhotos.map((photo, i) => {
                const rating = reviews.find((r) => r.id === photo.reviewId)?.rating ?? 5
                return (
                  <button
                    key={photo.id}
                    className="cust-gallery__cell"
                    onClick={(e) => openImage(e, photo)}
                    aria-label={`Open photo ${i + 1}, rated ${rating} stars`}
                  >
                    <img src={photo.src} alt="" loading="lazy" />
                    <span className="cust-gallery__badge">
                      {rating}
                      <img src="/assets/iv6-star-12.svg" width={12} height={12} alt="" />
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
