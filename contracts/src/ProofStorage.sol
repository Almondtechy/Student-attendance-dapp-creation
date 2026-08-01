//SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/// @title ProofStorage
/// @notice Stores on-chain proofs of student attendance.
/// @dev Only the contract owner (the institution/deployer) and explicitly
///      authorized markers (teachers) can record proofs. This makes attendance
///      verifiable: students cannot self-attest a proof hash without an
///      authorized account recording it.
contract ProofStorage {
    address public owner;
    mapping(address => bool) public markers;
    mapping(bytes32 => bool) public proofs;

    event ProofStored(
        bytes32 indexed hash,
        address indexed student,
        uint256 timestamp
    );
    event MarkerAuthorized(address indexed marker);
    event MarkerRevoked(address indexed marker);
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyMarker() {
        require(msg.sender == owner || markers[msg.sender], "not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Records an attendance proof hash for a student.
    /// @dev Only the owner or an authorized marker may call this.
    function storeProof(bytes32 hash, address student) external onlyMarker {
        require(student != address(0), "invalid student");
        proofs[hash] = true;
        emit ProofStored(hash, student, block.timestamp);
    }

    /// @notice Returns whether a proof hash has been recorded on-chain.
    function verifyProof(bytes32 hash) external view returns (bool) {
        return proofs[hash];
    }

    /// @notice Grants an address permission to record proofs (teacher role).
    function authorizeMarker(address marker) external onlyOwner {
        require(marker != address(0), "invalid marker");
        markers[marker] = true;
        emit MarkerAuthorized(marker);
    }

    /// @notice Revokes an address's permission to record proofs.
    function revokeMarker(address marker) external onlyOwner {
        require(markers[marker], "marker not set");
        markers[marker] = false;
        emit MarkerRevoked(marker);
    }

    /// @notice Transfers contract ownership to a new address.
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
