import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

type DissolveShaderConfig = {
  color?: string
  accentColor?: string
  trigger?: HTMLElement
  opacity?: number
  origin?: 'top' | 'bottom'
  spread?: number
  speed?: number
  progressEase?: number
  reverse?: boolean
  start?: string
  end?: string
  markers?: boolean
}

type ManagedWebGLContext = WebGLRenderingContext | WebGL2RenderingContext | null

type DissolveTransitionShader = {
  setProgress: (progress: number) => void
  setOrigin: (origin: 'top' | 'bottom') => void
  resize: () => void
  destroy: () => void
}

export const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const fragmentShader = `
  uniform float uProgress;
  uniform vec2 uResolution;
  uniform vec3 uColor;
  uniform vec3 uAccentColor;
  uniform float uOpacity;
  uniform float uOrigin;
  uniform float uTime;
  uniform float uSpread;
  varying vec2 vUv;

  float Hash(vec2 p) {
    vec3 p2 = vec3(p.xy, 1.0);
    return fract(sin(dot(p2, vec3(37.1, 61.7, 12.4))) * 3758.5453123);
  }

  float noise(in vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f *= f * (3.0 - 2.0 * f);

    return mix(
      mix(Hash(i + vec2(0.0, 0.0)), Hash(i + vec2(1.0, 0.0)), f.x),
      mix(Hash(i + vec2(0.0, 1.0)), Hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    v += noise(p * 1.0) * 0.5;
    v += noise(p * 2.0) * 0.25;
    v += noise(p * 4.0) * 0.125;
    v += noise(p * 8.0) * 0.0625;
    return v;
  }

  void main() {
    float aspect = uResolution.x / uResolution.y;
    vec2 centeredUv = (vUv - 0.5) * vec2(aspect, 1.0);
    float dissolveAxis = mix(vUv.y, 1.0 - vUv.y, uOrigin);

    vec2 drift = vec2(uTime * 0.035, -uTime * 0.02);
    float macroField = fbm(vec2(centeredUv.x * 0.68, centeredUv.y * 1.08) + drift * 0.38 + vec2(8.3, 1.7));
    vec2 warp = vec2(
      fbm(centeredUv * vec2(0.92, 1.7) + drift * 0.44 + vec2(4.7, 0.9)) - 0.5,
      fbm(centeredUv * vec2(1.35, 1.08) - drift * 0.34 + vec2(1.6, 6.4)) - 0.5
    );
    vec2 cloudUv = centeredUv + warp * vec2(0.24 * aspect, 0.1) + vec2((macroField - 0.5) * 0.16 * aspect, 0.0);

    float slowCloud = fbm(cloudUv * 2.65 + drift);
    float mediumCloud = fbm(cloudUv * vec2(3.8, 2.9) - drift * 0.52 + vec2(6.1, 2.4));
    float fineGrain = fbm(cloudUv * 10.5 - drift * 1.1 + vec2(2.8, 9.2));
    float diagonalMemoryLine = sin((cloudUv.x * 1.45 + cloudUv.y * 4.4 + slowCloud * 0.9 + macroField * 0.65) * 3.14159);
    float ribbon = smoothstep(0.22, 0.92, diagonalMemoryLine * 0.5 + 0.5);

    float dissolveEdge = dissolveAxis - uProgress * 1.18;
    float cloudMass = slowCloud * 0.56 + mediumCloud * 0.24 + macroField * 0.28;
    float d = dissolveEdge + (cloudMass + fineGrain * 0.08 + ribbon * 0.1) * uSpread;

    float pixelSize = 1.0 / uResolution.y;
    float alpha = 1.0 - smoothstep(-pixelSize * 4.0, pixelSize * 58.0, d);
    float edgeGlow = 1.0 - smoothstep(0.0, 0.16, abs(d));
    float speckles = smoothstep(0.86, 0.99, fineGrain) * edgeGlow * 0.45;
    float cloudDensity = smoothstep(0.22, 0.92, cloudMass) * 0.34;
    float ribbonDensity = ribbon * edgeGlow * 0.14;
    float vignette = smoothstep(0.95, 0.22, length(centeredUv));
    vec3 color = mix(uColor, uAccentColor, clamp(edgeGlow * 0.42 + ribbon * 0.16, 0.0, 1.0));

    float cloudAlpha = alpha * (1.08 + cloudDensity + ribbonDensity + vignette * 0.08);
    gl_FragColor = vec4(color, clamp((cloudAlpha + speckles * 0.28) * uOpacity, 0.0, 1.0));
  }
`

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)

  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0.66, g: 0.33, b: 0.97 }
}

