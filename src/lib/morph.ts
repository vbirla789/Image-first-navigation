import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Shared-element morph between the review photos (PDP/PRP) and the
 * image-first view, built on the View Transitions API.
 *
 * Exactly one element per document may carry MORPH_NAME at snapshot
 * time, so we remember which thumbnail was tapped (and the page it
 * lives on) to re-apply the name for the reverse morph.
 */
export const MORPH_NAME = 'review-photo'

interface MorphSource {
  key: string
  path: string
}

const STORAGE_KEY = 'morph-source'

export function setMorphSource(key: string, path?: string): void {
  const source: MorphSource = {
    key,
    path: path ?? window.location.pathname + window.location.search,
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(source))
}

export function getMorphSource(): MorphSource | null {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as MorphSource
  } catch {
    return null
  }
}

/**
 * Tag `el` with the morph name, clearing it from every other element first.
 * Duplicate view-transition-names abort the whole transition, so the name
 * must be claimed exclusively before navigating.
 */
export function claimMorph(el: HTMLElement): void {
  document.querySelectorAll<HTMLElement>('[style]').forEach((node) => {
    if (node !== el && node.style.viewTransitionName === MORPH_NAME) {
      node.style.viewTransitionName = ''
    }
  })
  el.style.viewTransitionName = MORPH_NAME
}

/**
 * On a source page (PDP/PRP), scroll the morph-target thumbnail into view when
 * arriving back from the image view — the reverse morph needs its landing spot
 * on screen. Runs in a layout effect so the scroll is applied before the new
 * view-transition snapshot is captured.
 */
export function useMorphReturnScroll(): void {
  const location = useLocation()
  useLayoutEffect(() => {
    const state = location.state as { fromImageView?: boolean } | null
    if (!state?.fromImageView) return
    const key = getMorphSource()?.key
    if (!key) return
    document
      .querySelector(`[data-morph-key="${CSS.escape(key)}"]`)
      ?.scrollIntoView({ block: 'center' })
  }, [location.state])
}

/** Run a same-document state change inside a view transition when supported.
 * The state change must never be lost: if the transition can't start or is
 * aborted before invoking its callback (e.g. hidden document), apply directly. */
export function withLocalTransition(apply: () => void): void {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => {
      finished: Promise<void>
      updateCallbackDone: Promise<void>
    }
  }
  if (!doc.startViewTransition || document.visibilityState !== 'visible') {
    apply()
    return
  }
  document.documentElement.classList.add('vt-local')
  let applied = false
  const transition = doc.startViewTransition(() => {
    applied = true
    apply()
  })
  transition.updateCallbackDone.catch(() => {
    if (!applied) apply()
  })
  transition.finished
    .catch(() => {})
    .finally(() => document.documentElement.classList.remove('vt-local'))
}
