const gen = require('@ipld/schema-gen')
const schema = require('../schema.json')

const create = (Block, opts={}) => {
  const types = gen(schema)
  console.log(types)

  class FBL extends types.FlexibleByteLayout {
    async read (start=0, end=null) {
      if (end === null) end = await this.get('size')
    }
  }
  FBL.fromParts = async function * (parts, limit=400, inline=true) {
  }
  FBL.fromGenerator = async function * (gen) {
  }
}

module.exports = create
