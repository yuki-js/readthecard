
JS/WebAssembly build of [OpenJPEG](https://github.com/uclouvain/openjpeg)


## Description

`OpenJPEG` support most of `OpenJPEG2000` decoding or encoding.


## Using generated Javascript File:

1. install From `npm`:


```bash

npm i --save @abasb75/openjpeg@2.5.3

```


2. import `@abasb75/openjpeg`:


```js

import OpenJPEG from '@abasb75/openjpeg'


...

let decoder,encoder;

OpenJPEGWASM().then(function(openjpegjs) {

    decoder = new openjpegjs.J2KDecoder();

    encoder = new openjpegjs.J2KEncoder();

});

...


```


# Decode


```javascript


import {decode} from "@abasb75/openjpeg";


const decoded = await decode(arrayBuffer); // ArrayBuffer

console.log('decoded',decoded);



```


For see example you can use <a href="https://github.com/abasb75/openjpeg/blob/6139b9b9f4431988e28edea325caa8173134ab40/test/browser/index.html#L672">this link</a>


## only decoder versions:

<a href="https://www.npmjs.com/package/@abasb75/jpeg2000-decoder/v/2.5.2">2.5.2 decoder</a>

<a href="https://www.npmjs.com/package/@abasb75/jpeg2000-decoder/v/2.5.3-decoder">2.5.3 decoder</a>