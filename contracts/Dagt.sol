pragma solidity ^0.4.17;

import "zeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/PausableToken.sol";

/**
 * @dev DAGT token ERC20 contract
 * Based on references from OpenZeppelin: https://github.com/OpenZeppelin/zeppelin-solidity
 */
contract Dagt is MintableToken, PausableToken {
    string public constant version = "1.1";
    string public constant name = "DAGT Crypto Platform";
    string public constant symbol = "DAGT";
    uint8 public constant decimals = 18;

    event MintMasterTransferred(address indexed previousMaster, address indexed newMaster);
    
    address public mintMaster;

    modifier onlyMintMasterOrOwner() {
        require(msg.sender == mintMaster || msg.sender == owner);
        _;
    }

    function Dagt() public {
        mintMaster = msg.sender;
    }
        
    function transferMintMaster(address newMaster) onlyOwner public {
        require(newMaster != address(0));
        MintMasterTransferred(mintMaster, newMaster);
        mintMaster = newMaster;
    }

    function mintToAddresses(address[] addresses, uint256 amount) public onlyMintMasterOrOwner canMint {
        for (uint i = 0; i < addresses.length; i++) {
            require(mint(addresses[i], amount));
        }
    }

    function mintToAddressesAndAmounts(address[] addresses, uint256[] amounts) public onlyMintMasterOrOwner canMint {
        require(addresses.length == amounts.length);
        for (uint i = 0; i < addresses.length; i++) {
            require(mint(addresses[i], amounts[i]));
        }
    }
    /**
     * @dev Function to mint tokens
     * @param _to The address that will receive the minted tokens.
     * @param _amount The amount of tokens to mint.
     * @return A boolean that indicates if the operation was successful.
     */
    function mint(address _to, uint256 _amount) onlyMintMasterOrOwner canMint public returns (bool) {
        address oldOwner = owner;
        owner = msg.sender;
        bool result = super.mint(_to, _amount);
        owner = oldOwner;
        return result;
    }


}
