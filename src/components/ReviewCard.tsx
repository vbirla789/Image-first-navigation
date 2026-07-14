import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Review } from '../data/product'
import { MORPH_NAME, claimMorph, getMorphSource, setMorphSource } from '../lib/morph'
import Stars from './Stars'
import './ReviewCard.css'

interface ReviewCardProps {
  review: Review
  source: 'pdp' | 'prp'
  /** PRP's first card shows the verified tag next to the user name row */
  compactHeader?: boolean
}

export default function ReviewCard({ review, source, compactHeader = false }: ReviewCardProps) {
  const navigate = useNavigate()
  const [helpful, setHelpful] = useState(review.helpfulSelected)
  const count = review.helpfulCount + (helpful && !review.helpfulSelected ? 1 : 0) - (!helpful && review.helpfulSelected ? 1 : 0)

  return (
    <article className="review-card">
      <div className="review-card__user">
        <div className="review-card__user-main">
          <span className={compactHeader ? 'review-card__name review-card__name--medium' : 'review-card__name'}>
            {review.userName}
          </span>
          {compactHeader && review.verified && <VerifiedTag />}
        </div>
        <div className="review-card__rating-row">
          <Stars rating={review.rating} size={16} />
          {review.fromTrustedSource && (
            <span className="review-card__meta">
              <i>•</i> from trusted source
            </span>
          )}
          <span className="review-card__meta">
            <i>•</i> {review.timeAgo}
          </span>
        </div>
        {!compactHeader && review.verified && (
          <div className="review-card__verified-abs">
            <VerifiedTag />
          </div>
        )}
      </div>

      <div className="review-card__chips">
        {review.chips.map((chip) => (
          <span key={chip} className="review-card__chip">
            {chip}
          </span>
        ))}
        <button className="review-card__chip review-card__chip--link">
          View product
          <img src="/assets/chevron-right-blue.svg" width={10} height={10} alt="" />
        </button>
      </div>

      <div className="review-card__body">
        <h4>{review.title}</h4>
        <p>
          {review.body} <span className="review-card__more">more</span>
        </p>
        <button className="review-card__translate">
          Translate to <span dir="rtl">عربي</span>
        </button>
        <div className="h-scroll review-card__photos">
          {review.photos.map((photo, i) => (
            <button
              key={photo.id}
              className="review-card__photo"
              data-morph-key={`card-${photo.id}`}
              style={
                getMorphSource()?.key === `card-${photo.id}` ? { viewTransitionName: MORPH_NAME } : undefined
              }
              onClick={(e) => {
                setMorphSource(`card-${photo.id}`)
                claimMorph(e.currentTarget)
                navigate(`/image-view?review=${review.id}&photo=${i}&from=${source}`, {
                  viewTransition: true,
                })
              }}
              aria-label={`Open review photo ${i + 1}`}
            >
              <img src={photo.src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      </div>

      <div className="review-card__footer">
        <button
          className={helpful ? 'helpful-btn helpful-btn--selected' : 'helpful-btn'}
          onClick={() => setHelpful(!helpful)}
        >
          <img
            src={helpful ? '/assets/thumbs-up-filled.svg' : '/assets/thumbs-up.svg'}
            width={12}
            height={12}
            alt=""
          />
          Helpful ({count})
        </button>
      </div>
    </article>
  )
}

function VerifiedTag() {
  return (
    <span className="verified-tag">
      <img src="/assets/verified-icon.svg" width={12} height={12} alt="" />
      Verified Buy
    </span>
  )
}
