'use client'

import React, { useEffect, useRef } from 'react'
import { NetworkGraph } from './components/NetworkGraph'
import { TransactionStream } from './components/TransactionStream'
import { BlockStream } from './components/BlockStream'
import { NetworkStats } from './components/NetworkStats'
import { fetchNetworkData, NetworkData } from '../utils/api'

interface NetworkGraphRef {
  triggerCrossChainAnimation: (from: string, to: string) => void;
}

export default function AvalancheVisualization() {
  const [networkData, setNetworkData] = React.useState<NetworkData>({ nodes: [], links: [] })
  const networkRef = useRef<NetworkGraphRef>(null)

  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchNetworkData()
      setNetworkData(data)
    }
    fetchData()

    const animationInterval = setInterval(() => {
      if (networkRef.current) {
        const chains = ['X-Chain', 'P-Chain', 'C-Chain', 'Subnet-1', 'Subnet-2', 'Subnet-3']
        const numAnimations = Math.floor(Math.random() * 3) + 1 // Trigger 1-3 animations
        for (let i = 0; i < numAnimations; i++) {
          const fromChain = chains[Math.floor(Math.random() * chains.length)]
          let toChain
          do {
            toChain = chains[Math.floor(Math.random() * chains.length)]
          } while (toChain === fromChain) // Ensure from and to are different
          networkRef.current.triggerCrossChainAnimation(fromChain, toChain)
        }
      }
    }, 2000) // Trigger animations every 2 seconds

    return () => {
      clearInterval(animationInterval)
    }
  }, [])

  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white">
      {/* Stats Bar on Top */}
      <div className="h-[100px] px-4 pt-0 pb-2">
        <NetworkStats />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 grid grid-cols-[350px_1fr_350px]">
        {/* Left Side - Transactions */}
        <div className="h-full overflow-hidden">
          <TransactionStream />
        </div>
        
        {/* Center - Network Graph */}
        <div className="relative">
          <div className="absolute inset-0">
            <NetworkGraph ref={networkRef} />
          </div>
        </div>
        
        {/* Right Side - Blocks */}
        <div className="h-full overflow-hidden">
          <BlockStream />
        </div>
      </div>
    </div>
  )
}

