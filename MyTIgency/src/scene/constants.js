export const SCENE_PHASE = {
  INTRO: 'intro',
  TRANSITIONING: 'transitioning',
  HERO: 'hero',
}

/** Altura da dobra de intro → hero, em viewports. */
export const INTRO_SCROLL_VH = 1

export function getIntroScrollDistance() {
  return Math.max(window.innerHeight * INTRO_SCROLL_VH, 1)
}

export function progressToPhase(progress) {
  if (progress <= 0.001) return SCENE_PHASE.INTRO
  if (progress >= 0.999) return SCENE_PHASE.HERO
  return SCENE_PHASE.TRANSITIONING
}

export const SHARED_ASCII_OPTIONS = {
  targetSize: 9.0,
  cameraZ: 10.5,
  rotationStrength: 0.35,
  autoRotateSpeed: 0.08,
  fitToContainer: false,
  fillScene: true,
  pointerTrail: true,
  backgroundColor: '#FAFAF8',
  foregroundColor: '#0B0B0C',
}

