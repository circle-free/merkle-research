'strict';

const chai = require('chai');
const { expect } = chai;
const { generateElements } = require('./helpers');
const MerkleTree = require('../index');

const testBuildTree = (elementCount, seed, expected, options) => {
  const elements = generateElements(elementCount, { seed });
  const merkleTree = new MerkleTree(elements, options);

  expect(merkleTree.root.toString('hex')).to.equal(expected.root);
  expect(merkleTree.elementRoot.toString('hex')).to.equal(expected.elementRoot);
  expect(merkleTree.depth).to.equal(expected.depth);
  merkleTree.elements.forEach((e, i) => expect(e.equals(elements[i])).to.be.true);
  expect(merkleTree.elements.length).to.equal(elements.length);
};

const compareTrees = (elementCount, optionsA, optionsB) => {
  const elements = generateElements(elementCount, { seed: 'ff' });
  const treeA = new MerkleTree(elements, optionsA);
  const treeB = new MerkleTree(elements, optionsB);

  expect(treeA.root.equals(treeB.root)).to.be.true;
  expect(treeA.elementRoot.equals(treeB.elementRoot)).to.be.true;
  expect(treeA.depth).to.equal(treeB.depth);
  treeA.elements.forEach((e, i) => expect(e.equals(treeB.elements[i])).to.be.true);
  expect(treeA.elements.length).to.equal(treeB.elements.length);
};

const testSingleProofGeneration = (elementCount, seed, index, expected, options) => {
  const elements = generateElements(elementCount, { seed });
  const merkleTree = new MerkleTree(elements, options);
  const proof = merkleTree.generateSingleProof(index, options);

  expect(proof.root.equals(merkleTree.root)).to.be.true;
  expect(proof.index).to.equal(index);
  expect(proof.element.equals(elements[index])).to.be.true;

  if (options.compact) {
    expect(proof.compactProof.length).to.equal(expected.compactProof.length);
    proof.compactProof.forEach((d, i) => expect(d.toString('hex')).to.equal(expected.compactProof[i]));
    return;
  }

  expect(proof.elementCount).to.equal(elementCount);
  expect(proof.decommitments.length).to.equal(expected.decommitments.length);
  proof.decommitments.forEach((d, i) => expect(d.toString('hex')).to.equal(expected.decommitments[i]));
};

const compareSingleProofs = (elementCount, index, optionsA, optionsB) => {
  const elements = generateElements(elementCount, { seed: 'ff' });
  const treeA = new MerkleTree(elements, optionsA);
  const proofA = treeA.generateSingleProof(index);
  const treeB = new MerkleTree(elements, optionsB);
  const proofB = treeB.generateSingleProof(index);

  expect(proofA.root.equals(proofB.root)).to.be.true;
  expect(proofA.elementCount).to.equal(proofB.elementCount);
  expect(proofA.index).to.equal(proofB.index);
  expect(proofA.element.equals(proofB.element)).to.be.true;
  expect(proofA.decommitments.length).to.equal(proofB.decommitments.length);
  proofA.decommitments.forEach((d, i) => expect(d.equals(proofB.decommitments[i])).to.be.true);
};

const testSingleProofVerification = (elementCount, index, options) => {
  const elements = generateElements(elementCount, { seed: 'ff' });
  const merkleTree = new MerkleTree(elements, options);
  const proof = merkleTree.generateSingleProof(index, options);
  const proofValid = MerkleTree.verifySingleProof(proof, options);

  expect(proofValid).to.be.true;
};

const testSingleUpdate = (elementCount, index, options) => {
  const elements = generateElements(elementCount, { seed: 'ff' });
  const merkleTree = new MerkleTree(elements, options);
  const newElement = generateElements(1, { seed: '11' })[0];
  const { newMerkleTree, proof } = merkleTree.updateSingle(index, newElement, options);
  const { root } = MerkleTree.updateWithSingleProof(proof, options);
  const newElements = elements.map((e, i) => (i === index ? newElement : e));
  const freshMerkleTree = new MerkleTree(newElements, options);

  expect(root.equals(newMerkleTree.root)).to.be.true;
  expect(root.equals(freshMerkleTree.root)).to.be.true;
};

const testConsecutiveSingleUpdate = (iterations, elementCount, options) => {
  let elements = generateElements(elementCount, { seed: 'cc' });
  let merkleTree = new MerkleTree(elements, options);
  let root = null;

  for (let i = 0; i < iterations; i++) {
    const index = Math.floor(Math.random() * elementCount);
    const newElement = generateElements(1, { random: true })[0];
    const { newMerkleTree, proof } = merkleTree.updateSingle(index, newElement, options);
    merkleTree = newMerkleTree;
    root = MerkleTree.updateWithSingleProof(proof, options).root;
    elements[index] = newElement;

    expect(root.equals(merkleTree.root)).to.be.true;
  }

  const finalMerkleTree = new MerkleTree(elements, options);

  expect(root.equals(finalMerkleTree.root)).to.be.true;
};

const testMultiProofGeneration = (elementCount, seed, indices, expected, options) => {
  const elements = generateElements(elementCount, { seed });
  const merkleTree = new MerkleTree(elements, options);
  const proof = merkleTree.generateMultiProof(indices, options);

  expect(proof.root.equals(merkleTree.root)).to.be.true;
  expect(proof.elements.length).to.equal(indices.length);
  proof.elements.forEach((e, i) => expect(e.equals(elements[indices[i]])).to.be.true);

  if (options.compact) {
    expect(proof.compactProof.length).to.equal(expected.compactProof.length);
    proof.compactProof.forEach((p, i) => expect(p.toString('hex')).to.equal(expected.compactProof[i]));
    return;
  }

  if (options.indexed) {
    expect(proof.indices).to.deep.equal(indices);
  } else {
    expect(proof.indices).to.equal(undefined);
  }

  if (!options.sortedHash) {
    expect(proof.orders).to.deep.equal(expected.orders);
  }

  expect(proof.elementCount).to.equal(elementCount);
  expect(proof.decommitments.length).to.equal(expected.decommitments.length);
  proof.decommitments.forEach((d, i) => expect(d.toString('hex')).to.equal(expected.decommitments[i]));
  expect(proof.flags).to.deep.equal(expected.flags);
  expect(proof.skips).to.deep.equal(expected.skips);
};

const compareMultiProofs = (elementCount, indices, optionsA, optionsB) => {
  const elements = generateElements(elementCount, { seed: 'ff' });
  const treeA = new MerkleTree(elements, optionsA);
  const proofA = treeA.generateMultiProof(indices, optionsA);
  const treeB = new MerkleTree(elements, optionsB);
  const proofB = treeB.generateMultiProof(indices, optionsB);

  expect(proofA.root.equals(proofB.root)).to.be.true;
  expect(proofA.elementCount).to.equal(proofB.elementCount);
  proofA.elements.forEach((e, i) => expect(e.equals(proofB.elements[i])).to.be.true);
  expect(proofA.elements.length).to.equal(proofB.elements.length);

  if (optionsA.indexed && optionsB.indexed) {
    expect(proofA.indices).to.deep.equal(proofB.indices);
    return;
  }

  if (optionsA.compact && optionsB.compact) {
    proofA.compactProof.forEach((p, i) => expect(p.equals(proofB.compactProof[i])).to.be.true);
    expect(proofA.compactProof.length).to.equal(proofB.compactProof.length);
    return;
  }

  proofA.decommitments.forEach((d, i) => expect(d.equals(proofB.decommitments[i])).to.be.true);
  expect(proofA.decommitments.length).to.equal(proofB.decommitments.length);
  expect(proofA.flags).to.deep.equal(proofB.flags);
  expect(proofA.skips).to.deep.equal(proofB.skips);
};

const testMultiProofVerification = (elementCount, indices, options) => {
  const elements = generateElements(elementCount, { seed: 'ff' });
  const merkleTree = new MerkleTree(elements, options);
  const proof = merkleTree.generateMultiProof(indices, options);
  const proofValid = MerkleTree.verifyMultiProof(proof, options);

  expect(proofValid).to.be.true;
};

const testMultiProofIndicesInferring = (elementCount, indices, options) => {
  const elements = generateElements(elementCount, { seed: 'ff' });
  const merkleTree = new MerkleTree(elements, options);
  const proof = merkleTree.generateMultiProof(indices, options);
  const inferredIndices = MerkleTree.getMultiProofIndices(proof, options);

  expect(inferredIndices).to.deep.equal(indices);
};

const testMultiUpdate = (elementCount, indices, options) => {
  const elements = generateElements(elementCount, { seed: 'ff' });
  const merkleTree = new MerkleTree(elements, options);
  const newElements = generateElements(indices.length, { seed: '11' });
  const { newMerkleTree, proof } = merkleTree.updateMulti(indices, newElements, options);
  const { root } = MerkleTree.updateWithMultiProof(proof, options);

  const newTreeElements = elements.map((e, i) => {
    const index = indices.indexOf(i);

    return index >= 0 ? newElements[index] : e;
  });

  const freshMerkleTree = new MerkleTree(newTreeElements, options);

  expect(root.equals(newMerkleTree.root)).to.be.true;
  expect(root.equals(freshMerkleTree.root)).to.be.true;
};

const testConsecutiveMultiUpdate = (iterations, elementCount, updateSize, options) => {
  let elements = generateElements(elementCount, { seed: 'cc' });
  let merkleTree = new MerkleTree(elements, options);
  let root = null;

  for (let i = 0; i < iterations; i++) {
    const rawNewElements = generateElements(updateSize, { random: true });
    const rawIndices = rawNewElements.map(() => Math.floor(Math.random() * elementCount));
    const indices = rawIndices.filter((index, i) => rawIndices.indexOf(index) === i).sort((a, b) => a - b);
    const newElements = rawNewElements.slice(0, indices.length);

    const { newMerkleTree, proof } = merkleTree.updateMulti(indices, newElements, options);
    merkleTree = newMerkleTree;
    root = MerkleTree.updateWithMultiProof(proof, options).root;

    elements = elements.map((element, i) => {
      const index = indices.indexOf(i);

      return index >= 0 ? newElements[index] : element;
    });

    expect(root.equals(merkleTree.root)).to.be.true;
  }

  const finalMerkleTree = new MerkleTree(elements, options);

  expect(root.equals(finalMerkleTree.root)).to.be.true;
};

const testAppendProofGeneration = (elementCount, seed, expected, options) => {
  const elements = generateElements(elementCount, { seed });
  const merkleTree = new MerkleTree(elements, options);
  const proof = merkleTree.generateAppendProof(options);

  expect(proof.root.equals(merkleTree.root)).to.be.true;

  if (options.compact) {
    proof.compactProof.forEach((d, i) => expect(d.toString('hex')).to.equal(expected.compactProof[i]));
    expect(proof.compactProof.length).to.equal(expected.compactProof.length);
    return;
  }

  expect(proof.elementCount).to.equal(elementCount);
  proof.decommitments.forEach((d, i) => expect(d.toString('hex')).to.equal(expected.decommitments[i]));
  expect(proof.decommitments.length).to.equal(expected.decommitments.length);
};

const testAppendProofVerification = (elementCount, options) => {
  const elements = generateElements(elementCount, { seed: 'ff' });
  const merkleTree = new MerkleTree(elements, options);
  const proof = merkleTree.generateAppendProof(options);
  const proofValid = MerkleTree.verifyAppendProof(proof, options);

  expect(proofValid).to.be.true;
};

const testSingleAppend = (elementCount, options) => {
  const elements = generateElements(elementCount, { seed: 'ff' });
  const merkleTree = new MerkleTree(elements, options);
  const newElement = generateElements(1, { seed: '11' })[0];
  const { newMerkleTree, proof } = merkleTree.appendSingle(newElement, options);
  const { root, elementCount: newElementCount } = MerkleTree.appendSingleWithProof(proof, options);
  const newElements = elements.concat(newElement);
  const freshMerkleTree = new MerkleTree(newElements, options);

  expect(root.equals(newMerkleTree.root)).to.be.true;
  expect(root.equals(freshMerkleTree.root)).to.be.true;
  expect(newElementCount).to.equal(newMerkleTree.elements.length);
  expect(newElementCount).to.equal(freshMerkleTree.elements.length);
};

const testConsecutiveSingleAppend = (iterations, elementCount, options) => {
  let elements = generateElements(elementCount, { seed: 'cc' });
  let merkleTree = new MerkleTree(elements, options);
  let root = null;

  for (let i = 0; i < iterations; i++) {
    const newElement = generateElements(1, { random: true })[0];
    const { newMerkleTree, proof } = merkleTree.appendSingle(newElement, options);
    merkleTree = newMerkleTree;
    const results = MerkleTree.appendSingleWithProof(proof, options);
    root = results.root;
    elements.push(newElement);

    expect(root.equals(merkleTree.root)).to.equal(true);
    expect(results.elementCount).to.equal(merkleTree.elements.length);
  }

  const finalMerkleTree = new MerkleTree(elements, options);

  expect(root.equals(finalMerkleTree.root)).to.be.true;
};

const testMultiAppend = (elementCount, appendSize, options) => {
  const elements = generateElements(elementCount, { seed: 'ff' });
  const merkleTree = new MerkleTree(elements, options);
  const appendElements = generateElements(appendSize, { seed: '11' });
  const { newMerkleTree, proof } = merkleTree.appendMulti(appendElements, options);
  const { root, elementCount: newElementCount } = MerkleTree.appendMultiWithProof(proof, options);
  const newElements = elements.concat(appendElements);
  const freshMerkleTree = new MerkleTree(newElements, options);

  expect(root.equals(newMerkleTree.root)).to.be.true;
  expect(root.equals(freshMerkleTree.root)).to.be.true;
  expect(newElementCount).to.equal(newMerkleTree.elements.length);
  expect(newElementCount).to.equal(freshMerkleTree.elements.length);
};

const testConsecutiveMultiAppend = (iterations, elementCount, appendSize, options) => {
  let elements = generateElements(elementCount, { seed: 'cc' });
  let merkleTree = new MerkleTree(elements, options);
  let root = null;

  for (let i = 0; i < iterations; i++) {
    const newElements = generateElements(Math.ceil(Math.random() * appendSize));
    const { newMerkleTree, proof } = merkleTree.appendMulti(newElements, options);
    merkleTree = newMerkleTree;
    const results = MerkleTree.appendMultiWithProof(proof, options);
    root = results.root;
    elements = elements.concat(newElements);

    expect(root.equals(merkleTree.root)).to.be.true;
    expect(results.elementCount).to.equal(merkleTree.elements.length);
  }

  const finalMerkleTree = new MerkleTree(elements, options);

  expect(root.equals(finalMerkleTree.root)).to.be.true;
};

const testCombinedProofMinimumIndex = (elementCount, expected, options) => {
  const elements = generateElements(elementCount);
  const merkleTree = new MerkleTree(elements, options);
  const minimumIndex = merkleTree.minimumCombinedProofIndex;

  expect(minimumIndex).to.equal(expected.minimumIndex);
};

const testCombinedProofGeneration = (elementCount, seed, updateIndices, appendSize, options) => {
  const originalElements = generateElements(elementCount, { seed });
  const merkleTree = new MerkleTree(originalElements, options);
  const uElements = generateElements(updateIndices.length, { seed: '11' });
  const aElements = generateElements(appendSize, { seed: '22' });
  const combinedProof = merkleTree.generateMultiAppendUpdateProof(updateIndices, uElements, aElements, options);
  const { elements, updateElements, appendElements } = combinedProof;
  const multiProof = merkleTree.generateMultiProof(updateIndices, options);

  elements.forEach((e, i) => expect(e.equals(originalElements[updateIndices[i]])).to.be.true);
  expect(elements.length).to.equal(updateIndices.length);
  updateElements.forEach((e, i) => expect(e.equals(uElements[i])).to.be.true);
  expect(updateElements.length).to.equal(uElements.length);
  appendElements.forEach((e, i) => expect(e.equals(aElements[i])).to.be.true);
  expect(appendElements.length).to.equal(aElements.length);

  if (options.compact) {
    combinedProof.compactProof.forEach((p, i) => expect(p.equals(multiProof.compactProof[i])).to.be.true);
    expect(combinedProof.compactProof.length).to.equal(multiProof.compactProof.length);
    return;
  }

  expect(combinedProof.elementCount).to.equal(multiProof.elementCount);
  combinedProof.decommitments.forEach((d, i) => expect(d.equals(multiProof.decommitments[i])).to.be.true);
  expect(combinedProof.decommitments.length).to.equal(multiProof.decommitments.length);
  expect(combinedProof.flags).to.deep.equal(multiProof.flags);
  expect(combinedProof.skips).to.deep.equal(multiProof.skips);
};

