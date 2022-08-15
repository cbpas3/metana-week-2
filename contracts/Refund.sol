// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;


import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

contract Refund is ERC20Capped{
    address payable private _admin;

    modifier onlyAdmin {
      require(msg.sender == _admin, "CysToken: Not authorized to call this function.");
      _;
    }
    
    constructor() ERC20Capped(1_000_000*10**decimals()) ERC20("CysToken", "CYT") {
        _admin = payable(msg.sender);
    }

    function mint() external payable {
        require(msg.value == 1*10**decimals(), "CysToken: Wrong amount of Eth sent.");
        if(totalSupply() == cap()){
            require(balanceOf(address(this))>= 1000*10**decimals(), "CysToken: Insuffienct tokens in contract.");
            _transfer( address(this) ,msg.sender,1000 * 10**decimals());
        } else{
            _mint(msg.sender,1000*10**decimals());
        } 
    }

    function withdrawEth() external payable onlyAdmin {
        _admin.transfer(address(this).balance);
    }

    function refund() external payable {
        require(address(this).balance >= 5*10**(decimals()-1), "CysToken: Not enough ether to pay.");
        require(balanceOf(msg.sender) >= 1000 * 10**decimals());
        _transfer(msg.sender, address(this) ,1000 * 10**decimals());
        payable(msg.sender).transfer(5*10**(decimals()-1));
    }
}
