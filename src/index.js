const bare = require('./bare')
const Block = require('@ipld/block')

module.exports = bare(Block, 'dag-cbor')
