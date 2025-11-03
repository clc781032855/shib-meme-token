// 部署SHIB风格Meme代币合约的脚本
const { ethers } = require("hardhat");

async function main() {
  console.log("开始部署ShibMemeToken合约...");
  
  // 获取部署者地址
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);
  console.log("部署者余额:", (await deployer.getBalance()).toString());
  
  // 设置代币参数
  const tokenName = "ShibMemeToken";
  const tokenSymbol = "SMEME";
  const initialSupply = ethers.utils.parseEther("1000000000000"); // 1000万亿代币
  const tokenDescription = "一个基于以太坊的SHIB风格Meme代币，具有交易税、流动性池集成和交易限制功能";
  
  // 设置税收钱包地址（生产环境中请使用真实的钱包地址）
  // 注意：以下地址仅用于测试，实际部署时请替换为真实地址
  const marketingWallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const charityWallet = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  const devWallet = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
  
  // 获取合约工厂
  const ShibMemeToken = await ethers.getContractFactory("ShibMemeToken");
  
  // 部署合约
  console.log("正在部署合约...");
  const shibMemeToken = await ShibMemeToken.deploy(
    tokenName,
    tokenSymbol,
    initialSupply,
    tokenDescription,
    marketingWallet,
    charityWallet,
    devWallet
  );
  
  // 等待合约部署完成
  await shibMemeToken.deployed();
  
  console.log("ShibMemeToken合约部署成功！");
  console.log("合约地址:", shibMemeToken.address);
  
  // 验证部署信息
  console.log("\n验证部署信息:");
  console.log("代币名称:", await shibMemeToken.name());
  console.log("代币符号:", await shibMemeToken.symbol());
  console.log("总供应量:", (await shibMemeToken.totalSupply()).toString());
  console.log("最大供应量:", (await shibMemeToken.MAX_SUPPLY()).toString());
  console.log("代币描述:", await shibMemeToken.memeDescription());
  
  // 检查部署者余额
  const deployerBalance = await shibMemeToken.balanceOf(deployer.address);
  console.log("\n部署者代币余额:", deployerBalance.toString());
  
  console.log("\n部署脚本执行完成！");
}

// 执行部署
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
