import { defaultTreeOptions, treeOptions } from './common'
import {
  to32ByteBuffer,
  from32ByteBuffer,
  to32ByteBoolBuffer,
  toBigIntBoolSet,
  bigIntTo32ByteBuffer,
  bufferToBigInt,
} from './utils'

// This is the MultiIndexedProof.generate algorithm, however, since indices will not be used to
// compute the root at verify-time, a set fo flags need to be generated to indicate, for each
// hash performed at verify-time, whether a previously computed hash will be needed (True), or
// a decommitment will be needed. Since this method only works with hash functions that sort the
// hashed material, there is no need to provide instructions on hashing order. However, such a
// proof would also be possible, with a separate set of flags to instruct the hashing order.
// See MultiIndexedProof.generate for relevant inline comments.
const generateBooleans = (tree: Array<Buffer>, elementCount: number, indices: Array<number>, options: treeOptions = defaultTreeOptions): { compactProof: Array<Buffer>, elementCount: number, decommitments: Array<Buffer>, flags: Array<1 | 0>, skips: Array<1 | 0>, orders: Array<1 | 0> | undefined } => {
  const known = Array<1 | 0>(tree.length).fill(0)
  const relevant = Array<1 | 0>(tree.length).fill(0)
  const decommitments = Array<Buffer>()
  const flags = Array<1 | 0>()
  const orders = Array<1 | 0>()
  const skips = Array<1 | 0>()
  const leafCount = tree.length >>> 1

  for (let i = 0; i < indices.length; i++) {
    if (i !== 0 && indices[i - 1] > indices[i]) {
      throw new Error('Indices must be in ascending order.')
    }
    known[leafCount + indices[i]] = 1

    // The parent of this node is relevant, as there will be a hash computed at verify-time.
    relevant[(leafCount + indices[i]) >>> 1] = 1
  }

  for (let i = leafCount - 1; i > 0; i--) {
    const leftChildIndex = i << 1
    const left = known[leftChildIndex] ? 1 : 0
    const right = known[leftChildIndex + 1] ? 1 : 0
    const sibling = tree[leftChildIndex + left]

    if (left ^ right) decommitments.push(sibling)

    // Since there will be a hash computed at verify-time, push the flag on wether this hash
    // will require a decommitment (False) or a previously computed hash (True). Also, if the
    // sibling of this child does not exist, the sibling must be to the "right" of the
    // "right-most" leaf, so the hash can be skipped in favor of just using the child itself.
    // Further, the parent of this node it itself relevant, in a subsequent iteration.
    if (relevant[i]) {
      flags.push(left === right ? 1 : 0)
      skips.push(!sibling ? 1 : 0)
      orders.push(left)
      relevant[i >>> 1] = 1
    }

    known[i] = left || right
  }

  return {
    compactProof: Array<Buffer>(),
    elementCount,
    decommitments: decommitments.filter((d) => d).map(Buffer.from),
    flags,
    skips,
    orders: !options.sortedHash ? orders : undefined,
  }
}

// Convert the flags, skips, and orders generated by generateBooleans into a 32-byte bit-set
const generateBits = (tree: Array<Buffer>, elemCount: number, indices: Array<number>, options: treeOptions = defaultTreeOptions): { compactProof: Array<Buffer>, elementCount: number, decommitments: Array<Buffer>, flags: Array<1 | 0>, skips: Array<1 | 0>, orders: Array<1 | 0> | undefined } => {
  const { elementCount, decommitments, flags, orders, skips } = generateBooleans(tree, elemCount, indices, options)

  if (flags.length > 255) {
    throw new Error('Proof too large for bit flags.')
  }

  const stopMask = BigInt(1) << BigInt(flags.length)
  const proof = orders ? [to32ByteBoolBuffer(orders)].concat(decommitments) : decommitments
  const flagsAsBits = bigIntTo32ByteBuffer(toBigIntBoolSet(flags) | stopMask)
  const skipsAsBits = bigIntTo32ByteBuffer(toBigIntBoolSet(skips) | stopMask)

  return {
    compactProof: [to32ByteBuffer(elementCount), flagsAsBits, skipsAsBits].concat(proof),
    elementCount,
    decommitments: Array<Buffer>(),
    flags: Array<1 | 0>(),
    skips: Array<1 | 0>(),
    orders: undefined
  }
}

