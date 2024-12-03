const dummyNetworkData = {
    nodes: [
      { id: 'X-Chain' },
      { id: 'P-Chain' },
      { id: 'C-Chain' },
    ],
    links: [
      { source: 'X-Chain', target: 'P-Chain' },
      { source: 'P-Chain', target: 'C-Chain' },
      { source: 'C-Chain', target: 'X-Chain' },
    ]
  }
  
  export const fetchDummyData = async () => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(dummyNetworkData), 500)
    })
  }
  
  let counter = 0
  
  export const fetchDummyStreamingData = async () => {
    counter++
    const types = ['transaction', 'block', 'crossChain']
    const type = types[Math.floor(Math.random() * types.length)]
    
    let data: { id: string; type: string; from?: string; to?: string } = {
      id: `${type}-${counter}`,
      type: type
    }
  
    if (type === 'crossChain') {
      const chains = ['X-Chain', 'P-Chain', 'C-Chain']
      data.from = chains[Math.floor(Math.random() * chains.length)]
      data.to = chains[Math.floor(Math.random() * chains.length)]
      while (data.to === data.from) {
        data.to = chains[Math.floor(Math.random() * chains.length)]
      }
    }
  
    return new Promise((resolve) => {
      setTimeout(() => resolve(data), 50)
    })
  }
  
  