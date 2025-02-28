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

// Adding API key to all Glacier API requests
const GLACIER_API_KEY = 'ac_MPe8jF1Xdt1oP5qfMvVfJXF8M-GOjwzBCcmMeHZKVhHwEzpJUbyJ6bp4GjfNkTrzOfwHwVIKL8bXp__2_isAow'; // I don't care, sorry not sorry
const glacierAxios = axios.create({
  headers: {
    'x-glacier-api-key': GLACIER_API_KEY
  }
});

// Cache object only for chain data
const chainDataCache: Record<string, {
  data: ChainData | null,
  timestamp: number,
  expiryTime: number,
  notFound?: boolean // Add flag for 404 errors
}> = {};

export async function fetchLatestTransactions(): Promise<Transaction[]> {
  try {
    const response = await glacierAxios.get('https://glacier-api.avax.network/v1/transactions')
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
    const response = await glacierAxios.get('https://glacier-api.avax.network/v1/blocks');
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
  // Initialize cache entry for this chainID if it doesn't exist
  if (!chainDataCache[chainID]) {
    chainDataCache[chainID] = {
      data: null,
      timestamp: 0,
      expiryTime: 300000, // 5 minutes
    };
  }
  
  // If we've previously received a 404 for this chainID, don't try again
  if (chainDataCache[chainID].notFound) {
    return null;
  }
  
  // Check if cache is valid
  const now = Date.now();
  if (chainDataCache[chainID].data && 
      now - chainDataCache[chainID].timestamp < chainDataCache[chainID].expiryTime) {
    return chainDataCache[chainID].data;
  }
  
  try {
    const response = await glacierAxios.get(`https://glacier-api.avax.network/v1/chains/${chainID}`)
    const data = response.data
    const chainData = {
      chainLogoUri: data.chainLogoUri,
      chainName: data.chainName,
      nativeToken: {
        symbol: data.networkToken.symbol,
        name: data.networkToken.name,
        decimals: data.networkToken.decimals,
      }
    };
    
    // Update cache
    chainDataCache[chainID].data = chainData;
    chainDataCache[chainID].timestamp = now;
    
    return chainData;
  } catch (error) {
    console.error(`Error fetching chain data for chainID ${chainID}:`, error);
    
    // For 404 errors, mark as permanently not found
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      chainDataCache[chainID].notFound = true;
      chainDataCache[chainID].data = null;
    }
    
    // Return cached data if available, even if expired
    return chainDataCache[chainID].data;
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

