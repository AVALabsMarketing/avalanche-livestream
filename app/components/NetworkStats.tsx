'use client'

import { useEffect, useState, useRef } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import axios from 'axios'

interface NetworkStatsData {
  price: number
  priceChange: number
  marketCap: number
  transactions: number
  burnedFees: number
}

export const NetworkStats = () => {
  const [stats, setStats] = useState<NetworkStatsData>({
    price: 0,
    priceChange: 0,
    marketCap: 0,
    transactions: 0,
    burnedFees: 0
  })
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | null>(null)
  const prevPrice = useRef(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch AVAX price and market cap from Coinbase API
        const coinbaseResponse = await axios.get('https://api.coinbase.com/v2/exchange-rates?currency=AVAX')
        const avaxUsdRate = parseFloat(coinbaseResponse.data.data.rates.USD)
        
        // Fetch AVAX market cap from CoinGecko API
        const coingeckoResponse = await axios.get('https://api.coingecko.com/api/v3/coins/avalanche-2')
        const marketCap = coingeckoResponse.data.market_data.market_cap.usd / 1e9 // Convert to billions
        
        // Fetch transaction count from Avalanche Explorer API
        const explorerResponse = await axios.get('https://api.snowtrace.io/api?module=proxy&action=eth_blockNumber&apikey=YourApiKeyToken')
        const latestBlock = parseInt(explorerResponse.data.result, 16)
        const transactions = latestBlock / 1e6 // Rough estimate, divide by 1 million for billions
        
        // Fetch burned fees from Avalanche Explorer API (this is a placeholder, replace with actual API endpoint)
        const burnedFeesResponse = await axios.get('https://api.snowtrace.io/api?module=stats&action=totalburned&apikey=YourApiKeyToken')
        const burnedFees = parseFloat(burnedFeesResponse.data.result) / 1e6 // Convert to millions
        
        // Calculate price change
        const priceChange = ((avaxUsdRate - prevPrice.current) / prevPrice.current) * 100
        
        setStats({
          price: avaxUsdRate,
          priceChange: priceChange,
          marketCap: marketCap,
          transactions: transactions,
          burnedFees: burnedFees
        })
        
        // Set price direction for animation
        if (avaxUsdRate > prevPrice.current) {
          setPriceDirection('up')
        } else if (avaxUsdRate < prevPrice.current) {
          setPriceDirection('down')
        }
        prevPrice.current = avaxUsdRate
        
        // Reset price direction after animation
        setTimeout(() => setPriceDirection(null), 1000)
      } catch (error) {
        console.error('Error fetching network stats:', error)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000) // Fetch every 30 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-full flex flex-col justify-center items-end p-4 space-y-4 overflow-y-auto">
      <div className="bg-[rgba(232,65,66,0.1)] rounded-xl p-4 border border-[rgba(232,65,66,0.2)] w-full max-w-[300px]">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">AVAX</span>
          <span className={`text-2xl font-bold transition-all duration-300 ${
            priceDirection === 'up' ? 'text-green-500 transform translate-y-[-4px]' :
            priceDirection === 'down' ? 'text-red-500 transform translate-y-[4px]' :
            ''
          }`}>
            ${stats.price.toFixed(2)}
          </span>
          <span className={`flex items-center ${stats.priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {stats.priceChange >= 0 ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
            {Math.abs(stats.priceChange).toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="bg-[rgba(232,65,66,0.1)] rounded-xl p-4 border border-[rgba(232,65,66,0.2)] w-full max-w-[300px] flex flex-col items-center justify-center">
        <span className="text-sm text-gray-400 mb-2">Market Cap (AVAX)</span>
        <span className="text-xl font-bold">${stats.marketCap.toFixed(2)}B</span>
      </div>
      <div className="bg-[rgba(232,65,66,0.1)] rounded-xl p-4 border border-[rgba(232,65,66,0.2)] w-full max-w-[300px] flex flex-col items-center justify-center">
        <span className="text-sm text-gray-400 mb-2">Total Transactions (ALL)</span>
        <span className="text-xl font-bold">{stats.transactions.toFixed(2)}B</span>
      </div>
      <div className="bg-[rgba(232,65,66,0.1)] rounded-xl p-4 border border-[rgba(232,65,66,0.2)] w-full max-w-[300px] flex flex-col items-center justify-center">
        <span className="text-sm text-gray-400 mb-2">Burned Fees (AVAX)</span>
        <span className="text-xl font-bold">{stats.burnedFees.toFixed(2)}M AVAX</span>
      </div>
    </div>
  )
}

