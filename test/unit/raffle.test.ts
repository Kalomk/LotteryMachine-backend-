import {deployments,ethers,getNamedAccounts,network } from 'hardhat'
import {assert,expect} from 'chai'
import { Raffle,VRFCoordinatorV2Mock } from '../../typechain-types';
import { developmentChains } from '../../helper-hardhat-config';
import { BigNumber } from 'ethers';
!developmentChains.includes(network.name)
    ? describe.skip:
describe('Raffle', async function (){
    let Raffle: Raffle;
    let deployer: string;
    let VRFCoordinatorV2Mock: VRFCoordinatorV2Mock;
    let RaffleEntranceFee:BigNumber;
    let RaffleInterval:BigNumber;

    beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(['all'])
        Raffle = await ethers.getContract('Raffle',deployer)
        VRFCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock',deployer)
        RaffleEntranceFee = await Raffle.getEntranceFee()
    })

    describe('constructor', async function (){
        it('Initialize Raffle correctly', async () => {
            const RaffleState = await Raffle.getRaffleState()
            RaffleInterval = await Raffle.getInterval()
            assert.equal(RaffleState.toString(), '0')
            assert.equal(RaffleInterval.toString(), '30')
        })
    })

    describe('Enter the Raffle', async function (){
        it('Fails if you dont spent enough ETH', async () =>{
           await expect(Raffle.enterTheRaffle()).to.be.revertedWithCustomError(Raffle,'Raffle__NotEnoughETH')
        })
        it('Records player when they enter', async () =>{
            await Raffle.enterTheRaffle({value:RaffleEntranceFee})
            const player = await Raffle.getPlayer(0)
            assert.equal(player,deployer)
         })
         it('Emit event when the player enter',async () =>{
            await expect(Raffle.enterTheRaffle({value:RaffleEntranceFee})).to.be.emit(Raffle,'RaffleEnter')
         })
        it('Dosent allow entrance when status is calculating',async () =>{
            await Raffle.enterTheRaffle({value:RaffleEntranceFee})
            await network.provider.send('evm_increaseTime',[RaffleInterval.toNumber() + 1])
            await network.provider.send('evm_mine',[])
            await Raffle.performUpkeep([])
            await expect(Raffle.enterTheRaffle({value:RaffleEntranceFee})).to.be.revertedWithCustomError(Raffle,'Raffle__NotOpen')
        })
        })
    describe('checkUpKeep',async () =>{
        it("return false if players haven't send any ETH",async () =>{
            await Raffle.enterTheRaffle({value:RaffleEntranceFee})
            await network.provider.send('evm_increaseTime',[RaffleInterval.toNumber() + 1])
            await network.provider.send('evm_mine',[])
            const {upkeepNeeded} = await Raffle.callStatic.checkUpkeep([])
            assert.isNotOk(!upkeepNeeded,'False!')
        })
        it("returns false if Raffle isn't open", async () => {
            await Raffle.enterTheRaffle({ value: RaffleEntranceFee })
            await network.provider.send("evm_increaseTime", [RaffleInterval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
            await Raffle.performUpkeep([]) // changes the state to calculating
            const RaffleState = await Raffle.getRaffleState() // stores the new state
            const { upkeepNeeded } = await Raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
            assert.equal(RaffleState.toString() == "1", upkeepNeeded == false)
        })
        it("returns false if enough time hasn't passed", async () => {
            await Raffle.enterTheRaffle({ value: RaffleEntranceFee })
            await network.provider.send("evm_increaseTime", [RaffleInterval.toNumber() - 5]) // use a higher number here if this test fails
            await network.provider.request({ method: "evm_mine", params: [] })
            const { upkeepNeeded } = await Raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
            assert.isNotOk(upkeepNeeded,'False!')
        })
        it("returns true if enough time has passed, has players, eth, and is open", async () => {
            await Raffle.enterTheRaffle({ value: RaffleEntranceFee })
            await network.provider.send("evm_increaseTime", [RaffleInterval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
            const { upkeepNeeded } = await Raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
            assert(upkeepNeeded)
        })
    })
    describe("performUpkeep", function () {
        it("can only run if checkupkeep is true", async () => {
            await Raffle.enterTheRaffle({ value: RaffleEntranceFee })
            await network.provider.send("evm_increaseTime", [RaffleInterval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
            const tx = await Raffle.performUpkeep("0x") 
            assert(tx)
        })
        it("reverts if checkup is false", async () => {
            await expect(Raffle.performUpkeep("0x")).to.be.revertedWithCustomError(Raffle,
                "Raffle__NotCheckUpkeepNeeded"
            )
        })
        it("updates the Raffle state and emits a requestId", async () => {
            // Too many asserts in this test!
            await Raffle.enterTheRaffle({ value: RaffleEntranceFee })
            await network.provider.send("evm_increaseTime", [RaffleInterval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
            const txResponse = await Raffle.performUpkeep("0x") // emits requestId
            const txReceipt:any = await txResponse.wait(1) // waits 1 block
            const RaffleState = await Raffle.getRaffleState() // updates state
            const requestId = txReceipt?.events[1]?.args?.requestId
            assert(requestId.toNumber() > 0)
            assert(RaffleState == 1) // 0 = open, 1 = calculating
        })
    })
    describe('fulfillRandom',async () =>{
        beforeEach(async () => {
            await Raffle.enterTheRaffle({ value: RaffleEntranceFee })
            await network.provider.send("evm_increaseTime", [RaffleInterval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
        })
        it("can only be called after performupkeep", async () => {
            await expect(
                VRFCoordinatorV2Mock.fulfillRandomWords(0, Raffle.address) // reverts if not fulfilled
            ).to.be.revertedWith("nonexistent request")
            await expect(
                VRFCoordinatorV2Mock.fulfillRandomWords(1, Raffle.address) // reverts if not fulfilled
            ).to.be.revertedWith("nonexistent request")
        })
        it('picks a winner,resets the lottery and send a money',async () =>{
            const additionalEntrance = 3;
            const startingIndex = 2;
            const account = await ethers.getSigners()

            for(let i = startingIndex; i < startingIndex + additionalEntrance; i++){
                Raffle = Raffle.connect(account[i])
                await Raffle.enterTheRaffle({value:RaffleEntranceFee})
            }

            const firstBlockStamp = await Raffle.getLastBlockStamp()


            await new Promise(async(resolve,reject) =>{
                console.log('Resolve in proccess...')

                Raffle.once('WinnerPicked',async () =>{
                    try{
                        const recentWinner = await Raffle.getRecenWinner()
                        const players = await Raffle.getNumberOfPlayers()
                        const winnerBalance = await account[2].getBalance()
                        const lastBlockStamp = await Raffle.getLastBlockStamp()
                        const raffleState = await Raffle.getRaffleState()
                        
                        assert.equal(raffleState.toString(), '0')
                        assert.equal(players.toString(), '0')
                        assert(lastBlockStamp > firstBlockStamp)
                        assert.equal(recentWinner.toString(), account[2].address)
                        assert.equal(
                            winnerBalance.toString(), 
                            startingBalance // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                                .add(
                                    RaffleEntranceFee
                                        .mul(additionalEntrance)
                                        .add(RaffleEntranceFee)
                                )
                                .toString()
                        )
                        resolve(() =>{})
                    }
                catch(e){
                    reject(e)
                }
                })
                const tx = await Raffle.performUpkeep("0x")
                const txReceipt:any = await tx.wait(1)
                const startingBalance = await account[2].getBalance()
                await VRFCoordinatorV2Mock.fulfillRandomWords(txReceipt?.events[1]?.args?.requestId,Raffle.address)

            })
        })
    })
    })
