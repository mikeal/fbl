`Flexible Byte Layout` is an advanced layout for representing binary data.

It is flexible enough to support very small and very large (multi-block) binary data.

# Usage

```javascript
const fbl = require('@ipld/fbl')
const fs = require('fs')

const stream = fs.createReadStream('path/to/file')

for await (const block of fbl.from(stream)) {
  storage.put(block)
}
```

## API

### `fs.from(asyncIterable)`

This method returns an async iterable of [`Block`](https://github.com/ipld/js-block) instances.

It accepts any async iterable, but the iterable must only yield instances of `Buffer`.

### `fs.size(buffer|block|decodedBlockData)`

This method returns the size of a given FBL. It accepts either a buffer,
[`Block`](https://github.com/ipld/js-block) instance or the data for an FBL root block.

# Schema

```sh
type NestedByte struct {
  length Int
  part &FlexibleByteList
} representation tuple

type NestedByteList [ NestedByte ]

type FlexibleByteLayout union {
  | Bytes bytes
  | NestedByteList list
} representation kinded
```

`FlexibleByteLayout` uses a potentially recursive union type. This allows you to build very large nested
dags via NestedByteList that can themselves contain additional NestedByteLists, links to BytesUnions.

An implementation must define a custom function for reading ranges of binary
data but once implemented, you can read data regardless of the layout algorithm used.

Since readers only need to concern themselves with implementing the read method, they **do not**
need to understand the algorithms used to generate the layouts. This gives a lot of flexibility
in the future to define new layout algorithms as necessary without needing to worry about
updating prior impelementations.
