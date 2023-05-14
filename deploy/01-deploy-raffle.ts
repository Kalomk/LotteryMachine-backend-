
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { verify } from "../utils/verify"
import { networkConfig,developmentChains } from "../helper-hardhat-config"
import { ethers } from "hardhat"
import { Contract } from "ethers"

const FUND_AMOUNT = ethers.utils.parseEther("1") // 1 Ether, or 1e18 (10^18) Wei



const deployFundMe: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  // @ts-ignore
  const { getNamedAccounts, deployments, network } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  let vrfCoordinatorV2Address:string,
  subscriptionId:string,
  vrfCoordinatorV2Mock:Contract;
  if (developmentChains.includes(network.name)) {
    // create VRFV2 Subscription
    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
    const transactionReceipt = await transactionResponse.wait(1)
    subscriptionId = transactionReceipt.events[0].args.subId
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
} else {
    vrfCoordinatorV2Address = networkConfig[network.name]["VRFCoordinatorV2Address"]!
    subscriptionId = networkConfig[network.name]["subscriptionId"]!
}
  log("----------------------------------------------------")
  log("Deploying Raffle and waiting for confirmations...")
  const args = [
            vrfCoordinatorV2Address,
            subscriptionId,
            networkConfig[network.name]["gasLane"],
            networkConfig[network.name]["interval"],
            networkConfig[network.name]["entranceFee"],
            networkConfig[network.name]["callbackGasLimit"],
        ]
  const raffle = await deploy("Raffle", {
            from: deployer,
            args: args,
            log: true,
            waitConfirmations: networkConfig[network.name].blockConfirmations || 0,
        })
        
        if (developmentChains.includes(network.name)) {
          vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
          await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);
      
          log('Consumer is added');
        }

        if (!developmentChains.includes(network.name) && process.env.ETHER_SCAN_API ) {
          log("Verifying...")
          await verify(raffle.address, args)
      }

}
export default deployFundMe

deployFundMe.tags = ["all", "fundMe"]