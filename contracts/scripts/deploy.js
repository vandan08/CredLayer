const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

    // ─── 1. Deploy MockUSDC ───────────────────────────────────────
    console.log("\n📦 Deploying MockUSDC...");
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    const usdcAddress = await usdc.getAddress();
    console.log("✅ MockUSDC deployed to:", usdcAddress);

    // ─── 2. Deploy CreditRegistry ─────────────────────────────────
    // Using deployer as oracle for now (backend will replace later)
    console.log("\n📦 Deploying CreditRegistry...");
    const CreditRegistry = await hre.ethers.getContractFactory("CreditRegistry");
    const creditRegistry = await CreditRegistry.deploy(deployer.address);
    await creditRegistry.waitForDeployment();
    const creditRegistryAddress = await creditRegistry.getAddress();
    console.log("✅ CreditRegistry deployed to:", creditRegistryAddress);

    // ─── 3. Deploy CollateralVault ────────────────────────────────
    console.log("\n📦 Deploying CollateralVault...");
    const CollateralVault = await hre.ethers.getContractFactory("CollateralVault");
    const collateralVault = await CollateralVault.deploy(creditRegistryAddress, usdcAddress);
    await collateralVault.waitForDeployment();
    const collateralVaultAddress = await collateralVault.getAddress();
    console.log("✅ CollateralVault deployed to:", collateralVaultAddress);

    // ─── 4. Deploy LendingPool ────────────────────────────────────
    console.log("\n📦 Deploying LendingPool...");
    const LendingPool = await hre.ethers.getContractFactory("LendingPool");
    const lendingPool = await LendingPool.deploy(
        usdcAddress,
        creditRegistryAddress,
        collateralVaultAddress,
        deployer.address // approval signer = deployer for now
    );
    await lendingPool.waitForDeployment();
    const lendingPoolAddress = await lendingPool.getAddress();
    console.log("✅ LendingPool deployed to:", lendingPoolAddress);

    // ─── 5. Deploy Governance ─────────────────────────────────────
    console.log("\n📦 Deploying Governance...");
    const Governance = await hre.ethers.getContractFactory("Governance");
    const governance = await Governance.deploy();
    await governance.waitForDeployment();
    const governanceAddress = await governance.getAddress();
    console.log("✅ Governance deployed to:", governanceAddress);

    // ─── 6. Link Contracts ────────────────────────────────────────
    console.log("\n🔗 Linking contracts...");

    // Set LendingPool address in CollateralVault
    await collateralVault.setLendingPool(lendingPoolAddress);
    console.log("✅ CollateralVault → LendingPool linked");

    // ─── Summary ──────────────────────────────────────────────────
    console.log("\n" + "═".repeat(50));
    console.log("📋 DEPLOYMENT SUMMARY");
    console.log("═".repeat(50));
    console.log(`MockUSDC:        ${usdcAddress}`);
    console.log(`CreditRegistry:  ${creditRegistryAddress}`);
    console.log(`CollateralVault: ${collateralVaultAddress}`);
    console.log(`LendingPool:     ${lendingPoolAddress}`);
    console.log(`Governance:      ${governanceAddress}`);
    console.log("═".repeat(50));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
