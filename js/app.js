import {
  mulan_abi,
  mulan2_abi,
  mulan_stake_abi,
  timelocks_abi,
  mulan_address,
  mulan2_address,
  mulan_stake_address,
  timelocks_address
} from "./abi_address.js";


await window.ethereum.enable()
window.provider = new ethers.providers.Web3Provider(window.ethereum);


window.mulan = new ethers.Contract(mulan_address, mulan_abi, provider);
window.mulan2 = new ethers.Contract(mulan2_address, mulan2_abi, provider);
window.stake = new ethers.Contract(mulan_stake_address, mulan_stake_abi, provider);
window.lock = new ethers.Contract(timelocks_address, timelocks_abi, provider);

export const getAllProducts = async (mulan_stake) => {
  let num = await mulan_stake.getProductCount()
  if (num == 0) {
    return []
  }
  let promises = []
  for (let i = 0; i < num; i++) {
    promises.push(mulan_stake.products(i))
  }
  let products = await Promise.all(promises)
  return products
}


export const getProductSales = async (mulan_stake) => {
  let num = await mulan_stake.getProductCount()
  if (num == 0) {
    return []
  }
  let promises = []
  for (let i = 0; i < num; i++) {
    promises.push(mulan_stake.sales(i))
  }
  let sales = await Promise.all(promises)
  return sales
}

const YEAR_IN_SECONDS = 365 * 24 * 60 * 60;

export const deposit = async (mulan_stake, product_id, amount, signer) => {
  return mulan_stake.connect(signer).deposit(product_id, (new BigNumber(amount).times(new BigNumber(10).pow(18))).toString())
}

export const withdraw = async (mulan_stake, lockNumber, signer) => {
  return mulan_stake.connect(signer).withdraw(lockNumber)
}


export const getUserLocks = async (lock, account) => {

  let log = await (async () => {
    let filter = lock.filters.LockCreated(account, null)
    let abi = ["event LockCreated(address indexed user,uint256 indexed lockNumber,uint256 value,uint256 reward,uint256 startTime,uint256 releaseTime)"]
    let iface = new ethers.utils.Interface(abi);
    let logs = await lock.queryFilter(filter)
    let decodedEvents = logs.map(log => iface.parseLog(log));
    return decodedEvents
  })()

  let log_release = await (async () => {
    let filter = lock.filters.Released(account, null)
    let abi = ["event Released(address indexed user,uint256 indexed lockNumber,uint256 actualReleaseTime)"]
    let iface = new ethers.utils.Interface(abi);
    let logs = await lock.queryFilter(filter)
    let decodedEvents = logs.map(log => iface.parseLog(log));
    return decodedEvents
  })()

  let log_data = log.map(x => {
    let values = x.args
    return {
      locked: (values.value / 10 ** 18).toFixed(4),
      reward: (values.reward / 10 ** 18).toFixed(4),
      startTime: values.startTime * 1000,
      releaseTime: values.releaseTime * 1000,
      APY: Math.round(values.reward / values.value * (YEAR_IN_SECONDS / (values.releaseTime - values.startTime)) * 10000) / 10000 * 100 + "%",
      released: false
    }
  })

  let released = log_release.map(x => {
    let values = x.args
    return values.lockNumber
  })

  for (let i in log_data) {
    if (released.includes(i)) {
      log_data[i].released = true;
    }
  }
  return log_data

}


window.getAllProducts = getAllProducts
window.getProductSales = getProductSales
window.deposit = deposit
window.withdraw = withdraw
window.getUserLocks = getUserLocks


let n = await getProductSales(stake)
$("#product_sales").html(n.length)
let d = await getUserLocks(lock, "0x2F3B65fD3f5b4Efa1ccb258757aCc504aFd67F20");
$("#log_show").html(d[0].locked)
