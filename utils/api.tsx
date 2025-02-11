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
  value: string // Added value property to match with StreamingBox component
}

export interface NetworkData {
  nodes: Array<{ id: string; position: [number, number, number] }>;
  links: Array<{ source: string; target: string }>;
}

export interface ChainData {
  chainLogoUri: string
  chainName: string
  nativeToken: {
    symbol: string
    name: string
    decimals: number
  }
}

export async function fetchLatestTransactions(): Promise<Transaction[]> {
  try {
    const response = await axios.get('https://glacier-api.avax.network/v1/transactions')
    return response.data.transactions.map((item: any) => ({
      hash: item.txHash,
      timestamp: item.blockTimestamp * 1000, // Convert to milliseconds
      from: item.from.address,
      to: item.to.address,
      value: item.value,
      chainID: item.chainId
    }))
  } catch (error) {
    console.error('Error fetching latest transactions:', error)
    return []
  }
}

export async function fetchLatestBlocks(): Promise<Block[]> {
  try {  
    const response = await axios.get('https://glacier-api.avax.network/v1/blocks');
    return response.data.blocks.map((item: any) => ({
      hash: item.blockHash,
      timestamp: item.blockTimestamp * 1000, // Convert to milliseconds
      height: parseInt(item.blockNumber),
      chainID: item.chainId,
      txCount: item.txCount,
      value: item.feesSpent // Using feesSpent instead of burnedFees
    }));
  } catch (error) {
    console.error('Error fetching latest blocks:', error);
    return [];
  }
}

export async function fetchChainData(chainID: string): Promise<ChainData | null> {
  try {
    const response = await axios.get(`https://glacier-api.avax.network/v1/chains/${chainID}`)
    const data = response.data
    return {
      chainLogoUri: data.chainLogoUri,
      chainName: data.chainName,
      nativeToken: {
        symbol: data.networkToken.symbol,
        name: data.networkToken.name,
        decimals: data.networkToken.decimals,
      }
    }
  } catch (error) {
    console.error(`Error fetching chain data for chainID ${chainID}:`, error)
    return null
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

