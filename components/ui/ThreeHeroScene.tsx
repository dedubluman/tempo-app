"use client"

import { useEffect, useRef } from "react"
import { useReducedMotion, useScroll, useTransform } from "framer-motion"
import * as THREE from "three"

export default function ThreeHeroScene() {
  const prefersReducedMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll()
  const cameraZ = useTransform(scrollYProgress, [0, 0.4], [5, 9])
  const extraRotY = useTransform(scrollYProgress, [0, 0.4], [0, Math.PI * 0.5])

  useEffect(() => {
    if (prefersReducedMotion) return
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 100)
    camera.position.z = 5

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.domElement.style.position = "absolute"
    renderer.domElement.style.inset = "0"
    renderer.domElement.style.pointerEvents = "none"
    renderer.domElement.style.zIndex = "0"
    container.appendChild(renderer.domElement)

    const geometry = new THREE.TorusKnotGeometry(1, 0.3, 200, 16, 2, 3)
    const material = new THREE.MeshPhysicalMaterial({
      roughness: 0.1,
      metalness: 0.3,
      transmission: 0.9,
      iridescence: 1.0,
      iridescenceIOR: 1.5,
      color: new THREE.Color("#0e1a33"),
      envMapIntensity: 1.5,
    })
    const torusKnot = new THREE.Mesh(geometry, material)
    scene.add(torusKnot)

    const blueLight = new THREE.DirectionalLight("#00b4d8", 4)
    blueLight.position.set(-3, 3, 2)
    scene.add(blueLight)

    const purpleLight = new THREE.PointLight("#7c3aed", 3, 30)
    purpleLight.position.set(3, -2, 1)
    scene.add(purpleLight)

    const rimLight = new THREE.DirectionalLight("#ffffff", 0.8)
    rimLight.position.set(0, 0, -3)
    scene.add(rimLight)

    const ambientLight = new THREE.AmbientLight("#050d1d", 0.3)
    scene.add(ambientLight)

    let rafId: number
    let paused = false
    const clock = new THREE.Clock()

    function animate() {
      if (paused) return
      rafId = requestAnimationFrame(animate)
      const time = clock.getElapsedTime()
      camera.position.x = Math.sin(time * 0.4) * 0.08
      camera.position.y = Math.cos(time * 0.3) * 0.05
      camera.position.z = cameraZ.get()
      torusKnot.rotation.x += 0.004
      torusKnot.rotation.y += 0.007 + extraRotY.get() * 0.001
      renderer.render(scene, camera)
    }
    animate()

    function handleVisibilityChange() {
      if (document.hidden) {
        paused = true
        cancelAnimationFrame(rafId)
      } else {
        paused = false
        animate()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    function handleResize() {
      if (!container) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener("resize", handleResize)

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("resize", handleResize)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [prefersReducedMotion, cameraZ, extraRotY])

  if (prefersReducedMotion) return null

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0"
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    />
  )
}
