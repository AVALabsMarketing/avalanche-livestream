import type { NextApiRequest, NextApiResponse } from 'next'
import { Block } from '@/utils/api'

function generateDummyBlock(): Block {
  const chains = ['X-Chain', 'P-Chain', 'C-Chain', 'Subnet-1', 'Subnet-2', 'Subnet-3']
  return {
    hash: Math.random().toString(36).substring(2, 15),
    timestamp: Date.now(),
    height: Math.floor(Math.random() * 1000000),
    chainID: chains[Math.floor(Math.random() * chains.length)],
    txCount: Math.floor(Math.random() * 100),
    value: Math.floor(Math.random() * 1000).toString()
  }
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Block[]>
) {
  if (req.method === 'GET') {
    const dummyBlocks = Array(5).fill(null).map(generateDummyBlock)
    res.status(200).json(dummyBlocks)
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
