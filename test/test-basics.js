const { it } = require('mocha')
const main = require('../')
const test = it
const assert = require('assert')
const same = assert.deepStrictEqual

const chunk = Buffer.alloc(1024, '\n')

const mkgen = async function * (length) {
  let i = 0
  while (i < length) {
    yield chunk
    i++
  }
}

const sum = (x, y) => x + y

test('basic inline buffer', async () => {
  same(chunk.length, main.size(chunk))
})

const testMany = async (i, limit) => {
  const blocks = { 'dag-cbor': [], raw: [] }
  let last
  for await (const block of main.from(mkgen(i, { limit }))) {
    const cid = await block.cid()
    blocks[cid.codec].push(block)
    last = block
  }
  same(blocks.raw.length, i)
  same(blocks.raw.map(b => b.decodeUnsafe().length).reduce(sum), i * 1024)
  return [last, blocks['dag-cbor'], blocks.raw]
}

test('basic stream', async () => {
  const [root, blocks] = await testMany(50, 1000)
  same(blocks.length, 1)
  same(main.size(root), 50 * 1024)
})

test('nested stream', async () => {
  const [root, blocks] = await testMany(500, 100)
  same(blocks.length, 1)
  same(main.size(root), 500 * 1024)
})
