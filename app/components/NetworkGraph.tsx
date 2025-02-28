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
const NODE_RADIUS = 4.0;
const CONNECTIONS_PER_NODE = 3;

const Globe = () => (
  <Sphere args={[SPHERE_RADIUS, 32, 32]}>
    <meshBasicMaterial color="#E84142" wireframe opacity={0.1} transparent />
  </Sphere>
)

const Node = ({ position, logoUri, isCenter = false }: { position: [number, number, number], logoUri: string, isCenter?: boolean }) => {
  const [hasError, setHasError] = useState(false);
  const texture = useLoader(THREE.TextureLoader, logoUri, 
    undefined, 
    (error) => {
      console.error('Error loading texture:', error);
      setHasError(true);
    }
  );
  const { camera } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);

  // Create a fallback texture if the image fails to load
  const fallbackTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#E84142';
      context.fillRect(0, 0, 64, 64);
      context.fillStyle = '#FFFFFF';
      context.font = '32px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('?', 32, 32);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.lookAt(camera.position);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={isCenter ? [1.0, 1.0] : [0.55, 0.55]} />
      <meshBasicMaterial 
        map={hasError ? fallbackTexture : texture} 
        transparent 
        opacity={0.8} 
        side={THREE.DoubleSide} 
      />
    </mesh>
  );
};

