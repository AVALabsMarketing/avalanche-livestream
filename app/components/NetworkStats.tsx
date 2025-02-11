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
  l1Count: number
  subnetCount: number
}

export const NetworkStats = () => {
  const [stats, setStats] = useState<NetworkStatsData>({
    price: 0,
    priceChange: 0,
    marketCap: 0,
    transactions: 0,
    burnedFees: 0,
    l1Count: 0,
    subnetCount: 0
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
        
        
        const glacierResponse = await axios.get(
          `https://glacier-api.avax.network/v1/networks/mainnet/subnets`
        )
        
        let allSubnets = [...glacierResponse.data.subnets]
        let nextPageToken = glacierResponse.data.nextPageToken

        // Fetch additional pages while nextPageToken exists
        while (nextPageToken) {
          const nextPage = await axios.get(
            `https://glacier-api.avax.network/v1/networks/mainnet/subnets?pageToken=${nextPageToken}`
          )
          allSubnets = [...allSubnets, ...nextPage.data.subnets]
          nextPageToken = nextPage.data.nextPageToken
        }

        const l1Count = allSubnets.filter((subnet: any) => subnet.isL1).length
        const subnetCount = allSubnets.length

        setStats(prevStats => ({
          ...prevStats,
          price: avaxUsdRate,
          priceChange: priceChange,
          marketCap: marketCap,
          transactions: transactions,
          burnedFees: burnedFees,
          l1Count: l1Count,
          subnetCount: subnetCount
        }))
        
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
    <div className="h-full flex justify-center items-center gap-4 p-2">
      <div className="bg-[rgba(232,65,66,0.1)] rounded-xl p-3 border border-[rgba(232,65,66,0.2)] flex flex-col items-center justify-center">
        <span className="text-sm text-gray-400">Market Cap (AVAX)</span>
        <span className="text-lg font-bold">${stats.marketCap.toFixed(2)}B</span>
      </div>
      <div className="bg-[rgba(232,65,66,0.1)] rounded-xl p-3 border border-[rgba(232,65,66,0.2)] flex flex-col items-center justify-center">
        <span className="text-sm text-gray-400">Total Transactions</span>
        <span className="text-lg font-bold">{stats.transactions.toFixed(2)}B</span>
      </div>
      <div className="bg-[rgba(232,65,66,0.1)] rounded-xl p-3 border border-[rgba(232,65,66,0.2)] flex flex-col items-center justify-center">
        <span className="text-sm text-gray-400">Subnets / L1s</span>
        <span className="text-lg font-bold">{stats.subnetCount} / {stats.l1Count}</span>
      </div>
    </div>
  )
}

