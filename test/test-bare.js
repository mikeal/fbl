/* globals it */
import bare from '../bare.js'

it('bare import', () => {
  if (typeof bare !== 'function') throw new Error('failed import')
})