const Nodes = ({ chains }: { chains: Chain[] }) => {
  const avalancheChain = chains.find(chain => chain.chainName.toLowerCase().includes('avalanche'))
  
  // Limit the number of displayed chains to reduce clutter
  const MAX_DISPLAYED_CHAINS = 100;
  const otherChains = chains
    .filter(chain => chain !== avalancheChain)
    .slice(0, MAX_DISPLAYED_CHAINS);

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

    // Connect Avalanche to only a subset of nodes (e.g., every 3rd node)
    nodePositions.forEach((node, index) => {
      // Connect to Avalanche only if it's every 3rd node or one of the first 5 nodes
      if (index % 3 === 0 || index < 5) {
        result.push([centerPosition, node.position])
      }
    })

    // Connect each node to fewer neighbors
    nodePositions.forEach((node, index) => {
      // Find closest neighbors but limit the number
      const closestNeighbors = findClosestNeighbors(node, nodePositions, CONNECTIONS_PER_NODE)
      closestNeighbors.forEach(neighbor => {
        if (index < nodePositions.indexOf(neighbor)) {
          result.push([node.position, neighbor.position])
        }
      })
    })

    return result
  }, [nodePositions])

  return (
    <>
      {links.map((link, index) => (
        <Line
          key={index}
          points={link}
          color="#E84142"
          lineWidth={0.8}
          opacity={0.1}
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
        <pointLight color="#00FFFF" intensity={2} distance={0.1} />
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
    
    // Limit the number of displayed chains to reduce clutter
    const MAX_DISPLAYED_CHAINS = 100;
    const otherChains = chains
      .filter(chain => chain !== avalancheChain)
      .slice(0, MAX_DISPLAYED_CHAINS);

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
      groupRef.current.rotation.y += 0.0007
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
      {/* <Globe /> */}
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
        // Fetch chains data (no pagination needed)
        const chainsResponse = await axios.get('https://glacier-api.avax.network/v1/chains');
        console.log('Chains API response:', chainsResponse);
        
        // Process chains API data
        const mainnetChains = chainsResponse.data.chains
          .filter((chain: any) => !chain.isTestnet)
          .map((chain: any) => ({
            chainId: chain.chainId,
            chainName: chain.chainName,
            chainLogoUri: chain.chainLogoUri,
            networkToken: {
              symbol: chain.networkToken?.symbol || chain.chainName
            }
          }));
        
        // Track chain names to avoid duplicates
        const existingChainNames = new Set(mainnetChains.map((chain: Chain) => chain.chainName.toLowerCase()));
        
        // Fetch all blockchains with pagination
        let allBlockchains: any[] = [];
        let nextPageToken: string | null = null;
        let pageCount = 0;
        const maxPages = 5; // Limit to 5 pages to prevent too many requests
        
        do {
          // Build URL with pagination token if available
          let url = 'https://glacier-api.avax.network/v1/networks/mainnet/blockchains';
          if (nextPageToken) {
            url += `?pageToken=${encodeURIComponent(nextPageToken)}`;
          }
          
          const blockchainsResponse = await axios.get(url);
          console.log(`Blockchains API page ${pageCount + 1} response:`, blockchainsResponse);
          
          // Add blockchains from this page to our collection
          if (blockchainsResponse.data.blockchains && Array.isArray(blockchainsResponse.data.blockchains)) {
            allBlockchains = [...allBlockchains, ...blockchainsResponse.data.blockchains];
          }
          
          // Get next page token
          nextPageToken = blockchainsResponse.data.nextPageToken || null;
          pageCount++;
          
          // Break if we've reached the maximum number of pages
          if (pageCount >= maxPages) {
            console.log(`Reached maximum page count (${maxPages}), stopping pagination`);
            break;
          }
        } while (nextPageToken);
        
        console.log(`Total blockchains fetched: ${allBlockchains.length}`);
        
        // Deduplicate blockchains by ID
        const blockchainIds = new Set();
        allBlockchains = allBlockchains.filter(blockchain => {
          if (blockchainIds.has(blockchain.blockchainId)) {
            return false;
          }
          blockchainIds.add(blockchain.blockchainId);
          return true;
        });
        
        console.log(`Total unique blockchains: ${allBlockchains.length}`);
        
        // Deduplicate blockchains by name as well
        const blockchainNames = new Set();
        allBlockchains = allBlockchains.filter(blockchain => {
          if (!blockchain.blockchainName) return false;
          
          const lowerCaseName = blockchain.blockchainName.toLowerCase();
          if (blockchainNames.has(lowerCaseName)) {
            return false;
          }
          blockchainNames.add(lowerCaseName);
          return true;
        });
        
        console.log(`Total unique blockchains after name deduplication: ${allBlockchains.length}`);
        
        // Process blockchains API data
        const additionalBlockchains = allBlockchains
          .filter((blockchain: any) => !existingChainNames.has(blockchain.blockchainName.toLowerCase()))
          .map((blockchain: any, index: number) => {
            // Get the blockchain name or a default
            const name = blockchain.blockchainName || 'Unknown';
            
            // Generate a unique color based on the blockchain name or index
            const colors = [
              '#E84142', // Avalanche red
              '#3498db', // Blue
              '#2ecc71', // Green
              '#f1c40f', // Yellow
              '#9b59b6', // Purple
              '#e67e22', // Orange
              '#1abc9c', // Turquoise
              '#e74c3c', // Red
              '#34495e', // Dark blue
              '#16a085', // Green blue
              '#f39c12', // Orange
              '#8e44ad', // Purple
              '#d35400', // Dark orange
              '#2980b9', // Blue
              '#27ae60', // Green
            ];
            
            // Use a hash of the blockchain name to pick a consistent color, or fall back to index
            const colorIndex = name ? 
              name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % colors.length :
              index % colors.length;
            
            const backgroundColor = colors[colorIndex];
            
            // Create a data URL for an SVG image with the blockchain name
            // For longer names, use smaller font and truncate if necessary
            let displayText = name;
            let fontSize = 70;
            let yPosition = 85;
            
            if (name.length > 1) {
              if (name.length <= 2) {
                fontSize = 60;
                displayText = name;
              } else if (name.length <= 4) {
                fontSize = 40;
                displayText = name;
              } else if (name.length <= 6) {
                fontSize = 30;
                displayText = name;
              } else {
                // For longer names, split into two lines if possible
                if (name.length <= 12) {
                  // Find a good split point (space, hyphen, or middle)
                  const spaceIndex = name.indexOf(' ');
                  const hyphenIndex = name.indexOf('-');
                  
                  if (spaceIndex > 0 && spaceIndex < name.length - 3) {
                    // Split at space
                    const firstLine = name.substring(0, spaceIndex);
                    const secondLine = name.substring(spaceIndex + 1);
                    displayText = `${firstLine}
${secondLine}`;
                    fontSize = 24;
                    yPosition = 75; // Move text up a bit to center it
                  } else if (hyphenIndex > 0 && hyphenIndex < name.length - 3) {
                    // Split at hyphen
                    const firstLine = name.substring(0, hyphenIndex);
                    const secondLine = name.substring(hyphenIndex + 1);
                    displayText = `${firstLine}
${secondLine}`;
                    fontSize = 24;
                    yPosition = 75;
                  } else {
                    // Just use first 8 chars
                    fontSize = 24;
                    displayText = name.substring(0, 8);
                  }
                } else {
                  // Very long name, just use first 8 chars
                  fontSize = 24;
                  displayText = name.substring(0, 8);
                }
              }
            }
            
            // Add a subtle outline to make text more readable
            const svgContent = `
              <svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">
                <circle cx="75" cy="75" r="75" fill="${backgroundColor}"/>
                <text x="75" y="${yPosition}" font-family="Arial" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" stroke="black" stroke-width="1" paint-order="stroke">${displayText}</text>
              </svg>
            `;
            const dataUrl = `data:image/svg+xml;base64,${btoa(svgContent.trim())}`;
            
            return {
              chainId: blockchain.blockchainId,
              chainName: blockchain.blockchainName,
              chainLogoUri: dataUrl,
              networkToken: {
                symbol: blockchain.blockchainName
              }
            };
          });
        
        // Combine both datasets
        const combinedChains = [...mainnetChains, ...additionalBlockchains];
        
        setChains(combinedChains);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching chain data:', error);
        setError('Failed to fetch chain data. Please try again later.');
        setIsLoading(false);
      }
    };

    fetchChains();
  }, []);

  if (isLoading) {
    return <div className="w-full h-full flex items-center justify-center">Loading...</div>
  }

  if (error) {
    return <div className="w-full h-full flex items-center justify-center text-red-500">{error}</div>
  }

  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 12], fov: 45 }}>
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

