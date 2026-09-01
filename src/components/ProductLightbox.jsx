import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

const SWIPE_THRESHOLD = 48

export default function ProductLightbox({ images, activeIndex, name, labels, onChange, onClose }) {
  const closeRef = useRef(null)
  const pointerStart = useRef(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previouslyFocused = document.activeElement
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft' && images.length > 1) onChange(-1)
      if (event.key === 'ArrowRight' && images.length > 1) onChange(1)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [images.length, onChange, onClose])

  const currentImage = images[activeIndex]

  const finishSwipe = (event) => {
    if (pointerStart.current == null) return
    const distance = event.clientX - pointerStart.current
    pointerStart.current = null
    if (Math.abs(distance) < SWIPE_THRESHOLD || images.length < 2) return
    onChange(distance > 0 ? -1 : 1)
  }

  return (
    <div className="product-lightbox" role="dialog" aria-modal="true" aria-label={labels.gallery} onClick={onClose}>
      <div
        className="product-lightbox__stage"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => { pointerStart.current = event.clientX }}
        onPointerUp={finishSwipe}
        onPointerCancel={() => { pointerStart.current = null }}
      >
        <img src={currentImage.public_url} alt={currentImage.alt_text || name} draggable="false"/>
      </div>

      <button ref={closeRef} className="product-lightbox__close" type="button" onClick={onClose} aria-label={labels.close}>
        <X/>
      </button>

      {images.length > 1 && <>
        <button className="product-lightbox__arrow is-prev" type="button" onClick={(event) => { event.stopPropagation(); onChange(-1) }} aria-label={labels.previous}>
          <ChevronLeft/>
        </button>
        <button className="product-lightbox__arrow is-next" type="button" onClick={(event) => { event.stopPropagation(); onChange(1) }} aria-label={labels.next}>
          <ChevronRight/>
        </button>
        <span className="product-lightbox__counter" aria-live="polite">{activeIndex + 1} / {images.length}</span>
      </>}
    </div>
  )
}
