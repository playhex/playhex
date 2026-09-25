# @playhex/move-notation

Parse, validate and convert [Hex](https://en.wikipedia.org/wiki/Hex_(board_game)) move notation, as used on [PlayHex](https://playhex.org).

``` bash
npm install @playhex/move-notation
```

``` ts
import { parseMove, coordsToMove, isSpecialHexMove } from '@playhex/move-notation';

parseMove('c2'); // { row: 1, col: 2 }
coordsToMove({ row: 1, col: 2 }); // 'c2'
isSpecialHexMove('swap-pieces'); // true
```

## License

This package is under [AGPL-3.0 license](LICENSE).
