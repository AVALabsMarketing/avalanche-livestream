'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { fetchLatestTransactions, fetchLatestBlocks, fetchChainData, Transaction, Block, ChainData } from '@/utils/api'

interface StreamingBoxProps {
  title: string
  type: 'block' | 'transaction'
}

export const StreamingBox: React.FC<StreamingBoxProps> = ({ title, type }) => {
  const [items, setItems] = useState<(Transaction | Block)[]>([])
  const [chainData, setChainData] = useState<{ [chainID: string]: ChainData }>({})

  useEffect(() => {
    const fetchItems = async () => {
      try {
        let newItems: (Transaction | Block)[]
        if (type === 'block') {
          newItems = await fetchLatestBlocks()
        } else {
          newItems = await fetchLatestTransactions()
        }

        setItems(prevItems => {
          const updatedItems = [...newItems, ...prevItems]
          const uniqueItems = updatedItems.filter((item, index, self) =>
            index === self.findIndex((t) => 
              (type === 'block' ? (t as Block).hash === (item as Block).hash : (t as Transaction).hash === (item as Transaction).hash)
            )
          )
          return uniqueItems.slice(0, 5)
        })

        // Fetch chain data for new items
        newItems.forEach(async (item) => {
          const chainID = 'chainID' in item ? item.chainID : ''
          if (chainID && !chainData[chainID]) {
            const newChainData = await fetchChainData(chainID)
            if (newChainData) {
              setChainData(prev => ({ ...prev, [chainID]: newChainData }))
            }
          }
        })
      } catch (error) {
        console.error(`Error fetching ${type}s:`, error)
      }
    }

    fetchItems()
    const interval = setInterval(fetchItems, type === 'block' ? 1000 : 100)

    return () => clearInterval(interval)
  }, [type, chainData])

  const formatHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-6)}`
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  const formatValue = (value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return '0'
    if (num === 0) return '0'
    if (num < 0.00001) return '<0.00001'
    return num.toFixed(5)
  }

  const renderBlock = (block: Block) => {
    const currentChainData = chainData[block.chainID]
    return (
      <div 
        key={block.hash}
        className="flex items-center justify-between p-2 hover:bg-[rgba(232,65,66,0.2)] rounded-lg transition-colors animate-fadeInDown"
      >
        <div className="flex items-center gap-2">
          <Image 
            src={currentChainData?.chainLogoUri || '/globe.svg'} 
            alt={currentChainData?.chainName || 'Chain'} 
            width={20} 
            height={20} 
            className="rounded-full"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[rgba(232,65,66,0.8)] font-mono">{block.height}</span>
            </div>
            <div className="text-white font-mono text-xs">
              Hash {formatHash(block.hash)}
            </div>
            <div className="text-[rgba(255,255,255,0.7)] text-xs">
              Chain ID: {block.chainID}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="px-2 py-1 bg-[rgba(232,65,66,0.2)] rounded text-[rgba(232,65,66,0.8)] text-[10px]">
            {block.txCount} Txs
          </div>
          <div className="text-[rgba(255,255,255,0.7)] text-xs mt-1">
            {formatTimestamp(block.timestamp)}
          </div>
        </div>
      </div>
    )
  }

  const renderTransaction = (tx: Transaction) => {
    const currentChainData = chainData[tx.chainID]
    return (
      <div 
        key={tx.hash}
        className="flex items-center justify-between p-2 hover:bg-[rgba(232,65,66,0.2)] rounded-lg transition-colors animate-fadeInDown"
      >
        <div className="flex items-center gap-2">
          <Image 
            src={currentChainData?.chainLogoUri || '/globe.svg'} 
            alt={currentChainData?.chainName || 'Chain'} 
            width={20} 
            height={20} 
            className="rounded-full"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[rgba(232,65,66,0.8)] font-mono">{formatHash(tx.hash)}</span>
            </div>
            <div className="text-white font-mono text-xs">
              From: {formatAddress(tx.from)}
            </div>
            <div className="text-white font-mono text-xs">
              To: {formatAddress(tx.to)}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="px-2 py-1 bg-[rgba(232,65,66,0.2)] rounded text-[rgba(232,65,66,0.8)] text-[10px]">
            {formatValue(tx.value)} {currentChainData ? currentChainData.nativeToken.symbol : 'UNKNOWN'}
          </div>
          <div className="text-[rgba(255,255,255,0.7)] text-xs mt-1">
            {formatTimestamp(tx.timestamp)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[rgba(232,65,66,0.1)] rounded-xl border border-[rgba(232,65,66,0.2)] backdrop-blur-sm">
      <div className="flex items-center justify-between p-4 border-b border-[rgba(232,65,66,0.2)]">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      <div className="flex-grow overflow-hidden">
        <div className="h-full flex flex-col-reverse space-y-reverse space-y-1 p-2">
          {items.map((item) => 
            type === 'block' 
              ? renderBlock(item as Block)
              : renderTransaction(item as Transaction)
          )}
        </div>
      </div>
    </div>
  )
}

