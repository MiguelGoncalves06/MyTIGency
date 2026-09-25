import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLenis } from 'lenis/react'

gsap.registerPlugin(ScrollTrigger)

const MOBILE_QUERY = '(max-width: 820px)'
const MOBILE_PEEK = 10

// Hero stays fixed for its whole lifecycle (never toggled back to static —
// that reflow was what flickered the ascii canvas). Marquee and the reveal
// panel (Services + Work + Footer) are siblings, both driven by the exact
// same scrubbed `y` value so they travel together as one visual sheet —
// sweeping up from a peeking position at the fold until Marquee reaches the
// very top, dragging the next section in with it instead of popping in once
// Hero is scrolled past. They're kept as siblings (not nested) on purpose:
// see the comment above `.reveal-panel` in App.css for why nesting Marquee
// inside the panel breaks its stacking order relative to the header.
// Marquee stays position:fixed (and so above the header) for its whole
// engaged lifetime; the panel settles into normal flow once its travel
// ends. Reduced-motion users keep the original static, in-flow marquee.
export function useHeroMarqueeReveal() {
  const lenis = useLenis()

  useLayoutEffect(() => {
    const hero = document.getElementById('top')
    const spacer = document.querySelector('.reveal-spacer')
    const panel = document.querySelector('.reveal-panel')
    const marquee = document.querySelector('.marquee')
    const marqueeSpacer = document.querySelector('.marquee-dock-spacer')
    if (!hero || !spacer || !panel || !marquee || !marqueeSpacer) return undefined

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined
    }

    const setMarqueeHeight = () => {
      document.documentElement.style.setProperty('--marquee-h', `${marquee.offsetHeight}px`)
    }
    setMarqueeHeight()
    const marqueeHeightObserver = new ResizeObserver(setMarqueeHeight)
    marqueeHeightObserver.observe(marquee)

    hero.classList.add('hero--pinned')
    spacer.classList.add('reveal-spacer--active')
    marquee.classList.add('marquee--reveal')
    marqueeSpacer.classList.add('marquee-dock-spacer--active')

    function dock() {
      document.documentElement.classList.add('marquee-docked')
      hero.classList.add('hero--hidden')
      // Drop the panel's transform (and the will-change that goes with it)
      // once it's done sweeping — it's settled at y:0 either way, this just
      // stops it being an unnecessary compositor layer/stacking context.
      gsap.set(panel, { clearProps: 'transform,willChange' })
    }

    function undock() {
      document.documentElement.classList.remove('marquee-docked')
      hero.classList.remove('hero--hidden')
      gsap.set(panel, { y: 0, willChange: 'transform' })
    }

    const ctx = gsap.context(() => {
      const peek = () => (window.matchMedia(MOBILE_QUERY).matches ? MOBILE_PEEK : marquee.offsetHeight)
      // The panel's natural (untransformed) flow position is already
      // `spacer.offsetHeight` below the fold, so the starting transform only
      // needs to make up the difference down to the desired peek position.
      // Marquee is fixed (already viewport-relative), so it starts directly
      // at the peek position with no such offset.
      const panelFromY = () => (window.innerHeight - peek()) - spacer.offsetHeight
      const marqueeFromY = () => window.innerHeight - peek()

      // will-change promotes the panel to its own compositor layer so
      // scrubbing its transform doesn't repaint the whole subtree (Services
      // cards) on every scroll frame.
      const panelTween = gsap.fromTo(
        panel,
        { y: panelFromY, willChange: 'transform' },
        { y: 0, ease: 'none' }
      )
      const marqueeTween = gsap.fromTo(marquee, { y: marqueeFromY }, { y: 0, ease: 'none' })

      ScrollTrigger.create({
        trigger: spacer,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        animation: gsap.timeline().add(panelTween, 0).add(marqueeTween, 0),
        invalidateOnRefresh: true,
        onLeave: dock,
        onEnterBack: undock,
      })
    })

    return () => {
      marqueeHeightObserver.disconnect()
      ctx.revert()
      document.documentElement.classList.remove('marquee-docked')
      hero.classList.remove('hero--pinned', 'hero--hidden')
      spacer.classList.remove('reveal-spacer--active')
      marquee.classList.remove('marquee--reveal')
      marqueeSpacer.classList.remove('marquee-dock-spacer--active')
    }
  }, [])

  useLayoutEffect(() => {
    if (!lenis) return undefined
    const onScroll = () => ScrollTrigger.update()
    lenis.on('scroll', onScroll)
    return () => lenis.off('scroll', onScroll)
  }, [lenis])
}
