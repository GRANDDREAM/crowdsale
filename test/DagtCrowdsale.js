'use strict'

const BigNumber = web3.BigNumber;
const expect = require('chai').expect;
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(web3.BigNumber))
  .should();

const DagtCrowdsale = artifacts.require("./DagtCrowdsale.sol");
const Token = artifacts.require('./Dagt.sol');
contract('DagtCrowdsale', function (accounts) {

  let crowdsale;
  let token;
  let beneficiary = accounts[5];

  beforeEach('setup contract for each test', async function () {
    crowdsale = await DagtCrowdsale.deployed();
    var tokenAddress = await crowdsale.token.call();
    token = await Token.at(tokenAddress);
    var tMintMaster = await token.mintMaster.call();
    assert.equal(crowdsale.address, tMintMaster, "拥有代币挖矿权限的账户不是私募合约");

  })
  it("版本部署成功", async function () {
    assert.equal(await crowdsale.version(), "1.1", "版本部署失败");
  });
  it("将地址加入白名单", async function () {
    await crowdsale.addToWhitelist(beneficiary);
    assert.isTrue(await crowdsale.isWhitelistedAddress(beneficiary), "加入白名单失败");
  });
  it("计算没有设置时间窗口内折扣的奖金数量", async function () {
    var bonus = await crowdsale.computeTimeBonus(Math.floor(Date.now() / 1000));
    bonus.should.be.bignumber.equal(0);
  });
  it("计算没有设置代币数量折扣的奖金数量", async function () {
    var bonus = await crowdsale.computeAmountBonus(web3.toWei('1', 'ether'));
    bonus.should.be.bignumber.equal(0);
  });
  it("设置时间窗口的折扣", async function () {
    var times = [7 * 86400, 14 * 86400, 21 * 86400, 28 * 86400, 35 * 86400];
    await crowdsale.setBonusesForTimes(times, [1521, 1431, 1252, 1109, 1000]);
    assert.equal(await crowdsale.bonusesForTimesCount(), times.length, "设置时间窗口折扣失败");
  });
  it("获取每代币的价格 1ETH=1118DAGT", async function () {
    assert.equal(await crowdsale.rate(), '1118', "代币的价格设置失败");
  });
  it("获取代币募资上线 20000000 DAGT", async function () {
    var cap = await crowdsale.cap();
    cap.should.be.bignumber.equal(web3.toWei('20000000', 'ether'));
  });
  it("计算时间窗口内折扣后的奖金数量", async function () {
    assert.equal(await crowdsale.computeTimeBonus(Math.floor(Date.now() / 1000)), "1521", "时间窗口折扣计算错误");
  });
  it("计算时间窗口内折扣后的代币总数量", async function () {
    var bonus = await crowdsale.computeTokens(web3.toWei("1", "ether"));
    bonus.should.be.bignumber.equal(0);
  });
  it("设置数量的折扣", async function () {
    var amounts = [web3.toWei('500', 'ether'), web3.toWei('300', 'ether'), web3.toWei('200', 'ether'), web3.toWei('100', 'ether')];
    await crowdsale.setBonusesForAmounts(amounts, [1150, 1100, 1050, 1000]);
    assert.equal(await crowdsale.bonusesForAmountsCount(), amounts.length, "设置数量的折扣失败");
  });
  it("计算设置数量的折扣后的奖金数量", async function () {
    var bonnus = await crowdsale.computeAmountBonus(web3.toWei("1", "ether"));
    bonnus.should.be.bignumber.equal(0);
    bonnus = await crowdsale.computeAmountBonus(web3.toWei("99", "ether"));
    bonnus.should.be.bignumber.equal(0);
    bonnus = await crowdsale.computeAmountBonus(web3.toWei("100", "ether"))
    bonnus.should.be.bignumber.equal(1000);
    bonnus = await crowdsale.computeAmountBonus(web3.toWei("200", "ether"))
    bonnus.should.be.bignumber.equal(1050);
    bonnus = await crowdsale.computeAmountBonus(web3.toWei("300", "ether"))
    bonnus.should.be.bignumber.equal(1100);
    bonnus = await crowdsale.computeAmountBonus(web3.toWei("500", "ether"))
    bonnus.should.be.bignumber.equal(1150);
    bonnus = await crowdsale.computeAmountBonus(web3.toWei("501", "ether"))
    bonnus.should.be.bignumber.equal(1150);
  });
  it("计算数量折扣和时间窗口后的代币总数量", async function () {
    var weiAmount = web3.toWei('1', 'ether');
    var amountBonus = await crowdsale.computeAmountBonus(weiAmount);
    var timesBonus = await crowdsale.computeTimeBonus(Math.floor(Date.now() / 1000));
    assert.equal(Math.floor(1118 * timesBonus / 1000), 1700, "计算数量折扣代币价格错误");
    assert.equal(Math.floor((1118 * timesBonus / 1000) * amountBonus / 1000), 0, "计算代币总量错误")
    var tokens = await crowdsale.computeTokens(weiAmount);
    tokens.should.be.bignumber.equal(0);
    tokens = await crowdsale.computeTokens(web3.toWei('100', 'ether'));
    assert.isAtMost(Math.floor(tokens / weiAmount) - 100 * 1700, 100, "计算代币总量错误");
    tokens = await crowdsale.computeTokens(web3.toWei('500', 'ether'));
    assert.isAtMost(Math.floor(tokens / weiAmount) - 500 * 1700 * 1.15, 500, "计算代币总量错误");

  });
  it("代币挖矿30000000", async function () {
    var balance = await token.balanceOf.call(accounts[0]);
    balance.should.be.bignumber.equal(web3.toWei('0', 'ether'));

    var amount = web3.toWei('30000000', 'ether')
    await token.mint(accounts[3], amount, { from: accounts[0] });
    balance = await token.balanceOf(accounts[3]);
    balance.should.be.bignumber.equal(amount);

    var totalSupply = await token.totalSupply();
    totalSupply.should.be.bignumber.equal(amount);
  });
  it("购买代币", async function () {
    var date = new Date();
    date.setDate(date.getDate() + 30);
    await crowdsale.setTimedCrowdsale(Math.floor(Date.now() / 1000), Math.floor(date / 1000));
    var balance = await token.balanceOf.call(beneficiary);
    balance.should.be.bignumber.equal(0);
    var amounts = [web3.toWei('50', 'ether'), web3.toWei('30', 'ether'), web3.toWei('20', 'ether'), web3.toWei('10', 'ether')];
    await crowdsale.setBonusesForAmounts(amounts, [1150, 1100, 1050, 1000]);

    //代币购买
    var balanceOfEth = await web3.eth.getBalance(accounts[1]);
    var value = web3.toWei('1', 'ether');
    await web3.eth.sendTransaction({ from: beneficiary, to: crowdsale.address, value: value, gas: 4500000 });
    balance = await token.balanceOf.call(beneficiary);
    balance.should.be.bignumber.equal(0);
    assert.equal(balanceOfEth.add(value).toString(), (await web3.eth.getBalance(accounts[1])).toString(), "转移ETH成功");
    
    balanceOfEth = await web3.eth.getBalance(accounts[1]);
    value = web3.toWei('10', 'ether');
    await web3.eth.sendTransaction({ from: beneficiary, to: crowdsale.address, value: value, gas: 4500000 });
    balance = await token.balanceOf.call(beneficiary);
    assert.isAtMost(Math.floor(balance / web3.toWei('1', 'ether')) - 10 * 1700, 10, "购买代币总量不对");
    assert.equal(balanceOfEth.add(value).toString(), (await web3.eth.getBalance(accounts[1])).toString(), "转移ETH成功");
  });

  it("购买部分代币后结束售卖", async function () {
    // const other = await token.owner.call();
    var isFinalized = await crowdsale.isFinalized.call();
    assert.isTrue(!isFinalized, "代币售卖已经结束");
    var closeTime = await crowdsale.closingTime.call();
    assert.isBelow(Math.floor(Date.now() / 1000), closeTime, "代币售卖结束时间小于当前时间");
    var date = new Date();
    date.setDate(date.getDate() - 1);
    await crowdsale.setTimedCrowdsale(Math.floor(date / 1000), Math.floor(date / 1000));
    var isClosed = await crowdsale.hasClosed();
    assert.isTrue(isClosed, "代币售卖结束");
    await token.transferOwnership(crowdsale.address);
    await crowdsale.finalize();
    isFinalized = await crowdsale.isFinalized.call();
    assert.isTrue(isFinalized, "代币售卖结束");
    var totalSupply = await token.totalSupply.call();
    totalSupply.should.be.bignumber.equal(web3.toWei('100000000', 'ether'));
    var balance = await token.balanceOf.call(accounts[2]);
    assert.isAtMost(balance.toString(), web3.toWei('70000000', 'ether').toString(), '剩余代币个数不对');
  });

});