const testCombinedProofVerification = (elementCount, updateIndices, options) => {
  const elements = generateElements(elementCount, { seed: 'ff' });
  const merkleTree = new MerkleTree(elements, options);
  const proof = merkleTree.generateCombinedProof(updateIndices, options);
  const proofValid = MerkleTree.verifyCombinedProof(proof, options);

  expect(proofValid).to.be.true;
};

const testCombinedUpdateAndAppend = (elementCount, updateIndices, appendSize, options) => {
  const elements = generateElements(elementCount, { seed: 'ff' });
  const merkleTree = new MerkleTree(elements, options);
  const uElements = generateElements(updateIndices.length, { seed: '11' });
  const aElements = generateElements(appendSize, { seed: '22' });
  const { newMerkleTree, proof } = merkleTree.updateAndAppendMulti(updateIndices, uElements, aElements, options);
  const { root, elementCount: newElementCount } = MerkleTree.updateAndAppendWithCombinedProof(proof, options);

  const updatedElements = elements.map((e, i) => {
    const index = updateIndices.indexOf(i);

    return index >= 0 ? uElements[index] : e;
  });

  const newElements = updatedElements.concat(aElements);
  const freshMerkleTree = new MerkleTree(newElements, options);

  expect(root.equals(newMerkleTree.root)).to.be.true;
  expect(root.equals(freshMerkleTree.root)).to.be.true;
  expect(newElementCount).to.equal(newMerkleTree.elements.length);
  expect(newElementCount).to.equal(freshMerkleTree.elements.length);
};

const testConsecutiveUpdateAndAppend = (iterations, elementCount, updateSize, appendSize, options) => {
  let elements = generateElements(elementCount, { seed: 'cc' });
  let merkleTree = new MerkleTree(elements, options);
  let root = null;

  for (let i = 0; i < iterations; i++) {
    const rawUpdateElements = generateElements(updateSize, { random: true });
    const rawUpdateIndices = rawUpdateElements.map(() => Math.floor(Math.random() * elements.length));
    const minimumIndex = merkleTree.minimumCombinedProofIndex;
    rawUpdateIndices[0] = Math.floor(Math.random() * (elements.length - minimumIndex) + minimumIndex);
    const updateIndices = rawUpdateIndices.filter((index, i, arr) => arr.indexOf(index) === i).sort((a, b) => a - b);
    const updateElements = rawUpdateElements.slice(0, updateIndices.length);
    const appendElements = generateElements(Math.ceil(Math.random() * appendSize), { random: true });

    const { newMerkleTree, proof } = merkleTree.updateAndAppendMulti(
      updateIndices,
      updateElements,
      appendElements,
      options
    );
    merkleTree = newMerkleTree;
    const results = MerkleTree.updateAndAppendWithCombinedProof(proof, options);
    root = results.root;

    elements = elements
      .map((element, i) => {
        const index = updateIndices.indexOf(i);

        return index >= 0 ? updateElements[index] : element;
      })
      .concat(appendElements);

    expect(root.equals(merkleTree.root)).to.be.true;
    expect(results.elementCount).to.equal(merkleTree.elements.length);
  }

  const finalMerkleTree = new MerkleTree(elements, options);

  expect(root.equals(finalMerkleTree.root)).to.be.true;
};

const testSizeProofGeneration = (elementCount, seed, expected, options) => {
  const elements = generateElements(elementCount, { seed });
  const merkleTree = new MerkleTree(elements, options);
  const proof = merkleTree.generateSizeProof(options);

  expect(proof.root.equals(merkleTree.root)).to.be.true;
  expect(proof.elementCount).to.equal(elementCount);

  if (options.simple) {
    expect(proof.elementRoot.toString('hex')).to.equal(expected.elementRoot);
    return;
  }

  if (options.compact) {
    proof.compactProof.forEach((d, i) => expect(d.toString('hex')).to.equal(expected.compactProof[i]));
    expect(proof.compactProof.length).to.equal(expected.compactProof.length);
    return;
  }

  proof.decommitments.forEach((d, i) => expect(d.toString('hex')).to.equal(expected.decommitments[i]));
  expect(proof.decommitments.length).to.equal(expected.decommitments.length);
};

const testSizeProofVerification = (elementCount, options) => {
  const elements = generateElements(elementCount, { seed: 'ff' });
  const merkleTree = new MerkleTree(elements, options);
  const proof = merkleTree.generateSizeProof(options);
  const proofValid = MerkleTree.verifySizeProof(proof, options);

  expect(proofValid).to.be.true;
};