function createManagedWebGLContext(canvas: HTMLCanvasElement): ManagedWebGLContext {
  const contextAttributes = {
    alpha: true,
    antialias: false,
    powerPreference: 'low-power' as const,
    preserveDrawingBuffer: false,
  }

  return (
    (canvas.getContext('webgl2', contextAttributes) as WebGL2RenderingContext | null) ??
    (canvas.getContext('webgl', contextAttributes) as WebGLRenderingContext | null) ??
    (canvas.getContext('experimental-webgl', contextAttributes) as WebGLRenderingContext | null)
  )
}

export function initDissolveShader(
  canvas: HTMLCanvasElement,
  target: HTMLElement,
  config: DissolveShaderConfig = {},
) {
  if (!canvas.isConnected || !target.isConnected) {
    return () => {}
  }

  gsap.registerPlugin(ScrollTrigger)

  const settings = {
    color: '#faf5ff',
    accentColor: '#c084fc',
    opacity: 1,
    origin: 'top',
    spread: 0.5,
    speed: 1.1,
    progressEase: 0.08,
    reverse: false,
    start: 'top 82%',
    end: 'top 20%',
    ...config,
  }
  const triggerElement = settings.trigger ?? target
  const rgb = hexToRgb(settings.color)
  const accentRgb = hexToRgb(settings.accentColor)
  const webglContext = createManagedWebGLContext(canvas)

  if (!webglContext) {
    canvas.style.display = 'none'
    return () => {
      canvas.style.display = ''
    }
  }

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  let renderer: THREE.WebGLRenderer

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      context: webglContext,
      powerPreference: 'low-power',
    })
  } catch {
    canvas.style.display = 'none'
    return () => {
      canvas.style.display = ''
    }
  }

  renderer.setClearColor(0x000000, 0)
  const geometry = new THREE.PlaneGeometry(2, 2)
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uProgress: { value: settings.reverse ? 1.1 : 0 },
      uResolution: {
        value: new THREE.Vector2(target.offsetWidth, target.offsetHeight),
      },
      uColor: { value: new THREE.Vector3(rgb.r, rgb.g, rgb.b) },
      uAccentColor: { value: new THREE.Vector3(accentRgb.r, accentRgb.g, accentRgb.b) },
      uOpacity: { value: settings.opacity },
      uOrigin: { value: settings.origin === 'bottom' ? 1 : 0 },
      uTime: { value: 0 },
      uSpread: { value: settings.spread },
    },
    transparent: true,
  })
  const mesh = new THREE.Mesh(geometry, material)
  let frameId = 0
  let isContextLost = false
  let isInView = typeof IntersectionObserver === 'undefined'
  let isDocumentVisible = !document.hidden
  let intersectionObserver: IntersectionObserver | null = null
  let targetProgress = settings.reverse ? 1.1 : 0
  let renderedProgress = targetProgress
  let lastFrameTime = performance.now()

  scene.add(mesh)
  canvas.style.backgroundColor = 'transparent'
  canvas.style.opacity = '1'

  const shouldAnimate = () => !isContextLost && isInView && isDocumentVisible

  const render = () => {
    if (isContextLost) {
      return
    }

    material.uniforms.uProgress.value = renderedProgress
    canvas.style.opacity = '1'
    material.uniforms.uTime.value = performance.now() * 0.001
    renderer.render(scene, camera)
  }

  const resize = () => {
    const width = target.offsetWidth
    const height = target.offsetHeight

    if (!width || !height) {
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(width, height, false)
    material.uniforms.uResolution.value.set(width, height)
    render()
  }

  const handleContextLost = (event: Event) => {
    event.preventDefault()
    isContextLost = true
    canvas.style.opacity = '0'
    stopAnimation()
  }

  const startAnimation = () => {
    if (frameId || !shouldAnimate()) {
      return
    }

    frameId = window.requestAnimationFrame(animate)
  }

  function stopAnimation() {
    if (!frameId) {
      return
    }

    window.cancelAnimationFrame(frameId)
    frameId = 0
  }

  const handleVisibilityChange = () => {
    isDocumentVisible = !document.hidden

    if (shouldAnimate()) {
      startAnimation()
    } else {
      stopAnimation()
    }
  }

  const scrollTrigger = ScrollTrigger.create({
    trigger: triggerElement,
    start: settings.start,
    end: settings.end,
    scrub: 5,
    markers: settings.markers,
    onUpdate: (self) => {
      const progress = Math.min(self.progress * settings.speed, 0.8)
      targetProgress = settings.reverse ? 1 - progress : progress
      startAnimation()
    },
  })

  const animate = () => {
    frameId = 0

    if (!shouldAnimate()) {
      return
    }

    const now = performance.now()
    const deltaSeconds = Math.min((now - lastFrameTime) / 1000, 0.1)
    const progressDelta = targetProgress - renderedProgress
    const easeAmount = 1 - Math.pow(1 - settings.progressEase, deltaSeconds * 60)

    lastFrameTime = now

    if (Math.abs(progressDelta) <= 0.0005) {
      renderedProgress = targetProgress
    } else {
      renderedProgress += progressDelta * easeAmount
    }

    render()

    if (Math.abs(targetProgress - renderedProgress) > 0.0005) {
      startAnimation()
    } else if (scrollTrigger.isActive) {
      startAnimation()
    }
  }

  resize()
  if (typeof IntersectionObserver !== 'undefined') {
    intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isInView = Boolean(entry?.isIntersecting)

        if (shouldAnimate()) {
          startAnimation()
        } else {
          stopAnimation()
        }
      },
      { rootMargin: '240px 0px' },
    )
    intersectionObserver.observe(triggerElement)
  }
  startAnimation()
  window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  canvas.addEventListener('webglcontextlost', handleContextLost)

  return () => {
    window.cancelAnimationFrame(frameId)
    window.removeEventListener('resize', resize)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    canvas.removeEventListener('webglcontextlost', handleContextLost)
    intersectionObserver?.disconnect()
    scrollTrigger.kill()
    geometry.dispose()
    material.dispose()
    canvas.style.opacity = ''
    canvas.style.backgroundColor = ''
    renderer.dispose()
  }
}

