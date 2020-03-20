const validate = require('ipld-schema-validation')(require('./schema.json'))

const cidSymbol = Symbol.for('@ipld/js-cid/CID')
const isCID = node => !!(node && node[cidSymbol])

const sum = (x, y) => x + y

module.exports = (Block, codec) => {
  const balanced = (limit=1000) => async function * (parts) {
    parts = [...parts]
    if (parts.length > limit) {
      const size = Math.ceil(parts.length / Math.ceil(parts.length / limit))
      const subparts = []
      while (parts.length) {
        const chunk = parts.splice(0, size)
        const length = chunk.map(([l]) => l).reduce(sum)
        let last
        for await (const block of balanced(limit)(chunk)) {
          yield block
          last = block
        }
        subparts.push([length, await last.cid()])
      }
      parts = subparts
    }
    validate(parts, 'FlexibleByteLayout')
    yield Block.encoder(parts, 'dag-cbor')
  }
  const _balanced = balanced()
  const fromGenerator = async function * (gen, algo = _balanced) {
    const parts = []
    for await (const buffer of gen) {
      const block = Block.encoder(buffer, 'raw')
      yield block
      parts.push([buffer.length, await block.cid()])
    }
    yield * algo(parts)
  }
  const size = block => {
    const data = Block.isBlock(block) ? block.decode() : block
    validate(data, 'FlexibleByteLayout')
    if (Buffer.isBuffer(data)) return data.length
    return data.map(([l]) => l).reduce(sum)
  }
  const read = async function * (block, get, offset = 0, end = Infinity) {
    if (isCID(block)) block = await get(block)
    const decoded = Block.isBlock(block) ? block.decodeUnsafe() : block
    if (Buffer.isBuffer(decoded)) {
      yield decoded.subarray(offset, end)
      return
    }

    validate(decoded, 'FlexibleByteLayout')

    let i = 0
    for (const [length, link] of decoded) {
      if (i > end) return

      yield * read(link, get, offset > i ? offset - i : 0, end - i)

      i += length
    }
  }
  return { from: fromGenerator, balanced, size, read }
}
