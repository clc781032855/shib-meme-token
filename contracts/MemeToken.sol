// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MemeToken
 * @dev 一个简单的MEME代币实现，基于ERC20标准
 */
contract MemeToken is ERC20, ERC20Burnable, Ownable {
    // MEME代币特有的属性
    string public memeDescription;
    uint256 public constant MAX_SUPPLY = 1000000000 * 10 ** 18; // 10亿代币

    /**
     * @dev 构造函数，初始化代币
     * @param name 代币名称
     * @param symbol 代币符号
     * @param initialSupply 初始供应量
     * @param description 代币描述
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        string memory description
    ) ERC20(name, symbol) Ownable(msg.sender) {
        memeDescription = description;
        
        // 确保初始供应量不超过最大供应量
        require(initialSupply <= MAX_SUPPLY, "Initial supply exceeds max supply");
        
        // 铸造初始代币到合约部署者地址
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev 铸造新代币
     * @param to 接收者地址
     * @param amount 铸造数量
     */
    function mint(address to, uint256 amount) public onlyOwner {
        // 确保铸造后总供应量不超过最大供应量
        require(totalSupply() + amount <= MAX_SUPPLY, "Mint would exceed max supply");
        _mint(to, amount);
    }

    /**
     * @dev 更新MEME代币描述
     * @param newDescription 新的描述内容
     */
    function updateDescription(string memory newDescription) public onlyOwner {
        memeDescription = newDescription;
    }
}
