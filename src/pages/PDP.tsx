import { useNavigate } from 'react-router-dom'
import { product, reviews } from '../data/product'
import { useMorphReturnScroll } from '../lib/morph'
import Stars from '../components/Stars'
import AISummary from '../components/AISummary'
import PhotoReviews from '../components/PhotoReviews'
import ReviewCard from '../components/ReviewCard'
import AtcBar from '../components/AtcBar'
import {
  BackIcon,
  SearchIcon,
  HeartIcon,
  ShareIcon,
  ChevronRight,
  ChevronDown,
  InfoIcon,
  StarSolid,
} from '../components/icons'
import './PDP.css'

export default function PDP() {
  const navigate = useNavigate()
  useMorphReturnScroll()

  return (
    <div className="app-shell pdp">
      {/* Header */}
      <header className="pdp-header">
        <button className="icon-btn" aria-label="Back">
          <BackIcon />
        </button>
        <div className="pdp-header__actions">
          <button className="icon-btn" aria-label="Search">
            <SearchIcon />
          </button>
          <button className="icon-btn" aria-label="Wishlist">
            <HeartIcon />
          </button>
          <button className="icon-btn" aria-label="Share">
            <ShareIcon />
          </button>
        </div>
      </header>

      {/* Hero image */}
      <section className="pdp-hero">
        <img src={product.heroImage} alt={product.name} />
        <div className="pdp-hero__dots">
          <span className="pdp-hero__dot pdp-hero__dot--active" />
          <span className="pdp-hero__dot" />
          <span className="pdp-hero__dot" />
          <span className="pdp-hero__dot" />
        </div>
      </section>

      <main className="pdp-body">
        {/* Main info card */}
        <section className="card pdp-main-info">
          <div className="pdp-brand-row">
            <div className="pdp-brand">
              <span className="pdp-brand__logo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="12" fill="#0057ff" />
                  <path d="M7 16V8l5 5 5-5v8" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="pdp-brand__name">{product.brand}</span>
            </div>
            <button className="pdp-visit-store">
              Visit Store <ChevronRight size={13} color="#0057ff" />
            </button>
          </div>

          <div className="pdp-info-card">
            <div className="pdp-title-row">
              <h1>{product.shortName}…</h1>
              <ChevronDown size={20} color="#666d85" />
            </div>

            <div className="pdp-badges">
              <span className="pdp-badge">
                <StarSolid /> <b>{product.rating}</b>&nbsp;({product.reviewsCount} reviews)
              </span>
              <span className="pdp-badge">💳 Prepaid Only</span>
            </div>

            <div className="pdp-price-row">
              <span className="pdp-price">Đ{product.price}</span>
              <s className="pdp-price-old">Đ{product.oldPrice}</s>
              <span className="pdp-price-off">{product.discount}</span>
              <span className="pdp-price-vat">(incl. of VAT)</span>
              <InfoIcon />
            </div>

            <div className="pdp-combo">
              <span className="pdp-combo__icon">＋</span>
              Saving Đ45 with Combo
              <InfoIcon size={14} />
            </div>

            <div className="pdp-unit">
              500ml <span>|</span> <s>Đ2.35/ml</s>
            </div>

            <div className="pdp-deal-row">
              <span className="pdp-mega-deal">Mega Deal</span>
              <span className="pdp-lowest">
                <span className="pdp-lowest__arrow">↓</span> Lowest Price in 30 days
              </span>
            </div>

            <div className="h-scroll pdp-coupons">
              <button className="pdp-coupon">
                <span className="pdp-coupon__icon">🎟️</span>
                Extra 15%, CODE: ENDD15
                <ChevronRight size={12} color="#101628" />
              </button>
              <button className="pdp-coupon">
                <span className="pdp-coupon__icon">🎟️</span>
                Extra 10% off up to Đ150
              </button>
            </div>

            <button className="pdp-bestseller">
              <span className="pdp-bestseller__medal">🏅</span>
              <span>
                Bestseller #1 in <b className="pdp-bestseller__link">Chargers</b>
              </span>
              <ChevronRight size={16} color="#101628" />
            </button>
          </div>
        </section>

        {/* Delivery information */}
        <section className="card pdp-delivery">
          <div className="pdp-delivery__head">
            <h3 className="section-title">Delivery Information</h3>
            <span className="pdp-one-member">
              <span className="pdp-one-pill">one</span> member
            </span>
          </div>
          <div className="pdp-delivery__express">
            <span className="pdp-express-pill">express</span>
            Get it Tomorrow before 12 PM
          </div>
          <button className="pdp-delivery__other">
            Other Delivery Options
            <ChevronDown size={16} color="#666d85" />
          </button>
        </section>

        {/* Trust markers strip */}
        <section className="h-scroll pdp-trust-strip">
          {[
            ['🔄', 'Low Return'],
            ['🤝', 'Partner Since'],
            ['✅', 'Product As Described'],
            ['⭐', 'High Rated'],
            ['📦', 'Low & Easy Returns'],
            ['🛡️', 'Secure Transactions'],
          ].map(([emoji, label]) => (
            <div key={label} className="pdp-trust-card">
              <span className="pdp-trust-card__icon">{emoji}</span>
              <span className="pdp-trust-card__label">{label}</span>
            </div>
          ))}
        </section>

        {/* Payment offers */}
        <section className="card pdp-payment">
          <h3 className="section-title">Payment offers</h3>
          <div className="h-scroll pdp-payment__row">
            <div className="pdp-payment__offer">
              <span className="pdp-payment__icon">💳</span>
              <p>
                <b>Get extra 5% cashback</b> using ENBD noon VISA credit card{' '}
                <button className="pdp-payment__apply">Apply Now</button>
              </p>
            </div>
            <div className="pdp-payment__tabby">tabby</div>
          </div>
        </section>

        {/* Product details accordions */}
        <section className="card pdp-details">
          <h3 className="section-title">Product Details</h3>
          {['Overview', 'Highlights', 'Specifications'].map((label) => (
            <button key={label} className="pdp-accordion">
              {label}
              <ChevronDown size={16} color="#101628" />
            </button>
          ))}
        </section>

        {/* Extended warranty */}
        <section className="card pdp-warranty">
          <div className="pdp-warranty__head">
            <h3 className="section-title">Extended warranty</h3>
            <span className="pdp-warranty__by">
              by <b>PROTECT</b>
              <span className="pdp-warranty__4">4</span>
              <b>LESS</b>
            </span>
          </div>
          <div className="h-scroll pdp-warranty__row">
            {['🛡️', '🔰'].map((icon, i) => (
              <div key={i} className="pdp-warranty__card">
                <div className="pdp-warranty__year">1 YEAR</div>
                <div className="pdp-warranty__body">
                  <div className="pdp-warranty__title-row">
                    <span className="pdp-warranty__icon">{icon}</span>
                    <span className="pdp-warranty__title">
                      Accidental Damage Protection <ChevronRight size={12} color="#101628" />
                    </span>
                  </div>
                  <ul>
                    <li>🕐 Active from date of purchase</li>
                    <li>💧 Covers liquid damages</li>
                    <li>🚚 Free pickup & delivery</li>
                  </ul>
                </div>
                <div className="pdp-warranty__footer">
                  <b>Đ449</b>
                  <button>Select</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Additional information */}
        <section className="card pdp-additional">
          <h3 className="section-title">Additional Information</h3>
          {[
            'Free 7 day returns',
            'Product as Described',
            'Delivery by Noon',
            'Highly rated',
            'Global Shipping',
            'Warranty',
            'Great Recent',
            'Sold by',
          ].map((label) => (
            <button key={label} className="pdp-additional__row">
              <span className="pdp-additional__icon">🔹</span>
              {label}
              <ChevronRight size={16} color="#101628" />
            </button>
          ))}
        </section>

        {/* Seller widget */}
        <section className="card pdp-seller">
          <div className="pdp-seller__head">
            <span className="pdp-seller__logo">🏪</span>
            <div className="pdp-seller__info">
              <button className="pdp-seller__name">
                Sold by <b>Anker UAE Inc.</b> <ChevronRight size={14} color="#101628" />
              </button>
              <div className="pdp-seller__stats">
                <span className="pdp-seller__stat">★ 4.3 (128)</span>
                <span className="pdp-seller__stat pdp-seller__stat--positive">
                  <b>74% Positive</b> Seller Ratings
                </span>
              </div>
            </div>
          </div>
          <div className="pdp-seller__tags">
            {['Low Return Seller', 'Great Recent Ratings', 'Partner Since 5+ Years', 'Item as Described 100%'].map(
              (tag) => (
                <span key={tag} className="pdp-seller__tag">
                  {tag}
                </span>
              ),
            )}
          </div>
          <p className="pdp-seller__subtitle">This is a placeholder for brands to place subtitile</p>
          <button className="pdp-seller__offers">
            🏪 5 offers from other sellers from <b>Đ649</b>
            <ChevronRight size={16} color="#101628" />
          </button>
        </section>

        {/* Ratings & Reviews — entry point #1 into the image-first view */}
        <section className="card pdp-reviews">
          <div className="pdp-reviews__block">
            <h3 className="section-title">Ratings &amp; Reviews</h3>
            <div className="pdp-reviews__score-row">
              <span className="pdp-reviews__score">{product.avgRating}</span>
              <Stars rating={product.avgRating} size={22} />
            </div>
            <p className="pdp-reviews__source">
              Avg. rating based on {product.totalReviews} reviews from trusted sources <InfoIcon size={14} />
            </p>
          </div>

          <AISummary sparkleSrc="/assets/pdp-ai-sparkle.svg" showChevron />

          <PhotoReviews source="pdp" />

          <div className="pdp-reviews__top">
            <h3 className="section-title">Top Reviews ({product.totalReviews})</h3>
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} source="pdp" />
            ))}
            <div className="pdp-reviews__all">
              <hr />
              <button onClick={() => navigate('/reviews')}>
                All customer reviews <ChevronRight size={12} color="#0057ff" />
              </button>
            </div>
          </div>
        </section>

        {/* Similar products */}
        <section className="card pdp-similar">
          <h3 className="section-title">Similar Products</h3>
          <div className="h-scroll pdp-similar__row">
            {[1, 2, 3].map((i) => (
              <div key={i} className="pdp-similar__card">
                {/* the cropped design asset already contains the heart / Ad / + controls */}
                <div className="pdp-similar__img-wrap">
                  <span className="pdp-similar__bestseller">Best Seller</span>
                  <img src="/assets/similar-airpods.png" alt="Apple Airpods Pro 2" />
                </div>
                <p className="pdp-similar__name">Apple Airpods Pro 2 Wireless Earbuds</p>
                <span className="pdp-similar__rating">★ 4.3 (128)</span>
                <p className="pdp-similar__price">
                  <b>Đ899</b> <s>1399</s> <span>33%</span>
                </p>
                <span className="pdp-similar__lowest">🔻 Lowest price in 30..</span>
                <span className="pdp-similar__express">
                  <i>express</i> Today
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <AtcBar />
    </div>
  )
}
