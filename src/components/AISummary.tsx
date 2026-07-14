import { aiHighlights, product } from '../data/product'
import './AISummary.css'

interface AISummaryProps {
  sparkleSrc?: string
  showChevron?: boolean
}

export default function AISummary({ sparkleSrc = '/assets/ai-sparkle.svg', showChevron = false }: AISummaryProps) {
  return (
    <button className="ai-summary" type="button">
      <div className="ai-summary__title">
        <span className="ai-summary__gradient-text">
          {product.totalReviews} reviews, summary by noon AI
        </span>
        <img src={sparkleSrc} width={13} height={13} alt="" />
        {showChevron && <img className="ai-summary__chevron" src="/assets/chevron-14.svg" width={14} height={14} alt="" />}
      </div>
      <div className="ai-summary__details">
        {aiHighlights.map((text, i) => (
          <div key={i} className="ai-summary__row">
            <span className="ai-summary__bullet" />
            <p>{text}</p>
          </div>
        ))}
      </div>
    </button>
  )
}
