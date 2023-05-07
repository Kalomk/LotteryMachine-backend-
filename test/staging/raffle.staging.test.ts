import {deployments,ethers,getNamedAccounts,network } from 'hardhat'
import {assert,expect} from 'chai'
import { Raffle,VRFCoordinatorV2Mock } from '../../typechain-types';
import { developmentChains } from '../../helper-hardhat-config';
import { BigNumber } from 'ethers';


developmentChains.includes(network.name)
    ? describe.skip:
describe('Raffle', async function (){
    let Raffle: Raffle;
    let deployer: string;
    let RaffleEntranceFee:BigNumber;

    beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        Raffle = await ethers.getContract('Raffle',deployer)
        RaffleEntranceFee = await Raffle.getEntranceFee()
    })
    describe('fulfillRandom',async () =>{
        it('it works in real Chain Link and VRF network',async () =>{
            console.log("Setting up test...")
            const account = await ethers.getSigners()
            const firstBlockStamp = await Raffle.getLastBlockStamp()


            await new Promise(async(resolve,reject) =>{
                console.log('Resolve in proccess...')

                Raffle.once('WinnerPicked',async () =>{
                    console.log("WinnerPicked event fired!")
                    try{
                        const recentWinner = await Raffle.getRecenWinner()
                        const players = await Raffle.getNumberOfPlayers()
                        const winnerBalance = await account[0].getBalance()
                        const lastBlockStamp = await Raffle.getLastBlockStamp()
                        const raffleState = await Raffle.getRaffleState()
                        
                        assert.equal(raffleState.toString(), '0')
                        assert.equal(players.toString(), '0')
                        assert(lastBlockStamp > firstBlockStamp)
                        assert.equal(recentWinner.toString(), account[0].address)
                        assert.equal(
                            winnerBalance.toString(), 
                            startingBalance // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                                .add(
                                    RaffleEntranceFee
                                )
                                .toString()
                        )
                        resolve(() =>{})
                    }
                catch(e){
                    reject(e)
                }
                })
                const tx = await Raffle.enterTheRaffle({value:RaffleEntranceFee})
                await tx.wait(1)
                console.log("Ok, time to wait...")
                const startingBalance = await account[0].getBalance()

            })
        })
    })
})