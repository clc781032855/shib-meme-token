const { expect } = require("chai");

describe("MemeToken合约测试", function() {
  let memeToken;
  let owner;
  let addr1;
  let addr2;
  let initialSupply;
  
  before(async function() {
    // 获取签名者
    const [deployer, account1, account2] = await ethers.getSigners();
    owner = deployer;
    addr1 = account1;
    addr2 = account2;
    
    // 设置初始供应量（1亿代币）
    initialSupply = ethers.utils.parseEther("100000000");
    
    // 获取合约工厂并部署
    const MemeToken = await ethers.getContractFactory("MemeToken");
    memeToken = await MemeToken.deploy(
      "MemeToken", 
      "MEME", 
      initialSupply, 
      "这是一个学习用的MEME代币"
    );
    
    await memeToken.deployed();
  });

  // 测试合约部署
  describe("部署", function() {
    it("应该将初始供应量分配给部署者", async function() {
      const ownerBalance = await memeToken.balanceOf(owner.address);
      expect(await memeToken.totalSupply()).to.equal(ownerBalance);
    });

    it("应该设置正确的代币名称和符号", async function() {
      expect(await memeToken.name()).to.equal("MemeToken");
      expect(await memeToken.symbol()).to.equal("MEME");
    });

    it("应该设置正确的最大供应量", async function() {
      const maxSupply = ethers.utils.parseEther("1000000000"); // 10亿
      expect(await memeToken.MAX_SUPPLY()).to.equal(maxSupply);
    });

    it("应该设置正确的代币描述", async function() {
      expect(await memeToken.memeDescription()).to.equal("这是一个学习用的MEME代币");
    });
  });

  // 测试交易功能
  describe("交易", function() {
    it("应该允许所有者转账代币", async function() {
      const transferAmount = ethers.utils.parseEther("1000");
      
      // 从owner转账到addr1
      await memeToken.transfer(addr1.address, transferAmount);
      const addr1Balance = await memeToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(transferAmount);
      
      // 从addr1转账到addr2
      await memeToken.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("500"));
      const addr2Balance = await memeToken.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(ethers.utils.parseEther("500"));
    });

    it("应该在余额不足时拒绝转账", async function() {
      const initialOwnerBalance = await memeToken.balanceOf(owner.address);
      const largeAmount = ethers.utils.parseEther("1000000000"); // 超过总供应量
      
      // 尝试转账超过余额的金额，应该失败
      await expect(
        memeToken.connect(addr1).transfer(owner.address, largeAmount)
      ).to.be.reverted;
      
      // 确认余额没有变化
      expect(await memeToken.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    });
  });

  // 测试铸造功能
  describe("铸造", function() {
    it("应该允许所有者铸造新代币", async function() {
      const mintAmount = ethers.utils.parseEther("50000000");
      await memeToken.mint(owner.address, mintAmount);
      
      const finalSupply = initialSupply.add(mintAmount);
      expect(await memeToken.totalSupply()).to.equal(finalSupply);
    });

    it("应该拒绝非所有者铸造代币", async function() {
      const mintAmount = ethers.utils.parseEther("1000");
      
      await expect(
        memeToken.connect(addr1).mint(addr1.address, mintAmount)
      ).to.be.reverted;
    });
  });

  // 测试销毁功能
  describe("销毁", function() {
    it("应该允许持有者销毁自己的代币", async function() {
      // 首先记录初始余额
      const initialBalance = await memeToken.balanceOf(addr1.address);
      
      const transferAmount = ethers.utils.parseEther("1000");
      const burnAmount = ethers.utils.parseEther("500");
      
      // 先转账一些代币给addr1
      await memeToken.transfer(addr1.address, transferAmount);
      
      // 确认转账后余额正确
      let addr1Balance = await memeToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(initialBalance.add(transferAmount));
      
      // addr1销毁一部分代币
      await memeToken.connect(addr1).burn(burnAmount);
      
      // 确认addr1的余额减少
      addr1Balance = await memeToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(initialBalance.add(transferAmount).sub(burnAmount));
    });
  });

  // 测试描述更新功能
  describe("更新描述", function() {
    it("应该允许所有者更新代币描述", async function() {
      const newDescription = "这是一个更新后的MEME代币描述";
      await memeToken.updateDescription(newDescription);
      expect(await memeToken.memeDescription()).to.equal(newDescription);
    });

    it("应该拒绝非所有者更新代币描述", async function() {
      const newDescription = "这是一个未授权的描述更新";
      
      await expect(
        memeToken.connect(addr1).updateDescription(newDescription)
      ).to.be.reverted;
    });
  });
});