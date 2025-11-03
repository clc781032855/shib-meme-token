const { ethers } = require("hardhat");

async function main() {
  // 部署者地址
  const [deployer] = await ethers.getSigners();
  console.log("部署合约的账户地址:", deployer.address);
  
  // 账户余额
  const balance = await deployer.getBalance();
  console.log("部署者账户余额:", ethers.utils.formatEther(balance), "ETH");
  
  // 部署MemeToken合约
  const Token = await ethers.getContractFactory("MemeToken");
  
  // 设置代币参数
  const name = "MemeToken";
  const symbol = "MEME";
  // 初始供应量：100,000,000 MEME代币
  const initialSupply = ethers.utils.parseEther("100000000");
  const description = "这是一个学习用的MEME代币，用于区块链教育目的。";
  
  console.log("部署MemeToken合约...");
  
  // 部署合约
  const token = await Token.deploy(name, symbol, initialSupply, description);
  
  // 等待合约部署完成
  await token.deployed();
  
  console.log("MemeToken合约已部署到:", token.address);
  
  // 显示合约信息
  console.log("\n合约信息:");
  console.log("代币名称:", await token.name());
  console.log("代币符号:", await token.symbol());
  console.log("代币精度:", await token.decimals());
  console.log("代币总供应量:", ethers.utils.formatEther(await token.totalSupply()), name);
  console.log("代币描述:", await token.memeDescription());
  console.log("最大供应量:", ethers.utils.formatEther(await token.MAX_SUPPLY()), name);
  
  // 显示部署者的代币余额
  const deployerBalance = await token.balanceOf(deployer.address);
  console.log("\n部署者代币余额:", ethers.utils.formatEther(deployerBalance), name);
}

// 执行主函数并处理错误
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("部署失败:", error);
    process.exit(1);
  });
