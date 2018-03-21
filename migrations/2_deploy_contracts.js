var DagtCrowdsale = artifacts.require("DagtCrowdsale");
var DAGT = artifacts.require("Dagt");
module.exports = function(deployer, network, accounts) {
    const openingTime = web3.eth.getBlock('latest').timestamp + 2; // two secs in the future
    const closingTime = openingTime + 86400 * 30; // 30 days
    const rate = new web3.BigNumber(1118);
    const cap = new web3.BigNumber(200000000);
    const fundWallet = accounts[1];
    const remainingTokensWallet=accounts[2];
    return deployer
        .then(() => {
            return deployer.deploy(DAGT);
        })
        .then(() => {
            return deployer.deploy(
                DagtCrowdsale,
                openingTime,
                closingTime,
                rate,
                fundWallet,
                remainingTokensWallet,
                cap,
                DAGT.address
            );
        });
};  