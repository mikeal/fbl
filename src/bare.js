const gen = require('@ipld/schema-gen')
const schema = require('../schema.json')

const sum = (x, y) => x + y

const defaults = { codec: 'dag-cbor' }

const getHead = (parts, size) => {
  const head = []
  let total = 0
  for (let i=parts.length-1;i>-1;i--) {
    head.push(parts[i])
    total += parts[i][1]
    if (total === size) return head.reverse()
  }

const create = (Block, opts={}) => {
  opts = {...defaults, ...opts}
  const types = gen(schema)
  console.log(types)

  class FBL extends types.FlexibleByteLayout {
    async read (start=0, end=null) {
      if (end === null) end = await this.get('size')
    }
  }
  gen.annotate(FBL)

  FBL.fromParts = async function * (parts, algo, limit=400) {
    const { FlexibleByteLayout } = types

    const nbls = []
    let parts = []
    for await (const [cid, size] of parts) {
      parts.push([cid, size])
      if (parts.length >= limit) {
        const lengths = parts.map(p => p[1])
        parts = parts.map(p => p[0])
        const nbl = types.NestedByteList.encoder({lengths, parts, algo})
        const size = lengths.reduce(sum, 0)
        const block = nbl.block()
        yield [ block, size ]
        nbls.push([await block.cid(), size])
      }
    }
    if (nbls.length > limit) {
      yield * FBL.fromParts(nbls, algo, limit)
    }
  }
  FBL.fromGenerator = async function * (iter, limit=400, algo='fg') {
    let size = 0
    let parts = []
    algo = ['b-v1', 'l400', algo].join('-')
    for await (const chunk of iter) {
      size += chunk.length
      const block = Block.encoder(chunk, 'raw')
      yield block
      parts.push([await block.cid(), chunk.length])
    }
    if (parts.length < limit) {
      const lengths = parts.map(p => p[1])
      parts = parts.map(p => p[0])
      const nbl = NBL.encoder({bytes: {parts, algo, lengths}, size)
      yield nbl.block()
    } else {
      const nbls = []
      for await (const [block, size] of FBL.fromParts(parts, algo, limit)) {
        yield block
        nbls.push([await block.cid(), size])
      }
      parts = getHead(nbls)
      const lengths = parts.map(p => p[1])
      parts = parts.map(p => p[0])
      const nbl = NBL.encoder({bytes: {parts, algo, lengths}, size})
      yield nbl.block()
    }
  }
  FBL.fromBuffer = async buffer => {
    return FBL.encoder({bytes: buffer, size: buffer.length})
  }
}

module.exports = create