export const generate = (tree: Array<Buffer>, elemCount: number, indices: Array<number>, options: treeOptions = defaultTreeOptions): { compactProof: Array<Buffer>, elementCount: number, decommitments: Array<Buffer>, flags: Array<1 | 0>, skips: Array<1 | 0>, orders: Array<1 | 0> | undefined } => {
  return options.compact
    ? generateBits(tree, elemCount, indices, options)
    : generateBooleans(tree, elemCount, indices, options)
}

// This is the MultiIndexedProof.getRoot algorithm, slightly simplified to take into account that
// this is to be used with a hash function that sorts the material it hashes, and thus this uses flags
// to determine hashing content, instead of the indices. Further, this implements skipping hashing for
// nodes without siblings to the "right", in the case of unbalanced trees.
// See MultiIndexedProof.getRoot for relevant inline comments.
const getRootBooleans = (leafs: Array<Buffer>, elementCount: number, flags: Array<1 | 0>, skips: Array<1 | 0>, orders: Array<1 | 0>, decommitments: Array<Buffer>, options: treeOptions = defaultTreeOptions): { root: Buffer, elementCount: number } => {
  const hashCount = flags.length
  const leafCount = leafs.length
  const hashes = leafs.map((leaf) => leaf).reverse()

  let readIndex = 0
  let writeIndex = 0
  let decommitmentIndex = 0

  for (let i = 0; i < hashCount; i++) {
    if (skips[i]) {
      hashes[writeIndex++] = hashes[readIndex++]

      readIndex %= leafCount
      writeIndex %= leafCount
      continue
    }

    const right = flags[i] ? hashes[readIndex++] : decommitments[decommitmentIndex++]
    readIndex %= leafCount
    const left = hashes[readIndex++]
    hashes[writeIndex++] = orders?.[i] ? options.hashFunction(left, right) : options.hashFunction(right, left)

    readIndex %= leafCount
    writeIndex %= leafCount
  }

  const rootIndex = (writeIndex === 0 ? leafCount : writeIndex) - 1

  return { root: Buffer.from(hashes[rootIndex]), elementCount }
}

// This is identical to the above getRootBooleans algorithm, differing only in that the
// the flag and skip bit-set is shifted and checked, rather than boolean arrays.
// See getRootBooleans for relevant inline comments.
const getRootBits = (leafs: Array<Buffer>, compactProof: Array<Buffer>, options: treeOptions = defaultTreeOptions): { root: Buffer, elementCount: number } => {
  const elementCount = from32ByteBuffer(compactProof[0])
  const flags = bufferToBigInt(compactProof[1])
  const skips = bufferToBigInt(compactProof[2])
  const orders = options.sortedHash ? undefined : bufferToBigInt(compactProof[3])
  const decommitments = compactProof.slice(options.sortedHash ? 3 : 4)
  const leafCount = leafs.length
  const hashes = leafs.map((leaf) => leaf).reverse()

  let readIndex = 0
  let writeIndex = 0
  let decommitmentIndex = 0
  let bitCheck = BigInt(1)

  while (true) {
    const flag = flags & bitCheck

    if (skips & bitCheck) {
      if (flag) {
        const rootIndex = (writeIndex === 0 ? leafCount : writeIndex) - 1

        return { root: hashes[rootIndex], elementCount }
      }

      hashes[writeIndex++] = hashes[readIndex++]

      readIndex %= leafCount
      writeIndex %= leafCount
      bitCheck <<= BigInt(1)
      continue
    }

    const right = flag ? hashes[readIndex++] : decommitments[decommitmentIndex++]
    readIndex %= leafCount
    const left = hashes[readIndex++]

    const order = orders && orders & bitCheck
    hashes[writeIndex++] = order ? options.hashFunction(left, right) : options.hashFunction(right, left)

    readIndex %= leafCount
    writeIndex %= leafCount
    bitCheck <<= BigInt(1)
  }
}

export const getRoot = (leafs: Array<Buffer>, compactProof: Array<Buffer> = [], elementCount: number = 0, flags: Array<1 | 0> = [], skips: Array<1 | 0> = [], orders: Array<1 | 0> = [], decommitments: Array<Buffer> = [], options: treeOptions = defaultTreeOptions): { root: Buffer, elementCount: number } => {
  return compactProof.length > 0
    ? getRootBits(leafs, compactProof, options)
    : getRootBooleans(leafs, elementCount, flags, skips, orders, decommitments, options)
}

