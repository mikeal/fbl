export default {
  types: {
    FlexibleByteLayout: {
      kind: 'union',
      representation: {
        kinded: {
          bytes: 'Bytes',
          list: 'NestedByteList'
        }
      }
    },
    NestedByteList: {
      kind: 'list',
      valueType: 'NestedByte'
    },
    NestedByte: {
      kind: 'struct',
      fields: {
        length: {
          type: 'Int'
        },
        part: {
          type: {
            kind: 'link',
            expectedType: 'FlexibleByteLayout'
          }
        }
      },
      representation: {
        tuple: {}
      }
    }
  }
}
