# ShibMemeToken 操作指南

本文档详细介绍了如何部署和使用 ShibMemeToken 合约，该合约是一个基于以太坊的 SHIB 风格 Meme 代币，具有交易税、流动性池集成和交易限制功能。

## 目录

- [项目准备](#项目准备)
- [合约部署](#合约部署)
- [初始配置](#初始配置)
- [代币交易](#代币交易)
- [流动性管理](#流动性管理)
- [税收管理](#税收管理)
- [交易限制管理](#交易限制管理)
- [常见问题](#常见问题)

## 项目准备

### 环境要求

- Node.js >= 14.x
- npm 或 yarn
- Hardhat
- MetaMask 或其他以太坊钱包

### 安装依赖

在项目根目录执行以下命令安装必要的依赖：

```bash
npm install
# 或
yarn install
```

### 配置网络

在 `hardhat.config.js` 文件中配置您想要部署的网络：

```javascript
module.exports = {
  solidity: "0.8.20",
  networks: {
    goerli: {
      url: `https://goerli.infura.io/v3/YOUR_INFURA_KEY`,
      accounts: [`0x${YOUR_PRIVATE_KEY}`]
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/YOUR_INFURA_KEY`,
      accounts: [`0x${YOUR_PRIVATE_KEY}`]
    }
  }
};
```

## 合约部署

### 步骤 1: 准备部署参数

编辑 `scripts/deployShibToken.js` 文件，设置以下参数：

- 代币名称和符号
- 初始供应量
- 代币描述
- 税收钱包地址（营销、慈善、开发钱包）

### 步骤 2: 部署到本地网络

在本地运行 Hardhat 节点：

```bash
npx hardhat node
```

然后在另一个终端部署合约：

```bash
npx hardhat run scripts/deployShibToken.js --network localhost
```

### 步骤 3: 部署到测试网或主网

部署到 Goerli 测试网：

```bash
npx hardhat run scripts/deployShibToken.js --network goerli
```

部署到以太坊主网：

```bash
npx hardhat run scripts/deployShibToken.js --network mainnet
```

## 初始配置

部署完成后，需要进行以下初始配置：

### 设置流动性池地址

在 Uniswap 或其他 DEX 创建流动性池后，使用以下命令设置流动性池地址：

```javascript
// 使用合约所有者地址调用
await shibMemeToken.setLiquidityPair("YOUR_LP_PAIR_ADDRESS");
```

### 启用交易

默认情况下，交易是禁用的，需要手动启用：

```javascript
// 使用合约所有者地址调用
await shibMemeToken.setTradingEnabled(true);
```

## 代币交易

### 通过 MetaMask 交易

1. 在 MetaMask 中添加代币（使用合约地址）
2. 使用 MetaMask 的发送功能进行转账

### 交易注意事项

- 买入交易征收买入税率的税费
- 卖出交易征收卖出税率的税费
- 白名单地址不受交易限制
- 非白名单地址受单笔交易限额、钱包持有量限制和每日交易限制

## 流动性管理

### 添加流动性

1. 访问 Uniswap 或其他 DEX
2. 连接您的钱包
3. 选择 "Pool" 或 "流动性"
4. 选择 ShibMemeToken 和 ETH
5. 输入想要添加的数量
6. 确认交易

### 移除流动性

1. 访问 Uniswap 或其他 DEX
2. 连接您的钱包
3. 选择 "Pool" 或 "流动性"
4. 找到您的流动性头寸
5. 点击 "移除流动性"
6. 确认交易

## 税收管理

### 更新税率

```javascript
// 使用合约所有者地址调用
// 参数: 买入税率, 卖出税率 (百分比)
await shibMemeToken.updateTaxRates(5, 10);
```

### 更新税收分配比例

```javascript
// 使用合约所有者地址调用
// 参数: 营销占比, 慈善占比, 开发占比 (总和必须为100)
await shibMemeToken.updateTaxDistribution(40, 30, 30);
```

### 更新税收钱包地址

```javascript
// 使用合约所有者地址调用
await shibMemeToken.updateTaxWallets(
  "NEW_MARKETING_WALLET",
  "NEW_CHARITY_WALLET",
  "NEW_DEV_WALLET"
);
```

### 启用/禁用税收

```javascript
// 使用合约所有者地址调用
// 禁用税收
await shibMemeToken.setTaxEnabled(false);

// 启用税收
await shibMemeToken.setTaxEnabled(true);
```

## 交易限制管理

### 更新交易限制

```javascript
// 使用合约所有者地址调用
// 参数: 最大单笔交易量, 最大钱包持有量, 每日交易限额
await shibMemeToken.updateTransactionLimits(
  ethers.utils.parseEther("100000"),  // 最大单笔交易
  ethers.utils.parseEther("1000000"), // 最大钱包持有量
  ethers.utils.parseEther("500000")   // 每日交易限额
);
```

### 管理白名单

```javascript
// 使用合约所有者地址调用
// 添加地址到白名单
await shibMemeToken.updateWhitelist("USER_ADDRESS", true);

// 从白名单移除地址
await shibMemeToken.updateWhitelist("USER_ADDRESS", false);
```

### 启用/禁用交易

```javascript
// 使用合约所有者地址调用
// 禁用交易
await shibMemeToken.setTradingEnabled(false);

// 启用交易
await shibMemeToken.setTradingEnabled(true);
```

## 常见问题

### 1. 为什么我的交易失败了？

可能的原因：
- 交易金额超过最大单笔交易限制
- 接收方钱包将超过最大持有量限制
- 您的每日交易次数或额度已达上限
- 交易未启用
- Gas 费用不足

### 2. 如何检查我的交易是否被收取了税费？

您可以通过区块链浏览器查看交易详情，比较发送金额和接收金额的差额。

### 3. 如何更新代币描述？

```javascript
// 使用合约所有者地址调用
await shibMemeToken.updateDescription("新的代币描述");
```

### 4. 如何增加代币供应量？

```javascript
// 使用合约所有者地址调用
// 参数: 接收地址, 铸造数量
await shibMemeToken.mint("RECIPIENT_ADDRESS", ethers.utils.parseEther("1000000"));
```

### 5. 如何紧急提取合约中的ETH？

如果合约中意外收到ETH，可以通过以下方式提取：

```javascript
// 使用合约所有者地址调用
await shibMemeToken.emergencyWithdraw();
```

## 安全提示

1. 保管好合约所有者的私钥
2. 在主网部署前进行充分的测试
3. 谨慎设置税率和交易限制参数
4. 定期审查合约的使用情况
5. 考虑进行合约审计以确保安全性

---

本文档由 ShibMemeToken 团队编写，如有任何问题，请联系项目团队。