export function initDissolveTransitionShader(
  canvas: HTMLCanvasElement,
  target: HTMLElement,
  config: Pick<
    DissolveShaderConfig,
    'accentColor' | 'color' | 'opacity' | 'origin' | 'spread'
  > = {},
): DissolveTransitionShader | null {
  if (!canvas.isConnected || !target.isConnected) {
    return null
  }

  const settings = {
    color: '#e9d5ff',
    accentColor: '#a855f7',
    opacity: 1.12,
    origin: 'top' as const,
    spread: 0.42,
    ...config,
  }
  const rgb = hexToRgb(settings.color)
  const accentRgb = hexToRgb(settings.accentColor)
  const webglContext = createManagedWebGLContext(canvas)

  if (!webglContext) {
    canvas.style.display = 'none'
    return {
      setProgress: () => {},
      setOrigin: () => {},
      resize: () => {},
      destroy: () => {
        canvas.style.display = ''
      },
    }
  }

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  let renderer: THREE.WebGLRenderer

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      context: webglContext,
      powerPreference: 'low-power',
    })
  } catch {
    canvas.style.display = 'none'
    return {
      setProgress: () => {},
      setOrigin: () => {},
      resize: () => {},
      destroy: () => {
        canvas.style.display = ''
      },
    }
  }

  renderer.setClearColor(0x000000, 0)
  const geometry = new THREE.PlaneGeometry(2, 2)
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uProgress: { value: 0 },
      uResolution: {
        value: new THREE.Vector2(target.offsetWidth, target.offsetHeight),
      },
      uColor: { value: new THREE.Vector3(rgb.r, rgb.g, rgb.b) },
      uAccentColor: { value: new THREE.Vector3(accentRgb.r, accentRgb.g, accentRgb.b) },
      uOpacity: { value: settings.opacity },
      uOrigin: { value: settings.origin === 'bottom' ? 1 : 0 },
      uTime: { value: 0 },
      uSpread: { value: settings.spread },
    },
    transparent: true,
  })
  const mesh = new THREE.Mesh(geometry, material)
  let isContextLost = false

  scene.add(mesh)
  canvas.style.backgroundColor = 'transparent'
  canvas.style.opacity = '1'

  const render = () => {
    if (isContextLost) {
      return
    }

    material.uniforms.uTime.value = performance.now() * 0.001
    renderer.render(scene, camera)
  }

  const resize = () => {
    const width = target.offsetWidth
    const height = target.offsetHeight

    if (!width || !height) {
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(width, height, false)
    material.uniforms.uResolution.value.set(width, height)
    render()
  }

  const handleContextLost = (event: Event) => {
    event.preventDefault()
    isContextLost = true
    canvas.style.opacity = '0'
  }

  resize()
  window.addEventListener('resize', resize)
  canvas.addEventListener('webglcontextlost', handleContextLost)

  return {
    setProgress: (progress: number) => {
      material.uniforms.uProgress.value = progress
      render()
    },
    setOrigin: (origin: 'top' | 'bottom') => {
      material.uniforms.uOrigin.value = origin === 'bottom' ? 1 : 0
      render()
    },
    resize,
    destroy: () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      geometry.dispose()
      material.dispose()
      canvas.style.opacity = ''
      canvas.style.backgroundColor = ''
      renderer.dispose()
    },
  }
}
