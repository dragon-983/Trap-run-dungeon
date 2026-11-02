// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title TRAP//RUN Shop
/// @notice Purchases and creation fees for TRAP//RUN on Arc Testnet.
/// @dev Prices are in six-decimal USDC base units. Payments go directly to the
/// treasury; there is no custody, withdrawal, wagering, payout, or randomness.
/// The supplied token must be the intended USDC ERC-20 interface.
contract TrapRunShop is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error ZeroAddress();
    error InvalidPackCount();
    error PriceTooHigh();
    error SkinNotForSale();
    error SkinAlreadyOwned();
    error InvalidDungeonHash();
    error DungeonAlreadyRegistered();
    error NotDungeonCreator();
    error InvalidHealthPackPrice();
    error OwnershipRenunciationDisabled();

    uint256 public constant HEALTH_PER_PACK = 5;
    uint256 public constant MAX_PACKS_PER_TX = 20;

    IERC20 public immutable usdc;
    address public treasury;
    uint256 public healthPackPrice;
    uint256 public createFee;
    uint256 public challengeFee;
    mapping(uint256 skinId => uint256 price) public skinPrice;
    mapping(address buyer => uint256 totalHealthPoints) public healthPurchased;
    mapping(address buyer => mapping(uint256 skinId => bool owned)) public skinOwned;
    mapping(address creator => mapping(bytes32 dungeonHash => bool registered)) public dungeonRegistered;
    uint256 public challengeCount;
    mapping(uint256 challengeId => address creator) public challengeCreator;
    mapping(uint256 challengeId => bytes32 dungeonHash) public challengeDungeon;

    event HealthPurchased(address indexed buyer, uint256 packs, uint256 healthPoints, uint256 paid);
    event SkinPurchased(address indexed buyer, uint256 indexed skinId, uint256 paid);
    event DungeonRegistered(address indexed creator, bytes32 indexed dungeonHash, uint256 paid);
    event ChallengeCreated(
        address indexed creator, bytes32 indexed dungeonHash, uint256 indexed challengeId, uint256 paid
    );
    event HealthPackPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event CreateFeeUpdated(uint256 oldFee, uint256 newFee);
    event ChallengeFeeUpdated(uint256 oldFee, uint256 newFee);
    event SkinPriceUpdated(uint256 indexed skinId, uint256 oldPrice, uint256 newPrice);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    /// @notice Initializes the payment token, two-step owner, treasury, and default prices.
    /// @param usdc_ USDC ERC-20 interface with six-decimal payment units.
    /// @param initialOwner Initial administrator; must not be zero.
    /// @param initialTreasury Direct recipient of payments; must not be zero.
    /// @dev Ownable rejects a zero initial owner with OwnableInvalidOwner.
    constructor(IERC20 usdc_, address initialOwner, address initialTreasury) Ownable(initialOwner) {
        if (address(usdc_) == address(0) || initialTreasury == address(0)) revert ZeroAddress();
        usdc = usdc_;
        treasury = initialTreasury;
        healthPackPrice = 500_000;
        createFee = 250_000;
        challengeFee = 100_000;
        skinPrice[1] = 1_000_000;
        skinPrice[2] = 1_000_000;
        skinPrice[3] = 2_000_000;
        skinPrice[4] = 3_000_000;
    }

    /// @notice Buys packs of five health points, recording lifetime purchased health.
    /// @param packs Number of packs, between one and MAX_PACKS_PER_TX inclusive.
    /// @param maxTotalPrice Maximum total payment authorized in USDC base units.
    function buyHealth(uint256 packs, uint256 maxTotalPrice) external nonReentrant {
        if (packs == 0 || packs > MAX_PACKS_PER_TX) revert InvalidPackCount();
        uint256 unitPrice = healthPackPrice;
        // Check the cap before multiplication, also preventing price multiplication overflow.
        if (unitPrice > maxTotalPrice / packs) revert PriceTooHigh();
        uint256 paid = packs * unitPrice;
        uint256 healthPoints = packs * HEALTH_PER_PACK;
        healthPurchased[msg.sender] += healthPoints;
        _pay(paid);
        emit HealthPurchased(msg.sender, packs, healthPoints, paid);
    }

    /// @notice Purchases a listed skin not already owned by the caller.
    /// @param skinId Identifier of the skin to purchase.
    /// @param maxPrice Maximum payment authorized in USDC base units.
    function buySkin(uint256 skinId, uint256 maxPrice) external nonReentrant {
        uint256 paid = skinPrice[skinId];
        if (paid == 0) revert SkinNotForSale();
        if (skinOwned[msg.sender][skinId]) revert SkinAlreadyOwned();
        if (paid > maxPrice) revert PriceTooHigh();
        skinOwned[msg.sender][skinId] = true;
        _pay(paid);
        emit SkinPurchased(msg.sender, skinId, paid);
    }

    /// @notice Registers a nonzero dungeon hash for the caller; registrations are scoped per creator.
    /// @param dungeonHash Hash identifying the dungeon; another account copying it cannot block the caller.
    /// @param maxFee Maximum creation fee authorized in USDC base units.
    function registerDungeon(bytes32 dungeonHash, uint256 maxFee) external nonReentrant {
        if (dungeonHash == bytes32(0)) revert InvalidDungeonHash();
        if (dungeonRegistered[msg.sender][dungeonHash]) revert DungeonAlreadyRegistered();
        uint256 paid = createFee;
        if (paid > maxFee) revert PriceTooHigh();
        dungeonRegistered[msg.sender][dungeonHash] = true;
        _pay(paid);
        emit DungeonRegistered(msg.sender, dungeonHash, paid);
    }

    /// @notice Creates a challenge for the caller's registered dungeon; only the creator pays.
    /// @param dungeonHash Hash of a dungeon previously registered by the caller.
    /// @param maxFee Maximum challenge fee authorized in USDC base units.
    /// @return challengeId Monotonically increasing identifier starting at one.
    /// @dev Friends playing a challenge incur no payment through this contract.
    function createChallenge(bytes32 dungeonHash, uint256 maxFee)
        external
        nonReentrant
        returns (uint256 challengeId)
    {
        if (!dungeonRegistered[msg.sender][dungeonHash]) revert NotDungeonCreator();
        uint256 paid = challengeFee;
        if (paid > maxFee) revert PriceTooHigh();
        challengeId = ++challengeCount;
        challengeCreator[challengeId] = msg.sender;
        challengeDungeon[challengeId] = dungeonHash;
        _pay(paid);
        emit ChallengeCreated(msg.sender, dungeonHash, challengeId, paid);
    }

    /// @notice Sets the positive price of one health pack; callable only by the owner.
    /// @param newPrice New price in USDC base units; must be greater than zero.
    function setHealthPackPrice(uint256 newPrice) external onlyOwner {
        if (newPrice == 0) revert InvalidHealthPackPrice();
        uint256 oldPrice = healthPackPrice;
        healthPackPrice = newPrice;
        emit HealthPackPriceUpdated(oldPrice, newPrice);
    }

    /// @notice Sets the dungeon registration fee; callable only by the owner.
    /// @param newFee New fee in USDC base units; zero makes registration free.
    function setCreateFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = createFee;
        createFee = newFee;
        emit CreateFeeUpdated(oldFee, newFee);
    }

    /// @notice Sets the challenge creation fee; callable only by the owner.
    /// @param newFee New fee in USDC base units; zero makes challenge creation free.
    function setChallengeFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = challengeFee;
        challengeFee = newFee;
        emit ChallengeFeeUpdated(oldFee, newFee);
    }

    /// @notice Lists, reprices, or delists a skin; callable only by the owner.
    /// @param skinId Identifier of the skin to configure.
    /// @param price New price in USDC base units; zero delists without revoking ownership.
    function setSkinPrice(uint256 skinId, uint256 price) external onlyOwner {
        uint256 oldPrice = skinPrice[skinId];
        skinPrice[skinId] = price;
        emit SkinPriceUpdated(skinId, oldPrice, price);
    }

    /// @notice Sets the nonzero recipient of future payments; callable only by the owner.
    /// @param newTreasury New treasury address.
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /// @notice Always reverts to prevent the owner from renouncing ownership.
    /// @dev Ownership may still be transferred using the inherited two-step process.
    function renounceOwnership() public override onlyOwner {
        revert OwnershipRenunciationDisabled();
    }

    /// @dev Transfers directly from the caller to the treasury, skipping zero fees.
    function _pay(uint256 amount) private {
        if (amount != 0) {
            usdc.safeTransferFrom(msg.sender, treasury, amount);
        }
    }
}
