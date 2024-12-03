import type { NextApiRequest, NextApiResponse } from 'next'

export interface Transaction {
  hash: string
  timestamp: number
  from: string
  to: string
  value: string
  chainID: string
}

function generateDummyTransaction(): Transaction {
  const chains = ['X-Chain', 'P-Chain', 'C-Chain']
  return {
    hash: Math.random().toString(36).substring(2, 15),
    timestamp: Date.now(),
    from: '0x' + Math.random().toString(36).substring(2, 15),
    to: '0x' + Math.random().toString(36).substring(2, 15),
    value: (Math.random() * 100).toFixed(4),
    chainID: chains[Math.floor(Math.random() * chains.length)]
  }
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Transaction[]>
) {
  if (req.method === 'GET') {
    const dummyTransactions = Array(10).fill(null).map(generateDummyTransaction)
    res.status(200).json(dummyTransactions)
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}

