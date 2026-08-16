const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

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

    // ─── 7. Seed local demo state ─────────────────────────────────
    // Give the pool starting liquidity and register the deployer so the
    // borrow/repay flow works immediately against a fresh Hardhat node.
    console.log("\n🌱 Seeding demo state...");
    const seedLiquidity = 500_000n * 10n ** 6n; // 500,000 USDC
    await (await usdc.approve(lendingPoolAddress, seedLiquidity)).wait();
    await (await lendingPool.deposit(seedLiquidity)).wait();
    console.log(`✅ Seeded LendingPool with ${seedLiquidity / 10n ** 6n} USDC of liquidity`);

    await (await creditRegistry.registerBorrower(deployer.address)).wait();
    console.log(`✅ Registered deployer as a borrower (default score 500 / Band C)`);

    // Seed one governance proposal so the frontend has live DAO content.
    const proposalCallData = lendingPool.interface.encodeFunctionData(
        "setMaxLoanAmount", [150_000n * 10n ** 6n]
    );
    await (await governance.createProposal(
        "GIP-1: Raise the protocol max loan amount from 100,000 to 150,000 USDC to support larger Band A borrowers.",
        lendingPoolAddress,
        proposalCallData
    )).wait();
    console.log("✅ Seeded demo governance proposal (GIP-1)");

    // ─── 8. Persist addresses ─────────────────────────────────────
    const addresses = {
        MockUSDC: usdcAddress,
        CreditRegistry: creditRegistryAddress,
        CollateralVault: collateralVaultAddress,
        LendingPool: lendingPoolAddress,
        Governance: governanceAddress,
    };

    // (a) A per-network record under contracts/deployments/
    const network = hre.network.name;
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    fs.mkdirSync(deploymentsDir, { recursive: true });
    fs.writeFileSync(
        path.join(deploymentsDir, `${network}.json`),
        JSON.stringify(addresses, null, 2) + "\n"
    );

    // (b) The file the frontend imports directly.
    const frontendFile = path.join(
        __dirname, "..", "..", "frontend", "decredit-protocol", "lib", "web3", "deployed.json"
    );
    if (fs.existsSync(path.dirname(frontendFile))) {
        fs.writeFileSync(frontendFile, JSON.stringify(addresses, null, 2) + "\n");
        console.log(`✅ Wrote frontend addresses → ${path.relative(process.cwd(), frontendFile)}`);
    }

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
    console.log("\n👉 Update the backend so it can act as the oracle & listen for events:");
    console.log("   backend/src/main/resources/application.yml");
    console.log(`     credlayer.contracts.credit-registry: "${creditRegistryAddress}"`);
    console.log(`     credlayer.contracts.lending-pool:     "${lendingPoolAddress}"`);
    console.log("\n   Note: the oracle key (Hardhat account #0) is the deployer, which is");
    console.log("   the CreditRegistry oracle and LendingPool approvalSigner by default.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
