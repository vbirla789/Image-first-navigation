interface StarsProps {
  rating: number
  size?: 16 | 22 | 24
}

/** Row of 5 rating stars, filled according to `rating`. */
export default function Stars({ rating, size = 16 }: StarsProps) {
  const full = size === 24 ? '/assets/star-24.svg' : size === 22 ? '/assets/star-22.svg' : '/assets/star-16.svg'
  const empty = size === 22 ? '/assets/star-22-empty.svg' : '/assets/star-16-empty.svg'
  return (
    <div className="stars-row" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <img key={i} src={i <= Math.round(rating) ? full : size === 24 ? full : empty} width={size} height={size} alt="" />
      ))}
    </div>
  )
}
