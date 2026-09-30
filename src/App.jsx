import { useCallback, useEffect, useRef, useState } from 'react'

import './App.css'

const PREFETCH_PX = 320

function imageUrlFor(card) {
  return (
    card?.image_uris?.normal ??
    card?.card_faces?.[0]?.image_uris?.normal ??
    null
  )
}

function App() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const sentinelRef = useRef(null)
  const loadingRef = useRef(false)
  const errorRef = useRef(null)

  const drawCard = useCallback(async () => {
    if (loadingRef.current || errorRef.current) return

    loadingRef.current = true
    setLoading(true)

    try {
      const response = await fetch('https://api.scryfall.com/cards/random')

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()

      setCards((current) => [
        ...current,
        { drawKey: crypto.randomUUID(), card: data },
      ])
    } catch (err) {
      console.error('Fetch failed:', err)
      errorRef.current = err
      setError('Could not draw the next card.')
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          drawCard()
        }
      },
      { rootMargin: `0px 0px ${PREFETCH_PX}px 0px` },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [drawCard])

  // The observer only fires when the sentinel enters the prefetch zone.
  // After a card is appended the next one may already be inside that zone,
  // so check again once the request settles.
  useEffect(() => {
    if (loading || error) return

    const sentinel = sentinelRef.current
    if (!sentinel) return

    const { top } = sentinel.getBoundingClientRect()
    if (top <= window.innerHeight + PREFETCH_PX) {
      drawCard()
    }
  }, [cards, loading, error, drawCard])

  function retry() {
    errorRef.current = null
    setError(null)
    drawCard()
  }

  return (
    <div className="feed">
      {cards.map(({ drawKey, card }) => {
        const imageUrl = imageUrlFor(card)

        return (
          <section key={drawKey} className="card-slot">
            {imageUrl ? (
              <img src={imageUrl} alt={card.name} />
            ) : (
              <p className="card-fallback">{card.name}</p>
            )}
          </section>
        )
      })}

      <div ref={sentinelRef} className="sentinel">
        {loading && <p>Drawing a card…</p>}
        {error && (
          <button type="button" onClick={retry}>
            {error} Try again
          </button>
        )}
      </div>
    </div>
  )
}

export default App
