const { deployments, getNamedAccounts, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");
!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", function () {
      let FundMe;
      let deployer;
      let mockV3Aggregator;
      const sendValue = ethers.utils.parseEther("1");
      beforeEach(async function () {
        //deploying FundMe using hardhat-deploy
        // const accounts = await ethers.getSigner();
        // const accountZero=accounts[0];
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        FundMe = await ethers.getContract("FundMe", deployer);
        mockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        );
      });
      describe("constructor", function () {
        it("sets the aggregatorV3 address correctly", async function () {
          const response = await FundMe.priceFeed();
          assert.equal(response, mockV3Aggregator.address);
        });
      });

      describe("fund", async function () {
        it("fails if you dont send enough eth", async function () {
          expect(FundMe.fund());
        });

        it("updated the amount of data structre", async function () {
          await FundMe.fund({ value: sendValue });
          const response = await FundMe.addressToAmountFunded(deployer);
          assert.equal(response.toString(), sendValue.toString());
        });

        it("adds funder to funders array", async function () {
          await FundMe.fund({ value: sendValue });

          assert.equal(deployer, await FundMe.funders(0));
        });
      });

      describe("withdraw", function () {
        beforeEach(async function () {
          await FundMe.fund({ value: sendValue });
        });

        it("withdraws ETH from a single funder", async () => {
          // Arrange
          const startingFundMeBalance = await FundMe.provider.getBalance(
            FundMe.address
          );
          const startingDeployerBalance = await FundMe.provider.getBalance(
            deployer
          );

          // Act
          const transactionResponse = await FundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait();
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await FundMe.provider.getBalance(
            FundMe.address
          );
          const endingDeployerBalance = await FundMe.provider.getBalance(
            deployer
          );

          // Assert
          // Maybe clean up to understand the testing
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
        });

        it("is allows us to withdraw with multiple funders", async () => {
          // Arrange
          const accounts = await ethers.getSigners();
          for (i = 1; i < 6; i++) {
            const FundMeConnectedContract = await FundMe.connect(accounts[i]);
            await FundMeConnectedContract.fund({ value: sendValue });
          }
          const startingFundMeBalance = await FundMe.provider.getBalance(
            FundMe.address
          );
          const startingDeployerBalance = await FundMe.provider.getBalance(
            deployer
          );

          // Act
          //const transactionResponse = await FundMe.cheaperWithdraw();
          // Let's comapre gas costs :)
          const transactionResponse = await FundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const withdrawGasCost = gasUsed.mul(effectiveGasPrice);
          console.log(`GasCost: ${withdrawGasCost}`);
          console.log(`GasUsed: ${gasUsed}`);
          console.log(`GasPrice: ${effectiveGasPrice}`);
          const endingFundMeBalance = await FundMe.provider.getBalance(
            FundMe.address
          );
          const endingDeployerBalance = await FundMe.provider.getBalance(
            deployer
          );
          // Assert
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(withdrawGasCost).toString()
          );
          // Make a getter for storage variables
          expect(FundMe.funders(0));

          for (i = 1; i < 6; i++) {
            assert.equal(
              await FundMe.addressToAmountFunded(accounts[i].address),
              0
            );
          }
        });
        it("Only allows the owner to withdraw", async function () {
          const accounts = await ethers.getSigners();
          const FundMeConnectedContract = await FundMe.connect(accounts[1]);
          expect(FundMeConnectedContract.withdraw());
        });
      });
    });
