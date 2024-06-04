// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title Plantoid
/// @dev Blockchain based lifeform
///
///
contract PlantoidMetadata is Ownable {
    using ECDSA for bytes32; /*ECDSA for signature recovery for license mints*/

    event MetadataRevealed(
        address plantoid,
        uint256 tokenId,
        string tokenUri,
        bytes signature
    );

    function revealMetadata(
        address plantoid,
        uint256 tokenId,
        string calldata tokenUri,
        bytes calldata signature
    ) external {
        bytes32 _digest = keccak256(
            abi.encodePacked(tokenId, tokenUri, plantoid)
        );
        require(_verify(_digest, signature, owner()), "Not signer");
        emit MetadataRevealed(plantoid, tokenId, tokenUri, signature);
    }

    /*****************
    Internal utils
    *****************/
    /// @dev Internal util to confirm seed sig
    /// @param data Message hash
    /// @param signature Sig from primary token holder
    /// @param account address to compare with recovery
    function _verify(
        bytes32 data,
        bytes memory signature,
        address account
    ) internal pure returns (bool) {
        return data.toEthSignedMessageHash().recover(signature) == account;
    }
}