// This is identical to the above getRootBooleans algorithm, differing only in that the
// new root (due to the updated leafs), is computed along the way.
// See getRootBooleans for relevant inline comments.
const getNewRootBooleans = (leafs: Array<Buffer>, updateLeafs: Array<Buffer>, elementCount: number = 0, flags: Array<1 | 0>, skips: Array<1 | 0>, orders: Array<1 | 0>, decommitments: Array<Buffer>, options: treeOptions = defaultTreeOptions): { root: Buffer, newRoot: Buffer, elementCount: number } => {
  const hashCount = flags.length
  const leafCount = leafs.length
  const hashes = leafs.map((leaf) => leaf).reverse()
  const updateHashes = updateLeafs.map((leaf) => leaf).reverse()

  let readIndex = 0
  let writeIndex = 0
  let decommitmentIndex = 0

  for (let i = 0; i < hashCount; i++) {
    if (skips[i]) {
      hashes[writeIndex] = hashes[readIndex]
      updateHashes[writeIndex++] = updateHashes[readIndex++]

      readIndex %= leafCount
      writeIndex %= leafCount
      continue
    }

    const right = flags[i] ? hashes[readIndex] : decommitments[decommitmentIndex]
    const newRight = flags[i] ? updateHashes[readIndex++] : decommitments[decommitmentIndex++]
    readIndex %= leafCount

    const left = hashes[readIndex]
    const newLeft = updateHashes[readIndex++]
    hashes[writeIndex] = orders?.[i] ? options.hashFunction(left, right) : options.hashFunction(right, left)
    updateHashes[writeIndex++] = orders?.[i] ? options.hashFunction(newLeft, newRight) : options.hashFunction(newRight, newLeft)

    readIndex %= leafCount
    writeIndex %= leafCount
  }

  const rootIndex = (writeIndex === 0 ? leafCount : writeIndex) - 1

  return {
    root: Buffer.from(hashes[rootIndex]),
    newRoot: Buffer.from(updateHashes[rootIndex]),
    elementCount,
  }
}

// This is identical to the above getRootBits algorithm, differing only in that the
// new root (due to the updated leafs), is computed along the way.
// See getRootBits for relevant inline comments.
const getNewRootBits = (leafs: Array<Buffer>, updateLeafs: Array<Buffer>, compactProof: Array<Buffer>, options: treeOptions = defaultTreeOptions): { root: Buffer, newRoot: Buffer, elementCount: number } => {
  const elementCount = from32ByteBuffer(compactProof[0])
  const flags = bufferToBigInt(compactProof[1])
  const skips = bufferToBigInt(compactProof[2])
  const orders = options.sortedHash ? undefined : bufferToBigInt(compactProof[3])
  const decommitments = compactProof.slice(options.sortedHash ? 3 : 4)
  const leafCount = leafs.length
  const hashes = leafs.map((leaf) => leaf).reverse()
  const updateHashes = updateLeafs.map((leaf) => leaf).reverse()

  let readIndex = 0
  let writeIndex = 0
  let decommitmentIndex = 0
  let bitCheck = BigInt(1)

  while (true) {
    const flag = flags & bitCheck

    if (skips & bitCheck) {
      if (flag) {
        const rootIndex = (writeIndex === 0 ? leafCount : writeIndex) - 1

        return {
          root: Buffer.from(hashes[rootIndex]),
          newRoot: Buffer.from(updateHashes[rootIndex]),
          elementCount,
        }
      }

      hashes[writeIndex] = hashes[readIndex]
      updateHashes[writeIndex++] = updateHashes[readIndex++]

      readIndex %= leafCount
      writeIndex %= leafCount
      bitCheck <<= BigInt(1)
      continue
    }

    const right = flag ? hashes[readIndex] : decommitments[decommitmentIndex]
    const newRight = flag ? updateHashes[readIndex++] : decommitments[decommitmentIndex++]
    readIndex %= leafCount

    const left = hashes[readIndex]
    const newLeft = updateHashes[readIndex++]

    const order = orders && orders & bitCheck
    hashes[writeIndex] = order ? options.hashFunction(left, right) : options.hashFunction(right, left)
    updateHashes[writeIndex++] = order ? options.hashFunction(newLeft, newRight) : options.hashFunction(newRight, newLeft)

    readIndex %= leafCount
    writeIndex %= leafCount
    bitCheck <<= BigInt(1)
  }
}

