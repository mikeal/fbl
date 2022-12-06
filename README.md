**This project is no longer under active development and has been archived. If you would like to revive this project using the latest IPLD JavaScript stack, please open an issue on https://github.com/ipld/ipld for discussion (or just fork this repository!).**

`Flexible Byte Layout` is an advanced layout for representing binary data.

It is flexible enough to support very small and very large (multi-block) binary data.

# Usage

```javascript
import * as codec from '@ipld/dag-cbor'
import { sha256 as hasher } from 'multiformats/hashes/sha2'
import { fromIterable } from '@ipld/fbl'
import fs from 'fs'

const stream = fs.createReadStream('path/to/file')

for await (const block of fromIterable(stream, { codec, hasher })) {
  storage.put(block)
}
```

## API

### `fs.fromIterable(asyncIterable, { codec, hasher, algorithm=balanced() })`

This method returns an async iterable of `multiformats/block` instances.

It accepts any async iterable, but the iterable must only yield instances of `Buffer`.

The algorithm is an async generator that takes an array of `[ length, cid ]` tuples and yields `Block` instances.

The default algorithm is for a balanced tree with a default limit of 1000 chunk references per block.

### `fs.size(buffer|block|decodedBlockData)`

This method returns the size of a given FBL. It accepts either a buffer,
[`Block`](https://github.com/ipld/js-block) instance or the data for an FBL root block.

### `fs.read(root, get, start=0, end=Infinity)`

`read` returns and async generator that will yield `Buffer` instance for every chunk within
the `start` and `end` boundaries.

`root` is a root block, CID, or decoded block for the root of the FBL tree.

`get` is `async cid => Block()`, and async function that takes a `CID` instance and returns a `Block` instance.

`start` and `end` are the offsets to slice out of the data. Any `end` offset larger than the total size of
the FBL will read to the end of the FBL and finish without throwing an exception.

### `fs.balanced(limit=1000)`

This method returns an async generator for a balanced tree with no more than `limit` part references per block.

# Schema

`Flexible Byte Layout` is an advanced layout for representing binary data.

It is flexible enough to support very small and very large (multi-block) binary data.

```sh
type FlexibleByteLayout union {
  | Bytes bytes
  | NestedByteList list
  | &FlexibleByteLayout link
} representation kinded

type NestedByteList [ NestedByte ]

type NestedByte union {
  | Bytes bytes
  | NestedFBL list
} representation kinded

type NestedFBL struct {
  length Int
  part FlexibleByteLayout
} representation tuple
```

`FlexibleByteLayout` uses a potentially recursive union type. This allows you to build very large nested
dags via NestedByteList that can themselves contain additional NestedByteLists, links to BytesUnions.

An implementation must define a custom function for reading ranges of binary
data but once implemented, you can read data regardless of the layout algorithm used.

Since readers only need to concern themselves with implementing the read method, they **do not**
need to understand the algorithms used to generate the layouts. This gives a lot of flexibility
in the future to define new layout algorithms as necessary without needing to worry about
updating prior impelementations.

The `length` property must be encoded with the proper byte length. If not encoded properly, readers
will not be able to read properly. However, the property is **not secure** and a malicious encoder
could write it as whatever they please. As such, it should not be relied upon when calculating usage
against a quota or any similar calculation where there may be an incentive for an encoder to alter the
length.
