import { BigNumber } from "ethers"
import { ethers } from "hardhat"

export interface networkConfigItem {
    VRFCoordinatorV2Address?: string
    blockConfirmations?: number
    entranceFee:BigNumber
    gasLane:string;
    subscriptionId?:string;
    callbackGasLimit:string;
    interval:string;
  }
  
  export interface networkConfigInfo {
    [key: string]: networkConfigItem
  }

export const networkConfig:networkConfigInfo ={
    sepolia:{
        VRFCoordinatorV2Address:'0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625',
        blockConfirmations:6,
        entranceFee:ethers.utils.parseEther('0.01'),
        gasLane:'0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c',
        subscriptionId:'1813',
        interval:'30',
        callbackGasLimit:'500000'
    },
    hardhat: {
      entranceFee:ethers.utils.parseEther('0.01'),
      gasLane:'0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c',
      interval:'30',
      callbackGasLimit:'500000'
    },
}

export const frontEndContractsFile = '../hh-front-end-lottery/src/constants/contractAdresses.json'
export const frontEndAbiFile = '../hh-front-end-lottery/src/constants/contractAbi.json'
export const developmentChains = ['hardhat','localhost'];
export const DECIMALS = "8"
export const INITIAL_PRICE = "200000000000"
