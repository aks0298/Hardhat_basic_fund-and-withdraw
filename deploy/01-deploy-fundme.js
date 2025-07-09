// async function deployFunc() {
//   console.log("Hii....");
// }

const { network } = require("hardhat");
const {
  networkConfig,
  developmentChains,
} = require("../helper-hardhat-config");

const { verify } = require("../utils/verify");
// module.exports.default = deployFunc;

// module.exports = async (hre) => {
//   const { getNamedAccounts, deployments } = hre;
// };
//||
//\/
//same

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let ethUsdPriceFeedAddress; // = networkConfig[chainId]["ethUsdPriceFeed"];

  if (developmentChains.includes(network.name)) {
    const etherUseAggregator = await deployments.get("MockV3Aggregator");
    ethUsdPriceFeedAddress = etherUseAggregator.address;
  } else {
    ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"];
  }
  const args = [ethUsdPriceFeedAddress];
  log("----------------------------------------------------");
  log("Deploying FundMe and waiting for confirmations...");
  const fundMe = await deploy("FundMe", {
    from: deployer,
    args: args,
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(fundMe.address, args);
  }
};
module.exports.tags = ["all", "fundme"];
