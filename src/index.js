const bare = require('./bare')
const Block = require('@ipld/block')

module.exports = (...args) => bare(Block, ...args)
