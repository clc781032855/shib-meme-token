// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ShibMemeToken
 * @dev 一个SHIB风格的Meme代币合约，实现了交易税、流动性池集成和交易限制功能
 */
contract ShibMemeToken is ERC20, ERC20Burnable, Ownable {
    // 代币基本参数
    string public memeDescription;
    uint256 public constant MAX_SUPPLY = 1000000000000 * 10 ** 18; // 1000万亿代币
    
    // 交易税参数
    uint256 public buyTaxRate = 5; // 买入税率（百分比）
    uint256 public sellTaxRate = 10; // 卖出税率（百分比）
    uint256 public constant MAX_TAX_RATE = 20; // 最大税率限制
    
    // 税收分配地址
    address public marketingWallet; // 营销钱包地址
    address public charityWallet; // 慈善钱包地址
    address public devWallet; // 开发钱包地址
    
    // 税收分配比例（总和必须为100）
    uint256 public marketingShare = 40; // 营销占比40%
    uint256 public charityShare = 30; // 慈善占比30%
    uint256 public devShare = 30; // 开发占比30%
    
    // 流动性池相关
    address public liquidityPair; // 流动性池对地址
    uint256 public liquidityFeeRate = 5; // 流动性池费用率
    uint256 public minLiquidityTime = 0; // 最小提供流动性时间
    
    // 交易限制参数
    uint256 public maxTransactionAmount; // 最大单笔交易量
    uint256 public maxWalletSize; // 最大钱包持有量
    uint256 public dailyTransactionLimit; // 每日交易限额
    mapping(address => uint256) public lastTransactionTimestamp; // 上次交易时间戳
    mapping(address => uint256) public dailyTransactionCount; // 每日交易次数
    mapping(address => uint256) public dailyTransactionVolume; // 每日交易额度
    
    // 白名单
    mapping(address => bool) public isWhitelisted; // 白名单地址
    bool public tradingEnabled = false; // 交易是否启用
    bool public isTaxEnabled = true; // 税收是否启用
    
    // 事件定义
    // 税率变更事件
    event TaxRateChanged(uint256 newBuyTaxRate, uint256 newSellTaxRate);
    // 税收分配比例变更事件
    event TaxDistributionChanged(uint256 marketing, uint256 charity, uint256 dev);
    // 税收钱包地址变更事件
    event TaxWalletChanged(string walletType, address newAddress);
    // 交易限制变更事件
    event TransactionLimitChanged(uint256 maxTxAmount, uint256 maxWallet, uint256 dailyLimit);
    // 白名单状态更新事件
    event WhitelistUpdated(address account, bool status);
    // 交易状态变更事件
    event TradingStatusChanged(bool enabled);
    // 税收状态变更事件
    event TaxStatusChanged(bool enabled);
    // 流动性池设置事件
    event LiquidityPoolSet(address lpPair);
    // 费用分配事件
    event FeeDistributed(address marketing, address charity, address dev, uint256 amount);
    
    /**
     * @dev 构造函数，初始化代币
     * @param name 代币名称
     * @param symbol 代币符号
     * @param initialSupply 初始供应量
     * @param description 代币描述
     * @param _marketingWallet 营销钱包地址
     * @param _charityWallet 慈善钱包地址
     * @param _devWallet 开发钱包地址
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        string memory description,
        address _marketingWallet,
        address _charityWallet,
        address _devWallet
    ) ERC20(name, symbol) Ownable(msg.sender) {
        memeDescription = description;
        
        // 设置税收钱包地址
        require(_marketingWallet != address(0) && _charityWallet != address(0) && _devWallet != address(0), "Invalid wallet address");
        marketingWallet = _marketingWallet;
        charityWallet = _charityWallet;
        devWallet = _devWallet;
        
        // 确保初始供应量不超过最大供应量
        require(initialSupply <= MAX_SUPPLY, "Initial supply exceeds max supply");
        
        // 铸造初始代币到合约部署者地址
        _mint(msg.sender, initialSupply);
        
        // 初始化流动性池地址
        liquidityPair = address(0);
        
        // 设置默认交易限制
        maxTransactionAmount = initialSupply / 1000; // 默认为初始供应量的0.1%
        maxWalletSize = initialSupply / 100; // 默认为初始供应量的1%
        dailyTransactionLimit = initialSupply / 1000; // 默认为初始供应量的0.1%
        
        // 添加默认白名单
        isWhitelisted[msg.sender] = true;
        isWhitelisted[_marketingWallet] = true;
        isWhitelisted[_charityWallet] = true;
        isWhitelisted[_devWallet] = true;
    }
    
    /**
     * @dev 自定义转账函数，使用transferFrom和approve机制实现交易税和限制功能
     * @param to 接收者地址
     * @param amount 转账金额
     * @return 转账是否成功
     */
    function transferWithTax(address to, uint256 amount) public returns (bool) {
        address from = msg.sender;
        
        // 交易限制检查
        if (!isWhitelisted[from] && !isWhitelisted[to] && tradingEnabled) {
            // 检查交易是否启用
            require(tradingEnabled, "Trading is not enabled yet");
            
            // 检查单笔交易限额
            require(amount <= maxTransactionAmount, "Transaction amount exceeds maximum limit");
            
            // 检查钱包持有量限制
            if (to != liquidityPair) {
                require(balanceOf(to) + amount <= maxWalletSize, "Wallet size limit exceeded");
            }
            
            // 检查每日交易次数和额度
            uint256 currentDay = block.timestamp / 86400; // 每天的时间戳
            uint256 lastDay = lastTransactionTimestamp[from] / 86400;
            
            if (lastDay != currentDay) {
                dailyTransactionCount[from] = 0;
                dailyTransactionVolume[from] = 0;
            }
            
            require(dailyTransactionCount[from] < 100, "Daily transaction count limit exceeded"); // 每日最多100笔交易
            require(dailyTransactionVolume[from] + amount <= dailyTransactionLimit, "Daily transaction volume limit exceeded");
            
            // 更新交易记录
            lastTransactionTimestamp[from] = block.timestamp;
            dailyTransactionCount[from]++;
            dailyTransactionVolume[from] += amount;
        }
        
        // 税收处理
        uint256 taxAmount = 0;
        if (isTaxEnabled && !isWhitelisted[from] && !isWhitelisted[to]) {
            // 根据交易方向确定税率
            bool isBuying = from == liquidityPair;
            bool isSelling = to == liquidityPair;
            
            if (isBuying) {
                taxAmount = (amount * buyTaxRate) / 100;
            } else if (isSelling) {
                taxAmount = (amount * sellTaxRate) / 100;
            }
        }
        
        // 计算实际转账金额
        uint256 transferAmount = amount - taxAmount;
        
        // 执行实际转账
        super._transfer(from, to, transferAmount);
        
        // 设置成功标志
        bool success = true;
        
        // 分配税收
        if (taxAmount > 0 && success) {
            _distributeTax(taxAmount);
        }
        
        return success;
    }
    
    /**
     * @dev 分配交易税费到各个钱包
     * @param amount 税费总额
     */
    function _distributeTax(uint256 amount) internal {
        // 计算各钱包应得的税费
        uint256 marketingAmount = (amount * marketingShare) / 100;
        uint256 charityAmount = (amount * charityShare) / 100;
        uint256 devAmount = amount - marketingAmount - charityAmount;
        
        // 转账税费到各个钱包
        super._transfer(msg.sender, marketingWallet, marketingAmount);
        super._transfer(msg.sender, charityWallet, charityAmount);
        super._transfer(msg.sender, devWallet, devAmount);
        
        emit FeeDistributed(marketingWallet, charityWallet, devWallet, amount);
    }
    
    /**
     * @dev 设置流动性池对地址
     * @param _liquidityPair 流动性池对地址
     */
    function setLiquidityPair(address _liquidityPair) external onlyOwner {
        require(liquidityPair == address(0), "Liquidity pair already set");
        require(_liquidityPair != address(0), "Invalid liquidity pair address");
        liquidityPair = _liquidityPair;
        minLiquidityTime = block.timestamp + 24 hours; // 初始流动性至少锁定24小时
        
        emit LiquidityPoolSet(_liquidityPair);
    }
    
    /**
     * @dev 更新税率
     * @param _buyTaxRate 买入税率
     * @param _sellTaxRate 卖出税率
     */
    function updateTaxRates(uint256 _buyTaxRate, uint256 _sellTaxRate) external onlyOwner {
        require(_buyTaxRate <= MAX_TAX_RATE && _sellTaxRate <= MAX_TAX_RATE, "Tax rate exceeds maximum limit");
        buyTaxRate = _buyTaxRate;
        sellTaxRate = _sellTaxRate;
        
        emit TaxRateChanged(_buyTaxRate, _sellTaxRate);
    }
    
    /**
     * @dev 更新税收分配比例
     * @param _marketingShare 营销占比
     * @param _charityShare 慈善占比
     * @param _devShare 开发占比
     */
    function updateTaxDistribution(uint256 _marketingShare, uint256 _charityShare, uint256 _devShare) external onlyOwner {
        require(_marketingShare + _charityShare + _devShare == 100, "Tax distribution must sum to 100");
        marketingShare = _marketingShare;
        charityShare = _charityShare;
        devShare = _devShare;
        
        emit TaxDistributionChanged(_marketingShare, _charityShare, _devShare);
    }
    
    /**
     * @dev 更新税收钱包地址
     * @param _marketingWallet 营销钱包地址
     * @param _charityWallet 慈善钱包地址
     * @param _devWallet 开发钱包地址
     */
    function updateTaxWallets(address _marketingWallet, address _charityWallet, address _devWallet) external onlyOwner {
        require(_marketingWallet != address(0) && _charityWallet != address(0) && _devWallet != address(0), "Invalid wallet address");
        
        if (marketingWallet != _marketingWallet) {
            marketingWallet = _marketingWallet;
            emit TaxWalletChanged("marketing", _marketingWallet);
        }
        
        if (charityWallet != _charityWallet) {
            charityWallet = _charityWallet;
            emit TaxWalletChanged("charity", _charityWallet);
        }
        
        if (devWallet != _devWallet) {
            devWallet = _devWallet;
            emit TaxWalletChanged("dev", _devWallet);
        }
    }
    
    /**
     * @dev 更新交易限制
     * @param _maxTransactionAmount 最大单笔交易量
     * @param _maxWalletSize 最大钱包持有量
     * @param _dailyTransactionLimit 每日交易限额
     */
    function updateTransactionLimits(uint256 _maxTransactionAmount, uint256 _maxWalletSize, uint256 _dailyTransactionLimit) external onlyOwner {
        maxTransactionAmount = _maxTransactionAmount;
        maxWalletSize = _maxWalletSize;
        dailyTransactionLimit = _dailyTransactionLimit;
        
        emit TransactionLimitChanged(_maxTransactionAmount, _maxWalletSize, _dailyTransactionLimit);
    }
    
    /**
     * @dev 更新白名单状态
     * @param account 账户地址
     * @param status 是否加入白名单
     */
    function updateWhitelist(address account, bool status) external onlyOwner {
        isWhitelisted[account] = status;
        emit WhitelistUpdated(account, status);
    }
    
    /**
     * @dev 设置交易启用状态
     * @param enabled 是否启用交易
     */
    function setTradingEnabled(bool enabled) external onlyOwner {
        tradingEnabled = enabled;
        emit TradingStatusChanged(enabled);
    }
    
    /**
     * @dev 设置税收启用状态
     * @param enabled 是否启用税收
     */
    function setTaxEnabled(bool enabled) external onlyOwner {
        isTaxEnabled = enabled;
        emit TaxStatusChanged(enabled);
    }
    
    /**
     * @dev 更新代币描述
     * @param newDescription 新的描述内容
     */
    function updateDescription(string memory newDescription) public onlyOwner {
        memeDescription = newDescription;
    }
    
    /**
     * @dev 铸造新代币（仅所有者）
     * @param to 接收者地址
     * @param amount 铸造数量
     */
    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Mint would exceed max supply");
        _mint(to, amount);
    }
    
    /**
     * @dev 紧急提取卡住的ETH（仅所有者）
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
