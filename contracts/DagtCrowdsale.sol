pragma solidity ^0.4.11;

import "zeppelin-solidity/contracts/crowdsale/validation/WhitelistedCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/distribution/FinalizableCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";

/**
 * @title DagtCrowdsale
 * @dev DAGT Token that can be minted.
 * It is meant to be used in a crowdsale contract.
 */
contract DagtCrowdsale is CappedCrowdsale, MintedCrowdsale, FinalizableCrowdsale, WhitelistedCrowdsale {
    using SafeMath for uint256;
    // Constants
    string public constant version = "1.1";
    // DAGT token unit.
    // Using same decimal value as ETH (makes ETH-DAGT conversion much easier).
    // This is the same as in DAGT token contract.
    uint256 public constant TOKEN_UNIT = 10 ** 18;
    // Maximum number of tokens in circulation
    uint256 public constant MAX_TOKENS = 100000000 * TOKEN_UNIT;
    // Values should be 10x percents, value 1000 = 100%
    uint public constant BONUS_COEFF = 1000; 
    // Variables
    address public remainingTokensWallet;
    uint public lockingRatio;

     // The following will be populated by main crowdsale contract
    uint32[] public BONUS_TIMES;
    uint32[] public BONUS_TIMES_VALUES;
    uint256[] public BONUS_AMOUNTS;
    uint32[] public BONUS_AMOUNTS_VALUES;

    /**
    * @dev Constructor, takes crowdsale opening and closing times.
    * @param _openingTime crowdsale opening time
    * @param _closingTime crowdsale closing time
    * @param _rate Number of token units a buyer gets per wei
    * @param _wallet Address where collected funds will be forwarded to
    * @param _remainingTokensWallet remaining tokens wallet
    * @param _cap Max amount of wei to be contributed
    * @param _lockingRatio locking ratio except bunus
    * @param _token Address of the token being sold
    */
    function DagtCrowdsale(uint256 _openingTime, uint256 _closingTime, uint256 _rate, address _wallet, address _remainingTokensWallet, uint256 _cap, uint _lockingRatio, MintableToken _token) public
        Crowdsale(_rate, _wallet, _token)
        CappedCrowdsale(_cap)
        TimedCrowdsale(_openingTime, _closingTime) {
            
        require(_remainingTokensWallet != address(0));
        remainingTokensWallet = _remainingTokensWallet;
        setLockedRatio(_lockingRatio);
    }
    /**
    * @dev Checks whether _beneficiary in whitelisted for the Presale And sale.
    * @param _beneficiary , User's Address. 
    * @return Whether _beneficiary in whitelisted.
    */
    function isWhitelistedAddress(address _beneficiary) public constant returns (bool) {
        return whitelist[_beneficiary];
    }
    /**
    * @dev Override to extend the way in which ether is converted to tokens.
    * @param _weiAmount Value in wei to be converted into tokens
    * @return Number of tokens that can be purchased with the specified _weiAmount
    */
    function _getTokenAmount(uint256 _weiAmount) internal view returns (uint256) {
        return computeTokens(_weiAmount);
    }
    /**
    * @dev Can be overridden to add finalization logic. The overriding function
    * should call super.finalization() to ensure the chain of finalization is
    * executed entirely.
    */
    function finalization() internal {
        //DAGT gets 20% of the amount of the total token supply
        uint256 totalSupply = token.totalSupply();
        // // total remaining Tokens
        // MintableToken token = MintableToken(token);
        MintableToken(token).mint(remainingTokensWallet,MAX_TOKENS.sub(totalSupply));
        MintableToken(token).finishMinting();
        super.finalization();
    }
    /**
    * @dev Overridden TimedCrowdsale, takes crowdsale opening and closing times.
    * @param _openingTime Crowdsale opening time
    * @param _closingTime Crowdsale closing time
    */
    function setTimedCrowdsale(uint256 _openingTime, uint256 _closingTime) public onlyOwner {
        // require(_openingTime >= now);
        require(_closingTime >= _openingTime);

        openingTime = _openingTime;
        closingTime = _closingTime;
    }
    /**
    * @dev Computes overall bonus based on time of contribution and amount of contribution. 
    * The total bonus is the sum of bonus by time and bonus by amount
    * @return tokens 
    */
    function computeTokens(uint256 _weiAmount) public constant returns(uint256) {
        uint256 tokens = _weiAmount.mul(rate.mul(computeTimeBonus(now))).div(BONUS_COEFF);
        uint256 bonus = tokens.mul(computeAmountBonus(_weiAmount)).div(BONUS_COEFF);
        return tokens.div(lockingRatio).add(bonus);
    }
    
   /**
    * @dev Set the lockingRatio  of  total bonus that is the sum of bonus by time. 
    * @param _lockingRatio locking ratio Except bunus
    */
    function setLockedRatio(uint _lockingRatio)  public onlyOwner{
        require(_lockingRatio > uint(0));
        lockingRatio = _lockingRatio;
    }
    /**
    * @dev Computes bonus based on time of contribution relative to the beginning of crowdsale
    * @return bonus 
    */
    function computeTimeBonus(uint256 _time) public constant returns(uint256) {
        require(_time >= openingTime);

        for (uint i = 0; i < BONUS_TIMES.length; i++) {
            if (_time.sub(openingTime) <= BONUS_TIMES[i]) {
                return BONUS_TIMES_VALUES[i];
            }
        }
        return 0;
    }

    /**
    * @dev Computes bonus based on amount of contribution
    * @return bonus 
    */
    function computeAmountBonus(uint256 _weiAmount) public constant returns(uint256) {
        for (uint i = 0; i < BONUS_AMOUNTS.length; i++) {
            if (_weiAmount >= BONUS_AMOUNTS[i]) {
                return BONUS_AMOUNTS_VALUES[i];
            }
        }
        return 0;
    }
      /**
    * @dev Retrieve length of bonuses by time array
    * @return Bonuses by time array length
    */
    function bonusesForTimesCount() public constant returns(uint) {
        return BONUS_TIMES.length;
    }

    /**
    * @dev Sets bonuses for time
    */
    function setBonusesForTimes(uint32[] times, uint32[] values) public onlyOwner {
        require(times.length == values.length);
        for (uint i = 0; i + 1 < times.length; i++) {
            require(times[i] < times[i+1]);
        }

        BONUS_TIMES = times;
        BONUS_TIMES_VALUES = values;
    }

    /**
    * @dev Retrieve length of bonuses by amounts array
    * @return Bonuses by amounts array length
    */
    function bonusesForAmountsCount() public constant returns(uint) {
        return BONUS_AMOUNTS.length;
    }

    /**
    * @dev Sets bonuses for USD amounts
    */
    function setBonusesForAmounts(uint256[] amounts, uint32[] values) public onlyOwner {
        require(amounts.length == values.length);
        for (uint i = 0; i + 1 < amounts.length; i++) {
            require(amounts[i] > amounts[i+1]);
        }

        BONUS_AMOUNTS = amounts;
        BONUS_AMOUNTS_VALUES = values;
    }

}
