const validate = require('ipld-schema-validation')(require('./schema.json'))

const sum = (x, y) => x + y

module.exports = (Block, codec) => {
  const balanced = async function * (parts, opts) {
    parts = [...parts]
    const limit = opts.limit || 1000
    if (parts.length > limit) {
      const size = Math.ceil(parts.length / Math.ceil(parts.length / limit))
      const subparts = []
      while (parts.length) {
        const chunk = parts.splice(0, size)
        const length = chunk.map(([l]) => l).reduce(sum)
        let last
        for await (const block of balanced(chunk, opts)) {
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
  const fromGenerator = async function * (gen, algo = balanced, opts = {}) {
   const parts = []
    for await (const buffer of gen) {
      const block = Block.encoder(buffer, 'raw')
      yield block
      parts.push([buffer.length, await block.cid()])
    }
    yield * algo(parts, opts)
  }
  const size = block => {
    const data = Block.isBlock(block) ? block.decode() : block
    validate(data, 'FlexibleByteLayout')
    if (Buffer.isBuffer(data)) return data.length
    return data.map(([l]) => l).reduce(sum)
  }
  return { from: fromGenerator, balanced, size }
}
