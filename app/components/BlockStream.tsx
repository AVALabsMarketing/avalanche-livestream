'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { fetchLatestBlocks, fetchChainData, Block, ChainData } from '@/utils/api'

export const BlockStream = () => {
  const MAX_ITEMS = 20
  const [items, setItems] = useState<Block[]>([])
  const [exitingItems, setExitingItems] = useState<Block[]>([])
  const [chainData, setChainData] = useState<{ [chainID: string]: ChainData }>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const processingQueue = useRef<Block[]>([])
  const isProcessing = useRef(false)
  const blockCache = useRef<Set<string>>(new Set())
  const animationFrame = useRef<number>()
  const lastFetchTime = useRef<number>(0)

  const processNextBlock = useCallback(() => {
    if (processingQueue.current.length === 0) {
      isProcessing.current = false
      return
    }

    isProcessing.current = true
    const nextBlock = processingQueue.current.shift()!
    
    if (blockCache.current.has(nextBlock.hash)) {
      requestAnimationFrame(processNextBlock)
      return
    }
    
    blockCache.current.add(nextBlock.hash)

    setItems(prevItems => {
      const newItems = [nextBlock, ...prevItems]
      
      if (prevItems.length >= MAX_ITEMS) {
        const itemToRemove = prevItems[prevItems.length - 1]
        setExitingItems(prev => [...prev, itemToRemove])
        animationFrame.current = requestAnimationFrame(() => {
          setExitingItems(prev => prev.filter(item => item.hash !== itemToRemove.hash))
        })
      }
      
      return newItems.slice(0, MAX_ITEMS)
    })

    // Process next block faster if we have more in queue
    const delay = processingQueue.current.length > 5 ? 50 : 100;
    setTimeout(() => requestAnimationFrame(processNextBlock), delay)
  }, [])

  useEffect(() => {
    let mounted = true
    
    const fetchItems = async () => {
      const now = Date.now()
      if (!mounted || isProcessing.current || now - lastFetchTime.current < 500) return
      
      lastFetchTime.current = now

      try {
        const newItems = await fetchLatestBlocks()
        if (!mounted || newItems.length === 0) return

        const uniqueNewItems = newItems.filter(item => !blockCache.current.has(item.hash))
        
        if (uniqueNewItems.length > 0) {
          processingQueue.current = [...processingQueue.current, ...uniqueNewItems.reverse()]
          
          if (!isProcessing.current) {
            requestAnimationFrame(processNextBlock)
          }

          // Pre-fetch chain data in parallel
          Promise.all(uniqueNewItems.map(async (item) => {
            if (!chainData[item.chainID]) {
              const newChainData = await fetchChainData(item.chainID)
              if (mounted && newChainData) {
                setChainData(prev => ({ ...prev, [item.chainID]: newChainData }))
              }
            }
          }))
        }
      } catch (error) {
        console.error('Error fetching blocks:', error)
      }
    }

    fetchItems()
    const interval = setInterval(fetchItems, 1000)
    
    return () => {
      mounted = false
      clearInterval(interval)
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current)
      }
    }
  }, [chainData, processNextBlock])

  const formatHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-6)}`
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  const renderBlock = (block: Block, index: number, isExiting = false) => {
    const currentChainData = chainData[block.chainID]
    return (
      <div 
        key={isExiting ? `exiting-${block.hash}-${index}` : block.hash}
        className="flex items-center justify-between p-2 hover:bg-[rgba(232,65,66,0.2)] rounded-lg h-[60px] min-h-[60px]"
        style={{
          opacity: isExiting ? 0 : 1,
          transform: isExiting ? 'translateY(20px)' : 'translateY(0)',
          transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)', // Faster transition
          animation: isExiting ? 'none' : 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1), glow 2s infinite'
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

  return (
    <div className="h-[900px] flex flex-col bg-[rgba(232,65,66,0.1)] rounded-xl border border-[rgba(232,65,66,0.2)] backdrop-blur-sm">
      <div className="flex items-center justify-between p-4 border-b border-[rgba(232,65,66,0.2)]">
        <h2 className="text-lg font-semibold text-white">Recent Blocks</h2>
      </div>
      <div className="overflow-hidden" style={{ height: 'calc(100% - 65px)' }}>
        <div 
          ref={containerRef} 
          className="h-full flex flex-col justify-start gap-1 p-2 relative"
        >
          {items.map((block, index) => renderBlock(block, index))}
          {exitingItems
            .filter(exitingBlock => !items.some(item => item.hash === exitingBlock.hash))
            .map((block, index) => renderBlock(block, index, true))}
        </div>
      </div>
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-3px); // Smaller distance for faster animation
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes glow {
          0% { box-shadow: 0 0 0 0 rgba(232, 65, 66, 0.1); }
          50% { box-shadow: 0 0 2px 1px rgba(232, 65, 66, 0.2); }
          100% { box-shadow: 0 0 0 0 rgba(232, 65, 66, 0.1); }
        }
      `}</style>
    </div>
  )
} 