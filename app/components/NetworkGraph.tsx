'use client'

import React, { useRef, forwardRef, useImperativeHandle, useMemo, useState, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { OrbitControls, Sphere, Line } from '@react-three/drei'
import * as THREE from 'three'
import axios from 'axios'

interface Chain {
  chainId: string;
  chainName: string;
  chainLogoUri: string;
  networkToken: {
    symbol: string;
  };
}

const SPHERE_RADIUS = 2.5;
const NODE_RADIUS = 2.5;
const CONNECTIONS_PER_NODE = 3;

const Globe = () => (
  <Sphere args={[SPHERE_RADIUS, 32, 32]}>
    <meshBasicMaterial color="#E84142" wireframe opacity={0.15} transparent />
  </Sphere>
)

const Node = ({ position, logoUri, isCenter = false }: { position: [number, number, number], logoUri: string, isCenter?: boolean }) => {
  const texture = useLoader(THREE.TextureLoader, logoUri)
  const { camera } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.lookAt(camera.position)
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={isCenter ? [0.8, 0.8] : [0.4, 0.4]} />
      <meshBasicMaterial map={texture} transparent opacity={0.8} side={THREE.DoubleSide} />
    </mesh>
  )
}

const Nodes = ({ chains }: { chains: Chain[] }) => {
  const avalancheChain = chains.find(chain => chain.chainName.toLowerCase().includes('avalanche'))
  const otherChains = chains.filter(chain => chain !== avalancheChain)

  return (
    <>
      {avalancheChain && (
        <Node 
          key={avalancheChain.chainId} 
          position={[0, 0, 0]} 
          logoUri={avalancheChain.chainLogoUri} 
          isCenter={true}
        />
      )}
      {otherChains.map((chain, index) => (
        <Node 
          key={chain.chainId} 
          position={generateSphericalPosition(index, otherChains.length)} 
          logoUri={chain.chainLogoUri} 
        />
      ))}
    </>
  )
}

const Links = ({ chains }: { chains: Chain[] }) => {
  const avalancheChain = chains.find(chain => chain.chainName.toLowerCase().includes('avalanche'))
  const otherChains = chains.filter(chain => chain !== avalancheChain)

  const nodePositions = useMemo(() => {
    return otherChains.map((chain, index) => {
      const position = generateSphericalPosition(index, otherChains.length)
      return { chainId: chain.chainId, position: new THREE.Vector3(...position) }
    })
  }, [otherChains])

  const links = useMemo(() => {
    const result: [THREE.Vector3, THREE.Vector3][] = []
    const centerPosition = new THREE.Vector3(0, 0, 0)

    // Connect Avalanche to all other nodes
    nodePositions.forEach(node => {
      result.push([centerPosition, node.position])
    })

    // Connect each node to its closest neighbors
    // nodePositions.forEach((node, index) => {
    //   const closestNeighbors = findClosestNeighbors(node, nodePositions, CONNECTIONS_PER_NODE)
    //   closestNeighbors.forEach(neighbor => {
    //     if (index < nodePositions.indexOf(neighbor)) {
    //       result.push([node.position, neighbor.position])
    //     }
    //   })
    // })

    return result
  }, [nodePositions])

  return (
    <>
      {links.map((link, index) => (
        <Line
          key={index}
          points={link}
          color="#E84142"
          lineWidth={1}
          opacity={0.25}
          transparent
        />
      ))}
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

const NeonBall = ({ animationState, currentTime }: { animationState: AnimationState, currentTime: number }) => {
  const { startPosition, endPosition, startTime, duration } = animationState
  const progress = Math.min((currentTime - startTime) / duration, 1)
  const position = new THREE.Vector3().lerpVectors(startPosition, endPosition, progress)

  const trailLength = 10
  const trailPositions = useMemo(() => {
    return Array.from({ length: trailLength }, (_, i) => {
      const trailProgress = Math.max(0, progress - (i + 1) * 0.03)
      const pos = new THREE.Vector3().lerpVectors(startPosition, endPosition, trailProgress)
      return pos
    })
  }, [startPosition, endPosition, progress])

  return (
    <group>
      <mesh position={position}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color="#00FFFF" />
        <pointLight color="#00FFFF" intensity={2} distance={0.15} />
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

const Scene = forwardRef<{ triggerCrossChainAnimation: (from: string, to: string) => void }, { chains: Chain[] }>(({ chains }, ref) => {
  const groupRef = useRef<THREE.Group>(null)
  const [animationStates, setAnimationStates] = useState<AnimationState[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  
  const nodePositions = useMemo(() => {
    const positions = new Map<string, THREE.Vector3>()
    const avalancheChain = chains.find(chain => chain.chainName.toLowerCase().includes('avalanche'))
    const otherChains = chains.filter(chain => chain !== avalancheChain)

    if (avalancheChain) {
      positions.set(avalancheChain.chainId, new THREE.Vector3(0, 0, 0))
    }

    otherChains.forEach((chain, index) => {
      const position = new THREE.Vector3(...generateSphericalPosition(index, otherChains.length))
      positions.set(chain.chainId, position)
    })

    return positions
  }, [chains])

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
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0005
    }
    setCurrentTime(prev => prev + delta)

    setAnimationStates(prev => 
      prev.filter(state => currentTime - state.startTime < state.duration)
    )
  })

  useImperativeHandle(ref, () => ({
    triggerCrossChainAnimation
  }))

  return (
    <group ref={groupRef}>
      <Globe />
      <Nodes chains={chains} />
      <Links chains={chains} />
      {animationStates.map(state => (
        <NeonBall key={state.id} animationState={state} currentTime={currentTime} />
      ))}
    </group>
  )
})

Scene.displayName = 'Scene'

function generateSphericalPosition(index: number, total: number): [number, number, number] {
  const phi = Math.acos(-1 + (2 * index) / total)
  const theta = Math.sqrt(total * Math.PI) * phi

  return [
    NODE_RADIUS * Math.cos(theta) * Math.sin(phi),
    NODE_RADIUS * Math.sin(theta) * Math.sin(phi),
    NODE_RADIUS * Math.cos(phi)
  ]
}

function findClosestNeighbors(node: { chainId: string, position: THREE.Vector3 }, nodes: { chainId: string, position: THREE.Vector3 }[], count: number) {
  return nodes
    .filter(n => n.chainId !== node.chainId)
    .sort((a, b) => 
      node.position.distanceTo(a.position) - node.position.distanceTo(b.position)
    )
    .slice(0, count)
}

export const NetworkGraph = forwardRef<{ triggerCrossChainAnimation: (from: string, to: string) => void }, {}>(({}, ref) => {
  const [chains, setChains] = useState<Chain[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChains = async () => {
      try {
        const response = await axios.get('https://glacier-api.avax.network/v1/chains')
        setChains(response.data.chains)
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching chain data:', error)
        setError('Failed to fetch chain data. Please try again later.')
        setIsLoading(false)
      }
    }

    fetchChains()
  }, [])

  if (isLoading) {
    return <div className="w-full h-full flex items-center justify-center">Loading...</div>
  }

  if (error) {
    return <div className="w-full h-full flex items-center justify-center text-red-500">{error}</div>
  }

  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Scene ref={ref} chains={chains} />
        <OrbitControls enablePan={false} enableZoom={false} />
      </Canvas>
    </div>
  )
})

NetworkGraph.displayName = 'NetworkGraph'

