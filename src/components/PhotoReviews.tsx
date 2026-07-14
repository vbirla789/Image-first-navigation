import { useNavigate } from 'react-router-dom'
import { photoReviews, product, type StripPhoto } from '../data/product'
import { MORPH_NAME, claimMorph, getMorphSource, setMorphSource } from '../lib/morph'
import './PhotoReviews.css'

interface PhotoReviewsProps {
  /** which page the strip lives on (kept for analytics/debugging) */
  source: 'pdp' | 'prp'
}

/** Horizontal strip of photo reviews — entry point into the image-first view. */
export default function PhotoReviews({ source }: PhotoReviewsProps) {
  const navigate = useNavigate()
  const morphKey = getMorphSource()?.key

  const openImage = (e: React.MouseEvent<HTMLButtonElement>, photo: StripPhoto) => {
    setMorphSource(`strip-${photo.id}`)
    // claim the morph name exclusively before the snapshot — duplicates abort the transition
    claimMorph(e.currentTarget)
    navigate(`/image-view?review=${photo.reviewId}&photo=${photo.photoIndex}&from=${source}`, {
      viewTransition: true,
    })
  }

  return (
    <section className="photo-reviews">
      <h3 className="section-title">Photo Reviews ({product.totalReviews})</h3>
      <div className="h-scroll photo-reviews__strip">
        {photoReviews.map((photo, i) => (
          <button
            key={photo.id}
            className="photo-reviews__item"
            data-morph-key={`strip-${photo.id}`}
            style={morphKey === `strip-${photo.id}` ? { viewTransitionName: MORPH_NAME } : undefined}
            onClick={(e) => openImage(e, photo)}
            aria-label={`Open photo review ${i + 1}`}
          >
            <img src={photo.src} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </section>
  )
}
