import { ethers,network } from "hardhat"
import fs from "fs"
const { frontEndContractsFile, frontEndAbiFile } = require('../helper-hardhat-config.ts')





const updateFrondEnd = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Writing to front end...")
        await updateContractAddresses()
        await updateAbi()
        console.log("Front end written!")
    }
}

async function updateAbi() {
    const raffle = await ethers.getContract("Raffle")
    fs.writeFileSync(frontEndAbiFile, <string>raffle.interface.format(ethers.utils.FormatTypes.json))
}

async function updateContractAddresses() {
    const raffle = await ethers.getContract("Raffle")
    const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))
    const chainId = network.config.chainId
    if(chainId){
        if (chainId.toString() in contractAddresses) {
            if (!contractAddresses[chainId.toString()].includes(raffle.address)) {
                contractAddresses[chainId.toString()].push(raffle.address)
            }
        } else {
            contractAddresses[chainId.toString()] = [raffle.address]
        }
        fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))
    }
    
}

export default updateFrondEnd
updateFrondEnd.tags = ["all", "update"]