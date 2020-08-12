// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.7.0;

contract Flag_Multi_Proofs {
  bytes32 public root;

  event Data_Used(bytes32 data_used);

  constructor(bytes32 _root) public {
    root = _root;
  }

  function hash_pair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
    return a < b ? hash_node(a, b) : hash_node(b, a);
  }

  function hash_node(bytes32 left, bytes32 right) internal pure returns (bytes32 hash) {
    assembly {
      mstore(0x00, left)
      mstore(0x20, right)
      hash := keccak256(0x00, 0x40)
    }
    return hash;
  }

  // Indices are required to be sorted highest to lowest.
  function verify(uint256 element_count, bytes32[] memory elements, uint256 hash_count, bytes32 flags, bytes32 skips, bytes32[] memory decommitments) public view returns (bool valid) {
    if (flags.length != hash_count && skips.length != hash_count) return false;
    
    uint256 leaf_count = elements.length;
    bytes32[] memory hashes = new bytes32[](leaf_count);

    uint256 hash_read_index = uint256(0);
    uint256 hash_write_index = uint256(0);
    uint256 decommitment_index = uint256(0);
    bytes32 bit_check = bytes32(0x0000000000000000000000000000000000000000000000000000000000000001);

    for(; hash_write_index < leaf_count; ++hash_write_index) {
      hashes[hash_write_index] = hash_node(bytes32(0), elements[hash_write_index]);
    }

    hash_write_index = 0;
    
    for (uint256 i = 0; i < hash_count; i++) {
      if (skips & bit_check == bit_check) {
        hashes[hash_write_index++] = hashes[hash_read_index++];

        hash_read_index %= leaf_count;
        hash_write_index %= leaf_count;
        bit_check = bit_check << 1;
        continue;
      }

      bytes32 left = (flags & bit_check == bit_check) ? hashes[hash_read_index++] : decommitments[decommitment_index++];
      hash_read_index %= leaf_count;
      hashes[hash_write_index++] = hash_pair(left, hashes[hash_read_index++]);

      hash_read_index %= leaf_count;
      hash_write_index %= leaf_count;
      bit_check = bit_check << 1;
    }

    return hash_node(bytes32(element_count), hashes[(hash_write_index == 0 ? leaf_count : hash_write_index) - 1]) == root;
  }

  // Indices are required to be sorted highest to lowest.
  function use(uint256 element_count, bytes32[] memory elements, uint256 hash_count, bytes32 flags, bytes32 skips, bytes32[] memory decommitments) public {
    uint256 leaf_count = elements.length;
    bytes32 data_used = bytes32(0);

    for(uint256 i; i < leaf_count; ++i) {
      data_used = hash_node(data_used, elements[i]);
    }

    emit Data_Used(data_used);

    require(verify(element_count, elements, hash_count, flags, skips, decommitments), "INVALID_ELEMENTS");
  }

  // Indices are required to be sorted highest to lowest.
  function update(uint256 element_count, bytes32[] memory elements, bytes32[] memory new_elements, uint256 hash_count, bytes32 flags, bytes32 skips, bytes32[] memory decommitments) public {
    uint256 leaf_count = elements.length;
    bytes32[] memory hashes = new bytes32[](leaf_count);
    bytes32[] memory new_hashes = new bytes32[](leaf_count);

    uint256 hash_read_index = uint256(0);
    uint256 hash_write_index = uint256(0);
    uint256 decommitment_index = uint256(0);
    bytes32 bit_check = bytes32(0x0000000000000000000000000000000000000000000000000000000000000001);

    for(; hash_write_index < leaf_count; ++hash_write_index) {
      hashes[hash_write_index] = hash_node(bytes32(0), elements[hash_write_index]);
      new_hashes[hash_write_index] = hash_node(bytes32(0), new_elements[hash_write_index]);
    }

    hash_write_index = 0;
    
    for (uint256 i = 0; i < hash_count; i++) {
      if (skips & bit_check == bit_check) {
        hashes[hash_write_index] = hashes[hash_read_index];
        new_hashes[hash_write_index++] = new_hashes[hash_read_index++];

        hash_read_index %= leaf_count;
        hash_write_index %= leaf_count;
        bit_check = bit_check << 1;
        continue;
      }

      bool flag = flags & bit_check == bit_check;
      bytes32 left = flag ? hashes[hash_read_index] : decommitments[decommitment_index];
      bytes32 new_left = flag ? hashes[hash_read_index++] : decommitments[decommitment_index++];
      hash_read_index %= leaf_count;

      hashes[hash_write_index] = hash_pair(left, hashes[hash_read_index]);
      new_hashes[hash_write_index++] = hash_pair(new_left, new_hashes[hash_read_index++]);

      hash_read_index %= leaf_count;
      hash_write_index %= leaf_count;
      bit_check = bit_check << 1;
    }

    hash_read_index = (hash_write_index == 0 ? leaf_count : hash_write_index) - 1;

    require(hash_node(bytes32(element_count), hashes[hash_read_index]) == root, "INVALID_ELEMENTS");
        
    root = hash_node(bytes32(element_count), new_hashes[hash_read_index]);
  }

  // Indices are required to be sorted highest to lowest.
  function use_and_update(uint256 element_count, bytes32[] memory elements, uint256 hash_count, bytes32 flags, bytes32 skips, bytes32[] memory decommitments) public {
    uint256 leaf_count = elements.length;
    bytes32[] memory new_elements = new bytes32[](leaf_count);
    bytes32 data_used = bytes32(0);

    for(uint256 i; i < leaf_count; ++i) {
      data_used = hash_node(data_used, elements[i]);
      new_elements[i] = data_used;
    }

    emit Data_Used(data_used);

    update(element_count, elements, new_elements, hash_count, flags, skips, decommitments);
  }
}