import { onMounted, onUnmounted } from 'vue'

const DRAG_THRESHOLD = 5

/**
 * Returns the nearest ancestor that can scroll sideways.
 * Only elements whose overflow-x is scrollable count, so fixed game layers
 * (`.game-stage`, `.game-shell`) never become drag targets.
 */
function findHorizontalScroller(target: EventTarget | null): HTMLElement | null {
  let node = target instanceof Element ? target : null
  while (node) {
    if (node.scrollWidth - node.clientWidth > 1) {
      const overflowX = getComputedStyle(node).overflowX
      if (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay')
        return node as HTMLElement
    }
    node = node.parentElement
  }
  return null
}

/**
 * H5 only: lets mouse/trackpad users drag a horizontal strip sideways.
 * Touch devices already scroll natively; the native scrollbar is hidden by
 * CSS, so this is the pointer fallback for desktop browsers.
 */
export function useHorizontalDragScroll(): void {
  // #ifdef H5
  let scroller: HTMLElement | null = null
  let startX = 0
  let startScrollLeft = 0
  let moved = false
  let blockClick = false

  function onPointerDown(event: PointerEvent): void {
    blockClick = false
    if (event.pointerType !== 'mouse' || event.button !== 0)
      return
    scroller = findHorizontalScroller(event.target)
    if (!scroller)
      return
    startX = event.clientX
    startScrollLeft = scroller.scrollLeft
    moved = false
  }

  function onPointerMove(event: PointerEvent): void {
    if (!scroller)
      return
    const offset = event.clientX - startX
    if (!moved && Math.abs(offset) < DRAG_THRESHOLD)
      return
    moved = true
    event.preventDefault()
    scroller.scrollLeft = startScrollLeft - offset
  }

  function onPointerUp(): void {
    if (scroller && moved)
      blockClick = true
    scroller = null
    moved = false
  }

  function onClickCapture(event: MouseEvent): void {
    if (!blockClick)
      return
    blockClick = false
    event.preventDefault()
    event.stopPropagation()
  }

  onMounted(() => {
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('click', onClickCapture, true)
  })

  onUnmounted(() => {
    window.removeEventListener('pointerdown', onPointerDown, true)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
    window.removeEventListener('click', onClickCapture, true)
  })
  // #endif
}
