// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
error Raffle__NotEnoughETH();
error Raffle__NotTransfered();
error Raffle__NotOpen();
error Raffle__NotCheckUpkeepNeeded(uint256 currentBalance,uint256 player_count, uint256 _raffleState);

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";

/**@title A sample Raffle Contract
 * @author Arestofan2010
 * @notice This contract is for creating a sample raffle contract
 * @dev This implements the Chainlink VRF Version 2
 */

contract Raffle is VRFConsumerBaseV2,AutomationCompatibleInterface {

    enum RaffleState {
        OPEN,
        CALCULATING
    }


    uint256 immutable private i_entranceFee;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 immutable private i_subscriptionId;
    address payable[] private s_players;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint16 private constant NUM_WORDS = 1;
    address private s_recentWinner;
    uint256 private s_lastBlockStamp;
    uint256 private immutable i_interval;

    RaffleState private s_raffleState;

    event RaffleEnter(address indexed player);
    event RequstedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed player );

    constructor(address vrfCoordinator,
        uint64 subscriptionId,
        bytes32 gasLane, // keyHash
        uint256 interval,
        uint256 entranceFee,
        uint32 callbackGasLimit ) VRFConsumerBaseV2(vrfCoordinator){
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinator);
        i_gasLane = gasLane;
        i_interval = interval;
        i_subscriptionId = subscriptionId;
        i_entranceFee = entranceFee;
        s_raffleState = RaffleState.OPEN;
        s_lastBlockStamp = block.timestamp;
        i_callbackGasLimit = callbackGasLimit;
    }

    function enterTheRaffle() external payable{
        if(msg.value < i_entranceFee){
            revert Raffle__NotEnoughETH();
        }
        if(s_raffleState != RaffleState.OPEN){
            revert Raffle__NotOpen();
        }
        s_players.push(payable (msg.sender));
        emit RaffleEnter(msg.sender);
    }

    function performUpkeep(bytes calldata) external override{
      (bool upkeepNeeded, ) = checkUpkeep("");

      if(!upkeepNeeded){
        revert Raffle__NotCheckUpkeepNeeded(address(this).balance, s_players.length, uint256(s_raffleState));
      }

      s_raffleState = RaffleState.CALCULATING;
      uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
      emit RequstedRaffleWinner(requestId);
    }

      function fulfillRandomWords(
        uint256,
        uint256[] memory _randomWords
    ) internal override {
        s_raffleState = RaffleState.OPEN;
        uint256 indexOfWinner = _randomWords[0] % s_players.length;
        address recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_players = new address payable[](0);
        s_lastBlockStamp = block.timestamp;
        (bool success,) = recentWinner.call{value:address(this).balance}('');

        if(!success){
            revert Raffle__NotTransfered();
        }
        emit WinnerPicked(recentWinner);
    }

       function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        override
        returns (bool upkeepNeeded, bytes memory)
    {
        bool isOpen = RaffleState.OPEN == s_raffleState;
        bool hasAPlayers =(s_players.length > 1);
        bool timePassed = ((block.timestamp - s_lastBlockStamp ) > i_interval);
        bool hasBalance = (address(this).balance > 0);
        upkeepNeeded = (isOpen && hasAPlayers && timePassed && hasBalance);
        return (upkeepNeeded, "0x0");
    }

    function getEntranceFee() external view returns(uint256){
        return i_entranceFee;
    }

    function getPlayer(uint256 index) external view returns(address){
        return s_players[index];
    }

     function getRecenWinner() external view returns(address){
        return s_recentWinner;
    }

     function getRaffleState() external view returns(RaffleState){
        return s_raffleState;
    }

    function getNumWords() external pure returns(uint256){
        return NUM_WORDS;
    }

    function getNumberOfPlayers() external view returns(uint256){
        return s_players.length;
    }

    function getNumberOfConfirmations() external pure returns(uint256){
        return REQUEST_CONFIRMATIONS;
    }

    function getLastBlockStamp() external view returns(uint256){
        return s_lastBlockStamp;
    }

    function getInterval() external view returns(uint256){
        return i_interval;
    }
}
