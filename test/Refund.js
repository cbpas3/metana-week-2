const { ethers } = require("hardhat");
const { expect } = require("chai");
const { BigNumber } = ethers;

const easyMint = async (contract, account) => {
  const mintTx = await contract
    .connect(account)
    .mint({ value: ethers.utils.parseEther("1.0") });
  await mintTx.wait();
  return true;
};

describe("Refund", function () {
  const DEPLOYER_ID = 0;
  const ATTACKER_ID = 1;
  let contract = null;
  let accounts = null;
  let provider = null;
  beforeEach(async function () {
    const ContractFactory = await ethers.getContractFactory("Refund");
    contract = await ContractFactory.deploy();
    await contract.deployed();

    accounts = await ethers.getSigners();
    provider = await ethers.provider;

    twentyThousandEtherInHex = ethers.utils.hexStripZeros(
      ethers.utils.parseEther("20000").toHexString()
    );
    await provider.send("hardhat_setBalance", [
      accounts[1].address,
      twentyThousandEtherInHex,
    ]);
  });

  describe("mint", async function () {
    it("buyer should gain 1 token", async function () {
      await easyMint(contract, accounts[1]);

      expect(await contract.balanceOf(accounts[1].address)).to.equal(
        new BigNumber.from("1000000000000000000000")
      );
    });

    it("should revert saying not enough", async function () {
      await expect(
        contract
          .connect(accounts[1])
          .mint({ value: ethers.utils.parseEther("0.5") })
      ).to.be.revertedWith("CysToken: Wrong amount of Eth sent.");
    });

    it("should revert saying that the contract does not have tokens", async function () {
      const counter = [...Array(1000).keys()];
      for await (const count of counter) {
        await easyMint(contract, accounts[1]);
      }

      await expect(
        contract
          .connect(accounts[1])
          .mint({ value: ethers.utils.parseEther("1.0") })
      ).to.be.revertedWith("CysToken: Insufficient tokens in contract.");
    });

    it("should send tokens that the contract owns once the mint cap is reached", async function () {
      // REACHING MINT CAP
      const counter = [...Array(1000).keys()];
      for await (const count of counter) {
        await easyMint(contract, accounts[1]);
      }

      let refundTx = await contract.connect(accounts[1]).refund();
      await refundTx.wait();

      await easyMint(contract, accounts[1]);
      expect(await contract.balanceOf(accounts[1].address)).to.equal(
        new BigNumber.from("1000000000000000000000000")
      );
    });
  });

  describe("withdraw", async function () {
    it("should not allow non-admin to withdraw", async function () {
      await expect(
        contract.connect(accounts[1]).withdrawEth()
      ).to.be.revertedWith("CysToken: Not authorized to call this function.");
    });

    it("Contract balance should be transferred to admin", async function () {
      const INITIAL_BALANCE = await provider.getBalance(accounts[0].address);

      await contract
        .connect(accounts[1])
        .mint({ value: ethers.utils.parseEther("1.0") });

      await contract.connect(accounts[0]).withdrawEth();

      await expect(
        await provider.getBalance(accounts[0].address)
      ).to.be.closeTo(
        INITIAL_BALANCE.add(new BigNumber.from(ethers.utils.parseEther("1"))),
        new BigNumber.from(ethers.utils.parseEther("0.001"))
      );
    });
  });

  describe("refund", async function () {
    it("It should revert since user has tokens.", async function () {
      await expect(contract.connect(accounts[1]).refund()).to.be.revertedWith(
        "CysToken: Not enough ether to pay."
      );
    });

    it("It should revert since contract has no ether.", async function () {
      await easyMint(contract, accounts[1]);
      let refundTx = await contract.connect(accounts[1]).refund();
      await refundTx.wait();

      await expect(contract.connect(accounts[1]).refund()).to.be.revertedWith(
        "CysToken: Not enough tokens."
      );
    });

    it("It should give refunder ether.", async function () {
      await easyMint(contract, accounts[1]);
      const INITIAL_BALANCE = await provider.getBalance(accounts[1].address);
      let refundTx = await contract.connect(accounts[1]).refund();
      await refundTx.wait();
      await expect(
        await provider.getBalance(accounts[1].address)
      ).to.be.closeTo(
        INITIAL_BALANCE.add(new BigNumber.from(ethers.utils.parseEther("0.5"))),
        new BigNumber.from(ethers.utils.parseEther("0.001"))
      );
    });
  });
});
