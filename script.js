import fetch from 'node-fetch';
import Web3 from "web3";
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()
const web3 = new Web3(Web3.providers.HttpProvider())
const API_SCAN_KEY = process.env.API_SCAN_KEY

async function getControllers() {
  const response = await fetch('https://api.thegraph.com/subgraphs/name/alexandersazonof/tetu-controller-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
         {
  controllerImplementations(
    orderBy:upgradedAtBlock,
    orderDirection:asc
  ) {
    id
    upgradedAtBlock
  }
}

      `,
    }),
  })
  const data = await response.json()
  const listControllerImplementationAddress = data.data.controllerImplementations.map(controller => controller)

  await Promise.all(listControllerImplementationAddress.map(async item => {
    const res = await getAbiFull(item)
    await writeResult(
      {
        events: res.events,
        methods: res.methods
      }, res.block)
    return res
  }))
  console.log('Created files')
}

async function getAbiFull(controller) {
  const abi = await getAbi(controller.id)

  return {
    address: controller.id,
    block: controller.upgradedAtBlock,
    events: Array.from(abi.events.keys()),
    methods: Array.from(abi.methods.keys())
  }
}

async function writeResult(data, block) {
  try {
    await fs.writeFile(`data/controller-block-${block}.json`, JSON.stringify(data), function(err, result) {
      if(err) console.log('error', err);
    });
  } catch (err) {
    console.log(err);
    throw err
  }
}

async function getAbi(address) {
  const response = await fetch(`https://api.polygonscan.com/api?module=contract&action=getabi&address=${address}&apikey=${API_SCAN_KEY}`)
  const json = await response.json()
  const result = json.result
  const contract = new web3.eth.Contract(JSON.parse(result))
  const eventMap = new Map(Object.entries(contract.events))
  const methodMap = new Map(Object.entries(contract.methods))
  return {
    events: eventMap,
    methods: methodMap
  }
}

getControllers()