export const getNewRoot = (leafs: Array<Buffer>, updatedLeafs: Array<Buffer>, compactProof: Array<Buffer> = [], elementCount: number = 0, flags: Array<1 | 0> = [], skips: Array<1 | 0> = [], orders: Array<1 | 0> = [], decommitments: Array<Buffer> = [], options: treeOptions = defaultTreeOptions): { root: Buffer, newRoot: Buffer, elementCount: number } => {
  return compactProof.length > 0
    ? getNewRootBits(leafs, updatedLeafs, compactProof, options)
    : getNewRootBooleans(leafs, updatedLeafs, elementCount, flags, skips, orders, decommitments, options)
}

// Infers the indices of a multi proof by back-calculating the the bits of each element's
// index, based on it's relative position in each hash operation during a proof.
const getIndicesWithBooleans = (leafCount: number, flags: Array<1 | 0>, skips: Array<1 | 0>, orders: Array<1 | 0>): { indices: Array<number> } => {
  if (orders.length == 0) {
    throw new Error('Cannot infer indices without orders in proof.')
  }

  const hashCount = flags.length
  const indices = Array<number>(leafCount).fill(0)
  const groupedWithNext = Array<boolean>(leafCount).fill(false)
  const bitsPushed = Array<number>(leafCount).fill(0)
  let leafIndex = leafCount - 1

  for (let i = 0; i < hashCount; i++) {
    if (skips[i]) {
      while (true) {
        bitsPushed[leafIndex]++

        if (leafIndex === 0) {
          leafIndex = leafCount - 1
          break
        }

        if (!groupedWithNext[leafIndex--]) break
      }

      continue
    }

    if (flags[i]) {
      while (true) {
        if (orders[i]) indices[leafIndex] |= 1 << bitsPushed[leafIndex]

        bitsPushed[leafIndex]++

        if (leafIndex === 0) {
          leafIndex = leafCount - 1
          break
        }

        if (!groupedWithNext[leafIndex]) {
          groupedWithNext[leafIndex--] = true
          break
        }

        groupedWithNext[leafIndex--] = true
      }
    }

    while (true) {
      if (!orders[i]) indices[leafIndex] |= 1 << bitsPushed[leafIndex]

      bitsPushed[leafIndex]++

      if (leafIndex === 0) {
        leafIndex = leafCount - 1
        break
      }

      if (!groupedWithNext[leafIndex--]) break
    }
  }

  return { indices }
}

// This is identical to the above getIndicesWithBooleans, but with bit sets rather than
// boolean arrays.
// See getIndicesWithBooleans for relevant inline comments
const getIndicesWithBits = (
  leafCount: number,
  compactProof: Array<Buffer>,
  flags = bufferToBigInt(compactProof[1]),
  skips = bufferToBigInt(compactProof[2]),
  orders = bufferToBigInt(compactProof[3]),
): { indices: Array<number> } => {
  const indices = Array(leafCount).fill(0)
  const groupedWithNext = Array(leafCount).fill(false)
  const bitsPushed = Array(leafCount).fill(0)
  let leafIndex = leafCount - 1
  let bitCheck = BigInt(1)

  while (true) {
    const flag = flags & bitCheck

    if (skips & bitCheck) {
      if (flag) return { indices }

      while (true) {
        bitsPushed[leafIndex]++

        if (leafIndex === 0) {
          leafIndex = leafCount - 1
          break
        }

        if (!groupedWithNext[leafIndex--]) break
      }

      bitCheck <<= BigInt(1)
      continue
    }

    const order = orders & bitCheck

    if (flag) {
      while (true) {
        if (order) indices[leafIndex] |= 1 << bitsPushed[leafIndex]

        bitsPushed[leafIndex]++

        if (leafIndex === 0) {
          leafIndex = leafCount - 1
          break
        }

        if (!groupedWithNext[leafIndex]) {
          groupedWithNext[leafIndex--] = true
          break
        }

        groupedWithNext[leafIndex--] = true
      }
    }

    while (true) {
      if (!order) indices[leafIndex] |= 1 << bitsPushed[leafIndex]

      bitsPushed[leafIndex]++

      if (leafIndex === 0) {
        leafIndex = leafCount - 1
        break
      }

      if (!groupedWithNext[leafIndex--]) break
    }

    bitCheck <<= BigInt(1)
  }
}

export const getIndices = (leafCount: number, compactProof: Array<Buffer> = [], flags: Array<1 | 0> = [], skips: Array<1 | 0> = [], orders: Array<1 | 0> = []): { indices: Array<number> } => {
  return compactProof.length > 0
    ? getIndicesWithBits(leafCount, compactProof)
    : getIndicesWithBooleans(leafCount, flags, skips, orders)
}
