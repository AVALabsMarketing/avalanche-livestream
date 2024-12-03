import axios from 'axios'

export interface Transaction {
  hash: string
  timestamp: number
  from: string
  to: string
  value: string
  chainID: string
}

export interface Block {
  hash: string
  timestamp: number
  height: number
  chainID: string
  txCount: number
}

export interface NetworkData {
  nodes: Array<{ id: string; position: [number, number, number] }>;
  links: Array<{ source: string; target: string }>;
}

export async function fetchLatestTransactions(): Promise<Transaction[]> {
  try {
    const response = await axios.get('/api/latest-transactions')
    return response.data
  } catch (error) {
    console.error('Error fetching latest transactions:', error)
    return []
  }
}

export async function fetchLatestBlocks(): Promise<Block[]> {
  try {
    const response = await axios.get('/api/latest-blocks')
    return response.data
  } catch (error) {
    console.error('Error fetching latest blocks:', error)
    return []
  }
}

function generateSphericalPosition(index: number, total: number): [number, number, number] {
  const phi = Math.acos(-1 + (2 * index) / total)
  const theta = Math.sqrt(total * Math.PI) * phi

  return [
    1.5 * Math.cos(theta) * Math.sin(phi),
    1.5 * Math.sin(theta) * Math.sin(phi),
    1.5 * Math.cos(phi)
  ]
}

export async function fetchNetworkData(): Promise<NetworkData> {
  const nodes = [
    { id: 'X-Chain' },
    { id: 'P-Chain' },
    { id: 'C-Chain' },
    { id: 'Subnet-1' },
    { id: 'Subnet-2' },
    { id: 'Subnet-3' },
  ].map((node, index, array) => ({
    ...node,
    position: generateSphericalPosition(index, array.length)
  }));

  const links = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      links.push({ source: nodes[i].id, target: nodes[j].id });
    }
  }

  return { nodes, links };
}
