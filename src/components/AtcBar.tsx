import './AtcBar.css'

/** Sticky bottom Buy now / Add to cart bar. */
export default function AtcBar() {
  return (
    <div className="atc-bar">
      <div className="atc-bar__qty">
        <span className="atc-bar__qty-label">QTY</span>
        <span className="atc-bar__qty-value">1</span>
      </div>
      <button className="atc-bar__buy">Buy now</button>
      <button className="atc-bar__add">Add to cart</button>
    </div>
  )
}
