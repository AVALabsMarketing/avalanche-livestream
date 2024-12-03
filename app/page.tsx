'use client'

import React, { useEffect, useRef, useState } from 'react'
import { NetworkGraph } from './components/NetworkGraph'
import { StreamingBox } from './components/StreamingBox'
import { NetworkStats } from './components/NetworkStats'
import { fetchNetworkData, fetchLatestTransactions, fetchLatestBlocks, Transaction, Block, NetworkData } from '../utils/api'

interface NetworkGraphRef {
  triggerCrossChainAnimation: (from: string, to: string) => void;
}

export default function AvalancheVisualization() {
  const [networkData, setNetworkData] = useState<NetworkData>({ nodes: [], links: [] })
  const [transactionData, setTransactionData] = useState<Transaction[]>([])
  const [blockData, setBlockData] = useState<Block[]>([])
  const networkRef = useRef<NetworkGraphRef>(null)

  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchNetworkData()
      setNetworkData(data)
    }
    fetchData()

    const fetchTransactions = async () => {
      const transactions = await fetchLatestTransactions()
      setTransactionData((prev) => {
        const newData = [...transactions, ...prev]
        return newData.slice(0, 5)
      })
    }

    const fetchBlocks = async () => {
      const blocks = await fetchLatestBlocks()
      setBlockData((prev) => {
        const newData = [...blocks, ...prev]
        return newData.slice(0, 5)
      })
    }

    const dataInterval = setInterval(() => {
      fetchTransactions()
      fetchBlocks()
    }, 100) // Update every 100ms for a fast stream

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
      clearInterval(dataInterval)
      clearInterval(animationInterval)
    }
  }, [])

  return (
    <div className="fixed inset-0 grid grid-cols-[350px_1fr_350px] bg-black text-white">
      <div className="p-4 overflow-hidden flex flex-col">
        <div className="flex-1 mb-4">
          <StreamingBox title="Recent Blocks" data={blockData} type="block" />
        </div>
        <div className="flex-1">
          <StreamingBox title="Recent Transactions" data={transactionData} type="transaction" />
        </div>
      </div>
      
      <div className="relative">
        <div className="absolute inset-0">
          <NetworkGraph ref={networkRef} data={networkData} />
        </div>
      </div>
      
      <div className="p-4">
        <NetworkStats />
      </div>
    </div>
  )
}