describe.only('Merkle-Tree', () => {
  describe('Merkle Tree Construction', () => {
    describe('Balanced', () => {
      it('should build a 8-element Merkle Tree.', () => {
        const expected = {
          root: 'd2fa9d47845f1571f1318afaaabc63a55cc57af3f511e42fc30e05f171d6853d',
          elementRoot: '0c67c6340449c320fb4966988f319713e0610c40237a05fdef8e5da8c66db8a4',
          depth: 3,
        };

        testBuildTree(8, 'ff', expected, { unbalanced: false, sortedHash: false });
      });

      it('should build a 1-element Merkle Tree.', () => {
        const expected = {
          root: 'c83b51dc238800a2852366108ab7df1e32b35e99905c5d845ff5a652f0fb58a8',
          elementRoot: '0e3ba1c61ffe3e984a50346034613b3b7368e64dafd5ea3d2ac05fc5ada33a60',
          depth: 0,
        };

        testBuildTree(1, 'ff', expected, { unbalanced: false, sortedHash: false });
      });

      it('should build a balanced sorted-hash 8-element Merkle Tree.', () => {
        const expected = {
          root: '6764fd6d226590b844285c3d0f1e12bbd19cb7d1ee8277b0fb5b9b45efbbffb6',
          elementRoot: '7f8dc34b7b4e06eff546283358ff8d7a988b62bc266f6337f8234c9a84778221',
          depth: 3,
        };

        testBuildTree(8, 'ff', expected, { unbalanced: false, sortedHash: true });
      });

      it('should build a balanced sorted-hash 1-element Merkle Tree.', () => {
        const expected = {
          root: 'c83b51dc238800a2852366108ab7df1e32b35e99905c5d845ff5a652f0fb58a8',
          elementRoot: '0e3ba1c61ffe3e984a50346034613b3b7368e64dafd5ea3d2ac05fc5ada33a60',
          depth: 0,
        };

        testBuildTree(1, 'ff', expected, { unbalanced: false, sortedHash: true });
      });
    });

    describe('Unbalanced', () => {
      it('should build an 9-element Merkle Tree.', () => {
        const expected = {
          root: '743605bc7fcb07d66ecf3f2b5fcea24bfb27901bfbdb7baf6a194aa45d62461d',
          elementRoot: '5449a839359e08115bbc14ed1795892a3a8562d583744e1a1fa146d273ff1f55',
          depth: 4,
        };

        testBuildTree(9, 'ff', expected, { unbalanced: true, sortedHash: false });
      });

      it('should build an sorted-hash 9-element Merkle Tree.', () => {
        const expected = {
          root: '4c10104ea544f26190809c1117a092b18c8d7ab892f23c30a0f0cdb2c5242c48',
          elementRoot: '86620d93d22f2d06344f81166356ed881cfdc36c8b35a7115e8b0daad4d56ee4',
          depth: 4,
        };

        testBuildTree(9, 'ff', expected, { unbalanced: true, sortedHash: true });
      });
    });

    describe('Balanced/Unbalanced Overlapping Cases', () => {
      it('should build the same 8-element Merkle Tree.', () => {
        compareTrees(8, { unbalanced: false, sortedHash: false }, { unbalanced: true, sortedHash: false });
      });

      it('should build the same sorted-hash 8-element Merkle Tree.', () => {
        compareTrees(8, { unbalanced: false, sortedHash: true }, { unbalanced: true, sortedHash: true });
      });
    });

    describe('Empty', () => {
      it('should build a 0-element Merkle Tree.', () => {
        const expected = {
          root: '0000000000000000000000000000000000000000000000000000000000000000',
          elementRoot: '0000000000000000000000000000000000000000000000000000000000000000',
          depth: 0,
        };

        testBuildTree(0, 'ff', expected, { unbalanced: true, sortedHash: false });
      });
    });
  });

  describe('Single Proofs', () => {
    describe('Single Proof Generation', () => {
      describe('Balanced', () => {
        it('should generate a Single Proof for a 8-element Merkle Tree.', () => {
          const options = { unbalanced: false, sortedHash: false };

          const expected = {
            decommitments: [
              'babbf2a0bca3f1360d7706d6d175f3380c5973df4b2d1bb19a9496792891697d',
              'a3ce89c3f749bfd79ce683054de83f70e40e847cef70e5389167871c4dd4af27',
              'c91b0c977258a25a3803b772c6229444bdca5f73995a108cf36439fdbb30d82e',
            ],
          };

          testSingleProofGeneration(8, 'ff', 2, expected, options);
        });

        it('should generate a Single Proof for a 1-element Merkle Tree.', () => {
          const options = { unbalanced: false, sortedHash: false };

          const expected = {
            decommitments: [],
          };

          testSingleProofGeneration(1, 'ff', 0, expected, options);
        });

        it('should generate a Single Proof for a sorted-hash 8-element Merkle Tree.', () => {
          const options = { unbalanced: false, sortedHash: true };

          const expected = {
            decommitments: [
              'bc481a454a66b25fd1adf8b6b88cbcac3783d39d5ab1e4c45d114846da10274c',
              'a3ce89c3f749bfd79ce683054de83f70e40e847cef70e5389167871c4dd4af27',
              'c91b0c977258a25a3803b772c6229444bdca5f73995a108cf36439fdbb30d82e',
            ],
          };

          testSingleProofGeneration(8, 'ff', 2, expected, options);
        });

        it('should generate a Single Proof for a sorted-hash 1-element Merkle Tree.', () => {
          const options = { unbalanced: false, sortedHash: true };

          const expected = {
            decommitments: [],
          };

          testSingleProofGeneration(1, 'ff', 0, expected, options);
        });

        it('should generate a compact Single Proof for a 8-element Merkle Tree.', () => {
          const options = { unbalanced: false, sortedHash: false, compact: true };

          const expected = {
            compactProof: [
              '0000000000000000000000000000000000000000000000000000000000000008',
              'babbf2a0bca3f1360d7706d6d175f3380c5973df4b2d1bb19a9496792891697d',
              'a3ce89c3f749bfd79ce683054de83f70e40e847cef70e5389167871c4dd4af27',
              'c91b0c977258a25a3803b772c6229444bdca5f73995a108cf36439fdbb30d82e',
            ],
          };

          testSingleProofGeneration(8, 'ff', 2, expected, options);
        });

        it('should generate a compact Single Proof for a 1-element Merkle Tree.', () => {
          const options = { unbalanced: false, sortedHash: false, compact: true };

          const expected = {
            compactProof: ['0000000000000000000000000000000000000000000000000000000000000001'],
          };

          testSingleProofGeneration(1, 'ff', 0, expected, options);
        });
      });

      describe('Unbalanced', () => {
        it('should verify a Single Proof for a 9-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false };

          const expected = {
            decommitments: ['0c67c6340449c320fb4966988f319713e0610c40237a05fdef8e5da8c66db8a4'],
          };

          testSingleProofGeneration(9, 'ff', 8, expected, options);
        });

        it('should verify a Single Proof for a 27-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false };

          const expected = {
            decommitments: [
              'c7ec3e428ae2869b12c1b8e12a84e56f0d7f3cbe752cd1c3775158cf846412be',
              '88d2a11c3b0935fc6a30e3b0a69fa58a84de08ea333248f23e5d747613fc04f9',
              '289b3d65643b54739112fa7df258736b511ed1b5611e4f9ce681ae39fbd5fd8b',
              'c43e6f0c51c26c040dc4a40e372839ccc4a53c1762504da451819ae9e93d239a',
            ],
          };

          testSingleProofGeneration(27, 'ff', 25, expected, options);
        });

        it('should verify a Single Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false };

          const expected = {
            decommitments: [
              'eb98df4415ff9a93976bb26b84f3819662fe31939e022cfa52d9061de351f6d5',
              '06f8f83483a72750b8ba34cbe8fd54cc1243479b12f7b659075311dc54800203',
              'bbc26fa1ff8c9f841d4f4758cccac1def0f9929c30c949451d4e71e4ded0a681',
              '4ac05d0ec2e247aad1065f712d3d6934938e4709f224a0466f558bdf2e4cbf9c',
            ],
          };

          testSingleProofGeneration(100, 'ff', 97, expected, options);
        });

        it('should verify a Single Proof for a sorted-hash 9-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true };

          const expected = {
            decommitments: ['7f8dc34b7b4e06eff546283358ff8d7a988b62bc266f6337f8234c9a84778221'],
          };

          testSingleProofGeneration(9, 'ff', 8, expected, options);
        });

        it('should verify a Single Proof for a sorted-hash 27-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true };

          const expected = {
            decommitments: [
              '2c2cdc952c9d537709959cd357f6268fff33e5e21147f1a23db6cae78fb91eb9',
              'c62e1d7cf122111fa068da94e48ecd21cb02bba4bd41d56e9f4b69a4509a2962',
              '289b3d65643b54739112fa7df258736b511ed1b5611e4f9ce681ae39fbd5fd8b',
              'c43e6f0c51c26c040dc4a40e372839ccc4a53c1762504da451819ae9e93d239a',
            ],
          };

          testSingleProofGeneration(27, 'ff', 25, expected, options);
        });

        it('should verify a Single Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true };

          const expected = {
            decommitments: [
              'bb9a6e5787ae741c6a0e75a360aefe75ee06284ece1edddc1573ac9462945e7f',
              '904afce76e0f7ccead463e22aec76018c1450afd3deb4f387e0617ef39721685',
              'bbc26fa1ff8c9f841d4f4758cccac1def0f9929c30c949451d4e71e4ded0a681',
              '4ac05d0ec2e247aad1065f712d3d6934938e4709f224a0466f558bdf2e4cbf9c',
            ],
          };

          testSingleProofGeneration(100, 'ff', 97, expected, options);
        });

        it('should verify a compact Single Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, compact: true };

          const expected = {
            compactProof: [
              '0000000000000000000000000000000000000000000000000000000000000064',
              'eb98df4415ff9a93976bb26b84f3819662fe31939e022cfa52d9061de351f6d5',
              '06f8f83483a72750b8ba34cbe8fd54cc1243479b12f7b659075311dc54800203',
              'bbc26fa1ff8c9f841d4f4758cccac1def0f9929c30c949451d4e71e4ded0a681',
              '4ac05d0ec2e247aad1065f712d3d6934938e4709f224a0466f558bdf2e4cbf9c',
            ],
          };

          testSingleProofGeneration(100, 'ff', 97, expected, options);
        });
      });

      describe('Balanced/Unbalanced Overlapping Cases', () => {
        it('should generate the same Single Proof for a 8-element Merkle Tree.', () => {
          compareSingleProofs(8, 2, { unbalanced: false, sortedHash: false }, { unbalanced: true, sortedHash: false });
        });

        it('should generate the same Single Proof for a sorted-hash 8-element Merkle Tree.', () => {
          compareSingleProofs(8, 2, { unbalanced: false, sortedHash: true }, { unbalanced: true, sortedHash: true });
        });
      });
    });

    describe('Single Proof Verification', () => {
      describe('Balanced', () => {
        it('should verify a Single Proof for a 8-element Merkle Tree.', () => {
          const options = { unbalanced: false, sortedHash: false };
          testSingleProofVerification(8, 2, options);
        });

        it('should verify a Single Proof for a 1-element Merkle Tree.', () => {
          const options = { unbalanced: false, sortedHash: false };
          testSingleProofVerification(1, 0, options);
        });

        it('should verify a Single Proof for a sorted-hash 8-element Merkle Tree.', () => {
          const options = { unbalanced: false, sortedHash: true };
          testSingleProofVerification(8, 2, options);
        });

        it('should verify a Single Proof for a sorted-hash 1-element Merkle Tree.', () => {
          const options = { unbalanced: false, sortedHash: true };
          testSingleProofVerification(1, 0, options);
        });

        it('should verify a compact Single Proof for a 8-element Merkle Tree.', () => {
          const options = { unbalanced: false, sortedHash: false, compact: true };
          testSingleProofVerification(8, 2, options);
        });

        it('should verify a compact Single Proof for a 1-element Merkle Tree.', () => {
          const options = { unbalanced: false, sortedHash: false, compact: true };
          testSingleProofVerification(1, 0, options);
        });
      });

      describe('Unbalanced', () => {
        it('should verify a Single Proof for a 9-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false };
          testSingleProofVerification(9, 8, options);
        });

        it('should verify a Single Proof for a 27-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false };
          testSingleProofVerification(27, 25, options);
        });

        it('should verify a Single Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false };
          testSingleProofVerification(100, 97, options);
        });

        it('should verify a Single Proof for a sorted-hash 9-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true };
          testSingleProofVerification(9, 8, options);
        });

        it('should verify a Single Proof for a sorted-hash 27-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true };
          testSingleProofVerification(27, 25, options);
        });

        it('should verify a Single Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true };
          testSingleProofVerification(100, 97, options);
        });

        it('should verify a compact Single Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, compact: true };
          testSingleProofVerification(100, 97, options);
        });
      });

      describe('Balanced/Unbalanced Overlapping Cases', () => {
        it('should verify a Single Proof for a 8-element Merkle Tree, built with the unbalanced option.', () => {
          testSingleProofVerification(8, 2, { unbalanced: true, sortedHash: false });
        });

        it('should verify a Single Proof for a sorted-hash 8-element Merkle Tree, built with the unbalanced option.', () => {
          testSingleProofVerification(8, 2, { unbalanced: true, sortedHash: true });
        });
      });
    });

    describe('Single Proof Update', () => {
      describe('Balanced', () => {
        it('should use a Single Proof for a 8-element Merkle Tree to update an element.', () => {
          const options = { unbalanced: false, sortedHash: false };
          testSingleUpdate(8, 2, options);
        });

        it('should use a Single Proof for a 1-element Merkle Tree to update an element.', () => {
          const options = { unbalanced: false, sortedHash: false };
          testSingleUpdate(1, 0, options);
        });

        it('should use a Single Proof for a sorted-hash 8-element Merkle Tree to update an element.', () => {
          const options = { unbalanced: false, sortedHash: true };
          testSingleUpdate(8, 2, options);
        });

        it('should use a Single Proof for a sorted-hash 1-element Merkle Tree to update an element.', () => {
          const options = { unbalanced: false, sortedHash: true };
          testSingleUpdate(1, 0, options);
        });

        it('should use a compact Single Proof for a 8-element Merkle Tree to update an element.', () => {
          const options = { unbalanced: false, sortedHash: false, compact: true };
          testSingleUpdate(8, 2, options);
        });

        it('should use a compact Single Proof for a 1-element Merkle Tree to update an element.', () => {
          const options = { unbalanced: false, sortedHash: false, compact: true };
          testSingleUpdate(1, 0, options);
        });
      });

      describe('Unbalanced', () => {
        it('should verify a Single Proof for a 9-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false };
          testSingleUpdate(9, 8, options);
        });

        it('should verify a Single Proof for a 27-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false };
          testSingleUpdate(27, 25, options);
        });

        it('should verify a Single Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false };
          testSingleUpdate(100, 97, options);
        });

        it('should verify a Single Proof for a sorted-hash 9-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true };
          testSingleUpdate(9, 8, options);
        });

        it('should verify a Single Proof for a sorted-hash 27-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true };
          testSingleUpdate(27, 25, options);
        });

        it('should verify a Single Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true };
          testSingleUpdate(100, 97, options);
        });

        it('should verify a compact Single Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, compact: true };
          testSingleUpdate(100, 97, options);
        });
      });

      describe('Balanced/Unbalanced Overlapping Cases', () => {
        it('should use a Single Proof for a 8-element Merkle Tree, built with the unbalanced option, to update an element.', () => {
          testSingleUpdate(8, 2, { unbalanced: true, sortedHash: false });
        });

        it('should use a Single Proof for a sorted-hash 8-element Merkle Tree, built with the unbalanced option, to update an element.', () => {
          testSingleUpdate(8, 2, { unbalanced: true, sortedHash: true });
        });
      });
    });

    describe('Single Proof Update Consecutive Uses', () => {
      describe('Balanced', () => {
        it('should use 100 Single Proofs for a 16-element Merkle Tree, to update an 100 elements consecutively.', () => {
          testConsecutiveSingleUpdate(100, 16, { unbalanced: false, sortedHash: false });
        });
      });

      describe('Unbalanced', () => {
        it('should use 100 Single Proofs for a 25-element Merkle Tree, to update an 100 elements consecutively.', () => {
          testConsecutiveSingleUpdate(100, 25, { unbalanced: true, sortedHash: false });
        });
      });
    });
  });

  describe('Multi Proofs', () => {
    describe('Index and Existence Multi Proofs', () => {
      describe('Index and Existence Multi Proof Generation', () => {
        describe('Balanced', () => {
          it('should generate a Multi Proof for a 8-element Merkle Tree.', () => {
            const options = { unbalanced: false, sortedHash: false, indexed: true };

            const expected = {
              decommitments: [
                '0e3ba1c61ffe3e984a50346034613b3b7368e64dafd5ea3d2ac05fc5ada33a60',
                '55e76a40d8624a05e93c6bbdd36ed61989ef5f0903cea080e9968b590ba30c39',
                'e868cc58247970644e689c7c207cdbbe6db49bec4953c7ba28527799056f07e9',
              ],
            };

            testMultiProofGeneration(8, 'ff', [1, 4, 5], expected, options);
          });

          it('should generate a Multi Proof for a 1-element Merkle Tree.', () => {
            const options = { unbalanced: false, sortedHash: false, indexed: true };

            const expected = {
              decommitments: [],
            };

            testMultiProofGeneration(1, 'ff', [0], expected, options);
          });

          it('should generate a Multi Proof for a sorted-hash 8-element Merkle Tree.', () => {
            const options = { unbalanced: false, sortedHash: true, indexed: true };

            const expected = {
              decommitments: [
                '0e3ba1c61ffe3e984a50346034613b3b7368e64dafd5ea3d2ac05fc5ada33a60',
                'df00f936e8f696ef3929c73d2176f2012336b0fd4fa5ae504bb3053a44993b94',
                'e868cc58247970644e689c7c207cdbbe6db49bec4953c7ba28527799056f07e9',
              ],
            };

            testMultiProofGeneration(8, 'ff', [1, 4, 5], expected, options);
          });

          it('should generate a Multi Proof for a sorted-hash 1-element Merkle Tree.', () => {
            const options = { unbalanced: false, sortedHash: true, indexed: true };

            const expected = {
              decommitments: [],
            };

            testMultiProofGeneration(1, 'ff', [0], expected, options);
          });

          it('should generate a compact Multi Proof for a 8-element Merkle Tree.', () => {
            const options = { unbalanced: false, sortedHash: false, indexed: true, compact: true };

            const expected = {
              compactProof: [
                '0000000000000000000000000000000000000000000000000000000000000008',
                '0e3ba1c61ffe3e984a50346034613b3b7368e64dafd5ea3d2ac05fc5ada33a60',
                '55e76a40d8624a05e93c6bbdd36ed61989ef5f0903cea080e9968b590ba30c39',
                'e868cc58247970644e689c7c207cdbbe6db49bec4953c7ba28527799056f07e9',
              ],
            };

            testMultiProofGeneration(8, 'ff', [1, 4, 5], expected, options);
          });

          it('should generate a compact Multi Proof for a 1-element Merkle Tree.', () => {
            const options = { unbalanced: false, sortedHash: false, indexed: true, compact: true };

            const expected = {
              compactProof: ['0000000000000000000000000000000000000000000000000000000000000001'],
            };

            testMultiProofGeneration(1, 'ff', [0], expected, options);
          });
        });

        describe.skip('Unbalanced (TODO)', () => {});

        describe('Balanced/Unbalanced Overlapping Cases', () => {
          it.skip('should generate the same Multi Proof for a 8-element Merkle Tree.', () => {
            const balancedOptions = { unbalanced: false, sortedHash: false, indexed: true };
            const unbalancedOptions = { unbalanced: true, sortedHash: false, indexed: true };
            compareMultiProofs(8, [1, 4, 5], balancedOptions, unbalancedOptions);
          });

          it.skip('should generate the same Multi Proof for a sorted-hash 8-element Merkle Tree.', () => {
            const balancedOptions = { unbalanced: false, sortedHash: true, indexed: true };
            const unbalancedOptions = { unbalanced: true, sortedHash: true, indexed: true };
            compareMultiProofs(8, [1, 4, 5], balancedOptions, unbalancedOptions);
          });
        });
      });

      describe('Index and Existence Multi Proof Verification', () => {
        describe('Balanced', () => {
          it('should verify a Multi Proof for a 8-element Merkle Tree.', () => {
            const options = { unbalanced: false, sortedHash: false, indexed: true };
            testMultiProofVerification(8, [1, 4, 5], options);
          });

          it('should verify a Multi Proof for a 1-element Merkle Tree.', () => {
            const options = { unbalanced: false, sortedHash: false, indexed: true };
            testMultiProofVerification(1, [0], options);
          });

          it('should verify a Multi Proof for a sorted-hash 8-element Merkle Tree.', () => {
            const options = { unbalanced: false, sortedHash: true, indexed: true };
            testMultiProofVerification(8, [1, 4, 5], options);
          });

          it('should verify a Multi Proof for a sorted-hash 1-element Merkle Tree.', () => {
            const options = { unbalanced: false, sortedHash: true, indexed: true };
            testMultiProofVerification(1, [0], options);
          });

          it('should verify a compact Multi Proof for a 8-element Merkle Tree.', () => {
            const options = { unbalanced: false, sortedHash: false, indexed: true, compact: true };
            testMultiProofVerification(8, [1, 4, 5], options);
          });

          it('should verify a compact Multi Proof for a 1-element Merkle Tree.', () => {
            const options = { unbalanced: false, sortedHash: false, indexed: true, compact: true };
            testMultiProofVerification(1, [0], options);
          });
        });

        describe.skip('Unbalanced (TODO)', () => {});

        describe.skip('Balanced/Unbalanced Overlapping Cases', () => {
          it('should verify a Multi Proof for a 8-element Merkle Tree, built with the unbalanced option.', () => {
            const options = { unbalanced: true, sortedHash: false, indexed: true };
            testMultiProofVerification(8, [1, 4, 5], options);
          });

          it('should verify a Multi Proof for a sorted-hash 8-element Merkle Tree, built with the unbalanced option.', () => {
            const options = { unbalanced: true, sortedHash: true, indexed: true };
            testMultiProofVerification(8, [1, 4, 5], options);
          });
        });
      });

      describe('Index and Existence Multi Proof Update', () => {
        describe('Balanced', () => {
          it('should use a Multi Proof for a 8-element Merkle Tree to update elements.', () => {
            const options = { unbalanced: false, sortedHash: false, indexed: true };
            testMultiUpdate(8, [1, 4, 5], options);
          });

          it('should use a Multi Proof for a 1-element Merkle Tree to update elements.', () => {
            const options = { unbalanced: false, sortedHash: false, indexed: true };
            testMultiUpdate(1, [0], options);
          });

          it('should use a Multi Proof for a sorted-hash 8-element Merkle Tree to update elements.', () => {
            const options = { unbalanced: false, sortedHash: true, indexed: true };
            testMultiUpdate(8, [1, 4, 5], options);
          });

          it('should use a Multi Proof for a sorted-hash 1-element Merkle Tree to update elements.', () => {
            const options = { unbalanced: false, sortedHash: true, indexed: true };
            testMultiUpdate(1, [0], options);
          });

          it('should use a compact Multi Proof for a 8-element Merkle Tree to update elements.', () => {
            const options = { unbalanced: false, sortedHash: false, indexed: true, compact: true };
            testMultiUpdate(8, [1, 4, 5], options);
          });

          it('should use a compact Multi Proof for a 1-element Merkle Tree to update elements.', () => {
            const options = { unbalanced: false, sortedHash: false, indexed: true, compact: true };
            testMultiUpdate(1, [0], options);
          });
        });

        describe.skip('Unbalanced (TODO)', () => {});

        describe.skip('Balanced/Unbalanced Overlapping Cases', () => {
          it('should use a Multi Proof for a 8-element Merkle Tree, built with the unbalanced option, to update an element.', () => {
            const options = { unbalanced: true, sortedHash: false, indexed: true };
            testMultiUpdate(8, [1, 4, 5], options);
          });

          it('should use a Multi Proof for a sorted-hash 8-element Merkle Tree, built with the unbalanced option, to update an element.', () => {
            const options = { unbalanced: true, sortedHash: true, indexed: true };
            testMultiUpdate(8, [1, 4, 5], options);
          });
        });
      });

      describe('Index and Existence Multi Proof Update Consecutive Uses', () => {
        describe('Balanced', () => {
          it('should use 100 Multi Proofs for a 16-element Merkle Tree, to perform 100 updates of up to 6 random elements.', () => {
            const options = { unbalanced: false, sortedHash: false, indexed: true };
            testConsecutiveMultiUpdate(100, 16, 6, options);
          });

          it('should use 100 Multi Proofs for a 16-element sorted-hash Merkle Tree, to perform 100 updates of up to 6 random elements.', () => {
            const options = { unbalanced: false, sortedHash: true, indexed: true };
            testConsecutiveMultiUpdate(100, 16, 6, options);
          });
        });

        describe.skip('Unbalanced (TODO)', () => {});
      });
    });

    describe('Existence-Only Multi Proofs', () => {
      describe('Existence-Only Boolean-Array Multi Proofs', () => {
        describe('Existence-Only Boolean-Array Multi Proof Generation', () => {
          describe('Balanced', () => {
            it('should generate a Multi Proof for a 8-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: false, indexed: false, compact: false };

              const expected = {
                decommitments: [
                  '0e3ba1c61ffe3e984a50346034613b3b7368e64dafd5ea3d2ac05fc5ada33a60',
                  '55e76a40d8624a05e93c6bbdd36ed61989ef5f0903cea080e9968b590ba30c39',
                  'e868cc58247970644e689c7c207cdbbe6db49bec4953c7ba28527799056f07e9',
                ],
                flags: [true, false, false, false, true],
                skips: [false, false, false, false, false],
                orders: [true, false, true, true, true],
              };

              testMultiProofGeneration(8, 'ff', [1, 4, 5], expected, options);
            });

            it('should generate a Multi Proof for a 1-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: false, indexed: false, compact: false };

              const expected = {
                decommitments: [],
                flags: [],
                skips: [],
                orders: [],
              };

              testMultiProofGeneration(1, 'ff', [0], expected, options);
            });

            it('should generate a Multi Proof for a sorted-hash 8-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: true, indexed: false, compact: false };

              const expected = {
                decommitments: [
                  '0e3ba1c61ffe3e984a50346034613b3b7368e64dafd5ea3d2ac05fc5ada33a60',
                  'df00f936e8f696ef3929c73d2176f2012336b0fd4fa5ae504bb3053a44993b94',
                  'e868cc58247970644e689c7c207cdbbe6db49bec4953c7ba28527799056f07e9',
                ],
                flags: [true, false, false, false, true],
                skips: [false, false, false, false, false],
              };

              testMultiProofGeneration(8, 'ff', [1, 4, 5], expected, options);
            });

            it('should generate a Multi Proof for a sorted-hash 1-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: true, indexed: false, compact: false };

              const expected = {
                decommitments: [],
                flags: [],
                skips: [],
              };

              testMultiProofGeneration(1, 'ff', [0], expected, options);
            });
          });

          describe('Unbalanced', () => {
            it('should generate a Multi Proof for a 12-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };

              const expected = {
                decommitments: [
                  '4847e055cdb073d232313d8bf813dd31b7a3626d8e7881304d3bc41a848bf964',
                  'f9c38f9fec674389962b1b4cb3e26191be58cf5850ee58e4fe170b94de04d3d7',
                  'a3ce89c3f749bfd79ce683054de83f70e40e847cef70e5389167871c4dd4af27',
                  'babbf2a0bca3f1360d7706d6d175f3380c5973df4b2d1bb19a9496792891697d',
                ],
                flags: [false, false, true, true, false, false, false, true],
                skips: [false, false, false, false, false, true, false, false],
                orders: [false, true, true, true, false, true, true, true],
              };

              testMultiProofGeneration(12, 'ff', [2, 3, 8, 11], expected, options);
            });

            it('should generate a Multi Proof for a 19-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };

              const expected = {
                decommitments: [
                  '9a2ac3e4dd11303cc187ad6cbcfb99bcb955f3a242e14001a940a360d41abaa9',
                  '9c14306519dcde45d6985845e9af155bc2431d1ad6fde29a957eaf464f7ed1ec',
                  'c3ed5f33f97f302e5667c4cf731a7dca902aa88b1520976d37b79e2f614d839f',
                  '731017481bc7111f6621c3d3f5511e941e264077817c1939403ec0e16f24d24d',
                  'c91b0c977258a25a3803b772c6229444bdca5f73995a108cf36439fdbb30d82e',
                  'df30b2c34f6b8879381b45dcc32c84248dc5119ecc364f00939660bbf5430445',
                  'd1c7a0741902e7210c324ee399555decfb24a0281c42d0a690a84acae5a1cfd2',
                  '23d7e3b895db705a5867f3e2d747351226d34734b355fdbcf3a7e99e688c6cb2',
                  '55e76a40d8624a05e93c6bbdd36ed61989ef5f0903cea080e9968b590ba30c39',
                  'a3ce89c3f749bfd79ce683054de83f70e40e847cef70e5389167871c4dd4af27',
                ],
                flags: [
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  true,
                  true,
                  false,
                  true,
                  true,
                ],
                skips: [
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  true,
                  false,
                  false,
                  true,
                  false,
                  false,
                ],
                orders: [
                  false,
                  true,
                  false,
                  true,
                  true,
                  true,
                  true,
                  true,
                  true,
                  false,
                  true,
                  true,
                  true,
                  true,
                  true,
                  true,
                ],
              };

              testMultiProofGeneration(19, 'ff', [2, 4, 9, 12, 17], expected, options);
            });

            it('should generate a Multi Proof for a sorted-hash 12-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };

              const expected = {
                decommitments: [
                  '4847e055cdb073d232313d8bf813dd31b7a3626d8e7881304d3bc41a848bf964',
                  'f9c38f9fec674389962b1b4cb3e26191be58cf5850ee58e4fe170b94de04d3d7',
                  'a3ce89c3f749bfd79ce683054de83f70e40e847cef70e5389167871c4dd4af27',
                  'bc481a454a66b25fd1adf8b6b88cbcac3783d39d5ab1e4c45d114846da10274c',
                ],
                flags: [false, false, true, true, false, false, false, true],
                skips: [false, false, false, false, false, true, false, false],
              };

              testMultiProofGeneration(12, 'ff', [2, 3, 8, 11], expected, options);
            });

            it('should generate a Multi Proof for a sorted-hash 19-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };

              const expected = {
                decommitments: [
                  '9a2ac3e4dd11303cc187ad6cbcfb99bcb955f3a242e14001a940a360d41abaa9',
                  '9c14306519dcde45d6985845e9af155bc2431d1ad6fde29a957eaf464f7ed1ec',
                  'c3ed5f33f97f302e5667c4cf731a7dca902aa88b1520976d37b79e2f614d839f',
                  '731017481bc7111f6621c3d3f5511e941e264077817c1939403ec0e16f24d24d',
                  'c91b0c977258a25a3803b772c6229444bdca5f73995a108cf36439fdbb30d82e',
                  'df30b2c34f6b8879381b45dcc32c84248dc5119ecc364f00939660bbf5430445',
                  'c83c0742945e25d8ea750b433deb383bd3c68c5e415398cb3a1bf7ebd760fe85',
                  '23d7e3b895db705a5867f3e2d747351226d34734b355fdbcf3a7e99e688c6cb2',
                  'df00f936e8f696ef3929c73d2176f2012336b0fd4fa5ae504bb3053a44993b94',
                  'a3ce89c3f749bfd79ce683054de83f70e40e847cef70e5389167871c4dd4af27',
                ],
                flags: [
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  true,
                  true,
                  false,
                  true,
                  true,
                ],
                skips: [
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  false,
                  true,
                  false,
                  false,
                  true,
                  false,
                  false,
                ],
              };

              testMultiProofGeneration(19, 'ff', [2, 4, 9, 12, 17], expected, options);
            });
          });

          describe('Balanced/Unbalanced Overlapping Cases', () => {
            it('should generate the same Multi Proof for a 8-element Merkle Tree.', () => {
              const balancedOptions = { unbalanced: false, sortedHash: false, indexed: false, compact: false };
              const unbalancedOptions = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
              compareMultiProofs(8, [1, 4, 5], balancedOptions, unbalancedOptions);
            });

            it('should generate the same Multi Proof for a sorted-hash 8-element Merkle Tree.', () => {
              const balancedOptions = { unbalanced: false, sortedHash: true, indexed: false, compact: false };
              const unbalancedOptions = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
              compareMultiProofs(8, [1, 4, 5], balancedOptions, unbalancedOptions);
            });
          });
        });

        describe('Existence-Only Boolean-Array Multi Proof Verification', () => {
          describe('Balanced', () => {
            it('should verify a Multi Proof for a 8-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: false, indexed: false, compact: false };
              testMultiProofVerification(8, [1, 4, 5], options);
            });

            it('should verify a Multi Proof for a 1-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: false, indexed: false, compact: false };
              testMultiProofVerification(1, [0], options);
            });

            it('should verify a Multi Proof for a sorted-hash 8-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: true, indexed: false, compact: false };
              testMultiProofVerification(8, [1, 4, 5], options);
            });

            it('should verify a Multi Proof for a sorted-hash 1-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: true, indexed: false, compact: false };
              testMultiProofVerification(1, [0], options);
            });
          });

          describe('Unbalanced', () => {
            it('should verify a Multi Proof for a 12-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
              testMultiProofVerification(12, [2, 3, 8, 11], options);
            });

            it('should verify a Multi Proof for a 19-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
              testMultiProofVerification(19, [2, 4, 9, 12, 17], options);
            });

            it('should verify a Multi Proof for a sorted-hash 12-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
              testMultiProofVerification(12, [2, 3, 8, 11], options);
            });

            it('should verify a Multi Proof for a sorted-hash 19-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
              testMultiProofVerification(19, [2, 4, 9, 12, 17], options);
            });
          });

          describe('Balanced/Unbalanced Overlapping Cases', () => {
            it('should verify a Multi Proof for a 8-element Merkle Tree, built with the unbalanced option.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
              testMultiProofVerification(8, [1, 4, 5], options);
            });

            it('should verify a Multi Proof for a sorted-hash 8-element Merkle Tree, built with the unbalanced option.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
              testMultiProofVerification(8, [1, 4, 5], options);
            });
          });
        });

        describe('Existence-Only Boolean-Array Multi Indices Inferring', () => {
          describe('Balanced', () => {
            it('should verify a Multi Proof for a 1-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: false, indexed: false, compact: false };
              testMultiProofIndicesInferring(1, [0], options);
            });

            it('should verify a Multi Proof for a 8-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: false, indexed: false, compact: false };
              testMultiProofIndicesInferring(8, [1, 4, 5], options);
            });

            it('should verify a Multi Proof for a 64-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: false, indexed: false, compact: false };
              testMultiProofIndicesInferring(64, [0, 1, 7, 13, 15, 26, 34, 35, 36, 50, 62], options);
            });
          });

          describe('Unbalanced', () => {
            it('should verify a Multi Proof for a 12-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
              testMultiProofIndicesInferring(12, [2, 3, 8, 11], options);
            });

            it('should verify a Multi Proof for a 19-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
              testMultiProofIndicesInferring(19, [2, 4, 9, 12, 17], options);
            });

            it('should verify a Multi Proof for a 85-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
              testMultiProofIndicesInferring(85, [5, 6, 20, 36, 37, 65, 78, 83], options);
            });
          });
        });

        describe('Existence-Only Boolean-Array Multi Proof Update', () => {
          describe('Balanced', () => {
            it('should use a Multi Proof for a 8-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: false, sortedHash: false, indexed: false, compact: false };
              testMultiUpdate(8, [1, 4, 5], options);
            });

            it('should use a Multi Proof for a 1-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: false, sortedHash: false, indexed: false, compact: false };
              testMultiUpdate(1, [0], options);
            });

            it('should use a Multi Proof for a sorted-hash 8-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: false, sortedHash: true, indexed: false, compact: false };
              testMultiUpdate(8, [1, 4, 5], options);
            });

            it('should use a Multi Proof for a sorted-hash 1-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: false, sortedHash: true, indexed: false, compact: false };
              testMultiUpdate(1, [0], options);
            });
          });

          describe('Unbalanced', () => {
            it('should use a Multi Proof for a 12-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
              testMultiUpdate(12, [2, 3, 8, 11], options);
            });

            it('should use a Multi Proof for a 19-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
              testMultiUpdate(19, [2, 4, 9, 12, 17], options);
            });

            it('should use a Multi Proof for a sorted-hash 12-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
              testMultiUpdate(12, [2, 3, 8, 11], options);
            });

            it('should use a Multi Proof for a sorted-hash 19-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
              testMultiUpdate(19, [2, 4, 9, 12, 17], options);
            });
          });

          describe('Balanced/Unbalanced Overlapping Cases', () => {
            it('should use a Multi Proof for a 8-element Merkle Tree, built with the unbalanced option, to update elements.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
              testMultiUpdate(8, [1, 4, 5], options);
            });

            it('should use a Multi Proof for a sorted-hash 8-element Merkle Tree, built with the unbalanced option, to update elements.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
              testMultiUpdate(8, [1, 4, 5], options);
            });
          });
        });

        describe('Existence-Only Boolean-Array Multi Proof Update Consecutive Uses', () => {
          describe('Balanced', () => {
            it('should use 100 Multi Proofs for a 16-element Merkle Tree, to perform 100 updates of up to 6 random elements.', () => {
              const options = { unbalanced: false, sortedHash: false, indexed: false, compact: false };
              testConsecutiveMultiUpdate(100, 16, 6, options);
            });

            it('should use 100 Multi Proofs for a sorted-hash 16-element Merkle Tree, to perform 100 updates of up to 6 random elements.', () => {
              const options = { unbalanced: false, sortedHash: true, indexed: false, compact: false };
              testConsecutiveMultiUpdate(100, 16, 6, options);
            });
          });

          describe('Unbalanced', () => {
            it('should use 100 Multi Proofs for a 19-element Merkle Tree, to perform 100 updates of up to 6 random elements.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
              testConsecutiveMultiUpdate(100, 19, 6, options);
            });

            it('should use 100 Multi Proofs for a sorted-hash 19-element Merkle Tree, to perform 100 updates of up to 6 random elements.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
              testConsecutiveMultiUpdate(100, 19, 6, options);
            });
          });
        });
      });

      describe('Existence-Only Boolean-Bit (Compact) Multi Proofs', () => {
        describe('Existence-Only Boolean-Bit Multi Proof Generation', () => {
          describe('Balanced', () => {
            it('should generate a compact Multi Proof for a 8-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: false, indexed: false, compact: true };

              const expected = {
                compactProof: [
                  '0000000000000000000000000000000000000000000000000000000000000008',
                  '0000000000000000000000000000000000000000000000000000000000000031',
                  '0000000000000000000000000000000000000000000000000000000000000020',
                  '000000000000000000000000000000000000000000000000000000000000001d',
                  '0e3ba1c61ffe3e984a50346034613b3b7368e64dafd5ea3d2ac05fc5ada33a60',
                  '55e76a40d8624a05e93c6bbdd36ed61989ef5f0903cea080e9968b590ba30c39',
                  'e868cc58247970644e689c7c207cdbbe6db49bec4953c7ba28527799056f07e9',
                ],
              };

              testMultiProofGeneration(8, 'ff', [1, 4, 5], expected, options);
            });

            it('should generate a compact Multi Proof for a 1-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: false, indexed: false, compact: true };

              const expected = {
                compactProof: [
                  '0000000000000000000000000000000000000000000000000000000000000001',
                  '0000000000000000000000000000000000000000000000000000000000000001',
                  '0000000000000000000000000000000000000000000000000000000000000001',
                  '0000000000000000000000000000000000000000000000000000000000000000',
                ],
              };

              testMultiProofGeneration(1, 'ff', [0], expected, options);
            });

            it('should generate a compact Multi Proof for a sorted-hash 8-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: true, indexed: false, compact: true };

              const expected = {
                compactProof: [
                  '0000000000000000000000000000000000000000000000000000000000000008',
                  '0000000000000000000000000000000000000000000000000000000000000031',
                  '0000000000000000000000000000000000000000000000000000000000000020',
                  '0e3ba1c61ffe3e984a50346034613b3b7368e64dafd5ea3d2ac05fc5ada33a60',
                  'df00f936e8f696ef3929c73d2176f2012336b0fd4fa5ae504bb3053a44993b94',
                  'e868cc58247970644e689c7c207cdbbe6db49bec4953c7ba28527799056f07e9',
                ],
              };

              testMultiProofGeneration(8, 'ff', [1, 4, 5], expected, options);
            });

            it('should generate a compact Multi Proof for a sorted-hash 1-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: true, indexed: false, compact: true };

              const expected = {
                compactProof: [
                  '0000000000000000000000000000000000000000000000000000000000000001',
                  '0000000000000000000000000000000000000000000000000000000000000001',
                  '0000000000000000000000000000000000000000000000000000000000000001',
                ],
              };

              testMultiProofGeneration(1, 'ff', [0], expected, options);
            });
          });

          describe('Unbalanced', () => {
            it('should generate a compact Multi Proof for a 3-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };

              const expected = {
                compactProof: [
                  '0000000000000000000000000000000000000000000000000000000000000003',
                  '000000000000000000000000000000000000000000000000000000000000000e',
                  '0000000000000000000000000000000000000000000000000000000000000009',
                  '0000000000000000000000000000000000000000000000000000000000000007',
                ],
              };

              testMultiProofGeneration(3, 'ff', [0, 1, 2], expected, options);
            });

            it('should generate a compact Multi Proof for a 3-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };

              const expected = {
                compactProof: [
                  '0000000000000000000000000000000000000000000000000000000000000003',
                  '000000000000000000000000000000000000000000000000000000000000000c',
                  '0000000000000000000000000000000000000000000000000000000000000009',
                  '0000000000000000000000000000000000000000000000000000000000000005',
                  '0e3ba1c61ffe3e984a50346034613b3b7368e64dafd5ea3d2ac05fc5ada33a60',
                ],
              };

              testMultiProofGeneration(3, 'ff', [1, 2], expected, options);
            });

            it('should generate a compact Multi Proof for a 3-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };

              const expected = {
                compactProof: [
                  '0000000000000000000000000000000000000000000000000000000000000003',
                  '0000000000000000000000000000000000000000000000000000000000000004',
                  '0000000000000000000000000000000000000000000000000000000000000005',
                  '0000000000000000000000000000000000000000000000000000000000000001',
                  'a3ce89c3f749bfd79ce683054de83f70e40e847cef70e5389167871c4dd4af27',
                ],
              };

              testMultiProofGeneration(3, 'ff', [2], expected, options);
            });

            it('should generate a compact Multi Proof for a 12-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };

              const expected = {
                compactProof: [
                  '000000000000000000000000000000000000000000000000000000000000000c',
                  '000000000000000000000000000000000000000000000000000000000000018c',
                  '0000000000000000000000000000000000000000000000000000000000000120',
                  '00000000000000000000000000000000000000000000000000000000000000ee',
                  '4847e055cdb073d232313d8bf813dd31b7a3626d8e7881304d3bc41a848bf964',
                  'f9c38f9fec674389962b1b4cb3e26191be58cf5850ee58e4fe170b94de04d3d7',
                  'a3ce89c3f749bfd79ce683054de83f70e40e847cef70e5389167871c4dd4af27',
                  'babbf2a0bca3f1360d7706d6d175f3380c5973df4b2d1bb19a9496792891697d',
                ],
              };

              testMultiProofGeneration(12, 'ff', [2, 3, 8, 11], expected, options);
            });

            it('should generate a compact Multi Proof for a 19-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };

              const expected = {
                compactProof: [
                  '0000000000000000000000000000000000000000000000000000000000000013',
                  '000000000000000000000000000000000000000000000000000000000001d800',
                  '0000000000000000000000000000000000000000000000000000000000012400',
                  '000000000000000000000000000000000000000000000000000000000000fdfa',
                  '9a2ac3e4dd11303cc187ad6cbcfb99bcb955f3a242e14001a940a360d41abaa9',
                  '9c14306519dcde45d6985845e9af155bc2431d1ad6fde29a957eaf464f7ed1ec',
                  'c3ed5f33f97f302e5667c4cf731a7dca902aa88b1520976d37b79e2f614d839f',
                  '731017481bc7111f6621c3d3f5511e941e264077817c1939403ec0e16f24d24d',
                  'c91b0c977258a25a3803b772c6229444bdca5f73995a108cf36439fdbb30d82e',
                  'df30b2c34f6b8879381b45dcc32c84248dc5119ecc364f00939660bbf5430445',
                  'd1c7a0741902e7210c324ee399555decfb24a0281c42d0a690a84acae5a1cfd2',
                  '23d7e3b895db705a5867f3e2d747351226d34734b355fdbcf3a7e99e688c6cb2',
                  '55e76a40d8624a05e93c6bbdd36ed61989ef5f0903cea080e9968b590ba30c39',
                  'a3ce89c3f749bfd79ce683054de83f70e40e847cef70e5389167871c4dd4af27',
                ],
              };

              testMultiProofGeneration(19, 'ff', [2, 4, 9, 12, 17], expected, options);
            });

            it('should generate a compact Multi Proof for a sorted-hash 3-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };

              const expected = {
                compactProof: [
                  '0000000000000000000000000000000000000000000000000000000000000003',
                  '000000000000000000000000000000000000000000000000000000000000000e',
                  '0000000000000000000000000000000000000000000000000000000000000009',
                ],
              };

              testMultiProofGeneration(3, 'ff', [0, 1, 2], expected, options);
            });

            it('should generate a compact Multi Proof for a sorted-hash 3-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };

              const expected = {
                compactProof: [
                  '0000000000000000000000000000000000000000000000000000000000000003',
                  '000000000000000000000000000000000000000000000000000000000000000c',
                  '0000000000000000000000000000000000000000000000000000000000000009',
                  '0e3ba1c61ffe3e984a50346034613b3b7368e64dafd5ea3d2ac05fc5ada33a60',
                ],
              };

              testMultiProofGeneration(3, 'ff', [1, 2], expected, options);
            });

            it('should generate a compact Multi Proof for a sorted-hash 3-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };

              const expected = {
                compactProof: [
                  '0000000000000000000000000000000000000000000000000000000000000003',
                  '0000000000000000000000000000000000000000000000000000000000000004',
                  '0000000000000000000000000000000000000000000000000000000000000005',
                  'a3ce89c3f749bfd79ce683054de83f70e40e847cef70e5389167871c4dd4af27',
                ],
              };

              testMultiProofGeneration(3, 'ff', [2], expected, options);
            });

            it('should generate a compact Multi Proof for a sorted-hash 12-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
              const expected = {
                compactProof: [
                  '000000000000000000000000000000000000000000000000000000000000000c',
                  '000000000000000000000000000000000000000000000000000000000000018c',
                  '0000000000000000000000000000000000000000000000000000000000000120',
                  '4847e055cdb073d232313d8bf813dd31b7a3626d8e7881304d3bc41a848bf964',
                  'f9c38f9fec674389962b1b4cb3e26191be58cf5850ee58e4fe170b94de04d3d7',
                  'a3ce89c3f749bfd79ce683054de83f70e40e847cef70e5389167871c4dd4af27',
                  'bc481a454a66b25fd1adf8b6b88cbcac3783d39d5ab1e4c45d114846da10274c',
                ],
              };

              testMultiProofGeneration(12, 'ff', [2, 3, 8, 11], expected, options);
            });

            it('should generate a compact Multi Proof for a sorted-hash 19-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };

              const expected = {
                compactProof: [
                  '0000000000000000000000000000000000000000000000000000000000000013',
                  '000000000000000000000000000000000000000000000000000000000001d800',
                  '0000000000000000000000000000000000000000000000000000000000012400',
                  '9a2ac3e4dd11303cc187ad6cbcfb99bcb955f3a242e14001a940a360d41abaa9',
                  '9c14306519dcde45d6985845e9af155bc2431d1ad6fde29a957eaf464f7ed1ec',
                  'c3ed5f33f97f302e5667c4cf731a7dca902aa88b1520976d37b79e2f614d839f',
                  '731017481bc7111f6621c3d3f5511e941e264077817c1939403ec0e16f24d24d',
                  'c91b0c977258a25a3803b772c6229444bdca5f73995a108cf36439fdbb30d82e',
                  'df30b2c34f6b8879381b45dcc32c84248dc5119ecc364f00939660bbf5430445',
                  'c83c0742945e25d8ea750b433deb383bd3c68c5e415398cb3a1bf7ebd760fe85',
                  '23d7e3b895db705a5867f3e2d747351226d34734b355fdbcf3a7e99e688c6cb2',
                  'df00f936e8f696ef3929c73d2176f2012336b0fd4fa5ae504bb3053a44993b94',
                  'a3ce89c3f749bfd79ce683054de83f70e40e847cef70e5389167871c4dd4af27',
                ],
              };

              testMultiProofGeneration(19, 'ff', [2, 4, 9, 12, 17], expected, options);
            });
          });

          describe('Balanced/Unbalanced Overlapping Cases', () => {
            it('should generate the same Multi Proof for a 8-element Merkle Tree.', () => {
              const balancedOptions = { unbalanced: false, sortedHash: false, indexed: false, compact: true };
              const unbalancedOptions = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
              compareMultiProofs(8, [1, 4, 5], balancedOptions, unbalancedOptions);
            });

            it('should generate the same Multi Proof for a sorted-hash 8-element Merkle Tree.', () => {
              const balancedOptions = { unbalanced: false, sortedHash: true, indexed: false, compact: true };
              const unbalancedOptions = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
              compareMultiProofs(8, [1, 4, 5], balancedOptions, unbalancedOptions);
            });
          });
        });

        describe('Existence-Only Boolean-Bit Multi Proof Verification', () => {
          describe('Balanced', () => {
            it('should verify a Multi Proof for a 8-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: false, indexed: false, compact: true };
              testMultiProofVerification(8, [1, 4, 5], options);
            });

            it('should verify a Multi Proof for a 1-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: false, indexed: false, compact: true };
              testMultiProofVerification(1, [0], options);
            });

            it('should verify a Multi Proof for a sorted-hash 8-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: true, indexed: false, compact: true };
              testMultiProofVerification(8, [1, 4, 5], options);
            });

            it('should verify a Multi Proof for a sorted-hash 1-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: true, indexed: false, compact: true };
              testMultiProofVerification(1, [0], options);
            });
          });

          describe('Unbalanced', () => {
            it('should verify a Multi Proof for a 3-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
              testMultiProofVerification(3, [0, 1, 2], options);
            });

            it('should verify a Multi Proof for a 3-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
              testMultiProofVerification(3, [1, 2], options);
            });

            it('should verify a Multi Proof for a 3-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
              testMultiProofVerification(3, [2], options);
            });

            it('should verify a Multi Proof for a 12-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
              testMultiProofVerification(12, [2, 3, 8, 11], options);
            });

            it('should verify a Multi Proof for a 19-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
              testMultiProofVerification(19, [2, 4, 9, 12, 17], options);
            });

            it('should verify a Multi Proof for a sorted-hash 3-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
              testMultiProofVerification(3, [0, 1, 2], options);
            });

            it('should verify a Multi Proof for a sorted-hash 3-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
              testMultiProofVerification(3, [1, 2], options);
            });

            it('should verify a Multi Proof for a sorted-hash 3-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
              testMultiProofVerification(3, [2], options);
            });

            it('should verify a Multi Proof for a sorted-hash 12-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
              testMultiProofVerification(12, [2, 3, 8, 11], options);
            });

            it('should verify a Multi Proof for a sorted-hash 19-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
              testMultiProofVerification(19, [2, 4, 9, 12, 17], options);
            });
          });

          describe('Balanced/Unbalanced Overlapping Cases', () => {
            it('should verify a Multi Proof for a 8-element Merkle Tree, built with the unbalanced option.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
              testMultiProofVerification(8, [1, 4, 5], options);
            });

            it('should verify a Multi Proof for a sorted-hash 8-element Merkle Tree, built with the unbalanced option.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
              testMultiProofVerification(8, [1, 4, 5], options);
            });
          });
        });

        describe('Existence-Only Boolean-Bit Multi Indices Inferring', () => {
          describe('Balanced', () => {
            it('should verify a Multi Proof for a 1-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: false, indexed: false, compact: true };
              testMultiProofIndicesInferring(1, [0], options);
            });

            it('should verify a Multi Proof for a 8-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: false, indexed: false, compact: true };
              testMultiProofIndicesInferring(8, [1, 4, 5], options);
            });

            it('should verify a Multi Proof for a 64-element Merkle Tree.', () => {
              const options = { unbalanced: false, sortedHash: false, indexed: false, compact: true };
              testMultiProofIndicesInferring(64, [0, 1, 7, 13, 15, 26, 34, 35, 36, 50, 62], options);
            });
          });

          describe('Unbalanced', () => {
            it('should verify a Multi Proof for a 12-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
              testMultiProofIndicesInferring(12, [2, 3, 8, 11], options);
            });

            it('should verify a Multi Proof for a 19-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
              testMultiProofIndicesInferring(19, [2, 4, 9, 12, 17], options);
            });

            it('should verify a Multi Proof for a 85-element Merkle Tree.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
              testMultiProofIndicesInferring(85, [5, 6, 20, 36, 37, 65, 78, 83], options);
            });
          });
        });

        describe('Existence-Only Boolean-Bit Multi Proof Update', () => {
          describe('Balanced', () => {
            it('should use a Multi Proof for a 8-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: false, sortedHash: false, indexed: false, compact: true };
              testMultiUpdate(8, [1, 4, 5], options);
            });

            it('should use a Multi Proof for a 1-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: false, sortedHash: false, indexed: false, compact: true };
              testMultiUpdate(1, [0], options);
            });

            it('should use a Multi Proof for a sorted-hash 8-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: false, sortedHash: true, indexed: false, compact: true };
              testMultiUpdate(8, [1, 4, 5], options);
            });

            it('should use a Multi Proof for a sorted-hash 1-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: false, sortedHash: true, indexed: false, compact: true };
              testMultiUpdate(1, [0], options);
            });
          });

          describe('Unbalanced', () => {
            it('should use a Multi Proof for a 3-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
              testMultiUpdate(3, [0, 1, 2], options);
            });

            it('should use a Multi Proof for a 3-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
              testMultiUpdate(3, [1, 2], options);
            });

            it('should use a Multi Proof for a 3-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
              testMultiUpdate(3, [2], options);
            });

            it('should use a Multi Proof for a 12-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
              testMultiUpdate(12, [2, 3, 8, 11], options);
            });

            it('should use a Multi Proof for a 19-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
              testMultiUpdate(19, [2, 4, 9, 12, 17], options);
            });

            it('should use a Multi Proof for a sorted-hash 3-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
              testMultiUpdate(3, [0, 1, 2], options);
            });

            it('should use a Multi Proof for a sorted-hash 3-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
              testMultiUpdate(3, [1, 2], options);
            });

            it('should use a Multi Proof for a sorted-hash 3-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
              testMultiUpdate(3, [2], options);
            });

            it('should use a Multi Proof for a sorted-hash 12-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
              testMultiUpdate(12, [2, 3, 8, 11], options);
            });

            it('should use a Multi Proof for a sorted-hash 19-element Merkle Tree, to update elements.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
              testMultiUpdate(19, [2, 4, 9, 12, 17], options);
            });
          });

          describe('Balanced/Unbalanced Overlapping Cases', () => {
            it('should use a Multi Proof for a 8-element Merkle Tree, built with the unbalanced option, to update elements.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
              testMultiUpdate(8, [1, 4, 5], options);
            });

            it('should use a Multi Proof for a sorted-hash 8-element Merkle Tree, built with the unbalanced option, to update elements.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
              testMultiUpdate(8, [1, 4, 5], options);
            });
          });
        });

        describe('Existence-Only Boolean-Bit Multi Proof Update Consecutive Uses', () => {
          describe('Balanced', () => {
            it('should use 100 Multi Proofs for a 16-element Merkle Tree, to perform 100 updates of up to 6 random elements.', () => {
              const options = { unbalanced: false, sortedHash: false, indexed: false, compact: true };
              testConsecutiveMultiUpdate(100, 16, 6, options);
            });

            it('should use 100 Multi Proofs for a sorted-hash 16-element Merkle Tree, to perform 100 updates of up to 6 random elements.', () => {
              const options = { unbalanced: false, sortedHash: true, indexed: false, compact: true };
              testConsecutiveMultiUpdate(100, 16, 6, options);
            });
          });

          describe('Unbalanced', () => {
            it('should use 100 Multi Proofs for a 19-element Merkle Tree, to perform 100 updates of up to 6 random elements.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
              testConsecutiveMultiUpdate(100, 19, 6, options);
            });

            it('should use 50 Multi Proofs for a 89-element Merkle Tree, to perform 50 updates of up to 13 random elements.', () => {
              const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
              testConsecutiveMultiUpdate(50, 89, 13, options);
            });

            it('should use 100 Multi Proofs for a sorted-hash 19-element Merkle Tree, to perform 100 updates of up to 6 random elements.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
              testConsecutiveMultiUpdate(100, 19, 6, options);
            });

            it('should use 50 Multi Proofs for a sorted-hash 89-element Merkle Tree, to perform 50 updates of up to 13 random elements.', () => {
              const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
              testConsecutiveMultiUpdate(50, 89, 13, options);
            });
          });
        });
      });
    });
  });

  describe('Append Proofs', () => {
    describe('Append Proof Generation', () => {
      it('should generate an Append Proof for a 0-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false };

        const expected = {
          decommitments: [],
        };

        testAppendProofGeneration(0, 'ff', expected, options);
      });

      it('should generate an Append Proof for a 1-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false };

        const expected = {
          decommitments: ['0e3ba1c61ffe3e984a50346034613b3b7368e64dafd5ea3d2ac05fc5ada33a60'],
        };

        testAppendProofGeneration(1, 'ff', expected, options);
      });

      it('should generate an Append Proof for a 2-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false };

        const expected = {
          decommitments: ['a3ce89c3f749bfd79ce683054de83f70e40e847cef70e5389167871c4dd4af27'],
        };

        testAppendProofGeneration(2, 'ff', expected, options);
      });

      it('should generate an Append Proof for a 3-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false };

        const expected = {
          decommitments: [
            'a3ce89c3f749bfd79ce683054de83f70e40e847cef70e5389167871c4dd4af27',
            'a7220cb76d040b2fdf4e25b319539c769eb77147fcb92b6ea8962cd04096c27b',
          ],
        };

        testAppendProofGeneration(3, 'ff', expected, options);
      });

      it('should generate an Append Proof for a 8-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false };

        const expected = {
          decommitments: ['0c67c6340449c320fb4966988f319713e0610c40237a05fdef8e5da8c66db8a4'],
        };

        testAppendProofGeneration(8, 'ff', expected, options);
      });

      it('should generate an Append Proof for a 15-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false };

        const expected = {
          decommitments: [
            '0c67c6340449c320fb4966988f319713e0610c40237a05fdef8e5da8c66db8a4',
            'd9df67e21f45396a2739193be4bb49cefb1ebac44dd283c07519b6de6f154f5b',
            '712ed55abe1946b941876a6230b3135edadc400a18897e029ffdbff6900503e6',
            'e481ff292c1b323f27dd2e7b0da511947e0d349a0616a739ea628a3a5888c529',
          ],
        };

        testAppendProofGeneration(15, 'ff', expected, options);
      });

      it('should generate an Append Proof for a 20-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false };

        const expected = {
          decommitments: [
            'c7ec3e428ae2869b12c1b8e12a84e56f0d7f3cbe752cd1c3775158cf846412be',
            'febc2d558e22b7e32db3a5dd0b4d8ac3dac5835493955c53e3eb0f8fdb2f4954',
          ],
        };

        testAppendProofGeneration(20, 'ff', expected, options);
      });

      it('should generate an Append Proof for a 20-element sorted-hash Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: true };

        const expected = {
          decommitments: [
            '2c2cdc952c9d537709959cd357f6268fff33e5e21147f1a23db6cae78fb91eb9',
            'b1b7aca080829feceb8c4da79c5552b533f4f1542667ca689217d04230f835b0',
          ],
        };

        testAppendProofGeneration(20, 'ff', expected, options);
      });

      it('should generate a compact Append Proof for a 0-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, compact: true };

        const expected = {
          compactProof: ['0000000000000000000000000000000000000000000000000000000000000000'],
        };

        testAppendProofGeneration(0, 'ff', expected, options);
      });

      it('should generate a compact Append Proof for a 20-element sorted-hash Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: true, compact: true };

        const expected = {
          compactProof: [
            '0000000000000000000000000000000000000000000000000000000000000014',
            '2c2cdc952c9d537709959cd357f6268fff33e5e21147f1a23db6cae78fb91eb9',
            'b1b7aca080829feceb8c4da79c5552b533f4f1542667ca689217d04230f835b0',
          ],
        };

        testAppendProofGeneration(20, 'ff', expected, options);
      });

      it('should generate a compact Append Proof for a 20-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, compact: true };

        const expected = {
          compactProof: [
            '0000000000000000000000000000000000000000000000000000000000000014',
            'c7ec3e428ae2869b12c1b8e12a84e56f0d7f3cbe752cd1c3775158cf846412be',
            'febc2d558e22b7e32db3a5dd0b4d8ac3dac5835493955c53e3eb0f8fdb2f4954',
          ],
        };

        testAppendProofGeneration(20, 'ff', expected, options);
      });
    });

    describe('Append Proof Verification', () => {
      it('should verify an Append Proof for a 0-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testAppendProofVerification(0, options);
      });

      it('should verify an Append Proof for a 1-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testAppendProofVerification(1, options);
      });

      it('should verify an Append Proof for a 2-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testAppendProofVerification(2, options);
      });

      it('should verify an Append Proof for a 3-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testAppendProofVerification(3, options);
      });

      it('should verify an Append Proof for a 8-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testAppendProofVerification(8, options);
      });

      it('should verify an Append Proof for a 15-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testAppendProofVerification(15, options);
      });

      it('should verify an Append Proof for a 20-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testAppendProofVerification(20, options);
      });

      it('should verify an Append Proof for a 0-element sorted-hash Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testAppendProofVerification(0, options);
      });

      it('should verify an Append Proof for a 1-element sorted-hash Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testAppendProofVerification(1, options);
      });

      it('should verify an Append Proof for a 2-element sorted-hash Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testAppendProofVerification(2, options);
      });

      it('should verify an Append Proof for a 3-element sorted-hash Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testAppendProofVerification(3, options);
      });

      it('should verify an Append Proof for a 8-element sorted-hash Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testAppendProofVerification(8, options);
      });

      it('should verify an Append Proof for a 15-element sorted-hash Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testAppendProofVerification(15, options);
      });

      it('should verify an Append Proof for a 20-element sorted-hash Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testAppendProofVerification(20, options);
      });

      it('should verify a compact Append Proof for a 0-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, compact: true };
        testAppendProofVerification(0, options);
      });

      it('should verify a compact Append Proof for a 20-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, compact: true };
        testAppendProofVerification(20, options);
      });
    });

    describe('Append Proof Single Append', () => {
      it('should use an Append Proof for a 0-element Merkle Tree, to append an element.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testSingleAppend(0, options);
      });

      it('should use an Append Proof for a 1-element Merkle Tree, to append an element.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testSingleAppend(1, options);
      });

      it('should use an Append Proof for a 2-element Merkle Tree, to append an element.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testSingleAppend(2, options);
      });

      it('should use an Append Proof for a 3-element Merkle Tree, to append an element.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testSingleAppend(3, options);
      });

      it('should use an Append Proof for a 8-element Merkle Tree, to append an element.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testSingleAppend(8, options);
      });

      it('should use an Append Proof for a 15-element Merkle Tree, to append an element.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testSingleAppend(15, options);
      });

      it('should use an Append Proof for a 20-element Merkle Tree, to append an element.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testSingleAppend(20, options);
      });

      it('should use an Append Proof for a 0-element sorted-hash Merkle Tree, to append an element.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testSingleAppend(0, options);
      });

      it('should use an Append Proof for a 1-element sorted-hash Merkle Tree, to append an element.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testSingleAppend(1, options);
      });

      it('should use an Append Proof for a 2-element sorted-hash Merkle Tree, to append an element.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testSingleAppend(2, options);
      });

      it('should use an Append Proof for a 3-element sorted-hash Merkle Tree, to append an element.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testSingleAppend(3, options);
      });

      it('should use an Append Proof for a 8-element sorted-hash Merkle Tree, to append an element.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testSingleAppend(8, options);
      });

      it('should use an Append Proof for a 15-element sorted-hash Merkle Tree, to append an element.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testSingleAppend(15, options);
      });

      it('should use an Append Proof for a 20-element sorted-hash Merkle Tree, to append an element.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testSingleAppend(20, options);
      });

      it('should use a compact Append Proof for a 0-element Merkle Tree, to append an element.', () => {
        const options = { unbalanced: true, sortedHash: false, compact: true };
        testSingleAppend(0, options);
      });

      it('should use a compact Append Proof for a 20-element Merkle Tree, to append an element.', () => {
        const options = { unbalanced: true, sortedHash: false, compact: true };
        testSingleAppend(20, options);
      });
    });

    describe('Append Proof Single Append Consecutive Uses', () => {
      it('should use 50 Append Proofs for a 0-element Merkle Tree, to append an 50 elements consecutively.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testConsecutiveSingleAppend(50, 0, options);
      });

      it('should use 100 Append Proofs for a 15-element Merkle Tree, to append an 100 elements consecutively.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testConsecutiveSingleAppend(100, 15, options);
      });
    });

    describe('Append Proof Multi Append', () => {
      it('should use a Multi Append Proof for a 0-element Merkle Tree, to append 5 elements.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testMultiAppend(0, 5, options);
      });

      it('should use a Multi Append Proof for a 1-element Merkle Tree, to append 5 elements.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testMultiAppend(1, 5, options);
      });

      it('should use a Multi Append Proof for a 2-element Merkle Tree, to append 5 elements.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testMultiAppend(2, 5, options);
      });

      it('should use a Multi Append Proof for a 3-element Merkle Tree, to append 5 elements.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testMultiAppend(3, 5, options);
      });

      it('should use a Multi Append Proof for a 8-element Merkle Tree, to append 5 elements.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testMultiAppend(8, 5, options);
      });

      it('should use a Multi Append Proof for a 15-element Merkle Tree, to append 5 elements.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testMultiAppend(15, 5, options);
      });

      it('should use a Multi Append Proof for a 19-element Merkle Tree, to append 5 elements.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testMultiAppend(19, 5, options);
      });

      it('should use a Multi Append Proof for a 20-element Merkle Tree, to append 5 elements.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testMultiAppend(20, 5, options);
      });

      it('should use a Multi Append Proof for a 49-element Merkle Tree, to append 17 elements.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testMultiAppend(49, 17, options);
      });

      it('should use a Multi Append Proof for a 120-element Merkle Tree, to append 8 elements.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testMultiAppend(120, 8, options);
      });

      it('should use a Multi Append Proof for a 0-element sorted-hash Merkle Tree, to append 5 elements.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testMultiAppend(0, 5, options);
      });

      it('should use a Multi Append Proof for a 1-element sorted-hash Merkle Tree, to append 5 elements.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testMultiAppend(1, 5, options);
      });

      it('should use a Multi Append Proof for a 2-element sorted-hash Merkle Tree, to append 5 elements.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testMultiAppend(2, 5, options);
      });

      it('should use a Multi Append Proof for a 3-element sorted-hash Merkle Tree, to append 5 elements.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testMultiAppend(3, 5, options);
      });

      it('should use a Multi Append Proof for a 8-element sorted-hash Merkle Tree, to append 5 elements.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testMultiAppend(8, 5, options);
      });

      it('should use a Multi Append Proof for a 15-element sorted-hash Merkle Tree, to append 5 elements.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testMultiAppend(15, 5, options);
      });

      it('should use a Multi Append Proof for a sorted-hash 19-element Merkle Tree, to append 5 elements.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testMultiAppend(19, 5, options);
      });

      it('should use a Multi Append Proof for a sorted-hash 20-element Merkle Tree, to append 5 elements.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testMultiAppend(20, 5, options);
      });

      it('should use a Multi Append Proof for a sorted-hash 49-element Merkle Tree, to append 17 elements.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testMultiAppend(49, 17, options);
      });

      it('should use a Multi Append Proof for a sorted-hash 120-element Merkle Tree, to append 8 elements.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testMultiAppend(120, 8, options);
      });

      it('should use a compact Multi Append Proof for a 0-element Merkle Tree, to append 8 elements.', () => {
        const options = { unbalanced: true, sortedHash: false, compact: true };
        testMultiAppend(0, 8, options);
      });

      it('should use a compact Multi Append Proof for a 120-element Merkle Tree, to append 8 elements.', () => {
        const options = { unbalanced: true, sortedHash: false, compact: true };
        testMultiAppend(120, 8, options);
      });
    });

    describe('Append Proof Multi Append Consecutive Uses', () => {
      it('should use 25 Multi Append Proofs for a 0-element Merkle Tree, to perform 25 appends of up to 4 random elements.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testConsecutiveMultiAppend(25, 0, 4, options);
      });

      it('should use 100 Multi Append Proofs for a 1-element Merkle Tree, to perform 100 appends of up to 6 random elements.', () => {
        const options = { unbalanced: true, sortedHash: false };
        testConsecutiveMultiAppend(100, 1, 6, options);
      });

      it('should use 50 Multi Append Proofs for a 7-element sorted-hash Merkle Tree, to perform 50 appends of up to 11 random elements.', () => {
        const options = { unbalanced: true, sortedHash: true };
        testConsecutiveMultiAppend(50, 7, 11, options);
      });
    });
  });

  describe('Combined Proof (Multi Proofs with Append Proofs)', () => {
    describe('Get Minimum Element Index for Combined Proof', () => {
      it('should get the minimum element index to be included in a Combined Proof a 1-element Merkle Tree.', () => {
        const options = { unbalanced: true };
        testCombinedProofMinimumIndex(1, { minimumIndex: 0 }, options);
      });

      it('should get the minimum element index to be included in a Combined Proof a 2-element Merkle Tree.', () => {
        const options = { unbalanced: true };
        testCombinedProofMinimumIndex(2, { minimumIndex: 0 }, options);
      });

      it('should get the minimum element index to be included in a Combined Proof a 3-element Merkle Tree.', () => {
        const options = { unbalanced: true };
        testCombinedProofMinimumIndex(3, { minimumIndex: 2 }, options);
      });

      it('should get the minimum element index to be included in a Combined Proof a 4-element Merkle Tree.', () => {
        const options = { unbalanced: true };
        testCombinedProofMinimumIndex(4, { minimumIndex: 0 }, options);
      });

      it('should get the minimum element index to be included in a Combined Proof a 5-element Merkle Tree.', () => {
        const options = { unbalanced: true };
        testCombinedProofMinimumIndex(5, { minimumIndex: 4 }, options);
      });

      it('should get the minimum element index to be included in a Combined Proof a 6-element Merkle Tree.', () => {
        const options = { unbalanced: true };
        testCombinedProofMinimumIndex(6, { minimumIndex: 4 }, options);
      });

      it('should get the minimum element index to be included in a Combined Proof a 7-element Merkle Tree.', () => {
        const options = { unbalanced: true };
        testCombinedProofMinimumIndex(7, { minimumIndex: 6 }, options);
      });

      it('should get the minimum element index to be included in a Combined Proof a 8-element Merkle Tree.', () => {
        const options = { unbalanced: true };
        testCombinedProofMinimumIndex(8, { minimumIndex: 0 }, options);
      });

      it('should get the minimum element index to be included in a Combined Proof a 23-element Merkle Tree.', () => {
        const options = { unbalanced: true };
        testCombinedProofMinimumIndex(23, { minimumIndex: 22 }, options);
      });

      it('should get the minimum element index to be included in a Combined Proof a 48-element Merkle Tree.', () => {
        const options = { unbalanced: true };
        testCombinedProofMinimumIndex(48, { minimumIndex: 32 }, options);
      });

      it('should get the minimum element index to be included in a Combined Proof a 365-element Merkle Tree.', () => {
        const options = { unbalanced: true };
        testCombinedProofMinimumIndex(365, { minimumIndex: 364 }, options);
      });

      it('should get the minimum element index to be included in a Combined Proof a 384-element Merkle Tree.', () => {
        const options = { unbalanced: true };
        testCombinedProofMinimumIndex(384, { minimumIndex: 256 }, options);
      });

      it('should get the minimum element index to be included in a Combined Proof a 580-element Merkle Tree.', () => {
        const options = { unbalanced: true };
        testCombinedProofMinimumIndex(580, { minimumIndex: 576 }, options);
      });

      it('should get the minimum element index to be included in a Combined Proof a 1792-element Merkle Tree.', () => {
        const options = { unbalanced: true };
        testCombinedProofMinimumIndex(1792, { minimumIndex: 1536 }, options);
      });
    });

    describe('Boolean-Array Combined Proofs', () => {
      describe('Boolean-Array Combined Proof Generation', () => {
        it('should verify a Combined Proof for a 1-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofGeneration(1, 'ff', [0], 5, options);
        });

        it('should verify a Combined Proof for a 2-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofGeneration(2, 'ff', [1], 5, options);
        });

        it('should verify a Combined Proof for a 2-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofGeneration(2, 'ff', [0, 1], 5, options);
        });

        it('should verify a Combined Proof for a 128-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofGeneration(128, 'ff', [2, 4, 12, 15, 127], 5, options);
        });

        it('should verify a Combined Proof for a 128-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofGeneration(128, 'ff', [2, 4, 12, 15, 126, 127], 5, options);
        });

        it('should verify a Combined Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofGeneration(100, 'ff', [99], 5, options);
        });

        it('should verify a Combined Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofGeneration(100, 'ff', [2, 4, 12, 15, 99], 5, options);
        });

        it('should verify a Combined Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofGeneration(100, 'ff', [2, 4, 12, 15, 98, 99], 5, options);
        });

        it('should verify a Combined Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofGeneration(100, 'ff', [2, 4, 12, 15, 97, 99], 5, options);
        });

        it('should verify a Combined Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofGeneration(100, 'ff', [2, 4, 12, 15, 97, 98, 99], 5, options);
        });

        it('should verify a Combined Proof for a 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofGeneration(101, 'ff', [100], 5, options);
        });

        it('should verify a Combined Proof for a 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofGeneration(101, 'ff', [2, 4, 12, 15, 100], 5, options);
        });

        it('should verify a Combined Proof for a 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofGeneration(101, 'ff', [2, 4, 12, 15, 99, 100], 5, options);
        });

        it('should verify a Combined Proof for a 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofGeneration(101, 'ff', [2, 4, 12, 15, 98, 100], 5, options);
        });

        it('should verify a Combined Proof for a 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofGeneration(101, 'ff', [2, 4, 12, 15, 98, 99, 100], 5, options);
        });

        it('should verify a Combined Proof for a 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofGeneration(12, 'ff', [7, 11], 5, options);
        });

        it('should verify a Combined Proof for a 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofGeneration(12, 'ff', [7, 10], 5, options);
        });

        it('should verify a Combined Proof for a 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofGeneration(12, 'ff', [7, 9], 5, options);
        });

        it('should verify a Combined Proof for a 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofGeneration(12, 'ff', [7, 8], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 1-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofGeneration(1, 'ff', [0], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 2-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofGeneration(2, 'ff', [1], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 2-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofGeneration(2, 'ff', [0, 1], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 128-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofGeneration(128, 'ff', [2, 4, 12, 15, 127], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 128-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofGeneration(128, 'ff', [2, 4, 12, 15, 126, 127], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofGeneration(100, 'ff', [99], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofGeneration(100, 'ff', [2, 4, 12, 15, 99], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofGeneration(100, 'ff', [2, 4, 12, 15, 98, 99], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofGeneration(100, 'ff', [2, 4, 12, 15, 97, 99], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofGeneration(100, 'ff', [2, 4, 12, 15, 97, 98, 99], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofGeneration(101, 'ff', [100], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofGeneration(101, 'ff', [2, 4, 12, 15, 100], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofGeneration(101, 'ff', [2, 4, 12, 15, 99, 100], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofGeneration(101, 'ff', [2, 4, 12, 15, 98, 100], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofGeneration(101, 'ff', [2, 4, 12, 15, 98, 99, 100], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofGeneration(12, 'ff', [7, 11], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofGeneration(12, 'ff', [7, 10], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofGeneration(12, 'ff', [7, 9], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofGeneration(12, 'ff', [7, 8], 5, options);
        });
      });

      describe('Boolean-Array Combined Proof Verification', () => {
        it('should verify a Combined Proof for a 1-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofVerification(1, [0], options);
        });

        it('should verify a Combined Proof for a 2-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofVerification(2, [1], options);
        });

        it('should verify a Combined Proof for a 2-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofVerification(2, [0, 1], options);
        });

        it('should verify a Combined Proof for a 128-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofVerification(128, [2, 4, 12, 15, 127], options);
        });

        it('should verify a Combined Proof for a 128-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofVerification(128, [2, 4, 12, 15, 126, 127], options);
        });

        it('should verify a Combined Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofVerification(100, [99], options);
        });

        it('should verify a Combined Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofVerification(100, [2, 4, 12, 15, 99], options);
        });

        it('should verify a Combined Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofVerification(100, [2, 4, 12, 15, 98, 99], options);
        });

        it('should verify a Combined Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofVerification(100, [2, 4, 12, 15, 97, 99], options);
        });

        it('should verify a Combined Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofVerification(100, [2, 4, 12, 15, 97, 98, 99], options);
        });

        it('should verify a Combined Proof for a 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofVerification(101, [100], options);
        });

        it('should verify a Combined Proof for a 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofVerification(101, [2, 4, 12, 15, 100], options);
        });

        it('should verify a Combined Proof for a 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofVerification(101, [2, 4, 12, 15, 99, 100], options);
        });

        it('should verify a Combined Proof for a 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofVerification(101, [2, 4, 12, 15, 98, 100], options);
        });

        it('should verify a Combined Proof for a 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofVerification(101, [2, 4, 12, 15, 98, 99, 100], options);
        });

        it('should verify a Combined Proof for a 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofVerification(12, [7, 11], options);
        });

        it('should verify a Combined Proof for a 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofVerification(12, [7, 10], options);
        });

        it('should verify a Combined Proof for a 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofVerification(12, [7, 9], options);
        });

        it('should verify a Combined Proof for a 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedProofVerification(12, [7, 8], options);
        });

        it('should verify a Combined Proof for a sorted-hash 1-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofVerification(1, [0], options);
        });

        it('should verify a Combined Proof for a sorted-hash 2-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofVerification(2, [1], options);
        });

        it('should verify a Combined Proof for a sorted-hash 2-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofVerification(2, [0, 1], options);
        });

        it('should verify a Combined Proof for a sorted-hash 128-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofVerification(128, [2, 4, 12, 15, 127], options);
        });

        it('should verify a Combined Proof for a sorted-hash 128-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofVerification(128, [2, 4, 12, 15, 126, 127], options);
        });

        it('should verify a Combined Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofVerification(100, [99], options);
        });

        it('should verify a Combined Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofVerification(100, [2, 4, 12, 15, 99], options);
        });

        it('should verify a Combined Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofVerification(100, [2, 4, 12, 15, 98, 99], options);
        });

        it('should verify a Combined Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofVerification(100, [2, 4, 12, 15, 97, 99], options);
        });

        it('should verify a Combined Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofVerification(100, [2, 4, 12, 15, 97, 98, 99], options);
        });

        it('should verify a Combined Proof for a sorted-hash 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofVerification(101, [100], options);
        });

        it('should verify a Combined Proof for a sorted-hash 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofVerification(101, [2, 4, 12, 15, 100], options);
        });

        it('should verify a Combined Proof for a sorted-hash 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofVerification(101, [2, 4, 12, 15, 99, 100], options);
        });

        it('should verify a Combined Proof for a sorted-hash 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofVerification(101, [2, 4, 12, 15, 98, 100], options);
        });

        it('should verify a Combined Proof for a sorted-hash 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofVerification(101, [2, 4, 12, 15, 98, 99, 100], options);
        });

        it('should verify a Combined Proof for a sorted-hash 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofVerification(12, [7, 11], options);
        });

        it('should verify a Combined Proof for a sorted-hash 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofVerification(12, [7, 10], options);
        });

        it('should verify a Combined Proof for a sorted-hash 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofVerification(12, [7, 9], options);
        });

        it('should verify a Combined Proof for a sorted-hash 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedProofVerification(12, [7, 8], options);
        });
      });

      describe('Boolean-Array Combined Proof Update and Append', () => {
        it('should use a Combined Proof for a 1-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedUpdateAndAppend(1, [0], 5, options);
        });

        it('should use a Combined Proof for a 2-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedUpdateAndAppend(2, [1], 5, options);
        });

        it('should use a Combined Proof for a 2-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedUpdateAndAppend(2, [0, 1], 5, options);
        });

        it('should use a Combined Proof for a 128-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedUpdateAndAppend(128, [2, 4, 12, 15, 127], 5, options);
        });

        it('should use a Combined Proof for a 128-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedUpdateAndAppend(128, [2, 4, 12, 15, 126, 127], 5, options);
        });

        it('should use a Combined Proof for a 100-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedUpdateAndAppend(100, [99], 5, options);
        });

        it('should use a Combined Proof for a 100-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedUpdateAndAppend(100, [2, 4, 12, 15, 99], 5, options);
        });

        it('should use a Combined Proof for a 100-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedUpdateAndAppend(100, [2, 4, 12, 15, 98, 99], 5, options);
        });

        it('should use a Combined Proof for a 100-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedUpdateAndAppend(100, [2, 4, 12, 15, 97, 99], 5, options);
        });

        it('should use a Combined Proof for a 100-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedUpdateAndAppend(100, [2, 4, 12, 15, 97, 98, 99], 5, options);
        });

        it('should use a Combined Proof for a 101-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedUpdateAndAppend(101, [100], 5, options);
        });

        it('should use a Combined Proof for a 101-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedUpdateAndAppend(101, [2, 4, 12, 15, 100], 5, options);
        });

        it('should use a Combined Proof for a 101-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedUpdateAndAppend(101, [2, 4, 12, 15, 99, 100], 5, options);
        });

        it('should use a Combined Proof for a 101-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedUpdateAndAppend(101, [2, 4, 12, 15, 98, 100], 5, options);
        });

        it('should use a Combined Proof for a 101-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedUpdateAndAppend(101, [2, 4, 12, 15, 98, 99, 100], 5, options);
        });

        it('should use a Combined Proof for a 12-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedUpdateAndAppend(12, [7, 11], 5, options);
        });

        it('should use a Combined Proof for a 12-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedUpdateAndAppend(12, [7, 10], 5, options);
        });

        it('should use a Combined Proof for a 12-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedUpdateAndAppend(12, [7, 9], 5, options);
        });

        it('should use a Combined Proof for a 12-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testCombinedUpdateAndAppend(12, [7, 8], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 1-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedUpdateAndAppend(1, [0], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 2-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedUpdateAndAppend(2, [1], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 2-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedUpdateAndAppend(2, [0, 1], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 128-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedUpdateAndAppend(128, [2, 4, 12, 15, 127], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 128-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedUpdateAndAppend(128, [2, 4, 12, 15, 126, 127], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 100-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedUpdateAndAppend(100, [99], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 100-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedUpdateAndAppend(100, [2, 4, 12, 15, 99], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 100-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedUpdateAndAppend(100, [2, 4, 12, 15, 98, 99], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 100-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedUpdateAndAppend(100, [2, 4, 12, 15, 97, 99], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 100-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedUpdateAndAppend(100, [2, 4, 12, 15, 97, 98, 99], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 101-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedUpdateAndAppend(101, [100], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 101-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedUpdateAndAppend(101, [2, 4, 12, 15, 100], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 101-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedUpdateAndAppend(101, [2, 4, 12, 15, 99, 100], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 101-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedUpdateAndAppend(101, [2, 4, 12, 15, 98, 100], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 101-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedUpdateAndAppend(101, [2, 4, 12, 15, 98, 99, 100], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 12-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedUpdateAndAppend(12, [7, 11], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 12-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedUpdateAndAppend(12, [7, 10], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 12-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedUpdateAndAppend(12, [7, 9], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 12-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testCombinedUpdateAndAppend(12, [7, 8], 5, options);
        });
      });

      describe('Boolean-Array Combined Proof Update an Append Consecutive Uses', () => {
        it('should use 100 Combined Proofs for a 1-element Merkle Tree, to perform 100 updates and appends of up to 6 random elements respectively.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testConsecutiveUpdateAndAppend(100, 1, 6, 6, options);
        });

        it('should use 50 Combined Proofs for a 3-element Merkle Tree, to perform 50 updates and appends of up to 12 random elements respectively.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: false };
          testConsecutiveUpdateAndAppend(50, 3, 12, 12, options);
        });

        it('should use 100 Combined Proofs for a sorted-hash 1-element Merkle Tree, to perform 100 updates and appends of up to 6 random elements respectively.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testConsecutiveUpdateAndAppend(100, 1, 6, 6, options);
        });

        it('should use 50 Combined Proofs for a sorted-hash 3-element Merkle Tree, to perform 50 updates and appends of up to 12 random elements respectively.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: false };
          testConsecutiveUpdateAndAppend(50, 3, 12, 12, options);
        });
      });
    });

    describe('Boolean-Bit (Compact) Combined Proofs', () => {
      describe('Boolean-Bit Combined Proof Generation', () => {
        it('should verify a Combined Proof for a 1-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofGeneration(1, 'ff', [0], 5, options);
        });

        it('should verify a Combined Proof for a 2-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofGeneration(2, 'ff', [1], 5, options);
        });

        it('should verify a Combined Proof for a 2-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofGeneration(2, 'ff', [0, 1], 5, options);
        });

        it('should verify a Combined Proof for a 128-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofGeneration(128, 'ff', [2, 4, 12, 15, 127], 5, options);
        });

        it('should verify a Combined Proof for a 128-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofGeneration(128, 'ff', [2, 4, 12, 15, 126, 127], 5, options);
        });

        it('should verify a Combined Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofGeneration(100, 'ff', [99], 5, options);
        });

        it('should verify a Combined Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofGeneration(100, 'ff', [2, 4, 12, 15, 99], 5, options);
        });

        it('should verify a Combined Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofGeneration(100, 'ff', [2, 4, 12, 15, 98, 99], 5, options);
        });

        it('should verify a Combined Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofGeneration(100, 'ff', [2, 4, 12, 15, 97, 99], 5, options);
        });

        it('should verify a Combined Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofGeneration(100, 'ff', [2, 4, 12, 15, 97, 98, 99], 5, options);
        });

        it('should verify a Combined Proof for a 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofGeneration(101, 'ff', [100], 5, options);
        });

        it('should verify a Combined Proof for a 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofGeneration(101, 'ff', [2, 4, 12, 15, 100], 5, options);
        });

        it('should verify a Combined Proof for a 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofGeneration(101, 'ff', [2, 4, 12, 15, 99, 100], 5, options);
        });

        it('should verify a Combined Proof for a 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofGeneration(101, 'ff', [2, 4, 12, 15, 98, 100], 5, options);
        });

        it('should verify a Combined Proof for a 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofGeneration(101, 'ff', [2, 4, 12, 15, 98, 99, 100], 5, options);
        });

        it('should verify a Combined Proof for a 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofGeneration(12, 'ff', [7, 11], 5, options);
        });

        it('should verify a Combined Proof for a 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofGeneration(12, 'ff', [7, 10], 5, options);
        });

        it('should verify a Combined Proof for a 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofGeneration(12, 'ff', [7, 9], 5, options);
        });

        it('should verify a Combined Proof for a 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofGeneration(12, 'ff', [7, 8], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 1-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofGeneration(1, 'ff', [0], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 2-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofGeneration(2, 'ff', [1], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 2-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofGeneration(2, 'ff', [0, 1], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 128-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofGeneration(128, 'ff', [2, 4, 12, 15, 127], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 128-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofGeneration(128, 'ff', [2, 4, 12, 15, 126, 127], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofGeneration(100, 'ff', [99], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofGeneration(100, 'ff', [2, 4, 12, 15, 99], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofGeneration(100, 'ff', [2, 4, 12, 15, 98, 99], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofGeneration(100, 'ff', [2, 4, 12, 15, 97, 99], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofGeneration(100, 'ff', [2, 4, 12, 15, 97, 98, 99], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofGeneration(101, 'ff', [100], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofGeneration(101, 'ff', [2, 4, 12, 15, 100], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofGeneration(101, 'ff', [2, 4, 12, 15, 99, 100], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofGeneration(101, 'ff', [2, 4, 12, 15, 98, 100], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofGeneration(101, 'ff', [2, 4, 12, 15, 98, 99, 100], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofGeneration(12, 'ff', [7, 11], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofGeneration(12, 'ff', [7, 10], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofGeneration(12, 'ff', [7, 9], 5, options);
        });

        it('should verify a Combined Proof for a sorted-hash 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofGeneration(12, 'ff', [7, 8], 5, options);
        });
      });

      describe('Boolean-Bit Combined Proof Verification', () => {
        it('should verify a Combined Proof for a 1-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofVerification(1, [0], options);
        });

        it('should verify a Combined Proof for a 2-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofVerification(2, [1], options);
        });

        it('should verify a Combined Proof for a 2-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofVerification(2, [0, 1], options);
        });

        it('should verify a Combined Proof for a 128-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofVerification(128, [2, 4, 12, 15, 127], options);
        });

        it('should verify a Combined Proof for a 128-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofVerification(128, [2, 4, 12, 15, 126, 127], options);
        });

        it('should verify a Combined Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofVerification(100, [99], options);
        });

        it('should verify a Combined Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofVerification(100, [2, 4, 12, 15, 99], options);
        });

        it('should verify a Combined Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofVerification(100, [2, 4, 12, 15, 98, 99], options);
        });

        it('should verify a Combined Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofVerification(100, [2, 4, 12, 15, 97, 99], options);
        });

        it('should verify a Combined Proof for a 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofVerification(100, [2, 4, 12, 15, 97, 98, 99], options);
        });

        it('should verify a Combined Proof for a 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofVerification(101, [100], options);
        });

        it('should verify a Combined Proof for a 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofVerification(101, [2, 4, 12, 15, 100], options);
        });

        it('should verify a Combined Proof for a 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofVerification(101, [2, 4, 12, 15, 99, 100], options);
        });

        it('should verify a Combined Proof for a 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofVerification(101, [2, 4, 12, 15, 98, 100], options);
        });

        it('should verify a Combined Proof for a 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofVerification(101, [2, 4, 12, 15, 98, 99, 100], options);
        });

        it('should verify a Combined Proof for a 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofVerification(12, [7, 11], options);
        });

        it('should verify a Combined Proof for a 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofVerification(12, [7, 10], options);
        });

        it('should verify a Combined Proof for a 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofVerification(12, [7, 9], options);
        });

        it('should verify a Combined Proof for a 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedProofVerification(12, [7, 8], options);
        });

        it('should verify a Combined Proof for a sorted-hash 1-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofVerification(1, [0], options);
        });

        it('should verify a Combined Proof for a sorted-hash 2-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofVerification(2, [1], options);
        });

        it('should verify a Combined Proof for a sorted-hash 2-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofVerification(2, [0, 1], options);
        });

        it('should verify a Combined Proof for a sorted-hash 128-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofVerification(128, [2, 4, 12, 15, 127], options);
        });

        it('should verify a Combined Proof for a sorted-hash 128-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofVerification(128, [2, 4, 12, 15, 126, 127], options);
        });

        it('should verify a Combined Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofVerification(100, [99], options);
        });

        it('should verify a Combined Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofVerification(100, [2, 4, 12, 15, 99], options);
        });

        it('should verify a Combined Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofVerification(100, [2, 4, 12, 15, 98, 99], options);
        });

        it('should verify a Combined Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofVerification(100, [2, 4, 12, 15, 97, 99], options);
        });

        it('should verify a Combined Proof for a sorted-hash 100-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofVerification(100, [2, 4, 12, 15, 97, 98, 99], options);
        });

        it('should verify a Combined Proof for a sorted-hash 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofVerification(101, [100], options);
        });

        it('should verify a Combined Proof for a sorted-hash 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofVerification(101, [2, 4, 12, 15, 100], options);
        });

        it('should verify a Combined Proof for a sorted-hash 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofVerification(101, [2, 4, 12, 15, 99, 100], options);
        });

        it('should verify a Combined Proof for a sorted-hash 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofVerification(101, [2, 4, 12, 15, 98, 100], options);
        });

        it('should verify a Combined Proof for a sorted-hash 101-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofVerification(101, [2, 4, 12, 15, 98, 99, 100], options);
        });

        it('should verify a Combined Proof for a sorted-hash 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofVerification(12, [7, 11], options);
        });

        it('should verify a Combined Proof for a sorted-hash 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofVerification(12, [7, 10], options);
        });

        it('should verify a Combined Proof for a sorted-hash 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofVerification(12, [7, 9], options);
        });

        it('should verify a Combined Proof for a sorted-hash 12-element Merkle Tree.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedProofVerification(12, [7, 8], options);
        });
      });

      describe('Boolean-Bit Combined Proof Update and Append', () => {
        it('should use a Combined Proof for a 1-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedUpdateAndAppend(1, [0], 5, options);
        });

        it('should use a Combined Proof for a 2-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedUpdateAndAppend(2, [1], 5, options);
        });

        it('should use a Combined Proof for a 2-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedUpdateAndAppend(2, [0, 1], 5, options);
        });

        it('should use a Combined Proof for a 128-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedUpdateAndAppend(128, [2, 4, 12, 15, 127], 5, options);
        });

        it('should use a Combined Proof for a 128-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedUpdateAndAppend(128, [2, 4, 12, 15, 126, 127], 5, options);
        });

        it('should use a Combined Proof for a 100-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedUpdateAndAppend(100, [99], 5, options);
        });

        it('should use a Combined Proof for a 100-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedUpdateAndAppend(100, [2, 4, 12, 15, 99], 5, options);
        });

        it('should use a Combined Proof for a 100-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedUpdateAndAppend(100, [2, 4, 12, 15, 98, 99], 5, options);
        });

        it('should use a Combined Proof for a 100-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedUpdateAndAppend(100, [2, 4, 12, 15, 97, 99], 5, options);
        });

        it('should use a Combined Proof for a 100-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedUpdateAndAppend(100, [2, 4, 12, 15, 97, 98, 99], 5, options);
        });

        it('should use a Combined Proof for a 101-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedUpdateAndAppend(101, [100], 5, options);
        });

        it('should use a Combined Proof for a 101-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedUpdateAndAppend(101, [2, 4, 12, 15, 100], 5, options);
        });

        it('should use a Combined Proof for a 101-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedUpdateAndAppend(101, [2, 4, 12, 15, 99, 100], 5, options);
        });

        it('should use a Combined Proof for a 101-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedUpdateAndAppend(101, [2, 4, 12, 15, 98, 100], 5, options);
        });

        it('should use a Combined Proof for a 101-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedUpdateAndAppend(101, [2, 4, 12, 15, 98, 99, 100], 5, options);
        });

        it('should use a Combined Proof for a 12-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedUpdateAndAppend(12, [7, 11], 5, options);
        });

        it('should use a Combined Proof for a 12-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedUpdateAndAppend(12, [7, 10], 5, options);
        });

        it('should use a Combined Proof for a 12-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedUpdateAndAppend(12, [7, 9], 5, options);
        });

        it('should use a Combined Proof for a 12-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testCombinedUpdateAndAppend(12, [7, 8], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 1-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedUpdateAndAppend(1, [0], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 2-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedUpdateAndAppend(2, [1], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 2-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedUpdateAndAppend(2, [0, 1], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 128-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedUpdateAndAppend(128, [2, 4, 12, 15, 127], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 128-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedUpdateAndAppend(128, [2, 4, 12, 15, 126, 127], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 100-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedUpdateAndAppend(100, [99], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 100-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedUpdateAndAppend(100, [2, 4, 12, 15, 99], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 100-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedUpdateAndAppend(100, [2, 4, 12, 15, 98, 99], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 100-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedUpdateAndAppend(100, [2, 4, 12, 15, 97, 99], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 100-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedUpdateAndAppend(100, [2, 4, 12, 15, 97, 98, 99], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 101-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedUpdateAndAppend(101, [100], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 101-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedUpdateAndAppend(101, [2, 4, 12, 15, 100], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 101-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedUpdateAndAppend(101, [2, 4, 12, 15, 99, 100], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 101-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedUpdateAndAppend(101, [2, 4, 12, 15, 98, 100], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 101-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedUpdateAndAppend(101, [2, 4, 12, 15, 98, 99, 100], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 12-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedUpdateAndAppend(12, [7, 11], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 12-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedUpdateAndAppend(12, [7, 10], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 12-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedUpdateAndAppend(12, [7, 9], 5, options);
        });

        it('should use a Combined Proof for a sorted-hash 12-element Merkle Tree, to update and append elements.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testCombinedUpdateAndAppend(12, [7, 8], 5, options);
        });
      });

      describe('Boolean-Bit Combined Proof Update an Append Consecutive Uses', () => {
        it('should use 100 Combined Proofs for a 1-element Merkle Tree, to perform 100 updates and appends of up to 6 random elements respectively.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testConsecutiveUpdateAndAppend(100, 1, 6, 6, options);
        });

        it('should use 50 Combined Proofs for a 3-element Merkle Tree, to perform 50 updates and appends of up to 12 random elements respectively.', () => {
          const options = { unbalanced: true, sortedHash: false, indexed: false, compact: true };
          testConsecutiveUpdateAndAppend(50, 3, 12, 12, options);
        });

        it('should use 100 Combined Proofs for a sorted-hash 1-element Merkle Tree, to perform 100 updates and appends of up to 6 random elements respectively.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testConsecutiveUpdateAndAppend(100, 1, 6, 6, options);
        });

        it('should use 50 Combined Proofs for a sorted-hash 3-element Merkle Tree, to perform 50 updates and appends of up to 12 random elements respectively.', () => {
          const options = { unbalanced: true, sortedHash: true, indexed: false, compact: true };
          testConsecutiveUpdateAndAppend(50, 3, 12, 12, options);
        });
      });
    });
  });

  describe('Size Proofs', () => {
    describe('Size Proof Generation', () => {
      it('should generate a Size Proof for a 0-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, simple: false };

        const expected = {
          decommitments: [],
        };

        testSizeProofGeneration(0, 'ff', expected, options);
      });

      it('should generate a Size Proof for a 1-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, simple: false };

        const expected = {
          decommitments: ['0e3ba1c61ffe3e984a50346034613b3b7368e64dafd5ea3d2ac05fc5ada33a60'],
        };

        testSizeProofGeneration(1, 'ff', expected, options);
      });

      it('should generate a Size Proof for a 2-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, simple: false };

        const expected = {
          decommitments: ['a3ce89c3f749bfd79ce683054de83f70e40e847cef70e5389167871c4dd4af27'],
        };

        testSizeProofGeneration(2, 'ff', expected, options);
      });

      it('should generate a Size Proof for a 3-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, simple: false };

        const expected = {
          decommitments: [
            'a3ce89c3f749bfd79ce683054de83f70e40e847cef70e5389167871c4dd4af27',
            'a7220cb76d040b2fdf4e25b319539c769eb77147fcb92b6ea8962cd04096c27b',
          ],
        };

        testSizeProofGeneration(3, 'ff', expected, options);
      });

      it('should generate a Size Proof for a 8-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, simple: false };

        const expected = {
          decommitments: ['0c67c6340449c320fb4966988f319713e0610c40237a05fdef8e5da8c66db8a4'],
        };

        testSizeProofGeneration(8, 'ff', expected, options);
      });

      it('should generate a Size Proof for a 15-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, simple: false };

        const expected = {
          decommitments: [
            '0c67c6340449c320fb4966988f319713e0610c40237a05fdef8e5da8c66db8a4',
            'd9df67e21f45396a2739193be4bb49cefb1ebac44dd283c07519b6de6f154f5b',
            '712ed55abe1946b941876a6230b3135edadc400a18897e029ffdbff6900503e6',
            'e481ff292c1b323f27dd2e7b0da511947e0d349a0616a739ea628a3a5888c529',
          ],
        };

        testSizeProofGeneration(15, 'ff', expected, options);
      });

      it('should generate a Size Proof for a 20-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, simple: false };

        const expected = {
          decommitments: [
            'c7ec3e428ae2869b12c1b8e12a84e56f0d7f3cbe752cd1c3775158cf846412be',
            'febc2d558e22b7e32db3a5dd0b4d8ac3dac5835493955c53e3eb0f8fdb2f4954',
          ],
        };

        testSizeProofGeneration(20, 'ff', expected, options);
      });

      it('should generate a compact Size Proof for a 0-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, compact: true, simple: false };

        const expected = {
          compactProof: [],
        };

        testSizeProofGeneration(0, 'ff', expected, options);
      });

      it('should generate a compact Size Proof for a 20-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, compact: true, simple: false };

        const expected = {
          compactProof: [
            'c7ec3e428ae2869b12c1b8e12a84e56f0d7f3cbe752cd1c3775158cf846412be',
            'febc2d558e22b7e32db3a5dd0b4d8ac3dac5835493955c53e3eb0f8fdb2f4954',
          ],
        };

        testSizeProofGeneration(20, 'ff', expected, options);
      });

      it('should generate a simple Size Proof for a 0-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, simple: true };

        const expected = {
          elementRoot: '0000000000000000000000000000000000000000000000000000000000000000',
        };

        testSizeProofGeneration(0, 'ff', expected, options);
      });

      it('should generate a simple Size Proof for a 20-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, simple: true };

        const expected = {
          elementRoot: '56afa93d33699c72a6989f3b114b1b474d3ec202164549fe3d616cca61fb071b',
        };

        testSizeProofGeneration(20, 'ff', expected, options);
      });

      it('should generate a simple Size Proof for a 20-element sorted-hash Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: true, simple: true };

        const expected = {
          elementRoot: '5944736c577a3a171994fca82f54afa1cd102dd1a0b3c3bd9e71c82038a2172e',
        };

        testSizeProofGeneration(20, 'ff', expected, options);
      });
    });

    describe('Size Proof Verification', () => {
      it('should verify a Size Proof for a 0-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, simple: false };
        testSizeProofVerification(0, options);
      });

      it('should verify a Size Proof for a 1-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, simple: false };
        testSizeProofVerification(1, options);
      });

      it('should verify a Size Proof for a 2-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, simple: false };
        testSizeProofVerification(2, options);
      });

      it('should verify a Size Proof for a 3-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, simple: false };
        testSizeProofVerification(3, options);
      });

      it('should verify a Size Proof for a 8-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, simple: false };
        testSizeProofVerification(8, options);
      });

      it('should verify a Size Proof for a 15-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, simple: false };
        testSizeProofVerification(15, options);
      });

      it('should verify a Size Proof for a 20-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, simple: false };
        testSizeProofVerification(20, options);
      });

      it('should verify a compact Size Proof for a 0-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, compact: true, simple: false };
        testSizeProofVerification(0, options);
      });

      it('should verify a compact Size Proof for a 20-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, compact: true, simple: false };
        testSizeProofVerification(20, options);
      });

      it('should verify a simple Size Proof for a 0-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, simple: true };
        testSizeProofVerification(0, options);
      });

      it('should verify a simple Size Proof for a 20-element Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: false, simple: true };
        testSizeProofVerification(20, options);
      });

      it('should verify a simple Size Proof for a 20-element sorted-hash Merkle Tree.', () => {
        const options = { unbalanced: true, sortedHash: true, simple: true };
        testSizeProofVerification(20, options);
      });
    });
  });
});
