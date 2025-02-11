'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { fetchLatestTransactions, fetchChainData, Transaction, ChainData } from '@/utils/api'
import { formatUnits } from 'viem'

export const TransactionStream = () => {
  const MAX_ITEMS = 20;
  const [items, setItems] = useState<Transaction[]>([])
  const [exitingItems, setExitingItems] = useState<Transaction[]>([])
  const [chainData, setChainData] = useState<{ [chainID: string]: ChainData }>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const processingQueue = useRef<Transaction[]>([])
  const isProcessing = useRef(false)
  const lastProcessedHash = useRef<string | null>(null)

  const processNextTransaction = useCallback(() => {
    if (processingQueue.current.length === 0) {
      isProcessing.current = false
      return
    }

    isProcessing.current = true
    const nextTx = processingQueue.current.shift()!
    
    // Skip if we've already processed this transaction
    if (lastProcessedHash.current === nextTx.hash) {
      setTimeout(processNextTransaction, 0)
      return
    }
    
    lastProcessedHash.current = nextTx.hash

    setItems(prevItems => {
      if (prevItems.some(item => item.hash === nextTx.hash)) {
        return prevItems
      }

      const newItems = [nextTx, ...prevItems]
      
      if (prevItems.length >= MAX_ITEMS) {
        const itemToRemove = prevItems[prevItems.length - 1]
        setExitingItems(prev => [...prev, itemToRemove])
        setTimeout(() => {
          setExitingItems(prev => prev.filter(item => item.hash !== itemToRemove.hash))
        }, 0)
      }
      
      return newItems.slice(0, MAX_ITEMS)
    })

    setTimeout(processNextTransaction, 0)
  }, [])

  useEffect(() => {
    let mounted = true
    
    const fetchItems = async () => {
      if (!mounted || isProcessing.current) return

      try {
        const newItems = await fetchLatestTransactions()
        if (!mounted || newItems.length === 0) return

        // Filter out transactions we already have
        const existingHashes = new Set(items.map(item => item.hash))
        const uniqueNewItems = newItems.filter(item => !existingHashes.has(item.hash))
        
        if (uniqueNewItems.length > 0) {
          processingQueue.current = [...uniqueNewItems.reverse()]
          processNextTransaction()
        }

        // Fetch chain data for new items
        uniqueNewItems.forEach(async (item) => {
          if (!chainData[item.chainID]) {
            const newChainData = await fetchChainData(item.chainID)
            if (mounted && newChainData) {
              setChainData(prev => ({ ...prev, [item.chainID]: newChainData }))
            }
          }
        })
      } catch (error) {
        console.error('Error fetching transactions:', error)
      }
    }

    fetchItems()
    const interval = setInterval(fetchItems, 200)
    
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [chainData, processNextTransaction])

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
    const formattedValue = formatUnits(BigInt(value), 18)
    const [integerPart, fractionalPart] = formattedValue.split('.')
    
    if (integerPart.length > 8) {
      return `${integerPart.slice(0, 8)}...`
    }
    
    const truncatedFractionalPart = fractionalPart ? fractionalPart.slice(0, 4) : ''
    return `${integerPart}${truncatedFractionalPart ? '.' + truncatedFractionalPart : ''}`
  }

  const renderTransaction = (tx: Transaction, index: number, isExiting = false) => {
    const currentChainData = chainData[tx.chainID]
    return (
      <div 
        key={tx.hash}
        className="flex items-center justify-between p-2 hover:bg-[rgba(232,65,66,0.2)] rounded-lg h-[60px] min-h-[60px]"
        style={{
          opacity: isExiting ? 0 : 1,
          transform: isExiting ? 'translateY(20px)' : 'translateY(0)',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          animation: isExiting ? 'none' : 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1), glow 3s infinite'
        }}
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
          <div className={`inline-block px-2 py-1 bg-[rgba(232,65,66,0.2)] rounded text-[rgba(232,65,66,0.8)] text-[10px] text-right whitespace-nowrap overflow-hidden text-ellipsis`}>
            {formatValue(tx.value)} {currentChainData ? currentChainData.nativeToken.symbol : ''}
          </div>
          <div className="text-[rgba(255,255,255,0.7)] text-xs mt-1">
            {formatTimestamp(tx.timestamp)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[900px] flex flex-col bg-[rgba(232,65,66,0.1)] rounded-xl border border-[rgba(232,65,66,0.2)] backdrop-blur-sm">
      <div className="flex items-center justify-between p-4 border-b border-[rgba(232,65,66,0.2)]">
        <h2 className="text-lg font-semibold text-white">Recent Transactions</h2>
      </div>
      <div className="overflow-hidden" style={{ height: 'calc(100% - 65px)' }}>
        <div 
          ref={containerRef} 
          className="h-full flex flex-col justify-start gap-1 p-2 relative"
        >
          {items.map((tx, index) => renderTransaction(tx, index))}
          {exitingItems.map((tx, index) => renderTransaction(tx, index, true))}
        </div>
      </div>
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes glow {
          0% { box-shadow: 0 0 0 0 rgba(232, 65, 66, 0.1); }
          50% { box-shadow: 0 0 6px 1px rgba(232, 65, 66, 0.2); }
          100% { box-shadow: 0 0 0 0 rgba(232, 65, 66, 0.1); }
        }
      `}</style>
    </div>
  )
} 