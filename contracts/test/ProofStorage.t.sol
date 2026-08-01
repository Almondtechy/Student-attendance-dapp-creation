// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Test} from "forge-std/Test.sol";
import {ProofStorage} from "../src/ProofStorage.sol";

contract ProofStorageTest is Test {
    ProofStorage public proofStorage;

    address internal owner = address(0xA11CE);
    address internal teacher = address(0xB0B);
    address internal student = address(0xCAFE);
    bytes32 internal constant HASH = keccak256("attendance-record");

    function setUp() public {
        vm.prank(owner);
        proofStorage = new ProofStorage();
    }

    function test_OwnerCanStoreAndVerifyProof() public {
        vm.prank(owner);
        proofStorage.storeProof(HASH, student);

        assertTrue(proofStorage.verifyProof(HASH));
    }

    function test_AuthorizedMarkerCanStoreProof() public {
        vm.prank(owner);
        proofStorage.authorizeMarker(teacher);

        vm.prank(teacher);
        proofStorage.storeProof(HASH, student);

        assertTrue(proofStorage.verifyProof(HASH));
    }

    function test_UnauthorizedAccountCannotStoreProof() public {
        vm.prank(student);
        vm.expectRevert(bytes("not authorized"));
        proofStorage.storeProof(HASH, student);
    }

    function test_CannotStoreProofForZeroAddressStudent() public {
        vm.prank(owner);
        vm.expectRevert(bytes("invalid student"));
        proofStorage.storeProof(HASH, address(0));
    }

    function test_RevokedMarkerCannotStoreProof() public {
        vm.prank(owner);
        proofStorage.authorizeMarker(teacher);
        vm.prank(owner);
        proofStorage.revokeMarker(teacher);

        vm.prank(teacher);
        vm.expectRevert(bytes("not authorized"));
        proofStorage.storeProof(HASH, student);
    }

    function test_OnlyOwnerCanAuthorizeMarker() public {
        vm.prank(student);
        vm.expectRevert(bytes("not owner"));
        proofStorage.authorizeMarker(teacher);
    }

    function test_OnlyOwnerCanRevokeMarker() public {
        vm.prank(teacher);
        vm.expectRevert(bytes("not owner"));
        proofStorage.revokeMarker(teacher);
    }

    function test_OnlyOwnerCanTransferOwnership() public {
        vm.prank(student);
        vm.expectRevert(bytes("not owner"));
        proofStorage.transferOwnership(student);
    }

    function test_TransferOwnershipUpdatesOwner() public {
        vm.prank(owner);
        proofStorage.transferOwnership(student);

        assertEq(proofStorage.owner(), student);

        // Old owner can no longer store proofs
        vm.prank(owner);
        vm.expectRevert(bytes("not authorized"));
        proofStorage.storeProof(HASH, student);
    }

    function testFuzz_StoreAndVerifyProof(bytes32 hash) public {
        vm.prank(owner);
        proofStorage.storeProof(hash, student);

        assertTrue(proofStorage.verifyProof(hash));
    }
}
