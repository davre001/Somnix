'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface ParticleWaveProps {
  className?: string;
}

const ParticleWave: React.FC<ParticleWaveProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    particles: THREE.Points;
    particleMaterial: THREE.ShaderMaterial;
    animationId: number | null;
    mouse: THREE.Vector2;
    targetMouse: THREE.Vector2;
  } | null>(null);

  const particleVertex = `
    attribute float scale;
    uniform float uTime;
    varying float vElevation;

    void main() {
      vec3 p = position;
      
      // Multi-frequency wave formula
      float elevation = sin(p.x * 0.15 + uTime * 1.2) * 2.5 
                      + cos(p.z * 0.15 + uTime * 0.9) * 2.5
                      + sin((p.x + p.z) * 0.1 + uTime * 0.7) * 1.2;
      p.y += elevation;
      vElevation = elevation;

      vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
      
      // Calculate point size with distance attenuation
      float pSize = (scale * 55.0) / -mvPosition.z;
      gl_PointSize = clamp(pSize, 2.5, 18.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const particleFragment = `
    uniform vec3 uColor;
    varying float vElevation;

    void main() {
      // Circular glowing particle mask
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if (dist > 0.5) discard;

      // Soft circular gradient glow
      float strength = smoothstep(0.5, 0.05, dist);
      
      // Crest glow on wave peaks
      float brightness = 0.6 + clamp(vElevation * 0.1, -0.2, 0.4);
      vec3 finalColor = uColor * brightness;
      
      gl_FragColor = vec4(finalColor, strength * 0.85);
    }
  `;

  const initScene = () => {
    if (!canvasRef.current || typeof window === 'undefined') return;

    const canvas = canvasRef.current;
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const aspectRatio = winWidth / winHeight;

    // Camera looking down at an angle over the vast particle ocean
    const camera = new THREE.PerspectiveCamera(65, aspectRatio, 0.1, 1000);
    camera.position.set(0, 18, 38);

    // Scene
    const scene = new THREE.Scene();

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(winWidth, winHeight);
    renderer.setClearColor(0x050507, 1);

    // Particles Grid setup (130 x 130 = 16,900 points)
    const gap = 0.95;
    const amountX = 130;
    const amountY = 130;
    const particleNum = amountX * amountY;
    const particlePositions = new Float32Array(particleNum * 3);
    const particleScales = new Float32Array(particleNum);
    
    let i = 0;
    let j = 0;
    for (let ix = 0; ix < amountX; ix++) {
      for (let iy = 0; iy < amountY; iy++) {
        particlePositions[i] = ix * gap - ((amountX * gap) / 2);
        particlePositions[i + 1] = 0;
        particlePositions[i + 2] = iy * gap - ((amountY * gap) / 2);
        
        // Slightly random scale variation for natural starry shimmer
        particleScales[j] = 0.8 + Math.random() * 0.5;
        i += 3;
        j++;
      }
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('scale', new THREE.BufferAttribute(particleScales, 1));

    const particleMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Vector3(0.85, 0.92, 1.0) } // Crisp bright luminous white-cyan particles
      }
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    const mouse = new THREE.Vector2(0, 0);
    const targetMouse = new THREE.Vector2(0, 0);

    sceneRef.current = {
      scene,
      camera,
      renderer,
      particles,
      particleMaterial,
      animationId: null,
      mouse,
      targetMouse
    };
  };

  const animate = () => {
    if (!sceneRef.current) return;

    const { scene, camera, renderer, particleMaterial, mouse, targetMouse } = sceneRef.current;
    
    // Smooth time increment
    particleMaterial.uniforms.uTime.value += 0.025;
    
    // Smooth mouse parallax camera motion
    mouse.x += (targetMouse.x - mouse.x) * 0.05;
    mouse.y += (targetMouse.y - mouse.y) * 0.05;
    
    camera.position.x = mouse.x * 6;
    camera.position.y = 18 + mouse.y * 3;
    camera.lookAt(0, 0, 0);
    
    renderer.render(scene, camera);
    sceneRef.current.animationId = requestAnimationFrame(animate);
  };

  const handleResize = () => {
    if (!sceneRef.current || typeof window === 'undefined') return;

    const { camera, renderer } = sceneRef.current;
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    camera.aspect = winWidth / winHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(winWidth, winHeight);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!sceneRef.current || typeof window === 'undefined') return;

    sceneRef.current.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    sceneRef.current.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  };

  useEffect(() => {
    initScene();
    animate();

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      if (sceneRef.current?.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      
      if (sceneRef.current) {
        const { scene, renderer, particles } = sceneRef.current;
        scene.remove(particles);
        if (particles.geometry) particles.geometry.dispose();
        if (particles.material) {
          if (Array.isArray(particles.material)) {
            particles.material.forEach(material => material.dispose());
          } else {
            particles.material.dispose();
          }
        }
        renderer.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full pointer-events-none opacity-30 ${className}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        opacity: 0.3,
      }}
    />
  );
};

export { ParticleWave };
