const gen = require('@ipld/schema-gen')
const schema = require('./schema.json')

const types = gen(schema)
console.log(types)
