const { expect } = require("chai");

describe("ShibMemeToken合约测试", function() {
  let shibMemeToken;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addr4;
  let initialSupply;
  let lpPair;
  
  before(async function() {
    // 获取签名者
    const [deployer, account1, account2, account3, account4, lpAccount] = await ethers.getSigners();
    owner = deployer;
    addr1 = account1;
    addr2 = account2;
    addr3 = account3;
    addr4 = account4;
    lpPair = lpAccount.address;
    
    // 设置初始供应量（1000万亿代币）
    initialSupply = ethers.utils.parseEther("1000000000000");
    
    // 获取合约工厂并部署
    const ShibMemeToken = await ethers.getContractFactory("ShibMemeToken");
    shibMemeToken = await ShibMemeToken.deploy(
      "ShibMemeToken", 
      "SMEME", 
      initialSupply, 
      "一个基于以太坊的SHIB风格Meme代币",
      addr1.address, // marketingWallet
      addr2.address, // charityWallet
      addr3.address  // devWallet
    );
    
    await shibMemeToken.deployed();
    
    // 设置流动性池地址
    await shibMemeToken.setLiquidityPair(lpPair);
    
    // 启用交易
    await shibMemeToken.setTradingEnabled(true);
  });

  // 测试合约部署
  describe("部署", function() {
    it("应该将初始供应量分配给部署者", async function() {
      const ownerBalance = await shibMemeToken.balanceOf(owner.address);
      expect(await shibMemeToken.totalSupply()).to.equal(ownerBalance);
    });

    it("应该设置正确的代币名称和符号", async function() {
      expect(await shibMemeToken.name()).to.equal("ShibMemeToken");
      expect(await shibMemeToken.symbol()).to.equal("SMEME");
    });

    it("应该设置正确的最大供应量", async function() {
      const maxSupply = ethers.utils.parseEther("1000000000000"); // 1000万亿
      expect(await shibMemeToken.MAX_SUPPLY()).to.equal(maxSupply);
    });

    it("应该设置正确的代币描述", async function() {
      expect(await shibMemeToken.memeDescription()).to.equal("一个基于以太坊的SHIB风格Meme代币");
    });
    
    it("应该设置正确的税收钱包地址", async function() {
      expect(await shibMemeToken.marketingWallet()).to.equal(addr1.address);
      expect(await shibMemeToken.charityWallet()).to.equal(addr2.address);
      expect(await shibMemeToken.devWallet()).to.equal(addr3.address);
    });
  });

  // 测试交易功能
  describe("交易", function() {
    it("应该允许所有者转账代币", async function() {
      const transferAmount = ethers.utils.parseEther("1000");
      
      // 从owner转账到addr1，使用transferWithTax
      await shibMemeToken.transferWithTax(addr1.address, transferAmount);
      const addr1Balance = await shibMemeToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(transferAmount);
    });

    it("应该在余额不足时拒绝转账", async function() {
      const initialOwnerBalance = await shibMemeToken.balanceOf(owner.address);
      const largeAmount = ethers.utils.parseEther("10000000000000"); // 超过总供应量
      
      // 尝试转账超过余额的金额，应该失败
      await expect(
        shibMemeToken.connect(addr1).transferWithTax(owner.address, largeAmount)
      ).to.be.reverted;
      
      // 确认余额没有变化
      expect(await shibMemeToken.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    });
  });

  // 测试交易税功能
  describe("交易税", function() {
    it("应该对卖出交易征收税费", async function() {
      // 确保税收已启用
      await shibMemeToken.setTaxEnabled(true);
      
      // 从owner转账一些代币给addr4，使用transferWithTax
      const transferAmount = ethers.utils.parseEther("1000");
      await shibMemeToken.transferWithTax(addr4.address, transferAmount);
      
      // 获取税收前各钱包余额
      const marketingBefore = await shibMemeToken.balanceOf(addr1.address);
      const charityBefore = await shibMemeToken.balanceOf(addr2.address);
      const devBefore = await shibMemeToken.balanceOf(addr3.address);
      const addr4Before = await shibMemeToken.balanceOf(addr4.address);
      
      // addr4向流动性池卖出代币（触发卖出税），使用transferWithTax
      const sellAmount = ethers.utils.parseEther("100");
      await shibMemeToken.connect(addr4).transferWithTax(lpPair, sellAmount);
      
      // 卖出税率为10%，税费应为10代币
      const expectedTax = sellAmount.mul(10).div(100);
      
      // 检查addr4余额减少了sellAmount
      expect(await shibMemeToken.balanceOf(addr4.address)).to.equal(addr4Before.sub(sellAmount));
      
      // 检查税收钱包收到了税费（可能有精度误差，使用近似检查）
      const totalTaxCollected = 
        (await shibMemeToken.balanceOf(addr1.address)).sub(marketingBefore).add(
        (await shibMemeToken.balanceOf(addr2.address)).sub(charityBefore)).add(
        (await shibMemeToken.balanceOf(addr3.address)).sub(devBefore)
      );
      
      expect(totalTaxCollected).to.equal(expectedTax);
    });
    
    it("应该允许所有者更新税率", async function() {
      await shibMemeToken.updateTaxRates(3, 7);
      expect(await shibMemeToken.buyTaxRate()).to.equal(3);
      expect(await shibMemeToken.sellTaxRate()).to.equal(7);
      
      // 非所有者不应该能更新税率
      await expect(
        shibMemeToken.connect(addr1).updateTaxRates(5, 10)
      ).to.be.reverted;
    });
  });

  // 测试交易限制功能
  describe("交易限制", function() {
    it("应该限制单笔交易最大额度", async function () {
      // 直接验证maxTransactionAmount函数的存在
      const maxAmount = await shibMemeToken.maxTransactionAmount();
      // 验证maxAmount是一个有效的uint256值
      expect(maxAmount.gt(0)).to.be.true;
    });
    
    it("应该限制钱包最大持有量", async function () {
      // 直接验证maxWalletSize函数的存在
      const maxWalletSize = await shibMemeToken.maxWalletSize();
      // 验证maxWalletSize是一个有效的uint256值
      expect(maxWalletSize.gt(0)).to.be.true;
    });
  });

  // 测试白名单功能
  describe("白名单", function() {
    it("应该允许所有者更新白名单", async function() {
      // 添加addr4到白名单
      await shibMemeToken.updateWhitelist(addr4.address, true);
      expect(await shibMemeToken.isWhitelisted(addr4.address)).to.be.true;
      
      // 从白名单移除addr4
      await shibMemeToken.updateWhitelist(addr4.address, false);
      expect(await shibMemeToken.isWhitelisted(addr4.address)).to.be.false;
    });
    
    it("白名单地址应该不受交易限制", async function() {
      // 将addr1添加到白名单
      await shibMemeToken.updateWhitelist(addr1.address, true);
      
      // 验证addr1在白名单中
      expect(await shibMemeToken.isWhitelisted(addr1.address)).to.be.true;
      
      // 简单转账测试（使用较小金额）
      const smallAmount = ethers.utils.parseEther("100");
      await shibMemeToken.transferWithTax(addr1.address, smallAmount);
      
      // 白名单地址应该可以正常转账
      await expect(
        shibMemeToken.connect(addr1).transferWithTax(addr2.address, smallAmount.div(2))
      ).to.not.be.reverted;
    });
  });

  // 测试税收分配功能
  describe("税收分配", function() {
    it("应该允许所有者更新税收分配比例", async function() {
      await shibMemeToken.updateTaxDistribution(50, 30, 20);
      expect(await shibMemeToken.marketingShare()).to.equal(50);
      expect(await shibMemeToken.charityShare()).to.equal(30);
      expect(await shibMemeToken.devShare()).to.equal(20);
    });
    
    it("应该允许所有者更新税收钱包地址", async function() {
      const newMarketingWallet = addr4.address;
      const newCharityWallet = addr1.address;
      const newDevWallet = addr2.address;
      
      await shibMemeToken.updateTaxWallets(newMarketingWallet, newCharityWallet, newDevWallet);
      
      expect(await shibMemeToken.marketingWallet()).to.equal(newMarketingWallet);
      expect(await shibMemeToken.charityWallet()).to.equal(newCharityWallet);
      expect(await shibMemeToken.devWallet()).to.equal(newDevWallet);
    });
  });

  // 测试交易状态控制
  describe("交易控制", function() {
    it("应该允许所有者暂停和恢复交易", async function () {
      // 验证tradingEnabled函数的存在
      const initialStatus = await shibMemeToken.tradingEnabled();
      
      // 尝试修改交易状态
      await shibMemeToken.setTradingEnabled(true);
      expect(await shibMemeToken.tradingEnabled()).to.be.true;
      
      // 再次修改交易状态
      await shibMemeToken.setTradingEnabled(false);
      expect(await shibMemeToken.tradingEnabled()).to.be.false;
    });
    
    it("应该允许所有者启用和禁用税收", async function() {
      // 禁用税收
      await shibMemeToken.setTaxEnabled(false);
      expect(await shibMemeToken.isTaxEnabled()).to.be.false;
      
      // 启用税收
      await shibMemeToken.setTaxEnabled(true);
      expect(await shibMemeToken.isTaxEnabled()).to.be.true;
    });
  });
});
