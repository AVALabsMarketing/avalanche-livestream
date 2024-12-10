'use client'

import React, { useRef, forwardRef, useImperativeHandle, useMemo, useState, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { OrbitControls, Sphere, Line } from '@react-three/drei'
import * as THREE from 'three'
import { NetworkData } from '../../utils/api'

interface NetworkGraphProps {
  data: NetworkData;
}

const Globe = () => (
  <Sphere args={[2, 64, 64]}>
    <meshBasicMaterial color="#E84142" wireframe opacity={0.15} transparent />
  </Sphere>
)

const Node = ({ position, rotationY }: { position: [number, number, number], rotationY: number }) => {
  const texture = useLoader(THREE.TextureLoader, '/dexalot.png')
  const { camera } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)
  const rotatedPosition = useMemo(() => {
    const vec = new THREE.Vector3(...position)
    vec.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY)
    return vec
  }, [position, rotationY])

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(rotatedPosition)
      meshRef.current.quaternion.copy(camera.quaternion)
    }
  })
  
  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[0.5, 0.5]} />
      <meshBasicMaterial map={texture} transparent opacity={0.8} side={THREE.DoubleSide} />
    </mesh>
  )
}

const Nodes = ({ nodes, rotationY }: { nodes: NetworkData['nodes'], rotationY: number }) => (
  <>
    {nodes.map((node) => (
      <Node key={node.id} position={node.position} rotationY={rotationY} />
    ))}
  </>
)

const Links = ({ links, nodes, rotationY }: { links: NetworkData['links'], nodes: NetworkData['nodes'], rotationY: number }) => {
  const nodeMap = useMemo(() => new Map(nodes.map(node => {
    const vec = new THREE.Vector3(...node.position)
    vec.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY)
    return [node.id, vec]
  })), [nodes, rotationY])

  return (
    <>
      {links.map((link, index) => {
        const start = nodeMap.get(link.source)
        const end = nodeMap.get(link.target)
        if (!start || !end) return null

        return (
          <Line
            key={index}
            points={[start, end]}
            color="#E84142"
            lineWidth={1}
            opacity={0.5}
            transparent
          />
        )
      })}
    </>
  )
}

interface AnimationState {
  id: string;
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  startTime: number;
  duration: number;
}

const NeonBall = ({ animationState, currentTime, rotationY }: { animationState: AnimationState, currentTime: number, rotationY: number }) => {
  const { startPosition, endPosition, startTime, duration } = animationState
  const progress = Math.min((currentTime - startTime) / duration, 1)
  const position = new THREE.Vector3().lerpVectors(startPosition, endPosition, progress)
  position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY)

  const trailLength = 10
  const trailPositions = useMemo(() => {
    return Array.from({ length: trailLength }, (_, i) => {
      const trailProgress = Math.max(0, progress - (i + 1) * 0.03)
      const pos = new THREE.Vector3().lerpVectors(startPosition, endPosition, trailProgress)
      pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY)
      return pos
    })
  }, [startPosition, endPosition, progress, rotationY])

  return (
    <group>
      <mesh position={position}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#00FFFF" />
        <pointLight color="#00FFFF" intensity={2} distance={0.25} />
      </mesh>
      {trailPositions.map((pos, index) => (
        <mesh key={index} position={pos}>
          <sphereGeometry args={[0.03 * (1 - index / trailLength), 8, 8]} />
          <meshBasicMaterial color="#00FFFF" opacity={(1 - index / trailLength) * 0.5} transparent />
        </mesh>
      ))}
    </group>
  )
}

const Scene = forwardRef<{ triggerCrossChainAnimation: (from: string, to: string) => void }, NetworkData>(({ nodes, links }, ref) => {
  const groupRef = useRef<THREE.Group>(null)
  const [animationStates, setAnimationStates] = useState<AnimationState[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [rotationY, setRotationY] = useState(0)
  const nodePositions = useMemo(() => new Map(nodes.map(node => [node.id, new THREE.Vector3(...node.position)])), [nodes])

  const triggerCrossChainAnimation = useCallback((from: string, to: string) => {
    if (from === to) return;
    const startPosition = nodePositions.get(from)
    const endPosition = nodePositions.get(to)
    if (startPosition && endPosition) {
      const distance = startPosition.distanceTo(endPosition)
      const duration = distance * 0.5 // Adjust this multiplier to change animation speed
      setAnimationStates(prev => [
        ...prev,
        { 
          id: `${from}-${to}-${Date.now()}`, 
          startPosition: startPosition.clone(), 
          endPosition: endPosition.clone(), 
          startTime: currentTime,
          duration
        }
      ])
    }
  }, [nodePositions, currentTime])

  useFrame((_, delta) => {
    setRotationY(prev => prev + 0.0005)
    setCurrentTime(prev => prev + delta)

    setAnimationStates(prev => 
      prev.filter(state => currentTime - state.startTime < state.duration)
    )
  })

  useImperativeHandle(ref, () => ({
    triggerCrossChainAnimation
  }))

  return (
    <group ref={groupRef} rotation-y={rotationY}>
      <Globe />
      <Nodes nodes={nodes} rotationY={rotationY} />
      <Links links={links} nodes={nodes} rotationY={rotationY} />
      {animationStates.map(state => (
        <NeonBall key={state.id} animationState={state} currentTime={currentTime} rotationY={rotationY} />
      ))}
    </group>
  )
})

Scene.displayName = 'Scene'

export const NetworkGraph = forwardRef<{ triggerCrossChainAnimation: (from: string, to: string) => void }, NetworkGraphProps>(({ data }, ref) => {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Scene ref={ref} {...data} />
        <OrbitControls enablePan={false} enableZoom={false} />
      </Canvas>
    </div>
  )
})

NetworkGraph.displayName = 'NetworkGraph'

