'use client'

import { useEffect, useState } from 'react'
import { TrendingUp } from 'lucide-react'

interface NetworkStatsData {
  price: number
  priceChange: number
  marketCap: number
  transactions: number
  tps: number
  burnedFees: number
}

export const NetworkStats = () => {
  const [stats, setStats] = useState<NetworkStatsData>({
    price: 47.48,
    priceChange: 6.04,
    marketCap: 19.41,
    transactions: 1.73,
    tps: 49.73,
    burnedFees: 4.52
  })

  return (
    <div className="h-full flex flex-col justify-center items-end p-4 space-y-4 overflow-y-auto">
      <div className="bg-[rgba(232,65,66,0.1)] rounded-xl p-4 border border-[rgba(232,65,66,0.2)] w-full max-w-[300px]">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">AVAX</span>
          <span className="text-2xl font-bold">${stats.price.toFixed(2)}</span>
          <span className="flex items-center text-green-500">
            <TrendingUp size={16} className="mr-1" />
            {stats.priceChange.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="bg-[rgba(232,65,66,0.1)] rounded-xl p-4 border border-[rgba(232,65,66,0.2)] w-full max-w-[300px] flex flex-col items-center justify-center">
        <span className="text-sm text-gray-400 mb-2">Market Cap</span>
        <span className="text-xl font-bold">${stats.marketCap.toFixed(2)}B</span>
      </div>
      <div className="bg-[rgba(232,65,66,0.1)] rounded-xl p-4 border border-[rgba(232,65,66,0.2)] w-full max-w-[300px] flex flex-col items-center justify-center">
        <span className="text-sm text-gray-400 mb-2">Transactions</span>
        <span className="text-xl font-bold">{stats.transactions}B</span>
      </div>
      {/* <div className="bg-[rgba(232,65,66,0.1)] rounded-xl p-4 border border-[rgba(232,65,66,0.2)] w-full max-w-[300px] flex flex-col items-center justify-center">
        <span className="text-sm text-gray-400 mb-2">TPS</span>
        <span className="text-xl font-bold">{stats.tps}</span>
      </div> */}
      <div className="bg-[rgba(232,65,66,0.1)] rounded-xl p-4 border border-[rgba(232,65,66,0.2)] w-full max-w-[300px] flex flex-col items-center justify-center">
        <span className="text-sm text-gray-400 mb-2">Burned Fees</span>
        <span className="text-xl font-bold">{stats.burnedFees}M AVAX</span>
      </div>
    </div>
  )
}

