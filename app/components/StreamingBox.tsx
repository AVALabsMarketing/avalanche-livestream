import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Transaction, Block } from '../../utils/api'

interface StreamingBoxProps {
  title: string
  data: (Transaction | Block)[]
  type: 'transaction' | 'block'
}

export const StreamingBox: React.FC<StreamingBoxProps> = ({ title, data, type }) => {
  const streamRef = useRef<HTMLDivElement>(null)
  //const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (streamRef.current) {
      const scrollHeight = streamRef.current.scrollHeight;
      const height = streamRef.current.clientHeight;
      const maxScrollTop = scrollHeight - height;
      streamRef.current.scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
    }
  }, [data])

  const formatHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-6)}`
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`
  }

  return (
    <div className="h-full flex flex-col bg-[rgba(232,65,66,0.1)] rounded-xl border border-[rgba(232,65,66,0.2)] backdrop-blur-sm">
      <div className="flex items-center justify-between p-4 border-b border-[rgba(232,65,66,0.2)]">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {/*isPaused && (
          <span className="text-sm text-[rgba(232,65,66,0.8)]">Feed paused due to mouseover</span>
        )*/}
      </div>
      <div 
        ref={streamRef} 
        className="flex-grow overflow-y-auto space-y-1 p-2"
        //onMouseEnter={() => setIsPaused(true)}
        //onMouseLeave={() => setIsPaused(false)}
      >
        {data.map((item, index) => {
          if (type === 'block') {
            const block = item as Block
            return (
              <div key={index} className="flex items-center justify-between p-2 hover:bg-[rgba(232,65,66,0.2)] rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <Image src="/globe.svg" alt="Block" width={20} height={20} className="rounded-full" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[rgba(232,65,66,0.8)] font-mono">{block.height}</span>
                    </div>
                    <div className="text-white font-mono text-xs">
                      Hash {formatHash(block.hash)}
                    </div>
                    <div className="text-[rgba(255,255,255,0.7)] text-xs">
                      {block.txCount} Txs
                    </div>
                  </div>
                </div>
                <div className="px-2 py-1 bg-[rgba(232,65,66,0.2)] rounded text-[rgba(232,65,66,0.8)] text-[10px]">
                  {(Math.random() * 0.5).toFixed(2)} JEWEL
                </div>
              </div>
            )
          } else {
            const tx = item as Transaction
            return (
              <div key={index} className="flex items-center justify-between p-2 hover:bg-[rgba(232,65,66,0.2)] rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <Image src="/globe.svg" alt="Transaction" width={20} height={20} className="rounded-full" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[rgba(232,65,66,0.8)] font-mono">{formatHash(tx.hash)}</span>
                    </div>
                    <div className="text-white font-mono text-xs">
                      From {formatAddress(tx.from)}
                    </div>
                    <div className="text-white font-mono text-xs">
                      To {formatAddress(tx.to)}
                    </div>
                  </div>
                </div>
                <div className="px-2 py-1 bg-[rgba(232,65,66,0.2)] rounded text-[rgba(232,65,66,0.8)] text-[10px]">
                  {parseFloat(tx.value).toFixed(2)} PLSR
                </div>
              </div>
            )
          }
        })}
      </div>
    </div>
  )
}

