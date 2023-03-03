/* global it */
import * as codec from '@ipld/dag-cbor'
import { sha256 as hasher } from 'multiformats/hashes/sha2'
import * as main from '@ipld/fbl'
import assert from 'assert'
import { bytes } from 'multiformats'
import * as raw from 'multiformats/codecs/raw'
import { encode } from 'multiformats/block'

const { coerce, equals, isBinary } = bytes

const test = it
const same = assert.deepStrictEqual

const chunk = coerce(Buffer.alloc(1024, '\n'))

const mkgen = async function * (length, _chunk = chunk) {
  let i = 0
  while (i < length) {
    yield _chunk
    i++
  }
}

const sum = (x, y) => x + y

test('basic inline buffer', async () => {
  same(chunk.byteLength, main.size(chunk))
})

const testMany = async (i, limit) => {
  const blocks = { 113: [], 85: [] }
  let last
  const balanced = main.balanced(limit)
  for await (const block of main.fromIterable(mkgen(i), { algo: balanced, codec, hasher })) {
    blocks[block.cid.code].push(block)
    last = block
  }
  const raws = blocks['85']
  same(raws.length, i)
  same(raws.map(b => b.value.byteLength).reduce(sum), i * 1024)
  return [last, blocks['113'], blocks.raw]
}

test('basic stream', async () => {
  const [root, blocks] = await testMany(50, 1000)
  same(blocks.length, 1)
  same(main.size(root), 50 * 1024)
})

test('nested stream', async () => {
  const [root, blocks] = await testMany(500, 100)
  same(blocks.length, 6)
  same(main.size(root), 500 * 1024)
})

const toBuffer = async gen => {
  const buffers = []
  for await (const buffer of gen) {
    if (!isBinary(buffer)) throw new Error('not right')
    buffers.push(...buffer)
  }
  return Uint8Array.from(buffers)
}

const load = async gen => {
  const store = new Map()
  let last
  for await (const block of gen) {
    const { cid } = block
    store.set(cid.toString(), block)
    last = block
  }
  const get = cid => new Promise(resolve => resolve(store.get(cid.toString())))
  return [get, last]
}

const read = async (...args) => toBuffer(main.read(...args))

test('read inline', async () => {
  same(await read(chunk), chunk)
  same(await read(await encode({ value: chunk, codec: raw, hasher })), chunk)
  const single = async function * () { yield chunk }
  const [get, root] = await load(main.fromIterable(single(), { codec, hasher }))
  const data = await read(root, get)
  const comp = await toBuffer(single())
  assert.ok(equals(data, comp))
})

test('read nested full', async () => {
  const balanced = main.balanced(100)
  const [get, root] = await load(main.fromIterable(mkgen(500), { codec, hasher, algo: balanced }))
  const data = await read(root, get)
  const comp = await toBuffer(mkgen(500))
  same(data.byteLength, comp.byteLength)
  assert.ok(equals(data, comp))
})

const randomBytes = size => coerce(Buffer.alloc(size, Math.random().toString()))

test('read nested sliding', async () => {
  const buffer = await randomBytes(1024)
  const balanced = main.balanced(2)
  const [get, root] = await load(main.fromIterable(mkgen(10, buffer), { algo: balanced, codec, hasher }))
  const data = await read(root, get)
  const comp = await toBuffer(mkgen(10, buffer))
  same(data.byteLength, comp.byteLength)
  assert.ok(equals(data, comp))

  const length = 5 * 1024
  let start = 0
  let end = 40
  while (end <= length) {
    const data = await read(root, get, start, end)
    same(equals(data, coerce(comp.subarray(start, end))), true)
    start += 1
    end += 2
  }
})
