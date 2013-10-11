;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var proto = {}
module.exports = proto

proto.from = require('./from.js')
proto.to = require('./to.js')
proto.is = require('./is.js')
proto.subarray = require('./subarray.js')
proto.join = require('./join.js')
proto.copy = require('./copy.js')
proto.create = require('./create.js')

mix(require('./read.js'), proto)
mix(require('./write.js'), proto)

function mix(from, into) {
  for(var key in from) {
    into[key] = from[key]
  }
}

},{"./copy.js":4,"./create.js":5,"./from.js":6,"./is.js":7,"./join.js":8,"./read.js":10,"./subarray.js":11,"./to.js":12,"./write.js":13}],2:[function(require,module,exports){
(function (exports) {
	'use strict';

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	function b64ToByteArray(b64) {
		var i, j, l, tmp, placeHolders, arr;
	
		if (b64.length % 4 > 0) {
			throw 'Invalid string. Length must be a multiple of 4';
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		placeHolders = b64.indexOf('=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (lookup.indexOf(b64[i]) << 18) | (lookup.indexOf(b64[i + 1]) << 12) | (lookup.indexOf(b64[i + 2]) << 6) | lookup.indexOf(b64[i + 3]);
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (lookup.indexOf(b64[i]) << 2) | (lookup.indexOf(b64[i + 1]) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (lookup.indexOf(b64[i]) << 10) | (lookup.indexOf(b64[i + 1]) << 4) | (lookup.indexOf(b64[i + 2]) >> 2);
			arr.push((tmp >> 8) & 0xFF);
			arr.push(tmp & 0xFF);
		}

		return arr;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1];
				output += lookup[temp >> 2];
				output += lookup[(temp << 4) & 0x3F];
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup[temp >> 10];
				output += lookup[(temp >> 4) & 0x3F];
				output += lookup[(temp << 2) & 0x3F];
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

},{}],3:[function(require,module,exports){
module.exports = to_utf8

var out = []
  , col = []
  , fcc = String.fromCharCode
  , mask = [0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01]
  , unmask = [
      0x00
    , 0x01
    , 0x02 | 0x01
    , 0x04 | 0x02 | 0x01
    , 0x08 | 0x04 | 0x02 | 0x01
    , 0x10 | 0x08 | 0x04 | 0x02 | 0x01
    , 0x20 | 0x10 | 0x08 | 0x04 | 0x02 | 0x01
    , 0x40 | 0x20 | 0x10 | 0x08 | 0x04 | 0x02 | 0x01
  ]

function to_utf8(bytes, start, end) {
  start = start === undefined ? 0 : start
  end = end === undefined ? bytes.length : end

  var idx = 0
    , hi = 0x80
    , collecting = 0
    , pos
    , by

  col.length =
  out.length = 0

  while(idx < bytes.length) {
    by = bytes[idx]
    if(!collecting && by & hi) {
      pos = find_pad_position(by)
      collecting += pos
      if(pos < 8) {
        col[col.length] = by & unmask[6 - pos]
      }
    } else if(collecting) {
      col[col.length] = by & unmask[6]
      --collecting
      if(!collecting && col.length) {
        out[out.length] = fcc(reduced(col, pos))
        col.length = 0
      }
    } else { 
      out[out.length] = fcc(by)
    }
    ++idx
  }
  if(col.length && !collecting) {
    out[out.length] = fcc(reduced(col, pos))
    col.length = 0
  }
  return out.join('')
}

function find_pad_position(byt) {
  for(var i = 0; i < 7; ++i) {
    if(!(byt & mask[i])) {
      break
    }
  }
  return i
}

function reduced(list) {
  var out = 0
  for(var i = 0, len = list.length; i < len; ++i) {
    out |= list[i] << ((len - i - 1) * 6)
  }
  return out
}

},{}],4:[function(require,module,exports){
module.exports = copy

var slice = [].slice

function copy(source, target, target_start, source_start, source_end) {
  target_start = arguments.length < 3 ? 0 : target_start
  source_start = arguments.length < 4 ? 0 : source_start
  source_end = arguments.length < 5 ? source.length : source_end

  if(source_end === source_start) {
    return
  }

  if(target.length === 0 || source.length === 0) {
    return
  }

  if(source_end > source.length) {
    source_end = source.length
  }

  if(target.length - target_start < source_end - source_start) {
    source_end = target.length - target_start + start
  }

  if(source.buffer !== target.buffer) {
    return fast_copy(source, target, target_start, source_start, source_end)
  }
  return slow_copy(source, target, target_start, source_start, source_end)
}

function fast_copy(source, target, target_start, source_start, source_end) {
  var len = (source_end - source_start) + target_start

  for(var i = target_start, j = source_start;
      i < len;
      ++i,
      ++j) {
    target[i] = source[j]
  }
}

function slow_copy(from, to, j, i, jend) {
  // the buffers could overlap.
  var iend = jend + i
    , tmp = new Uint8Array(slice.call(from, i, iend))
    , x = 0

  for(; i < iend; ++i, ++x) {
    to[j++] = tmp[x]
  }
}

},{}],5:[function(require,module,exports){
module.exports = function(size) {
  return new Uint8Array(size)
}

},{}],6:[function(require,module,exports){
module.exports = from

var base64 = require('base64-js')

var decoders = {
    hex: from_hex
  , utf8: from_utf
  , base64: from_base64
}

function from(source, encoding) {
  if(Array.isArray(source)) {
    return new Uint8Array(source)
  }

  return decoders[encoding || 'utf8'](source)
}

function from_hex(str) {
  var size = str.length / 2
    , buf = new Uint8Array(size)
    , character = ''

  for(var i = 0, len = str.length; i < len; ++i) {
    character += str.charAt(i)

    if(i > 0 && (i % 2) === 1) {
      buf[i>>>1] = parseInt(character, 16)
      character = '' 
    }
  }

  return buf 
}

function from_utf(str) {
  var bytes = []
    , tmp
    , ch

  for(var i = 0, len = str.length; i < len; ++i) {
    ch = str.charCodeAt(i)
    if(ch & 0x80) {
      tmp = encodeURIComponent(str.charAt(i)).substr(1).split('%')
      for(var j = 0, jlen = tmp.length; j < jlen; ++j) {
        bytes[bytes.length] = parseInt(tmp[j], 16)
      }
    } else {
      bytes[bytes.length] = ch 
    }
  }

  return new Uint8Array(bytes)
}

function from_base64(str) {
  return new Uint8Array(base64.toByteArray(str)) 
}

},{"base64-js":2}],7:[function(require,module,exports){

module.exports = function(buffer) {
  return buffer instanceof Uint8Array;
}

},{}],8:[function(require,module,exports){
module.exports = join

function join(targets, hint) {
  if(!targets.length) {
    return new Uint8Array(0)
  }

  var len = hint !== undefined ? hint : get_length(targets)
    , out = new Uint8Array(len)
    , cur = targets[0]
    , curlen = cur.length
    , curidx = 0
    , curoff = 0
    , i = 0

  while(i < len) {
    if(curoff === curlen) {
      curoff = 0
      ++curidx
      cur = targets[curidx]
      curlen = cur && cur.length
      continue
    }
    out[i++] = cur[curoff++] 
  }

  return out
}

function get_length(targets) {
  var size = 0
  for(var i = 0, len = targets.length; i < len; ++i) {
    size += targets[i].byteLength
  }
  return size
}

},{}],9:[function(require,module,exports){
var proto
  , map

module.exports = proto = {}

map = typeof WeakMap === 'undefined' ? null : new WeakMap

proto.get = !map ? no_weakmap_get : get

function no_weakmap_get(target) {
  return new DataView(target.buffer, 0)
}

function get(target) {
  var out = map.get(target.buffer)
  if(!out) {
    map.set(target.buffer, out = new DataView(target.buffer, 0))
  }
  return out
}

},{}],10:[function(require,module,exports){
module.exports = {
    readUInt8:      read_uint8
  , readInt8:       read_int8
  , readUInt16LE:   read_uint16_le
  , readUInt32LE:   read_uint32_le
  , readInt16LE:    read_int16_le
  , readInt32LE:    read_int32_le
  , readFloatLE:    read_float_le
  , readDoubleLE:   read_double_le
  , readUInt16BE:   read_uint16_be
  , readUInt32BE:   read_uint32_be
  , readInt16BE:    read_int16_be
  , readInt32BE:    read_int32_be
  , readFloatBE:    read_float_be
  , readDoubleBE:   read_double_be
}

var map = require('./mapped.js')

function read_uint8(target, at) {
  return target[at]
}

function read_int8(target, at) {
  var v = target[at];
  return v < 0x80 ? v : v - 0x100
}

function read_uint16_le(target, at) {
  var dv = map.get(target);
  return dv.getUint16(at + target.byteOffset, true)
}

function read_uint32_le(target, at) {
  var dv = map.get(target);
  return dv.getUint32(at + target.byteOffset, true)
}

function read_int16_le(target, at) {
  var dv = map.get(target);
  return dv.getInt16(at + target.byteOffset, true)
}

function read_int32_le(target, at) {
  var dv = map.get(target);
  return dv.getInt32(at + target.byteOffset, true)
}

function read_float_le(target, at) {
  var dv = map.get(target);
  return dv.getFloat32(at + target.byteOffset, true)
}

function read_double_le(target, at) {
  var dv = map.get(target);
  return dv.getFloat64(at + target.byteOffset, true)
}

function read_uint16_be(target, at) {
  var dv = map.get(target);
  return dv.getUint16(at + target.byteOffset, false)
}

function read_uint32_be(target, at) {
  var dv = map.get(target);
  return dv.getUint32(at + target.byteOffset, false)
}

function read_int16_be(target, at) {
  var dv = map.get(target);
  return dv.getInt16(at + target.byteOffset, false)
}

function read_int32_be(target, at) {
  var dv = map.get(target);
  return dv.getInt32(at + target.byteOffset, false)
}

function read_float_be(target, at) {
  var dv = map.get(target);
  return dv.getFloat32(at + target.byteOffset, false)
}

function read_double_be(target, at) {
  var dv = map.get(target);
  return dv.getFloat64(at + target.byteOffset, false)
}

},{"./mapped.js":9}],11:[function(require,module,exports){
module.exports = subarray

function subarray(buf, from, to) {
  return buf.subarray(from || 0, to || buf.length)
}

},{}],12:[function(require,module,exports){
module.exports = to

var base64 = require('base64-js')
  , toutf8 = require('to-utf8')

var encoders = {
    hex: to_hex
  , utf8: to_utf
  , base64: to_base64
}

function to(buf, encoding) {
  return encoders[encoding || 'utf8'](buf)
}

function to_hex(buf) {
  var str = ''
    , byt

  for(var i = 0, len = buf.length; i < len; ++i) {
    byt = buf[i]
    str += ((byt & 0xF0) >>> 4).toString(16)
    str += (byt & 0x0F).toString(16)
  }

  return str
}

function to_utf(buf) {
  return toutf8(buf)
}

function to_base64(buf) {
  return base64.fromByteArray(buf)
}


},{"base64-js":2,"to-utf8":3}],13:[function(require,module,exports){
module.exports = {
    writeUInt8:      write_uint8
  , writeInt8:       write_int8
  , writeUInt16LE:   write_uint16_le
  , writeUInt32LE:   write_uint32_le
  , writeInt16LE:    write_int16_le
  , writeInt32LE:    write_int32_le
  , writeFloatLE:    write_float_le
  , writeDoubleLE:   write_double_le
  , writeUInt16BE:   write_uint16_be
  , writeUInt32BE:   write_uint32_be
  , writeInt16BE:    write_int16_be
  , writeInt32BE:    write_int32_be
  , writeFloatBE:    write_float_be
  , writeDoubleBE:   write_double_be
}

var map = require('./mapped.js')

function write_uint8(target, value, at) {
  return target[at] = value
}

function write_int8(target, value, at) {
  return target[at] = value < 0 ? value + 0x100 : value
}

function write_uint16_le(target, value, at) {
  var dv = map.get(target);
  return dv.setUint16(at + target.byteOffset, value, true)
}

function write_uint32_le(target, value, at) {
  var dv = map.get(target);
  return dv.setUint32(at + target.byteOffset, value, true)
}

function write_int16_le(target, value, at) {
  var dv = map.get(target);
  return dv.setInt16(at + target.byteOffset, value, true)
}

function write_int32_le(target, value, at) {
  var dv = map.get(target);
  return dv.setInt32(at + target.byteOffset, value, true)
}

function write_float_le(target, value, at) {
  var dv = map.get(target);
  return dv.setFloat32(at + target.byteOffset, value, true)
}

function write_double_le(target, value, at) {
  var dv = map.get(target);
  return dv.setFloat64(at + target.byteOffset, value, true)
}

function write_uint16_be(target, value, at) {
  var dv = map.get(target);
  return dv.setUint16(at + target.byteOffset, value, false)
}

function write_uint32_be(target, value, at) {
  var dv = map.get(target);
  return dv.setUint32(at + target.byteOffset, value, false)
}

function write_int16_be(target, value, at) {
  var dv = map.get(target);
  return dv.setInt16(at + target.byteOffset, value, false)
}

function write_int32_be(target, value, at) {
  var dv = map.get(target);
  return dv.setInt32(at + target.byteOffset, value, false)
}

function write_float_be(target, value, at) {
  var dv = map.get(target);
  return dv.setFloat32(at + target.byteOffset, value, false)
}

function write_double_be(target, value, at) {
  var dv = map.get(target);
  return dv.setFloat64(at + target.byteOffset, value, false)
}

},{"./mapped.js":9}],14:[function(require,module,exports){
var stream = require('stream')
var bops = require('bops')
var util = require('util')

function ConcatStream(cb) {
  stream.Stream.call(this)
  this.writable = true
  if (cb) this.cb = cb
  this.body = []
  this.on('error', function(err) {
    // no-op
  })
}

util.inherits(ConcatStream, stream.Stream)

ConcatStream.prototype.write = function(chunk) {
  this.body.push(chunk)
}

ConcatStream.prototype.destroy = function() {}

ConcatStream.prototype.arrayConcat = function(arrs) {
  if (arrs.length === 0) return []
  if (arrs.length === 1) return arrs[0]
  return arrs.reduce(function (a, b) { return a.concat(b) })
}

ConcatStream.prototype.isArray = function(arr) {
  return Array.isArray(arr)
}

ConcatStream.prototype.getBody = function () {
  if (this.body.length === 0) return
  if (typeof(this.body[0]) === "string") return this.body.join('')
  if (this.isArray(this.body[0])) return this.arrayConcat(this.body)
  if (bops.is(this.body[0])) return bops.join(this.body)
  return this.body
}

ConcatStream.prototype.end = function() {
  if (this.cb) this.cb(this.getBody())
}

module.exports = function(cb) {
  return new ConcatStream(cb)
}

module.exports.ConcatStream = ConcatStream

},{"bops":15,"stream":120,"util":121}],15:[function(require,module,exports){
module.exports=require(1)
},{"./copy.js":18,"./create.js":19,"./from.js":20,"./is.js":21,"./join.js":22,"./read.js":24,"./subarray.js":25,"./to.js":26,"./write.js":27}],16:[function(require,module,exports){
module.exports=require(2)
},{}],17:[function(require,module,exports){
module.exports=require(3)
},{}],18:[function(require,module,exports){
module.exports=require(4)
},{}],19:[function(require,module,exports){
module.exports=require(5)
},{}],20:[function(require,module,exports){
module.exports=require(6)
},{"base64-js":16}],21:[function(require,module,exports){
module.exports=require(7)
},{}],22:[function(require,module,exports){
module.exports=require(8)
},{}],23:[function(require,module,exports){
module.exports=require(9)
},{}],24:[function(require,module,exports){
module.exports=require(10)
},{"./mapped.js":23}],25:[function(require,module,exports){
module.exports=require(11)
},{}],26:[function(require,module,exports){
module.exports=require(12)
},{"base64-js":16,"to-utf8":17}],27:[function(require,module,exports){
module.exports=require(13)
},{"./mapped.js":23}],28:[function(require,module,exports){
(function () {
	'use strict';

	module.exports = {
		'inflate': require('./lib/rawinflate.js'),
		'deflate': require('./lib/rawdeflate.js')
	};
}());

},{"./lib/rawdeflate.js":29,"./lib/rawinflate.js":30}],29:[function(require,module,exports){
/*
 * $Id: rawdeflate.js,v 0.3 2009/03/01 19:05:05 dankogai Exp dankogai $
 *
 * Original:
 *   http://www.onicos.com/staff/iz/amuse/javascript/expert/deflate.txt
 */

/* Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0.1
 * LastModified: Dec 25 1999
 */

/* Interface:
 * data = deflate(src);
 */

(function () {
	/* constant parameters */
	var WSIZE = 32768, // Sliding Window size
		STORED_BLOCK = 0,
		STATIC_TREES = 1,
		DYN_TREES = 2,

	/* for deflate */
		DEFAULT_LEVEL = 6,
		FULL_SEARCH = false,
		INBUFSIZ = 32768, // Input buffer size
		//INBUF_EXTRA = 64, // Extra buffer
		OUTBUFSIZ = 1024 * 8,
		window_size = 2 * WSIZE,
		MIN_MATCH = 3,
		MAX_MATCH = 258,
		BITS = 16,
	// for SMALL_MEM
		LIT_BUFSIZE = 0x2000,
//		HASH_BITS = 13,
	//for MEDIUM_MEM
	//	LIT_BUFSIZE = 0x4000,
	//	HASH_BITS = 14,
	// for BIG_MEM
	//	LIT_BUFSIZE = 0x8000,
		HASH_BITS = 15,
		DIST_BUFSIZE = LIT_BUFSIZE,
		HASH_SIZE = 1 << HASH_BITS,
		HASH_MASK = HASH_SIZE - 1,
		WMASK = WSIZE - 1,
		NIL = 0, // Tail of hash chains
		TOO_FAR = 4096,
		MIN_LOOKAHEAD = MAX_MATCH + MIN_MATCH + 1,
		MAX_DIST = WSIZE - MIN_LOOKAHEAD,
		SMALLEST = 1,
		MAX_BITS = 15,
		MAX_BL_BITS = 7,
		LENGTH_CODES = 29,
		LITERALS = 256,
		END_BLOCK = 256,
		L_CODES = LITERALS + 1 + LENGTH_CODES,
		D_CODES = 30,
		BL_CODES = 19,
		REP_3_6 = 16,
		REPZ_3_10 = 17,
		REPZ_11_138 = 18,
		HEAP_SIZE = 2 * L_CODES + 1,
		H_SHIFT = parseInt((HASH_BITS + MIN_MATCH - 1) / MIN_MATCH, 10),

	/* variables */
		free_queue,
		qhead,
		qtail,
		initflag,
		outbuf = null,
		outcnt,
		outoff,
		complete,
		window,
		d_buf,
		l_buf,
		prev,
		bi_buf,
		bi_valid,
		block_start,
		ins_h,
		hash_head,
		prev_match,
		match_available,
		match_length,
		prev_length,
		strstart,
		match_start,
		eofile,
		lookahead,
		max_chain_length,
		max_lazy_match,
		compr_level,
		good_match,
		nice_match,
		dyn_ltree,
		dyn_dtree,
		static_ltree,
		static_dtree,
		bl_tree,
		l_desc,
		d_desc,
		bl_desc,
		bl_count,
		heap,
		heap_len,
		heap_max,
		depth,
		length_code,
		dist_code,
		base_length,
		base_dist,
		flag_buf,
		last_lit,
		last_dist,
		last_flags,
		flags,
		flag_bit,
		opt_len,
		static_len,
		deflate_data,
		deflate_pos;

	if (LIT_BUFSIZE > INBUFSIZ) {
		console.error("error: INBUFSIZ is too small");
	}
	if ((WSIZE << 1) > (1 << BITS)) {
		console.error("error: WSIZE is too large");
	}
	if (HASH_BITS > BITS - 1) {
		console.error("error: HASH_BITS is too large");
	}
	if (HASH_BITS < 8 || MAX_MATCH !== 258) {
		console.error("error: Code too clever");
	}

	/* objects (deflate) */

	function DeflateCT() {
		this.fc = 0; // frequency count or bit string
		this.dl = 0; // father node in Huffman tree or length of bit string
	}

	function DeflateTreeDesc() {
		this.dyn_tree = null; // the dynamic tree
		this.static_tree = null; // corresponding static tree or NULL
		this.extra_bits = null; // extra bits for each code or NULL
		this.extra_base = 0; // base index for extra_bits
		this.elems = 0; // max number of elements in the tree
		this.max_length = 0; // max bit length for the codes
		this.max_code = 0; // largest code with non zero frequency
	}

	/* Values for max_lazy_match, good_match and max_chain_length, depending on
	 * the desired pack level (0..9). The values given below have been tuned to
	 * exclude worst case performance for pathological files. Better values may be
	 * found for specific files.
	 */
	function DeflateConfiguration(a, b, c, d) {
		this.good_length = a; // reduce lazy search above this match length
		this.max_lazy = b; // do not perform lazy search above this match length
		this.nice_length = c; // quit search above this match length
		this.max_chain = d;
	}

	function DeflateBuffer() {
		this.next = null;
		this.len = 0;
		this.ptr = []; // new Array(OUTBUFSIZ); // ptr.length is never read
		this.off = 0;
	}

	/* constant tables */
	var extra_lbits = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
	var extra_dbits = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
	var extra_blbits = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7];
	var bl_order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
	var configuration_table = [
		new DeflateConfiguration(0, 0, 0, 0),
		new DeflateConfiguration(4, 4, 8, 4),
		new DeflateConfiguration(4, 5, 16, 8),
		new DeflateConfiguration(4, 6, 32, 32),
		new DeflateConfiguration(4, 4, 16, 16),
		new DeflateConfiguration(8, 16, 32, 32),
		new DeflateConfiguration(8, 16, 128, 128),
		new DeflateConfiguration(8, 32, 128, 256),
		new DeflateConfiguration(32, 128, 258, 1024),
		new DeflateConfiguration(32, 258, 258, 4096)
	];


	/* routines (deflate) */

	function deflate_start(level) {
		var i;

		if (!level) {
			level = DEFAULT_LEVEL;
		} else if (level < 1) {
			level = 1;
		} else if (level > 9) {
			level = 9;
		}

		compr_level = level;
		initflag = false;
		eofile = false;
		if (outbuf !== null) {
			return;
		}

		free_queue = qhead = qtail = null;
		outbuf = []; // new Array(OUTBUFSIZ); // outbuf.length never called
		window = []; // new Array(window_size); // window.length never called
		d_buf = []; // new Array(DIST_BUFSIZE); // d_buf.length never called
		l_buf = []; // new Array(INBUFSIZ + INBUF_EXTRA); // l_buf.length never called
		prev = []; // new Array(1 << BITS); // prev.length never called

		dyn_ltree = [];
		for (i = 0; i < HEAP_SIZE; i++) {
			dyn_ltree[i] = new DeflateCT();
		}
		dyn_dtree = [];
		for (i = 0; i < 2 * D_CODES + 1; i++) {
			dyn_dtree[i] = new DeflateCT();
		}
		static_ltree = [];
		for (i = 0; i < L_CODES + 2; i++) {
			static_ltree[i] = new DeflateCT();
		}
		static_dtree = [];
		for (i = 0; i < D_CODES; i++) {
			static_dtree[i] = new DeflateCT();
		}
		bl_tree = [];
		for (i = 0; i < 2 * BL_CODES + 1; i++) {
			bl_tree[i] = new DeflateCT();
		}
		l_desc = new DeflateTreeDesc();
		d_desc = new DeflateTreeDesc();
		bl_desc = new DeflateTreeDesc();
		bl_count = []; // new Array(MAX_BITS+1); // bl_count.length never called
		heap = []; // new Array(2*L_CODES+1); // heap.length never called
		depth = []; // new Array(2*L_CODES+1); // depth.length never called
		length_code = []; // new Array(MAX_MATCH-MIN_MATCH+1); // length_code.length never called
		dist_code = []; // new Array(512); // dist_code.length never called
		base_length = []; // new Array(LENGTH_CODES); // base_length.length never called
		base_dist = []; // new Array(D_CODES); // base_dist.length never called
		flag_buf = []; // new Array(parseInt(LIT_BUFSIZE / 8, 10)); // flag_buf.length never called
	}

	function deflate_end() {
		free_queue = qhead = qtail = null;
		outbuf = null;
		window = null;
		d_buf = null;
		l_buf = null;
		prev = null;
		dyn_ltree = null;
		dyn_dtree = null;
		static_ltree = null;
		static_dtree = null;
		bl_tree = null;
		l_desc = null;
		d_desc = null;
		bl_desc = null;
		bl_count = null;
		heap = null;
		depth = null;
		length_code = null;
		dist_code = null;
		base_length = null;
		base_dist = null;
		flag_buf = null;
	}

	function reuse_queue(p) {
		p.next = free_queue;
		free_queue = p;
	}

	function new_queue() {
		var p;

		if (free_queue !== null) {
			p = free_queue;
			free_queue = free_queue.next;
		} else {
			p = new DeflateBuffer();
		}
		p.next = null;
		p.len = p.off = 0;

		return p;
	}

	function head1(i) {
		return prev[WSIZE + i];
	}

	function head2(i, val) {
		return (prev[WSIZE + i] = val);
	}

	/* put_byte is used for the compressed output, put_ubyte for the
	 * uncompressed output. However unlzw() uses window for its
	 * suffix table instead of its output buffer, so it does not use put_ubyte
	 * (to be cleaned up).
	 */
	function put_byte(c) {
		outbuf[outoff + outcnt++] = c;
		if (outoff + outcnt === OUTBUFSIZ) {
			qoutbuf();
		}
	}

	/* Output a 16 bit value, lsb first */
	function put_short(w) {
		w &= 0xffff;
		if (outoff + outcnt < OUTBUFSIZ - 2) {
			outbuf[outoff + outcnt++] = (w & 0xff);
			outbuf[outoff + outcnt++] = (w >>> 8);
		} else {
			put_byte(w & 0xff);
			put_byte(w >>> 8);
		}
	}

	/* ==========================================================================
	 * Insert string s in the dictionary and set match_head to the previous head
	 * of the hash chain (the most recent string with same hash key). Return
	 * the previous length of the hash chain.
	 * IN  assertion: all calls to to INSERT_STRING are made with consecutive
	 *    input characters and the first MIN_MATCH bytes of s are valid
	 *    (except for the last MIN_MATCH-1 bytes of the input file).
	 */
	function INSERT_STRING() {
		ins_h = ((ins_h << H_SHIFT) ^ (window[strstart + MIN_MATCH - 1] & 0xff)) & HASH_MASK;
		hash_head = head1(ins_h);
		prev[strstart & WMASK] = hash_head;
		head2(ins_h, strstart);
	}

	/* Send a code of the given tree. c and tree must not have side effects */
	function SEND_CODE(c, tree) {
		send_bits(tree[c].fc, tree[c].dl);
	}

	/* Mapping from a distance to a distance code. dist is the distance - 1 and
	 * must not have side effects. dist_code[256] and dist_code[257] are never
	 * used.
	 */
	function D_CODE(dist) {
		return (dist < 256 ? dist_code[dist] : dist_code[256 + (dist >> 7)]) & 0xff;
	}

	/* ==========================================================================
	 * Compares to subtrees, using the tree depth as tie breaker when
	 * the subtrees have equal frequency. This minimizes the worst case length.
	 */
	function SMALLER(tree, n, m) {
		return tree[n].fc < tree[m].fc || (tree[n].fc === tree[m].fc && depth[n] <= depth[m]);
	}

	/* ==========================================================================
	 * read string data
	 */
	function read_buff(buff, offset, n) {
		var i;
		for (i = 0; i < n && deflate_pos < deflate_data.length; i++) {
			buff[offset + i] = deflate_data[deflate_pos++] & 0xff;
		}
		return i;
	}

	/* ==========================================================================
	 * Initialize the "longest match" routines for a new file
	 */
	function lm_init() {
		var j;

		// Initialize the hash table. */
		for (j = 0; j < HASH_SIZE; j++) {
			// head2(j, NIL);
			prev[WSIZE + j] = 0;
		}
		// prev will be initialized on the fly */

		// Set the default configuration parameters:
		max_lazy_match = configuration_table[compr_level].max_lazy;
		good_match = configuration_table[compr_level].good_length;
		if (!FULL_SEARCH) {
			nice_match = configuration_table[compr_level].nice_length;
		}
		max_chain_length = configuration_table[compr_level].max_chain;

		strstart = 0;
		block_start = 0;

		lookahead = read_buff(window, 0, 2 * WSIZE);
		if (lookahead <= 0) {
			eofile = true;
			lookahead = 0;
			return;
		}
		eofile = false;
		// Make sure that we always have enough lookahead. This is important
		// if input comes from a device such as a tty.
		while (lookahead < MIN_LOOKAHEAD && !eofile) {
			fill_window();
		}

		// If lookahead < MIN_MATCH, ins_h is garbage, but this is
		// not important since only literal bytes will be emitted.
		ins_h = 0;
		for (j = 0; j < MIN_MATCH - 1; j++) {
			// UPDATE_HASH(ins_h, window[j]);
			ins_h = ((ins_h << H_SHIFT) ^ (window[j] & 0xff)) & HASH_MASK;
		}
	}

	/* ==========================================================================
	 * Set match_start to the longest match starting at the given string and
	 * return its length. Matches shorter or equal to prev_length are discarded,
	 * in which case the result is equal to prev_length and match_start is
	 * garbage.
	 * IN assertions: cur_match is the head of the hash chain for the current
	 *   string (strstart) and its distance is <= MAX_DIST, and prev_length >= 1
	 */
	function longest_match(cur_match) {
		var chain_length = max_chain_length; // max hash chain length
		var scanp = strstart; // current string
		var matchp; // matched string
		var len; // length of current match
		var best_len = prev_length; // best match length so far

		// Stop when cur_match becomes <= limit. To simplify the code,
		// we prevent matches with the string of window index 0.
		var limit = (strstart > MAX_DIST ? strstart - MAX_DIST : NIL);

		var strendp = strstart + MAX_MATCH;
		var scan_end1 = window[scanp + best_len - 1];
		var scan_end = window[scanp + best_len];

		var i, broke;

		// Do not waste too much time if we already have a good match: */
		if (prev_length >= good_match) {
			chain_length >>= 2;
		}

		// Assert(encoder->strstart <= window_size-MIN_LOOKAHEAD, "insufficient lookahead");

		do {
			// Assert(cur_match < encoder->strstart, "no future");
			matchp = cur_match;

			// Skip to next match if the match length cannot increase
			// or if the match length is less than 2:
			if (window[matchp + best_len] !== scan_end  ||
					window[matchp + best_len - 1] !== scan_end1 ||
					window[matchp] !== window[scanp] ||
					window[++matchp] !== window[scanp + 1]) {
				continue;
			}

			// The check at best_len-1 can be removed because it will be made
			// again later. (This heuristic is not always a win.)
			// It is not necessary to compare scan[2] and match[2] since they
			// are always equal when the other bytes match, given that
			// the hash keys are equal and that HASH_BITS >= 8.
			scanp += 2;
			matchp++;

			// We check for insufficient lookahead only every 8th comparison;
			// the 256th check will be made at strstart+258.
			while (scanp < strendp) {
				broke = false;
				for (i = 0; i < 8; i += 1) {
					scanp += 1;
					matchp += 1;
					if (window[scanp] !== window[matchp]) {
						broke = true;
						break;
					}
				}

				if (broke) {
					break;
				}
			}

			len = MAX_MATCH - (strendp - scanp);
			scanp = strendp - MAX_MATCH;

			if (len > best_len) {
				match_start = cur_match;
				best_len = len;
				if (FULL_SEARCH) {
					if (len >= MAX_MATCH) {
						break;
					}
				} else {
					if (len >= nice_match) {
						break;
					}
				}

				scan_end1 = window[scanp + best_len - 1];
				scan_end = window[scanp + best_len];
			}
		} while ((cur_match = prev[cur_match & WMASK]) > limit && --chain_length !== 0);

		return best_len;
	}

	/* ==========================================================================
	 * Fill the window when the lookahead becomes insufficient.
	 * Updates strstart and lookahead, and sets eofile if end of input file.
	 * IN assertion: lookahead < MIN_LOOKAHEAD && strstart + lookahead > 0
	 * OUT assertions: at least one byte has been read, or eofile is set;
	 *    file reads are performed for at least two bytes (required for the
	 *    translate_eol option).
	 */
	function fill_window() {
		var n, m;

	 // Amount of free space at the end of the window.
		var more = window_size - lookahead - strstart;

		// If the window is almost full and there is insufficient lookahead,
		// move the upper half to the lower one to make room in the upper half.
		if (more === -1) {
			// Very unlikely, but possible on 16 bit machine if strstart == 0
			// and lookahead == 1 (input done one byte at time)
			more--;
		} else if (strstart >= WSIZE + MAX_DIST) {
			// By the IN assertion, the window is not empty so we can't confuse
			// more == 0 with more == 64K on a 16 bit machine.
			// Assert(window_size == (ulg)2*WSIZE, "no sliding with BIG_MEM");

			// System.arraycopy(window, WSIZE, window, 0, WSIZE);
			for (n = 0; n < WSIZE; n++) {
				window[n] = window[n + WSIZE];
			}

			match_start -= WSIZE;
			strstart    -= WSIZE; /* we now have strstart >= MAX_DIST: */
			block_start -= WSIZE;

			for (n = 0; n < HASH_SIZE; n++) {
				m = head1(n);
				head2(n, m >= WSIZE ? m - WSIZE : NIL);
			}
			for (n = 0; n < WSIZE; n++) {
			// If n is not on any hash chain, prev[n] is garbage but
			// its value will never be used.
				m = prev[n];
				prev[n] = (m >= WSIZE ? m - WSIZE : NIL);
			}
			more += WSIZE;
		}
		// At this point, more >= 2
		if (!eofile) {
			n = read_buff(window, strstart + lookahead, more);
			if (n <= 0) {
				eofile = true;
			} else {
				lookahead += n;
			}
		}
	}

	/* ==========================================================================
	 * Processes a new input file and return its compressed length. This
	 * function does not perform lazy evaluationof matches and inserts
	 * new strings in the dictionary only for unmatched strings or for short
	 * matches. It is used only for the fast compression options.
	 */
	function deflate_fast() {
		while (lookahead !== 0 && qhead === null) {
			var flush; // set if current block must be flushed

			// Insert the string window[strstart .. strstart+2] in the
			// dictionary, and set hash_head to the head of the hash chain:
			INSERT_STRING();

			// Find the longest match, discarding those <= prev_length.
			// At this point we have always match_length < MIN_MATCH
			if (hash_head !== NIL && strstart - hash_head <= MAX_DIST) {
				// To simplify the code, we prevent matches with the string
				// of window index 0 (in particular we have to avoid a match
				// of the string with itself at the start of the input file).
				match_length = longest_match(hash_head);
				// longest_match() sets match_start */
				if (match_length > lookahead) {
					match_length = lookahead;
				}
			}
			if (match_length >= MIN_MATCH) {
				// check_match(strstart, match_start, match_length);

				flush = ct_tally(strstart - match_start, match_length - MIN_MATCH);
				lookahead -= match_length;

				// Insert new strings in the hash table only if the match length
				// is not too large. This saves time but degrades compression.
				if (match_length <= max_lazy_match) {
					match_length--; // string at strstart already in hash table
					do {
						strstart++;
						INSERT_STRING();
						// strstart never exceeds WSIZE-MAX_MATCH, so there are
						// always MIN_MATCH bytes ahead. If lookahead < MIN_MATCH
						// these bytes are garbage, but it does not matter since
						// the next lookahead bytes will be emitted as literals.
					} while (--match_length !== 0);
					strstart++;
				} else {
					strstart += match_length;
					match_length = 0;
					ins_h = window[strstart] & 0xff;
					// UPDATE_HASH(ins_h, window[strstart + 1]);
					ins_h = ((ins_h << H_SHIFT) ^ (window[strstart + 1] & 0xff)) & HASH_MASK;

				//#if MIN_MATCH !== 3
				//		Call UPDATE_HASH() MIN_MATCH-3 more times
				//#endif

				}
			} else {
				// No match, output a literal byte */
				flush = ct_tally(0, window[strstart] & 0xff);
				lookahead--;
				strstart++;
			}
			if (flush) {
				flush_block(0);
				block_start = strstart;
			}

			// Make sure that we always have enough lookahead, except
			// at the end of the input file. We need MAX_MATCH bytes
			// for the next match, plus MIN_MATCH bytes to insert the
			// string following the next match.
			while (lookahead < MIN_LOOKAHEAD && !eofile) {
				fill_window();
			}
		}
	}

	function deflate_better() {
		// Process the input block. */
		while (lookahead !== 0 && qhead === null) {
			// Insert the string window[strstart .. strstart+2] in the
			// dictionary, and set hash_head to the head of the hash chain:
			INSERT_STRING();

			// Find the longest match, discarding those <= prev_length.
			prev_length = match_length;
			prev_match = match_start;
			match_length = MIN_MATCH - 1;

			if (hash_head !== NIL && prev_length < max_lazy_match && strstart - hash_head <= MAX_DIST) {
				// To simplify the code, we prevent matches with the string
				// of window index 0 (in particular we have to avoid a match
				// of the string with itself at the start of the input file).
				match_length = longest_match(hash_head);
				// longest_match() sets match_start */
				if (match_length > lookahead) {
					match_length = lookahead;
				}

				// Ignore a length 3 match if it is too distant: */
				if (match_length === MIN_MATCH && strstart - match_start > TOO_FAR) {
					// If prev_match is also MIN_MATCH, match_start is garbage
					// but we will ignore the current match anyway.
					match_length--;
				}
			}
			// If there was a match at the previous step and the current
			// match is not better, output the previous match:
			if (prev_length >= MIN_MATCH && match_length <= prev_length) {
				var flush; // set if current block must be flushed

				// check_match(strstart - 1, prev_match, prev_length);
				flush = ct_tally(strstart - 1 - prev_match, prev_length - MIN_MATCH);

				// Insert in hash table all strings up to the end of the match.
				// strstart-1 and strstart are already inserted.
				lookahead -= prev_length - 1;
				prev_length -= 2;
				do {
					strstart++;
					INSERT_STRING();
					// strstart never exceeds WSIZE-MAX_MATCH, so there are
					// always MIN_MATCH bytes ahead. If lookahead < MIN_MATCH
					// these bytes are garbage, but it does not matter since the
					// next lookahead bytes will always be emitted as literals.
				} while (--prev_length !== 0);
				match_available = false;
				match_length = MIN_MATCH - 1;
				strstart++;
				if (flush) {
					flush_block(0);
					block_start = strstart;
				}
			} else if (match_available) {
				// If there was no match at the previous position, output a
				// single literal. If there was a match but the current match
				// is longer, truncate the previous match to a single literal.
				if (ct_tally(0, window[strstart - 1] & 0xff)) {
					flush_block(0);
					block_start = strstart;
				}
				strstart++;
				lookahead--;
			} else {
				// There is no previous match to compare with, wait for
				// the next step to decide.
				match_available = true;
				strstart++;
				lookahead--;
			}

			// Make sure that we always have enough lookahead, except
			// at the end of the input file. We need MAX_MATCH bytes
			// for the next match, plus MIN_MATCH bytes to insert the
			// string following the next match.
			while (lookahead < MIN_LOOKAHEAD && !eofile) {
				fill_window();
			}
		}
	}

	function init_deflate() {
		if (eofile) {
			return;
		}
		bi_buf = 0;
		bi_valid = 0;
		ct_init();
		lm_init();

		qhead = null;
		outcnt = 0;
		outoff = 0;

		if (compr_level <= 3) {
			prev_length = MIN_MATCH - 1;
			match_length = 0;
		} else {
			match_length = MIN_MATCH - 1;
			match_available = false;
		}

		complete = false;
	}

	/* ==========================================================================
	 * Same as above, but achieves better compression. We use a lazy
	 * evaluation for matches: a match is finally adopted only if there is
	 * no better match at the next window position.
	 */
	function deflate_internal(buff, off, buff_size) {
		var n;

		if (!initflag) {
			init_deflate();
			initflag = true;
			if (lookahead === 0) { // empty
				complete = true;
				return 0;
			}
		}

		n = qcopy(buff, off, buff_size);
		if (n === buff_size) {
			return buff_size;
		}

		if (complete) {
			return n;
		}

		if (compr_level <= 3) {
			// optimized for speed
			deflate_fast();
		} else {
			deflate_better();
		}

		if (lookahead === 0) {
			if (match_available) {
				ct_tally(0, window[strstart - 1] & 0xff);
			}
			flush_block(1);
			complete = true;
		}

		return n + qcopy(buff, n + off, buff_size - n);
	}

	function qcopy(buff, off, buff_size) {
		var n, i, j;

		n = 0;
		while (qhead !== null && n < buff_size) {
			i = buff_size - n;
			if (i > qhead.len) {
				i = qhead.len;
			}
			// System.arraycopy(qhead.ptr, qhead.off, buff, off + n, i);
			for (j = 0; j < i; j++) {
				buff[off + n + j] = qhead.ptr[qhead.off + j];
			}

			qhead.off += i;
			qhead.len -= i;
			n += i;
			if (qhead.len === 0) {
				var p;
				p = qhead;
				qhead = qhead.next;
				reuse_queue(p);
			}
		}

		if (n === buff_size) {
			return n;
		}

		if (outoff < outcnt) {
			i = buff_size - n;
			if (i > outcnt - outoff) {
				i = outcnt - outoff;
			}
			// System.arraycopy(outbuf, outoff, buff, off + n, i);
			for (j = 0; j < i; j++) {
				buff[off + n + j] = outbuf[outoff + j];
			}
			outoff += i;
			n += i;
			if (outcnt === outoff) {
				outcnt = outoff = 0;
			}
		}
		return n;
	}

	/* ==========================================================================
	 * Allocate the match buffer, initialize the various tables and save the
	 * location of the internal file attribute (ascii/binary) and method
	 * (DEFLATE/STORE).
	 */
	function ct_init() {
		var n; // iterates over tree elements
		var bits; // bit counter
		var length; // length value
		var code; // code value
		var dist; // distance index

		if (static_dtree[0].dl !== 0) {
			return; // ct_init already called
		}

		l_desc.dyn_tree = dyn_ltree;
		l_desc.static_tree = static_ltree;
		l_desc.extra_bits = extra_lbits;
		l_desc.extra_base = LITERALS + 1;
		l_desc.elems = L_CODES;
		l_desc.max_length = MAX_BITS;
		l_desc.max_code = 0;

		d_desc.dyn_tree = dyn_dtree;
		d_desc.static_tree = static_dtree;
		d_desc.extra_bits = extra_dbits;
		d_desc.extra_base = 0;
		d_desc.elems = D_CODES;
		d_desc.max_length = MAX_BITS;
		d_desc.max_code = 0;

		bl_desc.dyn_tree = bl_tree;
		bl_desc.static_tree = null;
		bl_desc.extra_bits = extra_blbits;
		bl_desc.extra_base = 0;
		bl_desc.elems = BL_CODES;
		bl_desc.max_length = MAX_BL_BITS;
		bl_desc.max_code = 0;

	 // Initialize the mapping length (0..255) -> length code (0..28)
		length = 0;
		for (code = 0; code < LENGTH_CODES - 1; code++) {
			base_length[code] = length;
			for (n = 0; n < (1 << extra_lbits[code]); n++) {
				length_code[length++] = code;
			}
		}
	 // Assert (length === 256, "ct_init: length !== 256");

		// Note that the length 255 (match length 258) can be represented
		// in two different ways: code 284 + 5 bits or code 285, so we
		// overwrite length_code[255] to use the best encoding:
		length_code[length - 1] = code;

		// Initialize the mapping dist (0..32K) -> dist code (0..29) */
		dist = 0;
		for (code = 0; code < 16; code++) {
			base_dist[code] = dist;
			for (n = 0; n < (1 << extra_dbits[code]); n++) {
				dist_code[dist++] = code;
			}
		}
		// Assert (dist === 256, "ct_init: dist !== 256");
		// from now on, all distances are divided by 128
		for (dist >>= 7; code < D_CODES; code++) {
			base_dist[code] = dist << 7;
			for (n = 0; n < (1 << (extra_dbits[code] - 7)); n++) {
				dist_code[256 + dist++] = code;
			}
		}
		// Assert (dist === 256, "ct_init: 256+dist !== 512");

		// Construct the codes of the static literal tree
		for (bits = 0; bits <= MAX_BITS; bits++) {
			bl_count[bits] = 0;
		}
		n = 0;
		while (n <= 143) {
			static_ltree[n++].dl = 8;
			bl_count[8]++;
		}
		while (n <= 255) {
			static_ltree[n++].dl = 9;
			bl_count[9]++;
		}
		while (n <= 279) {
			static_ltree[n++].dl = 7;
			bl_count[7]++;
		}
		while (n <= 287) {
			static_ltree[n++].dl = 8;
			bl_count[8]++;
		}
		// Codes 286 and 287 do not exist, but we must include them in the
		// tree construction to get a canonical Huffman tree (longest code
		// all ones)
		gen_codes(static_ltree, L_CODES + 1);

		// The static distance tree is trivial: */
		for (n = 0; n < D_CODES; n++) {
			static_dtree[n].dl = 5;
			static_dtree[n].fc = bi_reverse(n, 5);
		}

		// Initialize the first block of the first file:
		init_block();
	}

	/* ==========================================================================
	 * Initialize a new block.
	 */
	function init_block() {
		var n; // iterates over tree elements

		// Initialize the trees.
		for (n = 0; n < L_CODES;  n++) {
			dyn_ltree[n].fc = 0;
		}
		for (n = 0; n < D_CODES;  n++) {
			dyn_dtree[n].fc = 0;
		}
		for (n = 0; n < BL_CODES; n++) {
			bl_tree[n].fc = 0;
		}

		dyn_ltree[END_BLOCK].fc = 1;
		opt_len = static_len = 0;
		last_lit = last_dist = last_flags = 0;
		flags = 0;
		flag_bit = 1;
	}

	/* ==========================================================================
	 * Restore the heap property by moving down the tree starting at node k,
	 * exchanging a node with the smallest of its two sons if necessary, stopping
	 * when the heap property is re-established (each father smaller than its
	 * two sons).
	 *
	 * @param tree- tree to restore
	 * @param k- node to move down
	 */
	function pqdownheap(tree, k) {
		var v = heap[k],
			j = k << 1; // left son of k

		while (j <= heap_len) {
			// Set j to the smallest of the two sons:
			if (j < heap_len && SMALLER(tree, heap[j + 1], heap[j])) {
				j++;
			}

			// Exit if v is smaller than both sons
			if (SMALLER(tree, v, heap[j])) {
				break;
			}

			// Exchange v with the smallest son
			heap[k] = heap[j];
			k = j;

			// And continue down the tree, setting j to the left son of k
			j <<= 1;
		}
		heap[k] = v;
	}

	/* ==========================================================================
	 * Compute the optimal bit lengths for a tree and update the total bit length
	 * for the current block.
	 * IN assertion: the fields freq and dad are set, heap[heap_max] and
	 *    above are the tree nodes sorted by increasing frequency.
	 * OUT assertions: the field len is set to the optimal bit length, the
	 *     array bl_count contains the frequencies for each bit length.
	 *     The length opt_len is updated; static_len is also updated if stree is
	 *     not null.
	 */
	function gen_bitlen(desc) { // the tree descriptor
		var tree = desc.dyn_tree;
		var extra = desc.extra_bits;
		var base = desc.extra_base;
		var max_code = desc.max_code;
		var max_length = desc.max_length;
		var stree = desc.static_tree;
		var h; // heap index
		var n, m; // iterate over the tree elements
		var bits; // bit length
		var xbits; // extra bits
		var f; // frequency
		var overflow = 0; // number of elements with bit length too large

		for (bits = 0; bits <= MAX_BITS; bits++) {
			bl_count[bits] = 0;
		}

		// In a first pass, compute the optimal bit lengths (which may
		// overflow in the case of the bit length tree).
		tree[heap[heap_max]].dl = 0; // root of the heap

		for (h = heap_max + 1; h < HEAP_SIZE; h++) {
			n = heap[h];
			bits = tree[tree[n].dl].dl + 1;
			if (bits > max_length) {
				bits = max_length;
				overflow++;
			}
			tree[n].dl = bits;
			// We overwrite tree[n].dl which is no longer needed

			if (n > max_code) {
				continue; // not a leaf node
			}

			bl_count[bits]++;
			xbits = 0;
			if (n >= base) {
				xbits = extra[n - base];
			}
			f = tree[n].fc;
			opt_len += f * (bits + xbits);
			if (stree !== null) {
				static_len += f * (stree[n].dl + xbits);
			}
		}
		if (overflow === 0) {
			return;
		}

		// This happens for example on obj2 and pic of the Calgary corpus

		// Find the first bit length which could increase:
		do {
			bits = max_length - 1;
			while (bl_count[bits] === 0) {
				bits--;
			}
			bl_count[bits]--; // move one leaf down the tree
			bl_count[bits + 1] += 2; // move one overflow item as its brother
			bl_count[max_length]--;
			// The brother of the overflow item also moves one step up,
			// but this does not affect bl_count[max_length]
			overflow -= 2;
		} while (overflow > 0);

		// Now recompute all bit lengths, scanning in increasing frequency.
		// h is still equal to HEAP_SIZE. (It is simpler to reconstruct all
		// lengths instead of fixing only the wrong ones. This idea is taken
		// from 'ar' written by Haruhiko Okumura.)
		for (bits = max_length; bits !== 0; bits--) {
			n = bl_count[bits];
			while (n !== 0) {
				m = heap[--h];
				if (m > max_code) {
					continue;
				}
				if (tree[m].dl !== bits) {
					opt_len += (bits - tree[m].dl) * tree[m].fc;
					tree[m].fc = bits;
				}
				n--;
			}
		}
	}

	  /* ==========================================================================
	   * Generate the codes for a given tree and bit counts (which need not be
	   * optimal).
	   * IN assertion: the array bl_count contains the bit length statistics for
	   * the given tree and the field len is set for all tree elements.
	   * OUT assertion: the field code is set for all tree elements of non
	   *     zero code length.
	   * @param tree- the tree to decorate
	   * @param max_code- largest code with non-zero frequency
	   */
	function gen_codes(tree, max_code) {
		var next_code = []; // new Array(MAX_BITS + 1); // next code value for each bit length
		var code = 0; // running code value
		var bits; // bit index
		var n; // code index

		// The distribution counts are first used to generate the code values
		// without bit reversal.
		for (bits = 1; bits <= MAX_BITS; bits++) {
			code = ((code + bl_count[bits - 1]) << 1);
			next_code[bits] = code;
		}

		// Check that the bit counts in bl_count are consistent. The last code
		// must be all ones.
		// Assert (code + encoder->bl_count[MAX_BITS]-1 === (1<<MAX_BITS)-1, "inconsistent bit counts");
		// Tracev((stderr,"\ngen_codes: max_code %d ", max_code));

		for (n = 0; n <= max_code; n++) {
			var len = tree[n].dl;
			if (len === 0) {
				continue;
			}
			// Now reverse the bits
			tree[n].fc = bi_reverse(next_code[len]++, len);

			// Tracec(tree !== static_ltree, (stderr,"\nn %3d %c l %2d c %4x (%x) ", n, (isgraph(n) ? n : ' '), len, tree[n].fc, next_code[len]-1));
		}
	}

	/* ==========================================================================
	 * Construct one Huffman tree and assigns the code bit strings and lengths.
	 * Update the total bit length for the current block.
	 * IN assertion: the field freq is set for all tree elements.
	 * OUT assertions: the fields len and code are set to the optimal bit length
	 *     and corresponding code. The length opt_len is updated; static_len is
	 *     also updated if stree is not null. The field max_code is set.
	 */
	function build_tree(desc) { // the tree descriptor
		var tree = desc.dyn_tree;
		var stree = desc.static_tree;
		var elems = desc.elems;
		var n, m; // iterate over heap elements
		var max_code = -1; // largest code with non zero frequency
		var node = elems; // next internal node of the tree

		// Construct the initial heap, with least frequent element in
		// heap[SMALLEST]. The sons of heap[n] are heap[2*n] and heap[2*n+1].
		// heap[0] is not used.
		heap_len = 0;
		heap_max = HEAP_SIZE;

		for (n = 0; n < elems; n++) {
			if (tree[n].fc !== 0) {
				heap[++heap_len] = max_code = n;
				depth[n] = 0;
			} else {
				tree[n].dl = 0;
			}
		}

		// The pkzip format requires that at least one distance code exists,
		// and that at least one bit should be sent even if there is only one
		// possible code. So to avoid special checks later on we force at least
		// two codes of non zero frequency.
		while (heap_len < 2) {
			var xnew = heap[++heap_len] = (max_code < 2 ? ++max_code : 0);
			tree[xnew].fc = 1;
			depth[xnew] = 0;
			opt_len--;
			if (stree !== null) {
				static_len -= stree[xnew].dl;
			}
			// new is 0 or 1 so it does not have extra bits
		}
		desc.max_code = max_code;

		// The elements heap[heap_len/2+1 .. heap_len] are leaves of the tree,
		// establish sub-heaps of increasing lengths:
		for (n = heap_len >> 1; n >= 1; n--) {
			pqdownheap(tree, n);
		}

		// Construct the Huffman tree by repeatedly combining the least two
		// frequent nodes.
		do {
			n = heap[SMALLEST];
			heap[SMALLEST] = heap[heap_len--];
			pqdownheap(tree, SMALLEST);

			m = heap[SMALLEST]; // m = node of next least frequency

			// keep the nodes sorted by frequency
			heap[--heap_max] = n;
			heap[--heap_max] = m;

			// Create a new node father of n and m
			tree[node].fc = tree[n].fc + tree[m].fc;
			//	depth[node] = (char)(MAX(depth[n], depth[m]) + 1);
			if (depth[n] > depth[m] + 1) {
				depth[node] = depth[n];
			} else {
				depth[node] = depth[m] + 1;
			}
			tree[n].dl = tree[m].dl = node;

			// and insert the new node in the heap
			heap[SMALLEST] = node++;
			pqdownheap(tree, SMALLEST);

		} while (heap_len >= 2);

		heap[--heap_max] = heap[SMALLEST];

		// At this point, the fields freq and dad are set. We can now
		// generate the bit lengths.
		gen_bitlen(desc);

		// The field len is now set, we can generate the bit codes
		gen_codes(tree, max_code);
	}

	/* ==========================================================================
	 * Scan a literal or distance tree to determine the frequencies of the codes
	 * in the bit length tree. Updates opt_len to take into account the repeat
	 * counts. (The contribution of the bit length codes will be added later
	 * during the construction of bl_tree.)
	 *
	 * @param tree- the tree to be scanned
	 * @param max_code- and its largest code of non zero frequency
	 */
	function scan_tree(tree, max_code) {
		var n, // iterates over all tree elements
			prevlen = -1, // last emitted length
			curlen, // length of current code
			nextlen = tree[0].dl, // length of next code
			count = 0, // repeat count of the current code
			max_count = 7, // max repeat count
			min_count = 4; // min repeat count

		if (nextlen === 0) {
			max_count = 138;
			min_count = 3;
		}
		tree[max_code + 1].dl = 0xffff; // guard

		for (n = 0; n <= max_code; n++) {
			curlen = nextlen;
			nextlen = tree[n + 1].dl;
			if (++count < max_count && curlen === nextlen) {
				continue;
			} else if (count < min_count) {
				bl_tree[curlen].fc += count;
			} else if (curlen !== 0) {
				if (curlen !== prevlen) {
					bl_tree[curlen].fc++;
				}
				bl_tree[REP_3_6].fc++;
			} else if (count <= 10) {
				bl_tree[REPZ_3_10].fc++;
			} else {
				bl_tree[REPZ_11_138].fc++;
			}
			count = 0; prevlen = curlen;
			if (nextlen === 0) {
				max_count = 138;
				min_count = 3;
			} else if (curlen === nextlen) {
				max_count = 6;
				min_count = 3;
			} else {
				max_count = 7;
				min_count = 4;
			}
		}
	}

	/* ==========================================================================
	 * Send a literal or distance tree in compressed form, using the codes in
	 * bl_tree.
	 *
	 * @param tree- the tree to be scanned
	 * @param max_code- and its largest code of non zero frequency
	 */
	function send_tree(tree, max_code) {
		var n; // iterates over all tree elements
		var prevlen = -1; // last emitted length
		var curlen; // length of current code
		var nextlen = tree[0].dl; // length of next code
		var count = 0; // repeat count of the current code
		var max_count = 7; // max repeat count
		var min_count = 4; // min repeat count

		// tree[max_code+1].dl = -1; */  /* guard already set */
		if (nextlen === 0) {
			max_count = 138;
			min_count = 3;
		}

		for (n = 0; n <= max_code; n++) {
			curlen = nextlen;
			nextlen = tree[n + 1].dl;
			if (++count < max_count && curlen === nextlen) {
				continue;
			} else if (count < min_count) {
				do {
					SEND_CODE(curlen, bl_tree);
				} while (--count !== 0);
			} else if (curlen !== 0) {
				if (curlen !== prevlen) {
					SEND_CODE(curlen, bl_tree);
					count--;
				}
			// Assert(count >= 3 && count <= 6, " 3_6?");
				SEND_CODE(REP_3_6, bl_tree);
				send_bits(count - 3, 2);
			} else if (count <= 10) {
				SEND_CODE(REPZ_3_10, bl_tree);
				send_bits(count - 3, 3);
			} else {
				SEND_CODE(REPZ_11_138, bl_tree);
				send_bits(count - 11, 7);
			}
			count = 0;
			prevlen = curlen;
			if (nextlen === 0) {
				max_count = 138;
				min_count = 3;
			} else if (curlen === nextlen) {
				max_count = 6;
				min_count = 3;
			} else {
				max_count = 7;
				min_count = 4;
			}
		}
	}

	/* ==========================================================================
	 * Construct the Huffman tree for the bit lengths and return the index in
	 * bl_order of the last bit length code to send.
	 */
	function build_bl_tree() {
		var max_blindex; // index of last bit length code of non zero freq

		// Determine the bit length frequencies for literal and distance trees
		scan_tree(dyn_ltree, l_desc.max_code);
		scan_tree(dyn_dtree, d_desc.max_code);

		// Build the bit length tree:
		build_tree(bl_desc);
		// opt_len now includes the length of the tree representations, except
		// the lengths of the bit lengths codes and the 5+5+4 bits for the counts.

		// Determine the number of bit length codes to send. The pkzip format
		// requires that at least 4 bit length codes be sent. (appnote.txt says
		// 3 but the actual value used is 4.)
		for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) {
			if (bl_tree[bl_order[max_blindex]].dl !== 0) {
				break;
			}
		}
		// Update opt_len to include the bit length tree and counts */
		opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
		// Tracev((stderr, "\ndyn trees: dyn %ld, stat %ld",
		// encoder->opt_len, encoder->static_len));

		return max_blindex;
	}

	/* ==========================================================================
	 * Send the header for a block using dynamic Huffman trees: the counts, the
	 * lengths of the bit length codes, the literal tree and the distance tree.
	 * IN assertion: lcodes >= 257, dcodes >= 1, blcodes >= 4.
	 */
	function send_all_trees(lcodes, dcodes, blcodes) { // number of codes for each tree
		var rank; // index in bl_order

		// Assert (lcodes >= 257 && dcodes >= 1 && blcodes >= 4, "not enough codes");
		// Assert (lcodes <= L_CODES && dcodes <= D_CODES && blcodes <= BL_CODES, "too many codes");
		// Tracev((stderr, "\nbl counts: "));
		send_bits(lcodes - 257, 5); // not +255 as stated in appnote.txt
		send_bits(dcodes - 1,   5);
		send_bits(blcodes - 4,  4); // not -3 as stated in appnote.txt
		for (rank = 0; rank < blcodes; rank++) {
			// Tracev((stderr, "\nbl code %2d ", bl_order[rank]));
			send_bits(bl_tree[bl_order[rank]].dl, 3);
		}

		// send the literal tree
		send_tree(dyn_ltree, lcodes - 1);

		// send the distance tree
		send_tree(dyn_dtree, dcodes - 1);
	}

	/* ==========================================================================
	 * Determine the best encoding for the current block: dynamic trees, static
	 * trees or store, and output the encoded block to the zip file.
	 */
	function flush_block(eof) { // true if this is the last block for a file
		var opt_lenb, static_lenb, // opt_len and static_len in bytes
			max_blindex, // index of last bit length code of non zero freq
			stored_len, // length of input block
			i;

		stored_len = strstart - block_start;
		flag_buf[last_flags] = flags; // Save the flags for the last 8 items

		// Construct the literal and distance trees
		build_tree(l_desc);
		// Tracev((stderr, "\nlit data: dyn %ld, stat %ld",
		// encoder->opt_len, encoder->static_len));

		build_tree(d_desc);
		// Tracev((stderr, "\ndist data: dyn %ld, stat %ld",
		// encoder->opt_len, encoder->static_len));
		// At this point, opt_len and static_len are the total bit lengths of
		// the compressed block data, excluding the tree representations.

		// Build the bit length tree for the above two trees, and get the index
		// in bl_order of the last bit length code to send.
		max_blindex = build_bl_tree();

	 // Determine the best encoding. Compute first the block length in bytes
		opt_lenb = (opt_len + 3 + 7) >> 3;
		static_lenb = (static_len + 3 + 7) >> 3;

	//  Trace((stderr, "\nopt %lu(%lu) stat %lu(%lu) stored %lu lit %u dist %u ", opt_lenb, encoder->opt_len, static_lenb, encoder->static_len, stored_len, encoder->last_lit, encoder->last_dist));

		if (static_lenb <= opt_lenb) {
			opt_lenb = static_lenb;
		}
		if (stored_len + 4 <= opt_lenb && block_start >= 0) { // 4: two words for the lengths
			// The test buf !== NULL is only necessary if LIT_BUFSIZE > WSIZE.
			// Otherwise we can't have processed more than WSIZE input bytes since
			// the last block flush, because compression would have been
			// successful. If LIT_BUFSIZE <= WSIZE, it is never too late to
			// transform a block into a stored block.
			send_bits((STORED_BLOCK << 1) + eof, 3);  /* send block type */
			bi_windup();         /* align on byte boundary */
			put_short(stored_len);
			put_short(~stored_len);

			// copy block
			/*
				p = &window[block_start];
				for (i = 0; i < stored_len; i++) {
					put_byte(p[i]);
				}
			*/
			for (i = 0; i < stored_len; i++) {
				put_byte(window[block_start + i]);
			}
		} else if (static_lenb === opt_lenb) {
			send_bits((STATIC_TREES << 1) + eof, 3);
			compress_block(static_ltree, static_dtree);
		} else {
			send_bits((DYN_TREES << 1) + eof, 3);
			send_all_trees(l_desc.max_code + 1, d_desc.max_code + 1, max_blindex + 1);
			compress_block(dyn_ltree, dyn_dtree);
		}

		init_block();

		if (eof !== 0) {
			bi_windup();
		}
	}

	/* ==========================================================================
	 * Save the match info and tally the frequency counts. Return true if
	 * the current block must be flushed.
	 *
	 * @param dist- distance of matched string
	 * @param lc- (match length - MIN_MATCH) or unmatched char (if dist === 0)
	 */
	function ct_tally(dist, lc) {
		l_buf[last_lit++] = lc;
		if (dist === 0) {
			// lc is the unmatched char
			dyn_ltree[lc].fc++;
		} else {
			// Here, lc is the match length - MIN_MATCH
			dist--; // dist = match distance - 1
			// Assert((ush)dist < (ush)MAX_DIST && (ush)lc <= (ush)(MAX_MATCH-MIN_MATCH) && (ush)D_CODE(dist) < (ush)D_CODES,  "ct_tally: bad match");

			dyn_ltree[length_code[lc] + LITERALS + 1].fc++;
			dyn_dtree[D_CODE(dist)].fc++;

			d_buf[last_dist++] = dist;
			flags |= flag_bit;
		}
		flag_bit <<= 1;

		// Output the flags if they fill a byte
		if ((last_lit & 7) === 0) {
			flag_buf[last_flags++] = flags;
			flags = 0;
			flag_bit = 1;
		}
		// Try to guess if it is profitable to stop the current block here
		if (compr_level > 2 && (last_lit & 0xfff) === 0) {
			// Compute an upper bound for the compressed length
			var out_length = last_lit * 8;
			var in_length = strstart - block_start;
			var dcode;

			for (dcode = 0; dcode < D_CODES; dcode++) {
				out_length += dyn_dtree[dcode].fc * (5 + extra_dbits[dcode]);
			}
			out_length >>= 3;
			// Trace((stderr,"\nlast_lit %u, last_dist %u, in %ld, out ~%ld(%ld%%) ", encoder->last_lit, encoder->last_dist, in_length, out_length, 100L - out_length*100L/in_length));
			if (last_dist < parseInt(last_lit / 2, 10) && out_length < parseInt(in_length / 2, 10)) {
				return true;
			}
		}
		return (last_lit === LIT_BUFSIZE - 1 || last_dist === DIST_BUFSIZE);
		// We avoid equality with LIT_BUFSIZE because of wraparound at 64K
		// on 16 bit machines and because stored blocks are restricted to
		// 64K-1 bytes.
	}

	  /* ==========================================================================
	   * Send the block data compressed using the given Huffman trees
	   *
	   * @param ltree- literal tree
	   * @param dtree- distance tree
	   */
	function compress_block(ltree, dtree) {
		var dist; // distance of matched string
		var lc; // match length or unmatched char (if dist === 0)
		var lx = 0; // running index in l_buf
		var dx = 0; // running index in d_buf
		var fx = 0; // running index in flag_buf
		var flag = 0; // current flags
		var code; // the code to send
		var extra; // number of extra bits to send

		if (last_lit !== 0) {
			do {
				if ((lx & 7) === 0) {
					flag = flag_buf[fx++];
				}
				lc = l_buf[lx++] & 0xff;
				if ((flag & 1) === 0) {
					SEND_CODE(lc, ltree); /* send a literal byte */
					//	Tracecv(isgraph(lc), (stderr," '%c' ", lc));
				} else {
					// Here, lc is the match length - MIN_MATCH
					code = length_code[lc];
					SEND_CODE(code + LITERALS + 1, ltree); // send the length code
					extra = extra_lbits[code];
					if (extra !== 0) {
						lc -= base_length[code];
						send_bits(lc, extra); // send the extra length bits
					}
					dist = d_buf[dx++];
					// Here, dist is the match distance - 1
					code = D_CODE(dist);
					//	Assert (code < D_CODES, "bad d_code");

					SEND_CODE(code, dtree); // send the distance code
					extra = extra_dbits[code];
					if (extra !== 0) {
						dist -= base_dist[code];
						send_bits(dist, extra); // send the extra distance bits
					}
				} // literal or match pair ?
				flag >>= 1;
			} while (lx < last_lit);
		}

		SEND_CODE(END_BLOCK, ltree);
	}

	/* ==========================================================================
	 * Send a value on a given number of bits.
	 * IN assertion: length <= 16 and value fits in length bits.
	 *
	 * @param value- value to send
	 * @param length- number of bits
	 */
	var Buf_size = 16; // bit size of bi_buf
	function send_bits(value, length) {
		// If not enough room in bi_buf, use (valid) bits from bi_buf and
		// (16 - bi_valid) bits from value, leaving (width - (16-bi_valid))
		// unused bits in value.
		if (bi_valid > Buf_size - length) {
			bi_buf |= (value << bi_valid);
			put_short(bi_buf);
			bi_buf = (value >> (Buf_size - bi_valid));
			bi_valid += length - Buf_size;
		} else {
			bi_buf |= value << bi_valid;
			bi_valid += length;
		}
	}

	/* ==========================================================================
	 * Reverse the first len bits of a code, using straightforward code (a faster
	 * method would use a table)
	 * IN assertion: 1 <= len <= 15
	 *
	 * @param code- the value to invert
	 * @param len- its bit length
	 */
	function bi_reverse(code, len) {
		var res = 0;
		do {
			res |= code & 1;
			code >>= 1;
			res <<= 1;
		} while (--len > 0);
		return res >> 1;
	}

	/* ==========================================================================
	 * Write out any remaining bits in an incomplete byte.
	 */
	function bi_windup() {
		if (bi_valid > 8) {
			put_short(bi_buf);
		} else if (bi_valid > 0) {
			put_byte(bi_buf);
		}
		bi_buf = 0;
		bi_valid = 0;
	}

	function qoutbuf() {
		var q, i;
		if (outcnt !== 0) {
			q = new_queue();
			if (qhead === null) {
				qhead = qtail = q;
			} else {
				qtail = qtail.next = q;
			}
			q.len = outcnt - outoff;
			// System.arraycopy(outbuf, outoff, q.ptr, 0, q.len);
			for (i = 0; i < q.len; i++) {
				q.ptr[i] = outbuf[outoff + i];
			}
			outcnt = outoff = 0;
		}
	}

	function deflate(arr, level) {
		var i, j, buff;

		deflate_data = arr;
		deflate_pos = 0;
		if (typeof level === "undefined") {
			level = DEFAULT_LEVEL;
		}
		deflate_start(level);

		buff = [];

		do {
			i = deflate_internal(buff, buff.length, 1024);
		} while (i > 0);

		deflate_data = null; // G.C.
		return buff;
	}

	module.exports = deflate;
	module.exports.DEFAULT_LEVEL = DEFAULT_LEVEL;
}());

},{}],30:[function(require,module,exports){
/*
 * $Id: rawinflate.js,v 0.2 2009/03/01 18:32:24 dankogai Exp $
 *
 * original:
 * http://www.onicos.com/staff/iz/amuse/javascript/expert/inflate.txt
 */

/* Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0.0.1
 * LastModified: Dec 25 1999
 */

/* Interface:
 * data = inflate(src);
 */

(function () {
	/* constant parameters */
	var WSIZE = 32768, // Sliding Window size
		STORED_BLOCK = 0,
		STATIC_TREES = 1,
		DYN_TREES = 2,

	/* for inflate */
		lbits = 9, // bits in base literal/length lookup table
		dbits = 6, // bits in base distance lookup table

	/* variables (inflate) */
		slide,
		wp, // current position in slide
		fixed_tl = null, // inflate static
		fixed_td, // inflate static
		fixed_bl, // inflate static
		fixed_bd, // inflate static
		bit_buf, // bit buffer
		bit_len, // bits in bit buffer
		method,
		eof,
		copy_leng,
		copy_dist,
		tl, // literal length decoder table
		td, // literal distance decoder table
		bl, // number of bits decoded by tl
		bd, // number of bits decoded by td

		inflate_data,
		inflate_pos,


/* constant tables (inflate) */
		MASK_BITS = [
			0x0000,
			0x0001, 0x0003, 0x0007, 0x000f, 0x001f, 0x003f, 0x007f, 0x00ff,
			0x01ff, 0x03ff, 0x07ff, 0x0fff, 0x1fff, 0x3fff, 0x7fff, 0xffff
		],
		// Tables for deflate from PKZIP's appnote.txt.
		// Copy lengths for literal codes 257..285
		cplens = [
			3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
			35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
		],
/* note: see note #13 above about the 258 in this list. */
		// Extra bits for literal codes 257..285
		cplext = [
			0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
			3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 99, 99 // 99==invalid
		],
		// Copy offsets for distance codes 0..29
		cpdist = [
			1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
			257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
			8193, 12289, 16385, 24577
		],
		// Extra bits for distance codes
		cpdext = [
			0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
			7, 7, 8, 8, 9, 9, 10, 10, 11, 11,
			12, 12, 13, 13
		],
		// Order of the bit length code lengths
		border = [
			16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15
		];
	/* objects (inflate) */

	function HuftList() {
		this.next = null;
		this.list = null;
	}

	function HuftNode() {
		this.e = 0; // number of extra bits or operation
		this.b = 0; // number of bits in this code or subcode

		// union
		this.n = 0; // literal, length base, or distance base
		this.t = null; // (HuftNode) pointer to next level of table
	}

	/*
	 * @param b-  code lengths in bits (all assumed <= BMAX)
	 * @param n- number of codes (assumed <= N_MAX)
	 * @param s- number of simple-valued codes (0..s-1)
	 * @param d- list of base values for non-simple codes
	 * @param e- list of extra bits for non-simple codes
	 * @param mm- maximum lookup bits
	 */
	function HuftBuild(b, n, s, d, e, mm) {
		this.BMAX = 16; // maximum bit length of any code
		this.N_MAX = 288; // maximum number of codes in any set
		this.status = 0; // 0: success, 1: incomplete table, 2: bad input
		this.root = null; // (HuftList) starting table
		this.m = 0; // maximum lookup bits, returns actual

	/* Given a list of code lengths and a maximum table size, make a set of
	   tables to decode that set of codes. Return zero on success, one if
	   the given code set is incomplete (the tables are still built in this
	   case), two if the input is invalid (all zero length codes or an
	   oversubscribed set of lengths), and three if not enough memory.
	   The code with value 256 is special, and the tables are constructed
	   so that no bits beyond that code are fetched when that code is
	   decoded. */
		var a; // counter for codes of length k
		var c = [];
		var el; // length of EOB code (value 256)
		var f; // i repeats in table every f entries
		var g; // maximum code length
		var h; // table level
		var i; // counter, current code
		var j; // counter
		var k; // number of bits in current code
		var lx = [];
		var p; // pointer into c[], b[], or v[]
		var pidx; // index of p
		var q; // (HuftNode) points to current table
		var r = new HuftNode(); // table entry for structure assignment
		var u = [];
		var v = [];
		var w;
		var x = [];
		var xp; // pointer into x or c
		var y; // number of dummy codes added
		var z; // number of entries in current table
		var o;
		var tail; // (HuftList)

		tail = this.root = null;

		// bit length count table
		for (i = 0; i < this.BMAX + 1; i++) {
			c[i] = 0;
		}
		// stack of bits per table
		for (i = 0; i < this.BMAX + 1; i++) {
			lx[i] = 0;
		}
		// HuftNode[BMAX][]  table stack
		for (i = 0; i < this.BMAX; i++) {
			u[i] = null;
		}
		// values in order of bit length
		for (i = 0; i < this.N_MAX; i++) {
			v[i] = 0;
		}
		// bit offsets, then code stack
		for (i = 0; i < this.BMAX + 1; i++) {
			x[i] = 0;
		}

		// Generate counts for each bit length
		el = n > 256 ? b[256] : this.BMAX; // set length of EOB code, if any
		p = b; pidx = 0;
		i = n;
		do {
			c[p[pidx]]++; // assume all entries <= BMAX
			pidx++;
		} while (--i > 0);
		if (c[0] === n) { // null input--all zero length codes
			this.root = null;
			this.m = 0;
			this.status = 0;
			return;
		}

		// Find minimum and maximum length, bound *m by those
		for (j = 1; j <= this.BMAX; j++) {
			if (c[j] !== 0) {
				break;
			}
		}
		k = j; // minimum code length
		if (mm < j) {
			mm = j;
		}
		for (i = this.BMAX; i !== 0; i--) {
			if (c[i] !== 0) {
				break;
			}
		}
		g = i; // maximum code length
		if (mm > i) {
			mm = i;
		}

		// Adjust last length count to fill out codes, if needed
		for (y = 1 << j; j < i; j++, y <<= 1) {
			if ((y -= c[j]) < 0) {
				this.status = 2; // bad input: more codes than bits
				this.m = mm;
				return;
			}
		}
		if ((y -= c[i]) < 0) {
			this.status = 2;
			this.m = mm;
			return;
		}
		c[i] += y;

		// Generate starting offsets into the value table for each length
		x[1] = j = 0;
		p = c;
		pidx = 1;
		xp = 2;
		while (--i > 0) { // note that i == g from above
			x[xp++] = (j += p[pidx++]);
		}

		// Make a table of values in order of bit lengths
		p = b; pidx = 0;
		i = 0;
		do {
			if ((j = p[pidx++]) !== 0) {
				v[x[j]++] = i;
			}
		} while (++i < n);
		n = x[g]; // set n to length of v

		// Generate the Huffman codes and for each, make the table entries
		x[0] = i = 0; // first Huffman code is zero
		p = v; pidx = 0; // grab values in bit order
		h = -1; // no tables yet--level -1
		w = lx[0] = 0; // no bits decoded yet
		q = null; // ditto
		z = 0; // ditto

		// go through the bit lengths (k already is bits in shortest code)
		for (null; k <= g; k++) {
			a = c[k];
			while (a-- > 0) {
				// here i is the Huffman code of length k bits for value p[pidx]
				// make tables up to required level
				while (k > w + lx[1 + h]) {
					w += lx[1 + h]; // add bits already decoded
					h++;

					// compute minimum size table less than or equal to *m bits
					z = (z = g - w) > mm ? mm : z; // upper limit
					if ((f = 1 << (j = k - w)) > a + 1) { // try a k-w bit table
						// too few codes for k-w bit table
						f -= a + 1; // deduct codes from patterns left
						xp = k;
						while (++j < z) { // try smaller tables up to z bits
							if ((f <<= 1) <= c[++xp]) {
								break; // enough codes to use up j bits
							}
							f -= c[xp]; // else deduct codes from patterns
						}
					}
					if (w + j > el && w < el) {
						j = el - w; // make EOB code end at table
					}
					z = 1 << j; // table entries for j-bit table
					lx[1 + h] = j; // set table size in stack

					// allocate and link in new table
					q = [];
					for (o = 0; o < z; o++) {
						q[o] = new HuftNode();
					}

					if (!tail) {
						tail = this.root = new HuftList();
					} else {
						tail = tail.next = new HuftList();
					}
					tail.next = null;
					tail.list = q;
					u[h] = q; // table starts after link

					/* connect to last table, if there is one */
					if (h > 0) {
						x[h] = i; // save pattern for backing up
						r.b = lx[h]; // bits to dump before this table
						r.e = 16 + j; // bits in this table
						r.t = q; // pointer to this table
						j = (i & ((1 << w) - 1)) >> (w - lx[h]);
						u[h - 1][j].e = r.e;
						u[h - 1][j].b = r.b;
						u[h - 1][j].n = r.n;
						u[h - 1][j].t = r.t;
					}
				}

				// set up table entry in r
				r.b = k - w;
				if (pidx >= n) {
					r.e = 99; // out of values--invalid code
				} else if (p[pidx] < s) {
					r.e = (p[pidx] < 256 ? 16 : 15); // 256 is end-of-block code
					r.n = p[pidx++]; // simple code is just the value
				} else {
					r.e = e[p[pidx] - s]; // non-simple--look up in lists
					r.n = d[p[pidx++] - s];
				}

				// fill code-like entries with r //
				f = 1 << (k - w);
				for (j = i >> w; j < z; j += f) {
					q[j].e = r.e;
					q[j].b = r.b;
					q[j].n = r.n;
					q[j].t = r.t;
				}

				// backwards increment the k-bit code i
				for (j = 1 << (k - 1); (i & j) !== 0; j >>= 1) {
					i ^= j;
				}
				i ^= j;

				// backup over finished tables
				while ((i & ((1 << w) - 1)) !== x[h]) {
					w -= lx[h]; // don't need to update q
					h--;
				}
			}
		}

		/* return actual size of base table */
		this.m = lx[1];

		/* Return true (1) if we were given an incomplete table */
		this.status = ((y !== 0 && g !== 1) ? 1 : 0);
	}


	/* routines (inflate) */

	function GET_BYTE() {
		if (inflate_data.length === inflate_pos) {
			return -1;
		}
		return inflate_data[inflate_pos++] & 0xff;
	}

	function NEEDBITS(n) {
		while (bit_len < n) {
			bit_buf |= GET_BYTE() << bit_len;
			bit_len += 8;
		}
	}

	function GETBITS(n) {
		return bit_buf & MASK_BITS[n];
	}

	function DUMPBITS(n) {
		bit_buf >>= n;
		bit_len -= n;
	}

	function inflate_codes(buff, off, size) {
		// inflate (decompress) the codes in a deflated (compressed) block.
		// Return an error code or zero if it all goes ok.
		var e; // table entry flag/number of extra bits
		var t; // (HuftNode) pointer to table entry
		var n;

		if (size === 0) {
			return 0;
		}

		// inflate the coded data
		n = 0;
		for (;;) { // do until end of block
			NEEDBITS(bl);
			t = tl.list[GETBITS(bl)];
			e = t.e;
			while (e > 16) {
				if (e === 99) {
					return -1;
				}
				DUMPBITS(t.b);
				e -= 16;
				NEEDBITS(e);
				t = t.t[GETBITS(e)];
				e = t.e;
			}
			DUMPBITS(t.b);

			if (e === 16) { // then it's a literal
				wp &= WSIZE - 1;
				buff[off + n++] = slide[wp++] = t.n;
				if (n === size) {
					return size;
				}
				continue;
			}

			// exit if end of block
			if (e === 15) {
				break;
			}

			// it's an EOB or a length

			// get length of block to copy
			NEEDBITS(e);
			copy_leng = t.n + GETBITS(e);
			DUMPBITS(e);

			// decode distance of block to copy
			NEEDBITS(bd);
			t = td.list[GETBITS(bd)];
			e = t.e;

			while (e > 16) {
				if (e === 99) {
					return -1;
				}
				DUMPBITS(t.b);
				e -= 16;
				NEEDBITS(e);
				t = t.t[GETBITS(e)];
				e = t.e;
			}
			DUMPBITS(t.b);
			NEEDBITS(e);
			copy_dist = wp - t.n - GETBITS(e);
			DUMPBITS(e);

			// do the copy
			while (copy_leng > 0 && n < size) {
				copy_leng--;
				copy_dist &= WSIZE - 1;
				wp &= WSIZE - 1;
				buff[off + n++] = slide[wp++] = slide[copy_dist++];
			}

			if (n === size) {
				return size;
			}
		}

		method = -1; // done
		return n;
	}

	function inflate_stored(buff, off, size) {
		/* "decompress" an inflated type 0 (stored) block. */
		var n;

		// go to byte boundary
		n = bit_len & 7;
		DUMPBITS(n);

		// get the length and its complement
		NEEDBITS(16);
		n = GETBITS(16);
		DUMPBITS(16);
		NEEDBITS(16);
		if (n !== ((~bit_buf) & 0xffff)) {
			return -1; // error in compressed data
		}
		DUMPBITS(16);

		// read and output the compressed data
		copy_leng = n;

		n = 0;
		while (copy_leng > 0 && n < size) {
			copy_leng--;
			wp &= WSIZE - 1;
			NEEDBITS(8);
			buff[off + n++] = slide[wp++] = GETBITS(8);
			DUMPBITS(8);
		}

		if (copy_leng === 0) {
			method = -1; // done
		}
		return n;
	}

	function inflate_fixed(buff, off, size) {
		// decompress an inflated type 1 (fixed Huffman codes) block.  We should
		// either replace this with a custom decoder, or at least precompute the
		// Huffman tables.

		// if first time, set up tables for fixed blocks
		if (!fixed_tl) {
			var i; // temporary variable
			var l = []; // 288 length list for huft_build (initialized below)
			var h; // HuftBuild

			// literal table
			for (i = 0; i < 144; i++) {
				l[i] = 8;
			}
			for (null; i < 256; i++) {
				l[i] = 9;
			}
			for (null; i < 280; i++) {
				l[i] = 7;
			}
			for (null; i < 288; i++) { // make a complete, but wrong code set
				l[i] = 8;
			}
			fixed_bl = 7;

			h = new HuftBuild(l, 288, 257, cplens, cplext, fixed_bl);
			if (h.status !== 0) {
				console.error("HufBuild error: " + h.status);
				return -1;
			}
			fixed_tl = h.root;
			fixed_bl = h.m;

			// distance table
			for (i = 0; i < 30; i++) { // make an incomplete code set
				l[i] = 5;
			}
			fixed_bd = 5;

			h = new HuftBuild(l, 30, 0, cpdist, cpdext, fixed_bd);
			if (h.status > 1) {
				fixed_tl = null;
				console.error("HufBuild error: " + h.status);
				return -1;
			}
			fixed_td = h.root;
			fixed_bd = h.m;
		}

		tl = fixed_tl;
		td = fixed_td;
		bl = fixed_bl;
		bd = fixed_bd;
		return inflate_codes(buff, off, size);
	}

	function inflate_dynamic(buff, off, size) {
		// decompress an inflated type 2 (dynamic Huffman codes) block.
		var i; // temporary variables
		var j;
		var l; // last length
		var n; // number of lengths to get
		var t; // (HuftNode) literal/length code table
		var nb; // number of bit length codes
		var nl; // number of literal/length codes
		var nd; // number of distance codes
		var ll = [];
		var h; // (HuftBuild)

		// literal/length and distance code lengths
		for (i = 0; i < 286 + 30; i++) {
			ll[i] = 0;
		}

		// read in table lengths
		NEEDBITS(5);
		nl = 257 + GETBITS(5); // number of literal/length codes
		DUMPBITS(5);
		NEEDBITS(5);
		nd = 1 + GETBITS(5); // number of distance codes
		DUMPBITS(5);
		NEEDBITS(4);
		nb = 4 + GETBITS(4); // number of bit length codes
		DUMPBITS(4);
		if (nl > 286 || nd > 30) {
			return -1; // bad lengths
		}

		// read in bit-length-code lengths
		for (j = 0; j < nb; j++) {
			NEEDBITS(3);
			ll[border[j]] = GETBITS(3);
			DUMPBITS(3);
		}
		for (null; j < 19; j++) {
			ll[border[j]] = 0;
		}

		// build decoding table for trees--single level, 7 bit lookup
		bl = 7;
		h = new HuftBuild(ll, 19, 19, null, null, bl);
		if (h.status !== 0) {
			return -1; // incomplete code set
		}

		tl = h.root;
		bl = h.m;

		// read in literal and distance code lengths
		n = nl + nd;
		i = l = 0;
		while (i < n) {
			NEEDBITS(bl);
			t = tl.list[GETBITS(bl)];
			j = t.b;
			DUMPBITS(j);
			j = t.n;
			if (j < 16) { // length of code in bits (0..15)
				ll[i++] = l = j; // save last length in l
			} else if (j === 16) { // repeat last length 3 to 6 times
				NEEDBITS(2);
				j = 3 + GETBITS(2);
				DUMPBITS(2);
				if (i + j > n) {
					return -1;
				}
				while (j-- > 0) {
					ll[i++] = l;
				}
			} else if (j === 17) { // 3 to 10 zero length codes
				NEEDBITS(3);
				j = 3 + GETBITS(3);
				DUMPBITS(3);
				if (i + j > n) {
					return -1;
				}
				while (j-- > 0) {
					ll[i++] = 0;
				}
				l = 0;
			} else { // j === 18: 11 to 138 zero length codes
				NEEDBITS(7);
				j = 11 + GETBITS(7);
				DUMPBITS(7);
				if (i + j > n) {
					return -1;
				}
				while (j-- > 0) {
					ll[i++] = 0;
				}
				l = 0;
			}
		}

		// build the decoding tables for literal/length and distance codes
		bl = lbits;
		h = new HuftBuild(ll, nl, 257, cplens, cplext, bl);
		if (bl === 0) { // no literals or lengths
			h.status = 1;
		}
		if (h.status !== 0) {
			if (h.status !== 1) {
				return -1; // incomplete code set
			}
			// **incomplete literal tree**
		}
		tl = h.root;
		bl = h.m;

		for (i = 0; i < nd; i++) {
			ll[i] = ll[i + nl];
		}
		bd = dbits;
		h = new HuftBuild(ll, nd, 0, cpdist, cpdext, bd);
		td = h.root;
		bd = h.m;

		if (bd === 0 && nl > 257) { // lengths but no distances
			// **incomplete distance tree**
			return -1;
		}
/*
		if (h.status === 1) {
			// **incomplete distance tree**
		}
*/
		if (h.status !== 0) {
			return -1;
		}

		// decompress until an end-of-block code
		return inflate_codes(buff, off, size);
	}

	function inflate_start() {
		if (!slide) {
			slide = []; // new Array(2 * WSIZE); // slide.length is never called
		}
		wp = 0;
		bit_buf = 0;
		bit_len = 0;
		method = -1;
		eof = false;
		copy_leng = copy_dist = 0;
		tl = null;
	}

	function inflate_internal(buff, off, size) {
		// decompress an inflated entry
		var n, i;

		n = 0;
		while (n < size) {
			if (eof && method === -1) {
				return n;
			}

			if (copy_leng > 0) {
				if (method !== STORED_BLOCK) {
					// STATIC_TREES or DYN_TREES
					while (copy_leng > 0 && n < size) {
						copy_leng--;
						copy_dist &= WSIZE - 1;
						wp &= WSIZE - 1;
						buff[off + n++] = slide[wp++] = slide[copy_dist++];
					}
				} else {
					while (copy_leng > 0 && n < size) {
						copy_leng--;
						wp &= WSIZE - 1;
						NEEDBITS(8);
						buff[off + n++] = slide[wp++] = GETBITS(8);
						DUMPBITS(8);
					}
					if (copy_leng === 0) {
						method = -1; // done
					}
				}
				if (n === size) {
					return n;
				}
			}

			if (method === -1) {
				if (eof) {
					break;
				}

				// read in last block bit
				NEEDBITS(1);
				if (GETBITS(1) !== 0) {
					eof = true;
				}
				DUMPBITS(1);

				// read in block type
				NEEDBITS(2);
				method = GETBITS(2);
				DUMPBITS(2);
				tl = null;
				copy_leng = 0;
			}

			switch (method) {
			case STORED_BLOCK:
				i = inflate_stored(buff, off + n, size - n);
				break;

			case STATIC_TREES:
				if (tl) {
					i = inflate_codes(buff, off + n, size - n);
				} else {
					i = inflate_fixed(buff, off + n, size - n);
				}
				break;

			case DYN_TREES:
				if (tl) {
					i = inflate_codes(buff, off + n, size - n);
				} else {
					i = inflate_dynamic(buff, off + n, size - n);
				}
				break;

			default: // error
				i = -1;
				break;
			}

			if (i === -1) {
				if (eof) {
					return 0;
				}
				return -1;
			}
			n += i;
		}
		return n;
	}

	function inflate(arr) {
		var buff = [], i;

		inflate_start();
		inflate_data = arr;
		inflate_pos = 0;

		do {
			i = inflate_internal(buff, buff.length, 1024);
		} while (i > 0);
		inflate_data = null; // G.C.
		return buff;
	}

	module.exports = inflate;
}());

},{}],31:[function(require,module,exports){
"use strict"

var iota = require("iota-array")

var arrayMethods = [
  "concat",
  "join",
  "slice",
  "toString",
  "indexOf",
  "lastIndexOf",
  "forEach",
  "every",
  "some",
  "filter",
  "map",
  "reduce",
  "reduceRight"
]

function compare1st(a, b) {
  return a[0] - b[0]
}

function order() {
  var stride = this.stride
  var terms = new Array(stride.length)
  var i
  for(i=0; i<terms.length; ++i) {
    terms[i] = [Math.abs(stride[i]), i]
  }
  terms.sort(compare1st)
  var result = new Array(terms.length)
  for(i=0; i<result.length; ++i) {
    result[i] = terms[i][1]
  }
  return result
}

var ZeroArray = "function ZeroArray(a,d) {\
this.data = a;\
this.offset = d\
};\
var proto=ZeroArray.prototype;\
proto.size=0;\
proto.shape=[];\
proto.stride=[];\
proto.order=[];\
proto.get=proto.set=function() {\
return Number.NaN\
};\
proto.lo=\
proto.hi=\
proto.transpose=\
proto.step=\
proto.pick=function() {\
return new ZeroArray(this.data,this.shape,this.stride,this.offset)\
}"

function compileConstructor(dtype, dimension) {
  //Special case for 0d arrays
  if(dimension === 0) {
    var compiledProc = new Function([
      ZeroArray,
      "ZeroArray.prototype.dtype='"+dtype+"'",
      "return function construct_ZeroArray(a,b,c,d){return new ZeroArray(a,d)}"].join("\n"))
    return compiledProc()
  }
  var useGetters = (dtype === "generic")
  var code = ["'use strict'"]
    
  //Create constructor for view
  var indices = iota(dimension)
  var args = indices.map(function(i) { return "i"+i })
  var index_str = "this.offset+" + indices.map(function(i) {
        return ["this._stride", i, "*i",i].join("")
      }).join("+")
  var className = ["View", dimension, "d", dtype].join("")
  code.push(["function ", className, "(a,",
    indices.map(function(i) {
      return "b"+i
    }).join(","), ",",
    indices.map(function(i) {
      return "c"+i
    }).join(","), ",d){this.data=a"].join(""))
  for(var i=0; i<dimension; ++i) {
    code.push(["this._shape",i,"=b",i,"|0"].join(""))
  }
  for(var i=0; i<dimension; ++i) {
    code.push(["this._stride",i,"=c",i,"|0"].join(""))
  }
  code.push("this.offset=d|0}")
  
  //Get prototype
  code.push(["var proto=",className,".prototype"].join(""))
  
  //view.dtype:
  code.push(["proto.dtype='", dtype, "'"].join(""))
  code.push("proto.dimension="+dimension)
  
  //view.stride and view.shape
  var strideClassName = ["VStride", dimension, "d", dtype].join("")
  var shapeClassName = ["VShape", dimension, "d", dtype].join("")
  var props = {"stride":strideClassName, "shape":shapeClassName}
  for(var prop in props) {
    var arrayName = props[prop]
    code.push(["function ", arrayName, "(v) {this._v=v} var aproto=", arrayName, ".prototype"].join(""))
    code.push(["aproto.length=",dimension].join(""))
    
    var array_elements = []
    for(var i=0; i<dimension; ++i) {
      array_elements.push(["this._v._", prop, i].join(""))
    }
    code.push(["aproto.toJSON=function ", arrayName, "_toJSON(){return [", array_elements.join(","), "]}"].join(""))
    code.push(["aproto.toString=function ", arrayName, "_toString(){return [", array_elements.join(","), "].join()}"].join(""))
    
    for(var i=0; i<dimension; ++i) {
      code.push(["Object.defineProperty(aproto,", i, ",{get:function(){return this._v._", prop, i, "},set:function(v){return this._v._", prop, i, "=v|0},enumerable:true})"].join(""))
    }
    for(var i=0; i<arrayMethods.length; ++i) {
      if(arrayMethods[i] in Array.prototype) {
        code.push(["aproto.", arrayMethods[i], "=Array.prototype.", arrayMethods[i]].join(""))
      }
    }
    code.push(["Object.defineProperty(proto,'",prop,"',{get:function ", arrayName, "_get(){return new ", arrayName, "(this)},set: function ", arrayName, "_set(v){"].join(""))
    for(var i=0; i<dimension; ++i) {
      code.push(["this._", prop, i, "=v[", i, "]|0"].join(""))
    }
    code.push("return v}})")
  }
  
  //view.size:
  code.push(["Object.defineProperty(proto,'size',{get:function ",className,"_size(){\
return ", indices.map(function(i) { return ["this._shape", i].join("") }).join("*"),
"}})"].join(""))

  //view.order:
  if(dimension === 1) {
    code.push("proto.order=[0]")
  } else {
    code.push("Object.defineProperty(proto,'order',{get:")
    if(dimension < 4) {
      code.push(["function ",className,"_order(){"].join(""))
      if(dimension === 2) {
        code.push("return (Math.abs(this._stride0)>Math.abs(this._stride1))?[1,0]:[0,1]}})")
      } else if(dimension === 3) {
        code.push(
"var s0=Math.abs(this._stride0),s1=Math.abs(this._stride1),s2=Math.abs(this._stride2);\
if(s0>s1){\
if(s1>s2){\
return [2,1,0];\
}else if(s0>s2){\
return [1,2,0];\
}else{\
return [1,0,2];\
}\
}else if(s0>s2){\
return [2,0,1];\
}else if(s2>s1){\
return [0,1,2];\
}else{\
return [0,2,1];\
}}})")
      }
    } else {
      code.push("ORDER})")
    }
  }
  
  //view.set(i0, ..., v):
  code.push([
"proto.set=function ",className,"_set(", args.join(","), ",v){"].join(""))
  if(useGetters) {
    code.push(["return this.data.set(", index_str, ",v)}"].join(""))
  } else {
    code.push(["return this.data[", index_str, "]=v}"].join(""))
  }
  
  //view.get(i0, ...):
  code.push(["proto.get=function ",className,"_get(", args.join(","), "){"].join(""))
  if(useGetters) {
    code.push(["return this.data.get(", index_str, ")}"].join(""))
  } else {
    code.push(["return this.data[", index_str, "]}"].join(""))
  }
  
  //view.hi():
  code.push(["proto.hi=function ",className,"_hi(",args.join(","),"){return new ", className, "(this.data,",
    indices.map(function(i) {
      return ["(typeof i",i,"!=='number'||i",i,"<0)?this._shape", i, ":i", i,"|0"].join("")
    }).join(","), ",",
    indices.map(function(i) {
      return "this._stride"+i
    }).join(","), ",this.offset)}"].join(""))
  
  //view.lo():
  var a_vars = indices.map(function(i) { return "a"+i+"=this._shape"+i })
  var c_vars = indices.map(function(i) { return "c"+i+"=this._stride"+i })
  code.push(["proto.lo=function ",className,"_lo(",args.join(","),"){var b=this.offset,d=0,", a_vars.join(","), ",", c_vars.join(",")].join(""))
  for(var i=0; i<dimension; ++i) {
    code.push([
"if(typeof i",i,"==='number'&&i",i,">=0){\
d=i",i,"|0;\
b+=c",i,"*d;\
a",i,"-=d}"].join(""))
  }
  code.push(["return new ", className, "(this.data,",
    indices.map(function(i) {
      return "a"+i
    }).join(","),",",
    indices.map(function(i) {
      return "c"+i
    }).join(","), ",b)}"].join(""))
  
  //view.step():
  code.push(["proto.step=function ",className,"_step(",args.join(","),"){var ",
    indices.map(function(i) {
      return "a"+i+"=this._shape"+i
    }).join(","), ",",
    indices.map(function(i) {
      return "b"+i+"=this._stride"+i
    }).join(","),",c=this.offset,d=0,ceil=Math.ceil"].join(""))
  for(var i=0; i<dimension; ++i) {
    code.push([
"if(typeof i",i,"==='number'){\
d=i",i,"|0;\
if(d<0){\
c+=b",i,"*(a",i,"-1);\
a",i,"=ceil(-a",i,"/d)\
}else{\
a",i,"=ceil(a",i,"/d)\
}\
b",i,"*=d\
}"].join(""))
  }
  code.push(["return new ", className, "(this.data,",
    indices.map(function(i) {
      return "a" + i
    }).join(","), ",",
    indices.map(function(i) {
      return "b" + i
    }).join(","), ",c)}"].join(""))
  
  //view.transpose():
  var tShape = new Array(dimension)
  var tStride = new Array(dimension)
  for(var i=0; i<dimension; ++i) {
    tShape[i] = ["a[i", i, "|0]"].join("")
    tStride[i] = ["b[i", i, "|0]"].join("")
  }
  code.push(["proto.transpose=function ",className,"_transpose(",args,"){var a=this.shape,b=this.stride;return new ", className, "(this.data,", tShape.join(","), ",", tStride.join(","), ",this.offset)}"].join(""))
  
  //view.pick():
  code.push(["proto.pick=function ",className,"_pick(",args,"){var a=[],b=[],c=this.offset"].join(""))
  for(var i=0; i<dimension; ++i) {
    code.push(["if(typeof i",i,"==='number'&&i",i,">=0){c=(c+this._stride",i,"*i",i,")|0}else{a.push(this._shape",i,");b.push(this._stride",i,")}"].join(""))
  }
  code.push("var ctor=CTOR_LIST[a.length];return ctor(this.data,a,b,c)}")
    
  //Add return statement
  code.push(["return function construct_",className,"(data,shape,stride,offset){return new ", className,"(data,",
    indices.map(function(i) {
      return "shape["+i+"]"
    }).join(","), ",",
    indices.map(function(i) {
      return "stride["+i+"]"
    }).join(","), ",offset)}"].join(""))
  
  //Compile procedure
  var procedure = new Function("CTOR_LIST", "ORDER", code.join("\n"))
  return procedure(CACHED_CONSTRUCTORS[dtype], order)
}

function arrayDType(data) {
  if(data instanceof Float64Array) {
    return "float64";
  } else if(data instanceof Float32Array) {
    return "float32"
  } else if(data instanceof Int32Array) {
    return "int32"
  } else if(data instanceof Uint32Array) {
    return "uint32"
  } else if(data instanceof Uint8Array) {
    return "uint8"
  } else if(data instanceof Uint16Array) {
    return "uint16"
  } else if(data instanceof Int16Array) {
    return "int16"
  } else if(data instanceof Int8Array) {
    return "int8"
  } else if(data instanceof Array) {
    return "array"
  }
  return "generic"
}

var CACHED_CONSTRUCTORS = {
  "float32":[],
  "float64":[],
  "int8":[],
  "int16":[],
  "int32":[],
  "uint8":[],
  "uint16":[],
  "uint32":[],
  "array":[],
  "generic":[]
}

function wrappedNDArrayCtor(data, shape, stride, offset) {
  if(shape === undefined) {
    shape = [ data.length ]
  }
  var d = shape.length
  if(stride === undefined) {
    stride = new Array(d)
    for(var i=d-1, sz=1; i>=0; --i) {
      stride[i] = sz
      sz *= shape[i]
    }
  }
  if(offset === undefined) {
    offset = 0
    for(var i=0; i<d; ++i) {
      if(stride[i] < 0) {
        offset -= (shape[i]-1)*stride[i]
      }
    }
  }
  var dtype = arrayDType(data)
  var ctor_list = CACHED_CONSTRUCTORS[dtype]
  while(ctor_list.length <= d) {
    ctor_list.push(compileConstructor(dtype, ctor_list.length))
  }
  var ctor = ctor_list[d]
  return ctor(data, shape, stride, offset)
}

module.exports = wrappedNDArrayCtor
},{"iota-array":32}],32:[function(require,module,exports){
"use strict"

function iota(n) {
  var result = new Array(n)
  for(var i=0; i<n; ++i) {
    result[i] = i
  }
  return result
}

module.exports = iota
},{}],33:[function(require,module,exports){
exports.Parser = require('./src/Parser');

},{"./src/Parser":106}],34:[function(require,module,exports){
var global=self;/**
 * @constructor
 */
global.AdditionalLayerInfo = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {string} */
  this.signature;
  /** @type {string} */
  this.key;
  /** @type {!(Array.<number>|Uint8Array)} */
  this.data;
  /** @type {{parse: function(StreamReader, number, Header)}} */
  this.info;
};

/**
 * @param {StreamReader} stream
 * @param {Header} header
 */
AdditionalLayerInfo.prototype.parse = function(stream, header) {
  /** @type {number} */
  var length;

  this.offset = stream.tell();
  this.signature = stream.readString(4);
  this.key = stream.readString(4);
  length = stream.readUint32();
  this.length = length + 12;

  // 実装されている key の場合はパースを行う
  // 各 key の実装は AdditionaLayerInfo ディレクトリにある
  if (typeof AdditionalLayerInfo[this.key] === 'function') {
    this.info = new (AdditionalLayerInfo[this.key])();
    this.info.parse(stream, length, header);
  } else {
    console.log('additional layer information: not implemented', this.key);
  }

  // error check
  if (stream.tell() - (this.offset + this.length) !== 0) {
    if (!COMPILED) {
      //   console.log(stream.fetch(stream.tell(), (this.offset + this.length)), this.offset + this.length);
      console.log(this.key, stream.tell() - (this.offset + this.length));
    }
  }

  stream.seek(this.offset + this.length, 0);
};


module.exports = AdditionalLayerInfo;


require('./AdditionalLayerInfo/EffectsLayer');

require('./AdditionalLayerInfo/Patt.js')
require('./AdditionalLayerInfo/SoLd.js')
require('./AdditionalLayerInfo/fxrp.js')
require('./AdditionalLayerInfo/knko.js')
require('./AdditionalLayerInfo/lnsr.js')
require('./AdditionalLayerInfo/lspf.js')
require('./AdditionalLayerInfo/lyvr.js')
require('./AdditionalLayerInfo/EffectsLayer.js')
require('./AdditionalLayerInfo/PlLd.js')
require('./AdditionalLayerInfo/TySh.js')
require('./AdditionalLayerInfo/iOpa.js')
require('./AdditionalLayerInfo/lclr.js')
require('./AdditionalLayerInfo/lrFX.js')
require('./AdditionalLayerInfo/luni.js')
require('./AdditionalLayerInfo/shmd.js')
require('./AdditionalLayerInfo/GdFl.js')
require('./AdditionalLayerInfo/SoCo.js')
require('./AdditionalLayerInfo/clbl.js')
require('./AdditionalLayerInfo/infx.js')
require('./AdditionalLayerInfo/lfx2.js')
require('./AdditionalLayerInfo/lsct.js')
require('./AdditionalLayerInfo/lyid.js')
require('./AdditionalLayerInfo/vmsk.js')
},{"./AdditionalLayerInfo/EffectsLayer":35,"./AdditionalLayerInfo/EffectsLayer.js":35,"./AdditionalLayerInfo/GdFl.js":43,"./AdditionalLayerInfo/Patt.js":44,"./AdditionalLayerInfo/PlLd.js":45,"./AdditionalLayerInfo/SoCo.js":46,"./AdditionalLayerInfo/SoLd.js":47,"./AdditionalLayerInfo/TySh.js":48,"./AdditionalLayerInfo/clbl.js":49,"./AdditionalLayerInfo/fxrp.js":50,"./AdditionalLayerInfo/iOpa.js":51,"./AdditionalLayerInfo/infx.js":52,"./AdditionalLayerInfo/knko.js":53,"./AdditionalLayerInfo/lclr.js":54,"./AdditionalLayerInfo/lfx2.js":55,"./AdditionalLayerInfo/lnsr.js":56,"./AdditionalLayerInfo/lrFX.js":57,"./AdditionalLayerInfo/lsct.js":58,"./AdditionalLayerInfo/lspf.js":59,"./AdditionalLayerInfo/luni.js":60,"./AdditionalLayerInfo/lyid.js":61,"./AdditionalLayerInfo/lyvr.js":62,"./AdditionalLayerInfo/shmd.js":63,"./AdditionalLayerInfo/vmsk.js":64}],35:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');

AdditionalLayerInfo.EffectsLayer = {};

require('./EffectsLayer/bevl.js')
require('./EffectsLayer/cmnS.js')
require('./EffectsLayer/dsdw.js')
require('./EffectsLayer/iglw.js')
require('./EffectsLayer/isdw.js')
require('./EffectsLayer/oglw.js')
require('./EffectsLayer/sofi.js')
},{"../AdditionalLayerInfo":34,"./EffectsLayer/bevl.js":36,"./EffectsLayer/cmnS.js":37,"./EffectsLayer/dsdw.js":38,"./EffectsLayer/iglw.js":39,"./EffectsLayer/isdw.js":40,"./EffectsLayer/oglw.js":41,"./EffectsLayer/sofi.js":42}],36:[function(require,module,exports){
var EffectsLayer = require('../EffectsLayer');

/**
 * @constructor
 */
AdditionalLayerInfo.EffectsLayer['bevl'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.size;
  /** @type {number} */
  this.version;
  /** @type {number} */
  this.angle;
  /** @type {number} */
  this.strength;
  /** @type {number} */
  this.blur;
  /** @type {string} */
  this.highlightBlendModeSignature;
  /** @type {string} */
  this.highlightBlendModeKey;
  /** @type {string} */
  this.shadowBlendModeSignature;
  /** @type {string} */
  this.shadowBlendModeKey;
  /** @type {Array} */
  this.highlightColor;
  /** @type {number} */
  this.bevelStyle;
  /** @type {number} */
  this.highlightOpacity;
  /** @type {number} */
  this.shadowOpacity;
  /** @type {boolean} */
  this.enabled;
  /** @type {boolean} */
  this.use;
  /** @type {boolean} */
  this.up;
  /** @type {Array} */
  this.readHighlightColor;
  /** @type {Array} */
  this.readShadowColor;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo.EffectsLayer['bevl'].prototype.parse = function(stream) {
  this.offset = stream.tell();
  this.size = stream.readUint32();
  this.version = stream.readUint32();

  this.angle = stream.readInt32();
  this.strength = stream.readInt32();
  this.blur = stream.readInt32();

  this.highlightBlendModeSignature = stream.readString(4);
  this.highlightBlendModeKey = stream.readString(4);
  this.shadowBlendModeSignature = stream.readString(4);
  this.shadowBlendModeKey = stream.readString(4);

  stream.seek(2);
  this.highlightColor = [
    stream.readUint32(),
    stream.readUint32()
  ];
  stream.seek(2);
  this.shadowColor = [
    stream.readUint32(),
    stream.readUint32()
  ];

  this.bevelStyle = stream.readUint8();

  this.highlightOpacity = stream.readUint8();
  this.shadowOpacity = stream.readUint8();

  this.enabled = !!stream.readUint8();
  this.use = !!stream.readUint8();
  this.up = !!stream.readUint8();

  // version 2 only
  if (this.version === 2) {
    stream.seek(2);
    this.readHighlightColor = [
      stream.readUint32(),
      stream.readUint32()
    ];

    stream.seek(2);
    this.readShadowColor = [
      stream.readUint32(),
      stream.readUint32()
    ];
  }

  this.length = stream.tell() - this.offset;
};

},{"../EffectsLayer":35}],37:[function(require,module,exports){
var EffectsLayer = require('../EffectsLayer');

/**
 * @constructor
 */
AdditionalLayerInfo.EffectsLayer['cmnS'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.size;
  /** @type {number} */
  this.version;
  /** @type {boolean} */
  this.visible;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo.EffectsLayer['cmnS'].prototype.parse = function(stream) {
  this.offset = stream.tell();
  this.size = stream.readUint32();
  this.version = stream.readUint32();

  this.visible = !!stream.readUint8();

  // unused
  stream.seek(2);

  this.length = stream.tell() - this.offset;
};

},{"../EffectsLayer":35}],38:[function(require,module,exports){
var EffectsLayer = require('../EffectsLayer');

/**
 * @constructor
 */
AdditionalLayerInfo.EffectsLayer['dsdw'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.size;
  /** @type {number} */
  this.version;
  /** @type {number} */
  this.blur;
  /** @type {number} */
  this.intensity;
  /** @type {number} */
  this.angle;
  /** @type {number} */
  this.distance;
  /** @type {Array} */
  this.color;
  /** @type {string} */
  this.signature;
  /** @type {string} */
  this.blend;
  /** @type {boolean} */
  this.enabled;
  /** @type {boolean} */
  this.use;
  /** @type {number} */
  this.opacity;
  /** @type {Array} */
  this.nativeColor;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo.EffectsLayer['dsdw'].prototype.parse = function(stream) {
  this.offset = stream.tell();
  this.size = stream.readUint32();
  this.version = stream.readUint32();

  this.blur = stream.readInt32();
  this.intensity = stream.readInt32();
  this.angle = stream.readInt32();
  this.distance = stream.readInt32();

  stream.seek(2);
  this.color = [
    stream.readUint32(),
    stream.readUint32()
  ];

  this.signature = stream.readString(4);
  this.blend = stream.readString(4);

  this.enabled = !!stream.readUint8();
  this.use = !!stream.readUint8();

  this.opacity = stream.readUint8();

  stream.seek(2);
  this.nativeColor = [
    stream.readUint32(),
    stream.readUint32()
  ];

  this.length = stream.tell() - this.offset;
};

},{"../EffectsLayer":35}],39:[function(require,module,exports){
var EffectsLayer = require('../EffectsLayer');

/**
 * @constructor
 */
AdditionalLayerInfo.EffectsLayer['iglw'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.size;
  /** @type {number} */
  this.version;
  /** @type {number} */
  this.blur;
  /** @type {number} */
  this.intensity;
  /** @type {Array} */
  this.color;
  /** @type {string} */
  this.signature;
  /** @type {string} */
  this.blend;
  /** @type {boolean} */
  this.enabled;
  /** @type {number} */
  this.opacity;
  /** @type {boolean} */
  this.invert;
  /** @type {Array} */
  this.nativeColor;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo.EffectsLayer['iglw'].prototype.parse = function(stream) {
  this.offset = stream.tell();
  this.size = stream.readUint32();
  this.version = stream.readUint32();

  this.blur = stream.readInt32();
  this.intensity = stream.readInt32();

  stream.seek(2);
  this.color = [
    stream.readUint32(),
    stream.readUint32()
  ];

  this.signature = stream.readString(4);
  this.blend = stream.readString(4);
  this.enabled = !!stream.readUint8();
  this.opacity = stream.readUint8();

  // version 2 only
  if (this.version === 2) {
    this.invert = !!stream.readUint8();

    stream.seek(2);
    this.nativeColor = [
      stream.readUint32(),
      stream.readUint32()
    ];
  }

  this.length = stream.tell() - this.offset;
};

},{"../EffectsLayer":35}],40:[function(require,module,exports){
var EffectsLayer = require('../EffectsLayer');

AdditionalLayerInfo.EffectsLayer['isdw'] =
AdditionalLayerInfo.EffectsLayer['dsdw'];

},{"../EffectsLayer":35}],41:[function(require,module,exports){
var EffectsLayer = require('../EffectsLayer');

/**
 * @constructor
 */
AdditionalLayerInfo.EffectsLayer['oglw'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.size;
  /** @type {number} */
  this.version;
  /** @type {number} */
  this.blur;
  /** @type {number} */
  this.intensity;
  /** @type {Array} */
  this.color;
  /** @type {string} */
  this.signature;
  /** @type {string} */
  this.blend;
  /** @type {boolean} */
  this.enabled;
  /** @type {number} */
  this.opacity;
  /** @type {Array} */
  this.nativeColor;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo.EffectsLayer['oglw'].prototype.parse = function(stream) {
  this.offset = stream.tell();
  this.size = stream.readUint32();
  this.version = stream.readUint32();

  this.blur = stream.readInt32();
  this.intensity = stream.readInt32();

  stream.seek(2);
  this.color = [
    stream.readUint32(),
    stream.readUint32()
  ];

  this.signature = stream.readString(4);
  this.blend = stream.readString(4);
  this.enabled = !!stream.readUint8();
  this.opacity = stream.readUint8();

  // version 2 only
  if (this.version === 2) {
    stream.seek(2);
    this.nativeColor = [
      stream.readUint32(),
      stream.readUint32()
    ];
  }

  this.length = stream.tell() - this.offset;
};

},{"../EffectsLayer":35}],42:[function(require,module,exports){
var EffectsLayer = require('../EffectsLayer');

/**
 * @constructor
 */
AdditionalLayerInfo.EffectsLayer['sofi'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.size;
  /** @type {number} */
  this.version;
  /** @type {string} */
  this.blend;
  /** @type {Array} */
  this.color;
  /** @type {number} */
  this.opacity;
  /** @type {boolean} */
  this.enabled;
  /** @type {Array} */
  this.nativeColor;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo.EffectsLayer['sofi'].prototype.parse = function(stream) {
  /** @type {string} */
  var signature;

  this.offset = stream.tell();
  this.size = stream.readUint32();
  this.version = stream.readUint32();

  signature = stream.readString(4);
  if (signature !== '8BIM') {
    throw new Error('invalid signature:', signature);
  }

  this.blend = stream.readString(4);

  // ARGB
  stream.seek(2);
  this.color = [
    stream.readUint16() >> 8,
    stream.readUint16() >> 8,
    stream.readUint16() >> 8,
    stream.readUint16() >> 8
  ];

  this.opacity = stream.readUint8();
  this.enabled = !!stream.readUint8();

  // ARGB
  stream.seek(2);
  this.nativeColor = [
    stream.readInt16() >> 8,
    stream.readInt16() >> 8,
    stream.readInt16() >> 8,
    stream.readInt16() >> 8
  ];

  this.length = stream.tell() - this.offset;
};

},{"../EffectsLayer":35}],43:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo')
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
AdditionalLayerInfo['GdFl'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.version;
  /** @type {*} */
  this.descriptor;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo['GdFl'].prototype.parse = function(stream) {
  this.offset = stream.tell();

  this.version = stream.readUint32();
  this.descriptor = new Descriptor();
  this.descriptor.parse(stream);

  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34,"../Descriptor":73}],44:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');
var ColorMode = require('../ColorMode');

/**
 * @constructor
 */
AdditionalLayerInfo['Patt'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  // TODO: pattern は専用のオブジェクト化する
  /** @type {Array.<Object>} */
  this.pattern;
};

/**
 * @param {StreamReader} stream
 * @param {number} length
 * @param {Header} header
 */
AdditionalLayerInfo['Patt'].prototype.parse = function(stream, length, header) {
  /** @type {number} */
  var limit = stream.tell() + length;
  /** @type {number} */
  var patternLength;
  /** @type {number} */
  var version;
  /** @type {number} */
  var mode;
  /** @type {number} */
  var vertical;
  /** @type {number} */
  var horizontal;
  /** @type {string} */
  var name;
  /** @type {string} */
  var id;
  /** @type {!(Array.<number>|Uint8Array)} */
  var colorTable;
  /** @type {*} TODO */
  var patternData;

  this.offset = stream.tell();

  // TODO
  // 現在 Patt は長さが 0 のものしか見つかっていない
  // 実際に動作するかどうかは確認する必要がある
  while (stream.tell() < limit) {
    patternLength = stream.readUint32();
    version = stream.readUint32();
    mode = stream.readInt32();
    vertical = stream.readInt16(); // TODO: 確認
    horizontal = stream.readInt16(); // TODO: 確認
    name = stream.readWideString(stream.readUint32());
    id = stream.readPascalString();

    if (header.colorMode === ColorMode.INDEXED_COLOR) {
      colorTable = stream.read(256*3);
    }

    // TODO: 現在は何もしていない, Virtural Memory Array List
    patternData = stream.read(limit - this.offset);
  }

  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34,"../ColorMode":70}],45:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
AdditionalLayerInfo['PlLd'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {string} */
  this.type;
  /** @type {number} */
  this.version;
  /** @type {string} */
  this.id;
  /** @type {number} */
  this.page;
  /** @type {number} */
  this.totalPage;
  /** @type {number} */
  this.antiAlias;
  /** @type {number} */
  this.placedLayerType;
  /** @type {Array.<number>} */
  this.transform;
  /** @type {number} */
  this.warpVersion;
  /** @type {number} */
  this.warpDescriptorVersion;
  /** @type {Descriptor} */
  this.descriptor;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo['PlLd'].prototype.parse = function(stream) {
  this.offset = stream.tell();

  this.type = stream.readString(4);
  if (this.type !== 'plcL') {
    throw new Error('invalid type:', this.type);
  }

  this.version = stream.readUint32();
  this.id = stream.readPascalString();
  this.page = stream.readInt32();
  this.totalPage = stream.readInt32();
  this.antiAlias = stream.readInt32();
  this.placedLayerType = stream.readInt32();
  this.transform = [
    stream.readFloat64(), stream.readFloat64(),
    stream.readFloat64(), stream.readFloat64(),
    stream.readFloat64(), stream.readFloat64(),
    stream.readFloat64(), stream.readFloat64()
  ];
  this.warpVersion = stream.readInt32();
  this.warpDescriptorVersion = stream.readInt32();
  this.descriptor = new Descriptor();
  this.descriptor.parse(stream);

  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34,"../Descriptor":73}],46:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
AdditionalLayerInfo['SoCo'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.version;
  /** @type {*} */
  this.descriptor;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo['SoCo'].prototype.parse = function(stream) {
  this.offset = stream.tell();

  this.version = stream.readUint32();
  this.descriptor = new Descriptor();
  this.descriptor.parse(stream);

  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34,"../Descriptor":73}],47:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
AdditionalLayerInfo['SoLd'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {string} */
  this.identifier;
  /** @type {number} */
  this.version;
  /** @type {number} */
  this.descriptorVersion;
  /** @type {Descriptor} */
  this.descriptor;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo['SoLd'].prototype.parse = function(stream) {
  this.offset = stream.tell();

  this.identifier = stream.readString(4);
  if (this.identifier !== 'soLD') {
    throw new Error('invalid identifier:', this.identifier);
  }

  this.version = stream.readUint32();
  this.descriptorVersion = stream.readInt32();
  this.descriptor = new Descriptor();
  this.descriptor.parse(stream);

  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34,"../Descriptor":73}],48:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
AdditionalLayerInfo['TySh'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.version;
  /** @type {Array.<number>} */
  this.transform;
  /** @type {number} */
  this.textVersion;
  /** @type {number}*/
  this.textDescriptorVersion;
  /** @type {Descriptor} */
  this.textData;
  /** @type {number} */
  this.warpVersion;
  /** @type {number} */
  this.warpDescriptorVersion;
  /** @type {Descriptor} */
  this.warpData;
  /** @type {!(Array.<number>|Uint8Array)} */
  this.left;
  /** @type {!(Array.<number>|Uint8Array)} */
  this.top;
  /** @type {!(Array.<number>|Uint8Array)} */
  this.right;
  /** @type {!(Array.<number>|Uint8Array)} */
  this.bottom;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo['TySh'].prototype.parse = function(stream) {
  this.offset = stream.tell();

  this.version = stream.readInt16();
  this.transform = [
    stream.readFloat64(), // xx
    stream.readFloat64(), // xy
    stream.readFloat64(), // yx
    stream.readFloat64(), // yy
    stream.readFloat64(), // tx
    stream.readFloat64()  // ty
  ];

  this.textVersion = stream.readInt16();
  this.textDescriptorVersion = stream.readInt32();
  this.textData = new Descriptor();
  this.textData.parse(stream);

  // parse failure
  if (this.textData.items !== this.textData.item.length) {
    console.log('Descriptor parsing failed');
    return;
  }

  this.warpVersion = stream.readInt16();
  this.warpDescriptorVersion = stream.readInt32();
  this.warpData = new Descriptor();
  this.warpData.parse(stream);


  // TODO: 4 Byte * 4?
  console.log('TySh implementation is incomplete');
  this.left = stream.readInt32();
  this.top = stream.readInt32();
  this.right = stream.readInt32();
  this.bottom = stream.readInt32();

  /*
  this.left = stream.readFloat64();
  this.top = stream.readFloat64();
  this.right = stream.readFloat64();
  this.bottom = stream.readFloat64();

  stream.seek(-32);
  console.log('64 or 32:',
    this.left,
    this.top,
    this.right,
    this.bottom,
    stream.readInt32(),
    stream.readInt32(),
    stream.readInt32(),
    stream.readInt32()
  );
   */

  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34,"../Descriptor":73}],49:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');

/**
 * @constructor
 */
AdditionalLayerInfo['clbl'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {boolean} */
  this.blendClippedElements;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo['clbl'].prototype.parse = function(stream) {
  this.offset = stream.tell();

  this.blendClippedElements = !!stream.readUint8();

  // padding
  stream.seek(3);

  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34}],50:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');

/**
 * @constructor
 */
AdditionalLayerInfo['fxrp'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {Array.<*>} */
  this.referencePoint;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo['fxrp'].prototype.parse = function(stream) {
  this.offset = stream.tell();

  // TODO: decode double
  this.referencePoint = [
    stream.readFloat64(),
    stream.readFloat64()
  ];

  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34}],51:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');

/**
 * @constructor
 */
AdditionalLayerInfo['iOpa'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} TODO: 公式の仕様？ */
  this.opacity;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo['iOpa'].prototype.parse = function(stream) {
  this.offset = stream.tell();

  // TODO: おそらく 1 Byte で Opacity を表していて残りはパディングだと思われる
  // console.log('iOpa:', stream.fetch(stream.tell(), stream.tell()+4));
  this.opacity= stream.readUint8();
  stream.seek(3);

  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34}],52:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');

/**
 * @constructor
 */
AdditionalLayerInfo['infx'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {boolean} */
  this.blendInteriorElements;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo['infx'].prototype.parse = function(stream) {
  this.offset = stream.tell();

  this.blendInteriorElements = !!stream.readUint8();

  // padding
  stream.seek(3);

  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34}],53:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');

/**
 * @constructor
 */
AdditionalLayerInfo['knko'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {boolean} */
  this.knockout;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo['knko'].prototype.parse = function(stream) {
  this.offset = stream.tell();

  this.knockout = !!stream.readUint8();

  // padding
  stream.seek(3);

  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34}],54:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');

/**
 * @constructor
 */
AdditionalLayerInfo['lclr'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {Array.<number>} */
  this.color;
  // TODO: flags のパースも行う
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo['lclr'].prototype.parse = function(stream) {
  this.offset = stream.tell();
  this.color = [
    stream.readUint32(),
    stream.readUint32()
  ];
  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34}],55:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
AdditionalLayerInfo['lfx2'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.version;
  /** @type {number} */
  this.descriptorVersion;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo['lfx2'].prototype.parse = function(stream) {
  this.offset = stream.tell();

  this.version = stream.readUint32();
  this.descriptorVersion = stream.readUint32();
  this.descriptor = new Descriptor();
  this.descriptor.parse(stream);

  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34,"../Descriptor":73}],56:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');

/**
 * @constructor
 */
AdditionalLayerInfo['lnsr'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {string} */
  this.id;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo['lnsr'].prototype.parse = function(stream) {
  this.offset = stream.tell();
  this.id = stream.readString(4);
  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34}],57:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');

/**
 * @constructor
 */
AdditionalLayerInfo['lrFX'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.version;
  /** @type {number} */
  this.count;
  /** @type {Array.<Object>} */
  this.effect;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo['lrFX'].prototype.parse = function(stream) {
  /** @type {string} */
  var signature;
  /** @type {string} */
  var key;
  /** @type {{parse: function(StreamReader)}} */
  var effect;
  /** @type {number} */
  var i;

  this.offset = stream.tell();

  this.version = stream.readUint16();
  this.count = stream.readUint16();
  this.effect = [];

  for (i = 0; i < this.count; ++i) {
    // signature
    signature = stream.readString(4);
    if (signature !== '8BIM') {
      console.log('invalid signature:', signature);
      break;
    }

    this.key = key = stream.readString(4);
    if (typeof AdditionalLayerInfo.EffectsLayer[this.key] === 'function') {
      effect = new (AdditionalLayerInfo.EffectsLayer[this.key])();
      effect.parse(stream);
      this.effect[i] = {
        key: key,
        effect: effect
      };
    } else {
      console.log('detect unknown key:', key);
      break;
    }
  }

  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34}],58:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');

/**
 * @constructor
 */
AdditionalLayerInfo['lsct'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.type;
  /** @type {string} */
  this.key;
};

/**
 * @param {StreamReader} stream
 * @param {number} length
 */
AdditionalLayerInfo['lsct'].prototype.parse = function(stream, length) {
  /** @type {string} */
  var signature;

  this.offset = stream.tell();
  this.type = stream.readUint32();

  if (length === 12) {
    signature = stream.readString(4);
    if (signature !== '8BIM') {
      throw new Error('invalid section divider setting signature:', signature);
    }

    this.key = stream.readString(4);
  }

  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34}],59:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');

/**
 * @constructor
 */
AdditionalLayerInfo['lspf'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.flags;
  // TODO: flags のパースも行う
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo['lspf'].prototype.parse = function(stream) {
  this.offset = stream.tell();
  this.flags = stream.readUint32();
  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34}],60:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');

/**
 * @constructor
 */
AdditionalLayerInfo['luni'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {string} */
  this.layerName;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo['luni'].prototype.parse = function(stream) {
  /** @type {number} */
  var length;

  this.offset = stream.tell();
  length = stream.readUint32();
  this.layerName = stream.readWideString(length);

  // NOTE: length が奇数の時はパディングがはいる
  if ((length & 1) === 1) {
    stream.seek(2);
  }

  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34}],61:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');

/**
 * @constructor
 */
AdditionalLayerInfo['lyid'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.layerId;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo['lyid'].prototype.parse = function(stream) {
  this.offset = stream.tell();

  this.layerId = stream.readUint32();

  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34}],62:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo')

/**
 * @constructor
 */
AdditionalLayerInfo['lyvr'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.version;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo['lyvr'].prototype.parse = function(stream) {
  this.offset = stream.tell();

  this.version = stream.readUint32();

  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34}],63:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');

/**
 * @constructor
 */
AdditionalLayerInfo['shmd'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.items;
  /** @type {Array.<Object>} */
  this.metadata;
};

/**
 * @param {StreamReader} stream
 */
AdditionalLayerInfo['shmd'].prototype.parse = function(stream) {
  /** @type {string} */
  var signature;
  /** @type {string} */
  var key;
  /** @type {number} */
  var copy;
  /** @type {number} */
  var length;
  /** @type {!(Array.<number>|Uint8Array)} */
  var data;
  /** @type {Array.<Object>} */
  var metadata = this.metadata = [];
  /** @type {number} */
  var i;
  /** @type {number} */
  var il;

  this.offset = stream.tell();

  this.items = stream.readUint32();

  for (i = 0, il = this.items; i < il; ++i) {
    signature = stream.readString(4);
    key = stream.readString(4);
    copy = stream.readUint8();
    stream.seek(3); // padding
    length = stream.readUint32();
    data = stream.read(length);

    // TODO: オブジェクトではなく型をつくる
    metadata[i] = {
      signature: signature,
      key: key,
      copy: copy,
      data: data
    };
  }

  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34}],64:[function(require,module,exports){
var AdditionalLayerInfo = require('../AdditionalLayerInfo');
var PathRecord = require('../PathRecord');

/**
 * @constructor
 */
AdditionalLayerInfo['vmsk'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.version;
};

/**
 * @param {StreamReader} stream
 * @param {number} length
 */
AdditionalLayerInfo['vmsk'].prototype.parse = function(stream, length) {
  /** @type {number} */
  var limit = stream.tell() + length;

  this.offset = stream.tell();
  this.version = stream.readUint32();
  this.flags = stream.readUint32();

  while (stream.tell() + 26 <= limit) {
    this.path = new PathRecord();
    this.path.parse(stream);
  }

  this.length = stream.tell() - this.offset;
};

},{"../AdditionalLayerInfo":34,"../PathRecord":107}],65:[function(require,module,exports){
/**
 * @constructor
 */
var ChannelImage = function() {
  /** @type {!(Array.<number>|Uint8Array)} */
  this.channel;
};

/**
 * @param {StreamReader} stream
 * @param {LayerRecord} layerRecord
 * @param {number} length
 */
ChannelImage.prototype.parse = function() { throw("abstract"); };

module.exports = ChannelImage;

},{}],66:[function(require,module,exports){
var StreamReader = require('./StreamReader');
var CompressionMethod = require('./CompressionMethod');
var ChannelRAW   = require('./ChannelRaw');
var ChannelRLE   = require('./ChannelRLE');

/**
 * @constructor
 */
var ChannelImageData = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {Array.<ChannelImage>} */
  this.channel;
};

/**
 * @param {StreamReader} stream
 * @param {LayerRecord} layerRecord
 */
ChannelImageData.prototype.parse = function(stream, layerRecord) {
  /** @type {Array.<ChannelImage>} */
  var channels = this.channel = [];
  /** @type {ChannelImage} */
  var channel;
  /** @type {CompressionMethod} */
  var compressionMethod;
  /** @type {number} */
  var i;
  /** @type {number} */
  var il;
  /** @type {number} */
  var pos;
  /** @type {Object} */
  var info;

  this.offset = stream.tell();

  for (i = 0, il = layerRecord.channels; i < il; ++i) {
    pos = stream.tell();
    info = layerRecord.info[i];

    compressionMethod =
      /** @type {CompressionMethod} */
      stream.readUint16();

    if (info.length === 2) {
      continue;
    }

    switch (compressionMethod) {
      case CompressionMethod.RAW:
        channel = new ChannelRAW();
        break;
      case CompressionMethod.RLE:
        channel = new ChannelRLE();
        break;
      default:
        throw new Error('unknown compression method: ' + compressionMethod);
    }
    channel.parse(stream, layerRecord, info.length - 2);

    channels[i] = channel;
    stream.seek(info.length + pos, 0);
  }

  this.length = stream.tell() - this.offset;
};

/**
 * @param {LayerRecord} layerRecord
 * @param {ColorModeData} colorModeData
 * @return {HTMLCanvasElement}
 */
ChannelImageData.prototype.createCanvas = function(header, colorModeData, layerRecord) {
  /** @type {HTMLCanvasElement} */
  var canvas =
    /** @type {HTMLCanvasElement} */
    document.createElement('canvas');
  /** @type {CanvasRenderingContext2D} */
  var ctx =
    /** @type {CanvasRenderingContext2D} */
    canvas.getContext('2d');
  /** @type {number} */
  var width = canvas.width = (layerRecord.right - layerRecord.left);
  /** @type {number} */
  var height = canvas.height = (layerRecord.bottom - layerRecord.top);
  /** @type {ImageData} */
  var imageData;
  /** @type {(Uint8ClampedArray|CanvasPixelArray)} */
  var pixelArray;
  /** @type {number} */
  var x;
  /** @type {number} */
  var y;
  /** @type {number} */
  var index;
  /** @type {Array.<(ChannelRAW|ChannelRLE)>} */
  var channels = this.channel;
  /** @type {Array} */
  var channel = [];
  /** @type {number} */
  var i;
  /** @type {number} */
  var il;
  /** @type {Array.<!(Array.<number>|Uint8Array)>} */
  var color;
  /** @type {!(Array.<number>|Uint8Array)} */
  var alpha;
  /** @type {!(Array.<number>|Uint8Array)} */
  var mask;


  if (width === 0 || height === 0) {
    return null;
  }

  imageData = ctx.createImageData(width, height);
  pixelArray = imageData.data;
  for (i = 0, il = channels.length; i < il; ++i) {
    switch (layerRecord.info[i].id) {
      case 0: // r c
      case 1: // g m
      case 2: // b y
      case 3: //   k
        channel[layerRecord.info[i].id] = channels[i].channel;
        break;
      case -1: // alpha
        alpha = channels[i].channel;
        break;
      case -2:
        mask = channels[i].channel;
        break;
      default:
        console.log("not supported channel id", layerRecord.info[i].id);
        continue;
    }
  }

  if (alpha) {
    channel.push(alpha);
  }
  color = new Color(header, colorModeData, channel).toRGBA();

  for (y = 0; y < height; ++y) {
    for (x = 0; x < width; ++x) {
      index = (y * width + x);
      pixelArray[index * 4 + 0] = color[0][index];
      pixelArray[index * 4 + 1] = color[1][index];
      pixelArray[index * 4 + 2] = color[2][index];
      if (mask) {
        pixelArray[index * 4 + 3] = (mask[index] / 255) * (color[3] ? color[3][index] : 255);
      } else {
        pixelArray[index * 4 + 3] = color[3] ? color[3][index] : 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
};

module.exports = ChannelImageData;

},{"./ChannelRLE":67,"./ChannelRaw":68,"./CompressionMethod":72,"./StreamReader":108}],67:[function(require,module,exports){
var util = require('util');

var ChannelImage = require('./ChannelImage');
var StreamReader = require('./StreamReader');
var LayerRecord = require('./LayerRecord');


/**
 * @constructor
 * @extends {ChannelImage}
 */
var ChannelRLE = function() {
  /** @type {Array.<number>} */
  this.lineLength;
};

util.inherits(ChannelRLE, ChannelImage);

/**
 * @param {StreamReader} stream
 * @param {LayerRecord} layerRecord
 * @param {number} length
 */
ChannelRLE.prototype.parse = function(stream, layerRecord, length) {
  /** @type {number} */
  var i;
  /** @type {Array.<number>} */
  var lineLength = this.lineLength = [];
  /** @type {Array} */
  var lines = [];
  /** @type {number} */
  var height = layerRecord.bottom - layerRecord.top;
  /** @type {number} */
  var limit = stream.tell() + length;
  /** @type {number} */
  var size = 0;
  /** @type {number} */
  var pos;

  // line lengths
  for (i = 0; i < height; ++i) {
    lineLength[i] = stream.readUint16();
  }

  // channel data
  for (i = 0; i < height; ++i) {
    lines[i] = stream.readPackBits(lineLength[i]);
    size += lines[i].length;
    // TODO: avoid invalid height
    if (stream.tell() >= limit) {
      break;
    }
  }

  // concatenation
  if (USE_TYPEDARRAY) {
    this.channel = new Uint8Array(size);
    for (i = 0, pos = 0, height = lines.length; i < height; ++i) {
      this.channel.set(lines[i], pos);
      pos += lines[i].length;
    }
  } else {
    this.channel = Array.prototype.concat.apply([], lines);
  }
};

module.exports = ChannelRLE;

},{"./ChannelImage":65,"./LayerRecord":105,"./StreamReader":108,"util":121}],68:[function(require,module,exports){
var util = require('util');

var ChannelImage = require('./ChannelImage');
var StreamReader = require('./StreamReader');
var LayerRecord = require('./LayerRecord');

/**
 * @Constructor
 * @extends {ChannelImage}
 */
var ChannelRAW = function() {
  ChannelImage.call(this);
};
util.inherits(ChannelRAW, ChannelImage);

/**
 * @param {StreamReader} stream
 * @param {LayerRecord} layerRecord
 * @param {number} length
 */
ChannelRAW.prototype.parse = function(stream, layerRecord, length) {
  /** @type {number} */
  var width = layerRecord.right - layerRecord.left;
  /** @type {number} */
  var height = layerRecord.bottom - layerRecord.top;

  //this.channel = stream.read(width * height);
  this.channel = stream.read(length);
};

module.exports = ChannelRAW;

},{"./ChannelImage":65,"./LayerRecord":105,"./StreamReader":108,"util":121}],69:[function(require,module,exports){
var Header = require('./Header');
var ColorMode = require('./ColorMode');

/**
 * @param {Header} header
 * @param {ColorModeData} colorModeData
 * @param {Array} channels
 * @constructor
 */
var Color = function(header, colorModeData, channels) {
  /** @type {Header} */
  this.header = header;
  /** @type {ColorModeData} */
  this.colorModeData = colorModeData;
  /** @type {Array} */
  this.channel = channels;
  /** @type {boolean} */
  this.parsed = false;
  /** @type {!(Array.<number>|Uint8Array)} */
  this.redChannel;
  /** @type {!(Array.<number>|Uint8Array)} */
  this.greenChannel;
  /** @type {!(Array.<number>|Uint8Array)} */
  this.blueChannel;
  /** @type {!(Array.<number>|Uint8Array)} */
  this.alphaChannel;
};

Color.prototype.parse = function() {
  switch (this.header.colorMode) {
    case ColorMode.BITMAP:
      console.log('bitmap color mode not supported');
      break;
    case ColorMode.DUOTONE:
      console.log('duotone color mode implementation is incomplete');
      /* FALLTHROUGH */
    case ColorMode.GRAYSCALE:
      this.fromGrayscale();
      break;
    case ColorMode.INDEXED_COLOR:
      this.fromIndexedColor();
      break;
    case ColorMode.MULTICHANNEL_COLOR:
      console.log('multichannel color mode implementation is incomplete');
      /* FALLTHROUGH */
    case ColorMode.RGB_COLOR:
      this.fromRGB();
      break;
    case ColorMode.CMYK_COLOR:
      this.fromCMYK();
      break;
    case ColorMode.LAB_COLOR:
      this.fromLAB();
      break;
  }

  this.parsed = true;
};

Color.prototype.fromRGB = function() {
  /** @type {!(Array.<number>|Uint8Array)} */
  var r = this.redChannel   = this.channel[0];
  /** @type {!(Array.<number>|Uint8Array)} */
  var g = this.greenChannel = this.channel[1];
  /** @type {!(Array.<number>|Uint8Array)} */
  var b = this.blueChannel  = this.channel[2];
  /** @type {!(Array.<number>|Uint8Array)} */
  var a;
  /** @type {number} */
  var skip = this.header.depth / 8;
  /** @type {number} */
  var i;
  /** @type {number} */
  var il;
  /** @type {number} */
  var idx;

  if (skip === 1) {
    return;
  }

  if (this.channel.length === 4) {
    a = this.alphaChannel = this.channel[3];
    for (i = idx = 0, il = r.length; i < il; ++idx, i += skip) {
      r[idx] = r[i];
      g[idx] = g[i];
      b[idx] = b[i];
      a[idx] = a[i];
    }
  } else {
    for (i = idx = 0, il = r.length; i < il; ++idx, i += skip) {
      r[idx] = r[i];
      g[idx] = g[i];
      b[idx] = b[i];
    }
  }

  if (USE_TYPEDARRAY) {
    this.redChannel   = r.subarray(0, idx);
    this.greenChannel = g.subarray(0, idx);
    this.blueChannel  = b.subarray(0, idx);
  } else {
    r.length = g.length = b.length = idx;
  }

  if (this.channel.length === 4) {
    if (USE_TYPEDARRAY) {
      this.alphaChannel = a.subarray(0, idx);
    } else {
      a.length = idx;
    }
  }
};

Color.prototype.fromIndexedColor = function() {
  /** @type {!(Array.<number>|Uint8Array)} */
  var indexed = this.channel[0];
  /** @type {number} */
  var i;
  /** @type {number} */
  var il = indexed.length;
  /** @type {number} */
  var idx;
  /** @type {!(Array.<number>|Uint8Array)} */
  var r = this.redChannel   = new (USE_TYPEDARRAY ? Uint8Array : Array)(il);
  /** @type {!(Array.<number>|Uint8Array)} */
  var g = this.greenChannel = new (USE_TYPEDARRAY ? Uint8Array : Array)(il);
  /** @type {!(Array.<number>|Uint8Array)} */
  var b = this.blueChannel  = new (USE_TYPEDARRAY ? Uint8Array : Array)(il);
  /** @type {!(Array.<number>|Uint8Array)} */
  var palette = this.colorModeData.data;
  /** @type {number} */
  var div = palette.length / 3;

  for (i = idx = 0; i < il; ++idx, i += 1) {
    r[idx] = palette[indexed[i]          ];
    g[idx] = palette[indexed[i] + div    ];
    b[idx] = palette[indexed[i] + div * 2];
  }
};

Color.prototype.fromGrayscale = function() {
  /** @type {!(Array.<number>|Uint8Array)} */
  var gray = this.channel[0];
  /** @type {number} */
  var i;
  /** @type {number} */
  var il = gray.length;
  /** @type {!(Array.<number>|Uint8Array)} */
  var r = this.redChannel   = new (USE_TYPEDARRAY ? Uint8Array : Array)(il);
  /** @type {!(Array.<number>|Uint8Array)} */
  var g = this.greenChannel = new (USE_TYPEDARRAY ? Uint8Array : Array)(il);
  /** @type {!(Array.<number>|Uint8Array)} */
  var b = this.blueChannel  = new (USE_TYPEDARRAY ? Uint8Array : Array)(il);
  /** @type {number} */
  var skip = this.header.depth / 8;
  /** @type {number} */
  var idx;

  for (i = idx = 0; i < il; ++idx, i += skip) {
    r[idx] = g[idx] = b[idx] = gray[i];
  }
};

Color.prototype.fromCMYK = function() {
  /** @type {!(Array.<number>|Uint8Array)} */
  var cc = this.channel[0];
  /** @type {!(Array.<number>|Uint8Array)} */
  var mc = this.channel[1];
  /** @type {!(Array.<number>|Uint8Array)} */
  var yc = this.channel[2];
  /** @type {!(Array.<number>|Uint8Array)} */
  var kc = this.channel[3];
  /** @type {number} */
  var i;
  /** @type {number} */
  var il = cc.length;
  /** @type {!(Array.<number>|Uint8Array)} */
  var r = this.redChannel   = new (USE_TYPEDARRAY ? Uint8Array : Array)(il);
  /** @type {!(Array.<number>|Uint8Array)} */
  var g = this.greenChannel = new (USE_TYPEDARRAY ? Uint8Array : Array)(il);
  /** @type {!(Array.<number>|Uint8Array)} */
  var b = this.blueChannel  = new (USE_TYPEDARRAY ? Uint8Array : Array)(il);
  /** @type {number} */
  var c;
  /** @type {number} */
  var m;
  /** @type {number} */
  var y;
  /** @type {number} */
  var k;
  /** @type {number} */
  var skip = this.header.depth / 8;
  /** @type {number} */
  var idx;

  // TODO: Alpha Channel support

  for (i = idx = 0; i < il; ++idx, i += skip) {
    c = 255 - cc[i];
    m = 255 - mc[i];
    y = 255 - yc[i];
    k = 255 - kc[i];
    r[idx] = (65535 - (c * (255 - k) + (k << 8))) >> 8;
    g[idx] = (65535 - (m * (255 - k) + (k << 8))) >> 8;
    b[idx] = (65535 - (y * (255 - k) + (k << 8))) >> 8;
  }
};

Color.prototype.fromLAB = function() {
  /** @type {!(Array.<number>|Uint8Array)} */
  var lc = this.channel[0];
  /** @type {!(Array.<number>|Uint8Array)} */
  var ac = this.channel[1];
  /** @type {!(Array.<number>|Uint8Array)} */
  var bc = this.channel[2];
  /** @type {number} */
  var i;
  /** @type {number} */
  var il = lc.length;
  /** @type {!(Array.<number>|Uint8Array)} */
  var r = this.redChannel   = new (USE_TYPEDARRAY ? Uint8Array : Array)(il);
  /** @type {!(Array.<number>|Uint8Array)} */
  var g = this.greenChannel = new (USE_TYPEDARRAY ? Uint8Array : Array)(il);
  /** @type {!(Array.<number>|Uint8Array)} */
  var b = this.blueChannel  = new (USE_TYPEDARRAY ? Uint8Array : Array)(il);
  var x;
  /** @type {number} */
  var y;
  /** @type {number} */
  var z;
  /** @const @type {number} */
  var Xn = 0.950456;
  /** @type {number} */
  var Yn = 1.0;
  /** @const @type {number} */
  var Zn = 1.088754;
  /** @const @type {number} */
  var delta = 6 / 29;
  /** @type {number} */
  var fy;
  /** @type {number} */
  var fx;
  /** @type {number} */
  var fz;
  /** @type {number} */
  var idx;
  /** @type {number} */
  var skip = this.header.depth / 8;

  // TODO: Alpha Channel support

  for (i = idx = 0; i < il; ++idx, i += skip) {
    // lab to xyz
    //   L: L' * 100 >> 8
    //   a: a' - 128
    //   b: b' - 128
    fy = ((lc[i] * 100 >> 8) + 16) / 116;
    fx = fy + (ac[i] - 128) / 500;
    fz = fy - (bc[i] - 128) / 200;

    x = fx > delta ? Xn * Math.pow(fx, 3) : (fx - 16 / 116) * 3 * Math.pow(delta, 2);
    y = fy > delta ? Yn * Math.pow(fy, 3) : (fy - 16 / 116) * 3 * Math.pow(delta, 2);
    z = fz > delta ? Zn * Math.pow(fz, 3) : (fz - 16 / 116) * 3 * Math.pow(delta, 2);

    // xyz to adobe rgb
    r[idx] = Math.pow( 2.041588 * x - 0.565007 * y - 0.344731 * z, 1/2.2) * 255;
    g[idx] = Math.pow(-0.969244 * x + 1.875968 * y + 0.041555 * z, 1/2.2) * 255;
    b[idx] = Math.pow( 0.013444 * x - 0.118362 * y + 1.015175 * z, 1/2.2) * 255;
  }
};

/**
 * @return {Array.<!(Array.<number>|Uint8Array)>} RGB Channels.
 */
Color.prototype.toRGB = function() {
  if (!this.parsed) {
    this.parse();
  }

  return [
    this.redChannel,
    this.greenChannel,
    this.blueChannel
  ];
};

/**
 * @return {Array.<!(Array.<number>|Uint8Array)>} RGBA Channels.
 */
Color.prototype.toRGBA = function() {
  if (!this.parsed) {
    this.parse();
  }

  return [
    this.redChannel,
    this.greenChannel,
    this.blueChannel,
    this.alphaChannel
  ];
};

module.exports = Color;

},{"./ColorMode":70,"./Header":93}],70:[function(require,module,exports){
/**
 * @enum {number}
 */
var ColorMode = {
  BITMAP: 0,
  GRAYSCALE: 1,
  INDEXED_COLOR: 2,
  RGB_COLOR: 3,
  CMYK_COLOR: 4,
  MULTICHANNEL_COLOR: 7,
  DUOTONE: 8,
  LAB_COLOR: 9
};

module.exports = ColorMode;

},{}],71:[function(require,module,exports){
var StreamReader = require('./StreamReader');
var Header = require('./Header');
var ColorMode = require('./ColorMode');

/**
 * @constructor
 */
var ColorModeData = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {!(Array.<number>|Uint8Array)} */
  this.data;
};

/**
 * @param {StreamReader} stream
 * @param {Header} header
 */
ColorModeData.prototype.parse = function(stream, header) {
  /** @type {number} */
  var length;

  this.offset = stream.tell();

  length = stream.readUint32();
  this.length = length + 4;

  if (header.colorMode === ColorMode.INDEXED_COLOR && length !== 768) {
    throw new Error('invalid color mode data');
  }

  this.data = stream.read(length);
};

module.exports = ColorModeData;

},{"./ColorMode":70,"./Header":93,"./StreamReader":108}],72:[function(require,module,exports){
/**
 * @enum {number}
 */
var CompressionMethod = {
  RAW: 0,
  RLE: 1,
  ZIP_WITHOUT_PREDICTION: 2,
  ZIP_WITH_PREDICTION: 3
};

module.exports = CompressionMethod;

},{}],73:[function(require,module,exports){

/**
 * @constructor
 */
var Descriptor = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {string} */
  this.name;
  /** @type {string} */
  this.classId;
  /** @type {number} */
  this.items;
  /** @type {Array} */
  this.item;
};

/**
 * @param {StreamReader} stream
 */
Descriptor.prototype.parse = function(stream) {
  /** @type {number} */
  var length;
  /** @type {string} */
  var key;
  /** @type {string} */
  var type;
  /** @type {number} */
  var i;
  /** @type {number} */
  var il;
  /** @type {!{parse: function(StreamReader)}} */
  var data;

  this.offset = stream.tell();

  length = stream.readUint32();
  this.name = stream.readWideString(length);

  length = stream.readUint32() || 4;
  this.classId = stream.readString(length);

  this.items = stream.readUint32();
  this.item = [];

  for (i = 0, il = this.items; i < il; ++i) {
    length = stream.readUint32() || 4;
    key = stream.readString(length);
    type = stream.readString(4);

    if (typeof Descriptor[type] !== 'function') {
      console.log('OSType Key not implemented:', type);
      //console.log(hoge, String.fromCharCode.apply(null, hoge));
      break;
    }

    data = new Descriptor[type]();
    data.parse(stream);

    this.item.push({key: key, data: data});
  }

  this.length = stream.tell() - this.offset;
};

Descriptor.prototype.toObject = function() {
  var obj = {};
  for(var i = 0; i < this.item.length; i++) {
    var key = this.item[i].key.replace(/\s+$/, '');
    var data = this.item[i].data;
    if(!data.toObject) { console.log("NO toObject: " + key); }
    obj[key] = data.toObject ? data.toObject() : data;
  }
  return obj;
};

module.exports = Descriptor;

require('./Descriptor/GlbC.js')
require('./Descriptor/GlbO.js')
require('./Descriptor/ObAr.js')
require('./Descriptor/Objc.js')
require('./Descriptor/TEXT.js')
require('./Descriptor/UnFl.js')
require('./Descriptor/UntF.js')
require('./Descriptor/VlLs.js')
require('./Descriptor/alis.js')
require('./Descriptor/bool.js')
require('./Descriptor/doub.js')
require('./Descriptor/enum.js')
require('./Descriptor/long.js')
require('./Descriptor/obj.js')
require('./Descriptor/prop.js')
require('./Descriptor/rele.js')
require('./Descriptor/tdta.js')
require('./Descriptor/type.js')

},{"./Descriptor/GlbC.js":74,"./Descriptor/GlbO.js":75,"./Descriptor/ObAr.js":76,"./Descriptor/Objc.js":77,"./Descriptor/TEXT.js":78,"./Descriptor/UnFl.js":79,"./Descriptor/UntF.js":80,"./Descriptor/VlLs.js":81,"./Descriptor/alis.js":82,"./Descriptor/bool.js":83,"./Descriptor/doub.js":84,"./Descriptor/enum.js":85,"./Descriptor/long.js":86,"./Descriptor/obj.js":87,"./Descriptor/prop.js":88,"./Descriptor/rele.js":89,"./Descriptor/tdta.js":90,"./Descriptor/type.js":91}],74:[function(require,module,exports){
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
Descriptor['GlbC'] = Descriptor['type'];

},{"../Descriptor":73}],75:[function(require,module,exports){
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
Descriptor['GlbO'] = Descriptor['Objc'];

},{"../Descriptor":73}],76:[function(require,module,exports){
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
Descriptor['ObAr'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
};

/**
 * @param {StreamReader} stream
 */
Descriptor['ObAr'].prototype.parse = function(stream) {
  /** @type {number} */
  var length;
  /** @type {Array.<Descriptor>} */
  var item;
  /** @type {number} */
  var i;
  /** @type {number} */
  var il;

  this.offset = stream.tell();

  console.log('OSType key not implemented (undocumented): ObAr(ObjectArray?)');

  this.length = stream.tell() - this.offset;
};

},{"../Descriptor":73}],77:[function(require,module,exports){
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
Descriptor['Objc'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {Descriptor} */
  this.value;
};

/**
 * @param {StreamReader} stream
 */
Descriptor['Objc'].prototype.parse = function(stream) {
  this.offset = stream.tell();
  this.value = new Descriptor();
  this.value.parse(stream);
  this.length = stream.tell() - this.offset;
};

Descriptor['Objc'].prototype.toObject = function() {
  return this.value.toObject ? this.value.toObject() : this.value;
};

},{"../Descriptor":73}],78:[function(require,module,exports){
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
Descriptor['TEXT'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {string} */
  this.string;
};

/**
 * @param {StreamReader} stream
 */
Descriptor['TEXT'].prototype.parse = function(stream) {
  /** @type {number} */
  var length;

  this.offset = stream.tell();

  length = stream.readUint32();
  this.string = stream.readWideString(length);

  this.length = stream.tell() - this.offset;
};

Descriptor['TEXT'].prototype.toObject = function() {
  return this.string.slice(0, this.string.length - 1);
}

},{"../Descriptor":73}],79:[function(require,module,exports){
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
Descriptor['UnFl'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {Array.<number>} */
  this.value;
};

/**
 * @param {StreamReader} stream
 */
Descriptor['UnFl'].prototype.parse = function(stream) {
  /** @type {Array.<number>} */
  var value = this.value = [];
  /** @type {number} */
  var count;
  /** @type {number} */
  var i;

  this.offset = stream.tell();

  this.key = stream.readString(4);
  count = stream.readUint32();
  for (i = 0; i < count; ++i) {
    value[i] = stream.readFloat64();
  }

  this.length = stream.tell() - this.offset;
};

Descriptor['UnFl'].prototype.toObject = function() {
  var obj = {};
  obj[this.key] = this.value;
  return obj;
};

},{"../Descriptor":73}],80:[function(require,module,exports){
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
Descriptor['UntF'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {string} */
  this.units;
  /** @type {!(Array.<number>|Uint8Array)} */
  this.value;
};

/**
 * @param {StreamReader} stream
 */
Descriptor['UntF'].prototype.parse = function(stream) {
  this.offset = stream.tell();
  this.units = stream.readString(4);
  this.value = stream.readFloat64();
  this.length = stream.tell() - this.offset;
};

Descriptor['UntF'].prototype.toObject = function() {
  return {value: this.value, units: this.units};
};

},{"../Descriptor":73}],81:[function(require,module,exports){
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
Descriptor['VlLs'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {Array} */
  this.item;
};

/**
 * @param {StreamReader} stream
 */
Descriptor['VlLs'].prototype.parse = function(stream) {
  /** @type {number} */
  var items;
  /** @type {number} */
  var i;
  /** @type {string} */
  var type;
  /** @type {!{parse: function(StreamReader)}} */
  var data;

  this.offset = stream.tell();

  this.item = [];
  items = stream.readUint32();
  for (i = 0; i < items; ++i) {
    type = stream.readString(4);
    if (typeof Descriptor[type] !== 'function') {
      console.log('OSType Key not implemented:', type);
      return;
    }

    data = new Descriptor[type]();
    data.parse(stream);

    this.item.push({
      type: type,
      data: data
    });
  }

  this.length = stream.tell() - this.offset;
};

Descriptor['VlLs'].prototype.toObject = function() {
  return this.item.map(function(item) { return item.data.toObject ? item.data.toObject() : item.data; });
};

},{"../Descriptor":73}],82:[function(require,module,exports){
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
Descriptor['alis'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {!(Array.<number>|Uint8Array)} */
  this.value;
};

/**
 * @param {StreamReader} stream
 */
Descriptor['alis'].prototype.parse = function(stream) {
  /** @type {number} */
  var length;
  this.offset = stream.tell();

  length = stream.readUint32();
  // TODO: きちんと parse する
  this.value = stream.read(length);

  this.length = stream.tell() - this.offset;
};

Descriptor['alis'].prototype.toObject = function() {
  return this.value;
};

},{"../Descriptor":73}],83:[function(require,module,exports){
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
Descriptor['bool'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {boolean} */
  this.value;
};

/**
 * @param {StreamReader} stream
 */
Descriptor['bool'].prototype.parse = function(stream) {
  this.offset = stream.tell();
  this.value = !!stream.readUint8();
  this.length = stream.tell() - this.offset;
};

Descriptor['bool'].prototype.toObject = function() { return this.value; };

},{"../Descriptor":73}],84:[function(require,module,exports){
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
Descriptor['doub'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {!(Array.<number>|Uint8Array)} */
  this.value;
};

/**
 * @param {StreamReader} stream
 */
Descriptor['doub'].prototype.parse = function(stream) {
  this.offset = stream.tell();
  this.value = stream.readFloat64();
  this.length = stream.tell() - this.offset;
};

Descriptor['doub'].prototype.toObject = function() {
  return this.value;
};

},{"../Descriptor":73}],85:[function(require,module,exports){
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
Descriptor['enum'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {string} */
  this.type;
  /** @type {string} */
  this.enum;
};

/**
 * @param {StreamReader} stream
 */
Descriptor['enum'].prototype.parse = function(stream) {
  /** @type {number} */
  var length;

  this.offset = stream.tell();

  // type
  length = stream.readUint32();
  if (length === 0) {
    length = 4;
  }
  this.type = stream.readString(length);

  // enum
  length = stream.readUint32();
  if (length === 0) {
    length = 4;
  }
  this.enum = stream.readString(length);

  this.length = stream.tell() - this.offset;
};

Descriptor['enum'].prototype.toObject = function() {
  return this.enum;
};

},{"../Descriptor":73}],86:[function(require,module,exports){
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
Descriptor['long'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.value;
};

/**
 * @param {StreamReader} stream
 */
Descriptor['long'].prototype.parse = function(stream) {
  this.offset = stream.tell();
  this.value = stream.readInt32();
  this.length = stream.tell() - this.offset;
};

Descriptor['long'].prototype.toObject = function() {
  return this.value;
};

},{"../Descriptor":73}],87:[function(require,module,exports){
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
Descriptor['obj '] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.items;
  /** @type {Array} */
  this.item;
};

/**
 * @param {StreamReader} stream
 */
Descriptor['obj '].prototype.parse = function(stream) {
  /** @type {number} */
  var items;
  /** @type {string} */
  var key;
  /** @type {string} */
  var type;
  /** @type {!{parse: function(StreamReader)}} */
  var data;
  /** @type {number} */
  var i;

  this.offset = stream.tell();

  this.item = [];
  items = this.items = stream.readUint32();
  for (i = 0; i < items; ++i) {
    key = stream.readString(4);
    type = Descriptor['obj '].Table[key];

    if (typeof Descriptor[type] !== 'function') {
      console.log('OSType Key not implemented:', type);
      return;
    }

    data = new (Descriptor[type])();
    data.parse(stream);

    this.item.push({key: key, data: data});
  }

  this.length = stream.tell() - this.offset;
};

Descriptor['obj '].Table = {
  'prop': 'prop',
  'Clss': 'type',
  'Enmr': 'enum',
  'rele': 'rele',
  'Idnt': 'long',
  'indx': 'long',
  'name': 'TEXT'
};

Descriptor['obj '].prototype.toObject = function() {
  return this.item.map(function(item) {
    return this.item.data.toObject ? this.item.data.toObject() : this.item.data
  });
};

},{"../Descriptor":73}],88:[function(require,module,exports){
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
Descriptor['prop'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {string} */
  this.name;
  /** @type {string} */
  this.classId;
  /** @type {string} */
  this.keyId;
};

/**
 * @param {StreamReader} stream
 */
Descriptor['prop'].prototype.parse = function(stream) {
  /** @type {number} */
  var length;

  this.offset = stream.tell();

  length = stream.readUint32();
  this.name = stream.readWideString(length);

  length = stream.readUint32() || 4;
  this.classId = stream.readString(length);

  length = stream.readUint32() || 4;
  this.keyId = stream.readString(length);

  this.length = stream.tell() - this.offset;
};

Descriptor['prop'].prototype.toObject = function() {
  return { name: this.name, classId: this.classId };
}

},{"../Descriptor":73}],89:[function(require,module,exports){
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
Descriptor['rele'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {string} */
  this.name;
  /** @type {string} */
  this.classId;
  /** @type {number} */
  this.value;
};

/**
 * @param {StreamReader} stream
 */
Descriptor['rele'].prototype.parse = function(stream) {
  /** @type {number} */
  var length;

  this.offset = stream.tell();

  length = stream.readUint32();
  this.name = stream.readWideString(length);

  length = stream.readUint32() || 4;
  this.classId = stream.readString(length);

  this.value = stream.readUint32();

  this.length = stream.tell() - this.offset;
};

Descriptor['rele'].prototype.toObject = function() {
  return { name: this.name, value: this.value, classId: this.classId };
}

},{"../Descriptor":73}],90:[function(require,module,exports){
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
Descriptor['tdta'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {!(Array.<number>|Uint8Array)} */
  this.value;
};

/**
 * @param {StreamReader} stream
 */
Descriptor['tdta'].prototype.parse = function(stream) {
  /** @type {number} */
  var length;

  this.offset = stream.tell();

  length = stream.readUint32();
  this.data = stream.read(length);

  this.length = stream.tell() - this.offset;
};

Descriptor['tdta'].prototype.toObject = function() {
  return this.data;
}

},{"../Descriptor":73}],91:[function(require,module,exports){
var Descriptor = require('../Descriptor');

/**
 * @constructor
 */
Descriptor['type'] = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {string} */
  this.name;
  /** @type {string} */
  this.classId;
};

/**
 * @param {StreamReader} stream
 */
Descriptor['type'].prototype.parse = function(stream) {
  /** @type {number} */
  var length;
  this.offset = stream.tell();

  length = stream.readUint32();
  this.name = stream.readWideString(length);

  length = stream.readUint32() || 4;
  this.classId = stream.readString(length);

  this.length = stream.tell() - this.offset;
};

Descriptor['type'].prototype.toObject = function() {
  return { name: this.name, classId: this.classId };
}

},{"../Descriptor":73}],92:[function(require,module,exports){
var StreamReader = require('./StreamReader');

/**
 * @constructor
 */
var GlobalLayerMaskInfo = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.overlayColorSpace;
  /** @type {Array.<number>} */
  this.colorComponents;
  /** @type {number} */
  this.opacity;
  /** @type {number} */
  this.kind;
  /** @type {!(Array.<number>|Uint8Array)} */
  this.filter;
};

/**
 * @param {StreamReader} stream
 * @param {Header} header
 */
GlobalLayerMaskInfo.prototype.parse = function(stream, header) {
  /** @type {number} */
  var length;

  this.offset = stream.tell();
  length = stream.readUint32();
  this.length = length + 4;

  this.overlayColorSpace = stream.readUint16();
  this.colorComponents = [
    stream.readUint16(), stream.readUint16(),
    stream.readUint16(), stream.readUint16()
  ];
  this.opacity = stream.readUint16();
  this.kind = stream.readUint8();
  this.filter = stream.read(this.offset + this.length - stream.tell());

  stream.seek(this.offset + this.length, 0);
};

module.exports = GlobalLayerMaskInfo;

},{"./StreamReader":108}],93:[function(require,module,exports){
var StreamReader = require('./StreamReader');

/**
 * @constructor
 */
var Header = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {string} */
  this.signature;
  /** @type {number} */
  this.version;
  /** @type {!(Array.<number>|Uint8Array)} */
  this.reserved;
  /** @type {number} */
  this.channels;
  /** @type {number} */
  this.rows;
  /** @type {number} */
  this.columns;
  /** @type {number} */
  this.depth;
  /** @type {ColorMode} */
  this.colorMode;
};

/**
 * @param {StreamReader} stream
 */
Header.prototype.parse = function(stream) {
  this.offset = stream.tell();

  // signature
  this.signature = stream.readString(4);
  if (this.signature !== '8BPS') {
    throw new Error('invalid signature');
  }

  this.version = stream.readUint16();
  this.reserved = stream.read(6);
  this.channels = stream.readUint16();
  this.rows = stream.readUint32();
  this.columns = stream.readUint32();
  this.depth = stream.readUint16();
  this.colorMode =
    /** @type {ColorMode} */
    stream.readUint16();

  this.length = stream.tell() - this.offset;
};

module.exports = Header;

},{"./StreamReader":108}],94:[function(require,module,exports){
/**
 * @constructor
 */
var Image = function() {
  /** @type {Array} */
  this.channel;
};

/**
 * @param {StreamReader} stream
 * @param {Header} header
 */
Image.prototype.parse = function() { throw("abstract"); };

module.exports = Image;

},{}],95:[function(require,module,exports){
var StreamReader = require('./StreamReader');
var Header = require('./Header');
var ImageRAW = require('./ImageRAW');
var ImageRLE = require('./ImageRLE');
var Color = require('./Color');
var CompressionMethod = require('./CompressionMethod');

/**
 * @constructor
 */
var ImageData = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {CompressionMethod} */
  this.compressionMethod;
  /** @type {!Image} */
  this.image;
};

/**
 * @param {StreamReader} stream
 * @param {Header} header
 */
ImageData.prototype.parse = function(stream, header) {
  this.offset = stream.tell();
  this.compressionMethod =
    /** @type {CompressionMethod} */
    stream.readUint16();

  switch (this.compressionMethod) {
    case CompressionMethod.RAW:
      this.image = new ImageRAW();
      break;
    case CompressionMethod.RLE:
      this.image = new ImageRLE();
      break;
    default:
      throw new Error('unknown compression method');
  }
  this.image.parse(stream, header);

  this.length = stream.tell() - this.offset;
};

/**
 * @param {Header} header
 * @param {ColorModeData} colorModeData
 * @return {HTMLCanvasElement}
 */
ImageData.prototype.createCanvas = function(header, colorModeData) {
  /** @type {HTMLCanvasElement} */
  var canvas =
    /** @type {HTMLCanvasElement} */
    document.createElement('canvas');
  /** @type {CanvasRenderingContext2D} */
  var ctx =
    /** @type {CanvasRenderingContext2D} */
    canvas.getContext('2d');
  /** @type {number} */
  var width = canvas.width = header.columns;
  /** @type {number} */
  var height = canvas.height = header.rows;
  /** @type {ImageData} */
  var imageData;
  /** @type {(Uint8ClampedArray|CanvasPixelArray)} */
  var pixelArray;
  /** @type {number} */
  var x;
  /** @type {number} */
  var y;
  /** @type {number} */
  var index;
  /** @type {Array.<!(Array.<number>|Uint8Array)>} */
  var color = new Color(header, colorModeData, this.image.channel).toRGB();

  if (width <= 0 || height <= 0) {
    return null;
  }

  imageData = ctx.createImageData(width, height);
  pixelArray = imageData.data;

  for (y = 0; y < height; ++y) {
    for (x = 0; x < width; ++x) {
      index = (y * width + x);
      pixelArray[index * 4    ] = color[0][index];
      pixelArray[index * 4 + 1] = color[1][index];
      pixelArray[index * 4 + 2] = color[2][index];
      pixelArray[index * 4 + 3] = 255;
      //pixelArray[index * 4 + 3] = channels[3] ? channels[3][index] : 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
};

ImageData.prototype.createColor = function(header, colorModeData) {
  return new Color(header, colorModeData, this.image.channel).toRGB();
};

module.exports = ImageData;

},{"./Color":69,"./CompressionMethod":72,"./Header":93,"./ImageRAW":96,"./ImageRLE":97,"./StreamReader":108}],96:[function(require,module,exports){
var util = require('util');

var StreamReader = require('./StreamReader');
var Header = require('./Header');
var Image = require('./Image');

/**
 * @constructor
 * @extends {Image}
 */
var ImageRAW = function() {
  Image.call(this);
};
util.inherits(ImageRAW, Image);

/**
 * @param {StreamReader} stream
 * @param {Header} header
 */
ImageRAW.prototype.parse = function(stream, header) {
  /** @type {Array} */
  var channel = this.channel = [];
  /** @type {number} */
  var channelIndex;
  /** @type {number} */
  var width = header.columns;
  /** @type {number} */
  var height = header.rows;
  /** @type {number} */
  var channels = header.channels;
  /** @type {number} */
  var size = width * height * (header.depth / 8);

  for (channelIndex = 0; channelIndex < channels; ++channelIndex) {
    channel[channelIndex] = stream.read(size);
  }
};

module.exports = ImageRAW;

},{"./Header":93,"./Image":94,"./StreamReader":108,"util":121}],97:[function(require,module,exports){
var util = require('util');

var StreamReader = require('./StreamReader');
var Header = require('./Header');
var Image = require('./Image');

/**
 * @constructor
 * @extends {Image}
 */
ImageRLE = function() {
  /** @type {Array.<number>} */
  this.lineLength;
};
util.inherits(ImageRLE, Image);

/**
 * @param {StreamReader} stream
 * @param {Header} header
 */
ImageRLE.prototype.parse = function(stream, header) {
  /** @type {number} */
  var i;
  /** @type {Array} */
  var channel = this.channel = [];
  /** @type {Array.<number>} */
  var lineLength = this.lineLength = [];
  /** @type {number} */
  var channelIndex;
  /** @type {Array} */
  var lines;
  /** @type {number} */
  var height = header.rows;
  /** @type {number} */
  var channels = header.channels;
  /** @type {number} */
  var size;
  /** @type {number} */
  var pos;

  // line lengths
  for (i = 0; i < height * channels; ++i) {
    lineLength[i] = stream.readUint16();
  }

  // channel data
  for (channelIndex = 0; channelIndex < channels; ++channelIndex) {
    lines = [];
    size = 0;

    for (i = 0; i < height; ++i) {
      lines[i] = stream.readPackBits(lineLength[channelIndex * height + i] * (header.depth / 8));
      size += lines[i].length;
    }
    // concatenation
    if (USE_TYPEDARRAY) {
      channel[channelIndex] = new Uint8Array(size);
      for (i = 0, pos = 0, height = lines.length; i < height; ++i) {
        channel[channelIndex].set(lines[i], pos);
        pos += lines[i].length;
      }
    } else {
      channel[channelIndex] = Array.prototype.concat.apply([], lines);
    }
  }
};

module.exports = ImageRLE;

},{"./Header":93,"./Image":94,"./StreamReader":108,"util":121}],98:[function(require,module,exports){
var global=self;var StreamReader = require('./StreamReader');
/**
 * @constructor
 */
global.ImageResourceBlock = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.identifier;
  /** @type {string} */
  this.name;
  /** @type {number} */
  this.dataSize;
  /** @type {!(Array.<number>|Uint8Array)} */
  this.data;
};

/**
 * @param {StreamReader} stream
 */
ImageResourceBlock.prototype.parse = function(stream) {
  this.offset = stream.tell();

  var signature = stream.readString(4);
  if (signature !== '8BIM') {
    throw new Error('invalid signature at ' + this.offset);
  }

  this.identifier = stream.readUint16();
  this.name = stream.readPascalString();
  if(!this.name.length) { stream.readUint8(); }
  this.dataSize = stream.readUint32();

  if(ImageResourceBlock[this.identifier + ""]) {
    var dataOffset = stream.tell();
    var block = new ImageResourceBlock[this.identifier + ""];
    block.parse(stream);
    this.data = block;
    stream.seek(dataOffset + this.dataSize, 0);
  } else {
    this.data = stream.read(this.dataSize);
  }

  if(stream.readUint8() != 0) {
    stream.seek(stream.tell() - 1, 0);
  }

  this.length = stream.tell() - this.offset;
};

ImageResourceBlock.prototype.toObject = function() {
  return this.data.toObject ? this.data.toObject() : this.data;
}

module.exports = ImageResourceBlock;

require('./ImageResourceBlocks/1050.js')

},{"./ImageResourceBlocks/1050.js":99,"./StreamReader":108}],99:[function(require,module,exports){
var Descriptor = require('../Descriptor');
var util = require('util');

ImageResourceBlock['1050'] = function() {}

var Slice = function() {};
Slice.prototype.parse = function(stream) {
  this.offset = stream.tell();

  this.sliceID = stream.readUint32();
  this.groupId = stream.readUint32();
  this.origin = stream.readUint32();

  if(parseInt(this.origin) == 1) {
    this.associatedLayerId = stream.readUint32();
  }

  this.Nm = stream.readUnicode();
  this.Type = stream.readUint32();
  this.bounds = {
    Left: stream.readUint32(),
    Top: stream.readUint32(),
    Rght: stream.readUint32(),
    Btom: stream.readUint32()
  };
  this.url = stream.readUnicode();
  this.target = stream.readUnicode();
  this.Msge = stream.readUnicode();
  this.altTag = stream.readUnicode();
  this.cellIsHtml = stream.readUint8();
  this.cellText = stream.readUnicode();
  this.horzAlign = stream.readUint32();
  this.vertAlign = stream.readUint32();
  this.color = {
    alpha: stream.readUint8(),
    red: stream.readUint8(),
    green: stream.readUint8(),
    blue: stream.readUint8()
  };

  this.length = stream.tell() - this.offset;
};

ImageResourceBlock['1050'].prototype.type = "sliceInfo";

ImageResourceBlock['1050'].prototype.parse = function(stream) {
  this.offset = stream.tell();

  this.version = stream.readUint32();

  if(this.version == 6) {
    this.bounds = {
      Top: stream.readUint32(),
      Left: stream.readUint32(),
      Bottom: stream.readUint32(),
      Right: stream.readUint32()
    };

    this.name = stream.readUnicode();
    this.count = stream.readUint32();

    this.slices = [];

    for(var i = 0; i < this.count - 1; i++) {
      var slice = new Slice();
      slice.parse(stream);
      this.slices.push(slice);
    }
  } else {
    var length = stream.readUint32();

    this.descriptor = new Descriptor();
    this.descriptor.parse(stream);
  }

  this.length = stream.tell() - this.offset;
};

ImageResourceBlock['1050'].prototype.toObject = function() {
  if(this.slices) {
    return {slices: this.slices};
  } else {
    return this.descriptor.toObject ? this.descriptor.toObject() : this.descriptor;
  }
};

},{"../Descriptor":73,"util":121}],100:[function(require,module,exports){
var StreamReader = require('./StreamReader');
var ImageResourceBlock = require('./ImageResourceBlock');

/**
 * @constructor
 */
var ImageResources = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {ImageResourceBlock} */
  this.imageResource;
};

/**
 * @param {StreamReader} stream
 */
ImageResources.prototype.parse = function(stream) {
  /** @type {number} */
  var length;

  this.offset = stream.tell();
  length = stream.readUint32();
  this.length = length + 4;

  this.imageResources = [];
  while(stream.tell() < this.offset + this.length) {
    var imageResource = new ImageResourceBlock();
    imageResource.parse(stream)
    this.imageResources.push(imageResource);
  }

  stream.seek(this.offset + this.length, 0);
};

module.exports = ImageResources;

},{"./ImageResourceBlock":98,"./StreamReader":108}],101:[function(require,module,exports){
var StreamReader = require('./StreamReader');
var LayerInfo = require('./LayerInfo');
var GlobalLayerMaskInfo = require('./GlobalLayerMaskInfo');
var AdditionalLayerInfo = require('./AdditionalLayerInfo');

/**
 * @constructor
 */
var LayerAndMaskInformation = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {LayerInfo} */
  this.layerInfo;
  /** @type {GlobalLayerMaskInfo} */
  this.globalLayerMaskInfo;
  /** @type {AdditionalLayerInfo} */
  this.additionalLayerInfo;
};

/**
 * @param {StreamReader} stream
 * @param {Header} header
 */
LayerAndMaskInformation.prototype.parse = function(stream, header) {
  /** @type {number} */
  var length;

  this.offset = stream.tell();
  length = stream.readUint32();
  this.length = length + 4;

  if (length === 0) {
    console.log("skip: layer and mask information (empty body)");
  }

  var pos = stream.tell() + length;

  // initialize
  this.layerInfo = new LayerInfo();
  this.globalLayerMaskInfo = new GlobalLayerMaskInfo();
  this.additionalLayerInfo = new AdditionalLayerInfo();

  // parse
  this.layerInfo.parse(stream, header);
  this.globalLayerMaskInfo.parse(stream, header);
  this.additionalLayerInfo.parse(stream, header);

  // TODO: remove
  stream.seek(pos, 0);
};

module.exports = LayerAndMaskInformation;

},{"./AdditionalLayerInfo":34,"./GlobalLayerMaskInfo":92,"./LayerInfo":103,"./StreamReader":108}],102:[function(require,module,exports){
/**
 * @constructor
 */
var LayerBlendingRanges = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {Array.<Array>} */
  this.channel = [];
  /** @type {number} */
  this.black;
  /** @type {number} */
  this.white;
  /** @type {number} */
  this.destRange;
};

/**
 * @param {StreamReader} stream
 */
LayerBlendingRanges.prototype.parse = function(stream) {
  /** @type {number} */
  var next;

  this.offset = stream.tell();
  this.length = stream.readUint32() + 4;

  if (this.length === 4) {
    console.log("skip: layer blending ranges(empty body)");
    return;
  }

  next = this.offset + this.length;

  this.black = stream.readUint16();
  this.white = stream.readUint16();

  this.destRange = stream.readUint32();

  while (stream.tell() < next) {
    // TODO: 専用のオブジェクトを作る
    this.channel.push([
      /* source range      */ stream.readUint32(),
      /* destination range */ stream.readUint32()
    ]);
  }
};

module.exports = LayerBlendingRanges;

},{}],103:[function(require,module,exports){
var StreamReader = require('./StreamReader');
var LayerRecord = require('./LayerRecord');
var ChannelImageData = require('./ChannelImageData');

/**
 * @constructor
 */
var LayerInfo = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.layerCount;
  /** @type {Array.<LayerRecord>} */
  this.layerRecord = [];
  /** @type {Array.<ChannelImageData>} */
  this.channelImageData = [];
};

/**
 * @param {StreamReader} stream
 * @param {Header} header
 */
LayerInfo.prototype.parse = function(stream, header) {
  /** @type {number} */
  var i;
  /** @type {number} */
  var il;
  /** @type {LayerRecord} */
  var layerRecord;
  /** @type {ChannelImageData} */
  var channelImageData;

  this.offset = stream.tell();
  this.length = stream.readUint32() + 4;

  this.layerCount = Math.abs(stream.readInt16());

  for (i = 0, il = this.layerCount; i < il; ++i) {
    layerRecord = new LayerRecord();
    layerRecord.parse(stream, header);
    this.layerRecord[i] = layerRecord;
  }

  // TODO: ChannelImageData の実装はまだないのでスキップする
  for (i = 0, il = this.layerCount; i < il; ++i) {
    channelImageData = new ChannelImageData();
    channelImageData.parse(stream, this.layerRecord[i]);
    this.channelImageData[i] = channelImageData;
  }
  stream.seek(this.offset + this.length, 0);
};

module.exports = LayerInfo;

},{"./ChannelImageData":66,"./LayerRecord":105,"./StreamReader":108}],104:[function(require,module,exports){
/**
 * @constructor
 */
LayerMaskData = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.top;
  /** @type {number} */
  this.left;
  /** @type {number} */
  this.bottom;
  /** @type {number} */
  this.right;
  /** @type {number} */
  this.defaultColor;
  /** @type {number} */
  this.flags;
  /** @type {number} */
  this.padding;
  /** @type {number} */
  this.realFlags;
  /** @type {number} */
  this.realBackground;
  /** @type {number} */
  this.top2;
  /** @type {number} */
  this.left2;
  /** @type {number} */
  this.bottom2;
  /** @type {number} */
  this.right2;
};

/**
 * @param {StreamReader} stream stream reader.
 */
LayerMaskData.prototype.parse = function(stream) {
  /** @type {number} */
  var length;

  this.offset = stream.tell();
  length = stream.readUint32();
  this.length = length + 4;

  if (length === 0) {
    console.log("skip: layer mask data (empty body)");
    return;
  }

  // rectangle enclosing layer mask
  this.top = stream.readInt32();
  this.left = stream.readInt32();
  this.bottom = stream.readInt32();
  this.right = stream.readInt32();

  // default color
  this.defaultColor = stream.readUint8();

  // flags
  this.flags = stream.readUint8();

  // length: 20
  if (length === 20) {
    // padding
    this.padding = stream.readUint16();
  // length: 36
  } else {
    // real flags
    this.realFlags = stream.readUint8();

    // real user mask background
    this.realBackground = stream.readUint8();

    // rectangle enclosing layer mask
    this.top2 = stream.readInt32();
    this.left2 = stream.readInt32();
    this.bottom2 = stream.readInt32();
    this.right2 = stream.readInt32();
  }
};

module.exports = LayerMaskData;

},{}],105:[function(require,module,exports){
var StreamReader = require('./StreamReader');
var AdditionalLayerInfo = require('./AdditionalLayerInfo');
var LayerMaskData = require('./LayerMaskData');
var LayerBlendingRanges = require('./LayerBlendingRanges');

/**
 * @constructor
 */
LayerRecord = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {number} */
  this.top;
  /** @type {number} */
  this.left;
  /** @type {number} */
  this.bottom;
  /** @type {number} */
  this.right;
  /** @type {number} */
  this.channels;
  /** @type {Array.<{id: number, length: number}>} */
  this.info = [];
  /** @type {string} */
  this.blendMode;
  /** @type {number} */
  this.opacity;
  /** @type {number} */
  this.clipping;
  /** @type {number} */
  this.flags;
  /** @type {number} */
  this.filter;
  /** @type {string} */
  this.name;
  /** @type {LayerMaskData} */
  this.layerMaskData;
  /** @type {LayerBlendingRanges} */
  this.blendingRanges;
  /** @type {Array.<AdditionalLayerInfo>} */
  this.additionalLayerInfo;
};

/**
 * @param {StreamReader} stream
 * @param {Header} header
 */
LayerRecord.prototype.parse = function(stream, header) {
  /** @type {number} */
  var pos;
  /** @type {number} */
  var i;
  /** @type {number} */
  var il;
  /** @type {AdditionalLayerInfo} */
  var additionalLayerInfo;

  this.offset = stream.tell();

  // rectangle
  this.top = stream.readInt32();
  this.left = stream.readInt32();
  this.bottom = stream.readInt32();
  this.right = stream.readInt32();

  // channel information
  this.channels = stream.readUint16();
  for (i = 0, il = this.channels; i < il; ++i) {
    this.info[i] = {
      id: stream.readInt16(),
      length: stream.readUint32()
    };
  }
  // signature
  if (stream.readString(4) !== '8BIM') {
    throw new Error('invalid blend mode signature');
  }

  // blend mode
  this.blendMode = stream.readString(4);

  // opacity
  this.opacity = stream.readUint8();

  // clipping
  this.clipping = stream.readUint8();

  // flags
  this.flags = stream.readUint8();

  // filter
  this.filter = stream.readUint8();

  // extra field length
  this.extraLength = stream.readUint32();
  pos = stream.tell() + this.extraLength;

  // layer mask data
  this.layerMaskData = new LayerMaskData();
  this.layerMaskData.parse(stream);

  // layer blending ranges
  this.blendingRanges = new LayerBlendingRanges();
  this.blendingRanges.parse(stream);

  // name
  var stringLength = stream.readUint8();
  this.name = stream.readString(stringLength);
  stream.seek((4 - ((1 + stringLength) % 4)) % 4); // padding

  // additional information
  this.additionalLayerInfo = [];
  while (stream.tell() < pos) {
    additionalLayerInfo = new AdditionalLayerInfo();
    additionalLayerInfo.parse(stream, header);
    this.additionalLayerInfo.push(additionalLayerInfo);
  }

  this.length = stream.tell() - this.offset;
};

module.exports = LayerRecord;

},{"./AdditionalLayerInfo":34,"./LayerBlendingRanges":102,"./LayerMaskData":104,"./StreamReader":108}],106:[function(require,module,exports){
var global=self;/**
 * PSD parser in JavaScript.
 * @author imaya <imaya.devel@gmail.com>
 */

global.USE_TYPEDARRAY = true;
global.COMPILED = true;

var StreamReader = require('./StreamReader');
var Header = require('./Header');
var ColorModeData = require('./ColorModeData');
var ImageResources = require('./ImageResources');
var LayerAndMaskInformation = require('./LayerAndMaskInformation');
var ImageData = require('./ImageData');

/**
 * PSD parser
 * @constructor
 * @param {!(Array.<number>|Uint8Array)} input input buffer.
 * @param {Object=} opt_param option parameters.
 */
var Parser = function(input, opt_param) {
  if (!opt_param) {
    opt_param = {};
  }

  /** @type {StreamReader} */
  this.stream = new StreamReader(input, opt_param['inputPosition'] | 0);
  /** @type {Header} */
  this.header;
  /** @type {ColorModeData} */
  this.colorModeData;
  /** @type {ImageResources} */
  this.imageResources;
  /** @type {LayerAndMaskInformation} */
  this.layerAndMaskInformation;
  /** @type {ImageData} */
  this.imageData;
};

/**
 * parse psd.
 */
Parser.prototype.parse = function() {
  /** @type {StreamReader} */
  var stream = this.stream;

  // initialize
  this.header = new Header();
  this.colorModeData = new ColorModeData();
  this.imageResources = new ImageResources();
  this.layerAndMaskInformation = new LayerAndMaskInformation();
  this.imageData = new ImageData();

  // parse
  this.header.parse(stream);
  this.colorModeData.parse(stream, this.header);
  this.imageResources.parse(stream);
  this.layerAndMaskInformation.parse(stream, this.header);
  this.imageData.parse(stream, this.header);

  this.stream.input = null;
};

module.exports = Parser;

},{"./ColorModeData":71,"./Header":93,"./ImageData":95,"./ImageResources":100,"./LayerAndMaskInformation":101,"./StreamReader":108}],107:[function(require,module,exports){
/**
 * @constructor
 */
var PathRecord = function() {
  /** @type {number} */
  this.offset;
  /** @type {number} */
  this.length;
  /** @type {string} */
  this.name;
  /** @type {string} */
  this.classId;
  /** @type {number} */
  this.items;
  /** @type {Array} */
  this.item;
};

/**
 * @param {StreamReader} stream
 */
PathRecord.prototype.parse = function(stream) {
  /** @type {number} */
  var length;
  /** @type {string} */
  var key;
  /** @type {number} */
  var type;
  /** @type {number} */
  var i;
  /** @type {number} */
  var il;
  /** @type {!{parse: function(StreamReader)}} */
  var data;

  this.offset = stream.tell();

  type = this.type = stream.readInt16();
  //
  // Path の座標は 8-24 の固定小数点なので 1 << 24 で割ってやれば良い？
  //
  /*
  switch (type) {
    case 0: // closed subpath length record
    case 3: // open subpath length record
      console.log('record type: subpath length record, opened:', type === 0);
      console.log('path length:', stream.readInt16());
      stream.seek(22);
      break;
    case 1: // closed subpath bezier knot, linked
    case 2: // closed subpath bezier knot, unlinked
    case 4: // open subpath bezier knot, linked
    case 5: // open subpath bezier knot, unlinked
      // control point
      // anchor point
      // control point
      /*
      console.log(
        "\tCtrlPoint:",   stream.readInt32() / 0x1000000, stream.readInt32() / 0x1000000,
        "\nAnchorPoint:", stream.readInt32() / 0x1000000, stream.readInt32() / 0x1000000,
        "\nCtrlPoint:",   stream.readInt32() / 0x1000000, stream.readInt32() / 0x1000000
      );
      /
      console.log('record type: subpath bezier knot, opened:', (type === 4 || type === 5), ', linked:', (type === 1|| type === 4));
      break;
    case 6: // path fill rule record
      console.log('record type: path fill rule record');
      stream.seek(24);
      break;
    case 7: // clipboard record
      console.log('clipboard record');
      console.log(
        "\ttop:", stream.readInt32() / 0x1000000,
        "\nleft:", stream.readInt32() / 0x1000000,
        "\nbottom:", stream.readInt32() / 0x1000000,
        "\nright:", stream.readInt32() / 0x1000000,
        "\nresolution:", stream.readInt32() / 0x1000000
      );
      stream.seek(4);
      break;
    case 8: // initial fill rule record
      console.log('initial fill rule record');
      console.log("initial:", stream.readInt16());
      stream.seek(22);
      break;
    default: // unknown
      console.log('unknown path record type:', type);
      break;
  }
  */

  stream.seek(26, this.offset);

  this.length = stream.tell() - this.offset;
};

module.exports = PathRecord;

},{}],108:[function(require,module,exports){
var Buffer=require("__browserify_Buffer").Buffer;/**
 * ByteArray Reader.
 * @param {!(Array.<number>|Uint8Array)} input input buffer.
 * @param {number=} opt_start start position.
 * @constructor
 */
StreamReader = function(input, opt_start) {
  /** @type {!(Array.<number>|Uint8Array)} */
  this.input = USE_TYPEDARRAY ? new Uint8Array(input) : input;
  /** @type {number} */
  this.ip = opt_start | 0;
}

/**
 * @return {number}
 */
StreamReader.prototype.readUint32 = function() {
  return (
    (this.input[this.ip++] << 24) | (this.input[this.ip++] << 16) |
    (this.input[this.ip++] <<  8) | (this.input[this.ip++]      )
  ) >>> 0;
};

/**
 * @return {number}
 */
StreamReader.prototype.readInt32 = function() {
  return (
    (this.input[this.ip++] << 24) | (this.input[this.ip++] << 16) |
    (this.input[this.ip++] <<  8) | (this.input[this.ip++]      )
  );
};

/**
 * @return {number}
 */
StreamReader.prototype.readUint16 = function() {
  return (this.input[this.ip++] << 8) | this.input[this.ip++];
};

/**
 * @return {number}
 */
StreamReader.prototype.readInt16 = function() {
  return ((this.input[this.ip++] << 8) | this.input[this.ip++]) << 16 >> 16;
};

/**
 * @return {number}
 */
StreamReader.prototype.readUint8 = function() {
  return this.input[this.ip++];
};

/**
 * @return {number}
 */
StreamReader.prototype.readInt8 = function() {
  return this.input[this.ip++] << 24 >> 24;
};

/**
 * @return {number}
 */
StreamReader.prototype.readFloat64 = (function() {
  if (USE_TYPEDARRAY) {
    /** @type {ArrayBuffer} */
    var buffer = new ArrayBuffer(8);
    /** @type {Uint8Array} */
    var uint8 = new Uint8Array(buffer);
    /** @type {Float64Array} */
    var float64 = new Float64Array(buffer);
  } else {
    /** @const @type {number} */
    var Pow48 = Math.pow(2, 48);
    /** @const @type {number} */
    var Pow40 = Math.pow(2, 40);
    /** @const @type {number} */
    var Pow32 = Math.pow(2, 32);
    /** @const @type {number} */
    var Pow24 = Math.pow(2, 24);
    /** @const @type {number} */
    var Pow16 = Math.pow(2, 16);
    /** @const @type {number} */
    var Pow8  = Math.pow(2,  8);
    /** @const @type {number} */
    var Pow_1022 = Math.pow(2, -1022);
    /** @const @type {number} */
    var Pow_52 = Math.pow(2, -52);
  }

  return function() {
    /** @type {number} */
    var value;

    value = USE_TYPEDARRAY ?
      parseDoubleUsingTypedArray(this.input, this.ip) :
      parseDoublePlain(this.input, this.ip);

    this.ip += 8;

    return value;
  };

  /**
   * @param {!(Array.<number>|Uint8Array)} input
   * @param {number} ip
   * @return {number}
   */
  function parseDoublePlain(input, ip) {
    /** @type {boolean} true: positive, false: negative */
    var sign = (input[ip] & 0x80) === 0;
    /** @type {number} */
    var exp = ((input[ip++] & 0x7F) << 4) | ((input[ip] & 0xf0) >> 4);
    /** @type {number} */
    var mantissa = ((input[ip++] & 0x0f) * Pow48) +
      (input[ip++] * Pow40) + (input[ip++] * Pow32) + (input[ip++] * Pow24) +
      (input[ip++] * Pow16) + (input[ip++] *  Pow8) +  input[ip++];

    if (exp === 0) {
      return mantissa === 0 ? 0 :
        (sign ? 1 : -1) * Pow_1022 * mantissa * Pow_52;
    } else if (exp === 0x7ff) {
      return (
        mantissa ? NaN :
          sign     ? Infinity : -Infinity
        );
    }

    return (sign ? 1 : -1) *
      (Math.pow(2, exp - 1023) + mantissa * Math.pow(2, exp - 1075));
  }

  /**
   * @param {!(Array.<number>|Uint8Array)} input
   * @param {number} ip
   * @return {number}
   */
  function parseDoubleUsingTypedArray(input, ip) {
    /** @type {number} */
    var i = 8;

    while (--i) {
      uint8[i] = input[ip++];
    }

    return float64[0];
  }
})();

/**
 * @param {number} length
 * @return {!(Array.<number>|Uint8Array)}
 */
StreamReader.prototype.read = function(length) {
  return USE_TYPEDARRAY ?
    this.input.subarray(this.ip, this.ip += length) :
    this.input.slice(this.ip, this.ip += length);
};

StreamReader.prototype.readHex = function(length) {
  return (new Buffer(this.read(length))).toString('hex');
}

/**
 * @param {number} start start position.
 * @param {number} end end position.
 * @return {!(Array.<number>|Uint8Array)}
 */
StreamReader.prototype.slice = function(start, end) {
  this.ip = end;
  return USE_TYPEDARRAY ?
    this.input.subarray(start, end) : this.input.slice(start, end);
};

/**
 * @param {number} start start position.
 * @param {number} end end position.
 * @return {!(Array.<number>|Uint8Array)}
 */
StreamReader.prototype.fetch = function(start, end) {
  return USE_TYPEDARRAY ?
    this.input.subarray(start, end) : this.input.slice(start, end);
};

/**
 * @param {number} length read length.
 * @return {string}
 */
StreamReader.prototype.readString = function(length) {
  /** @type {!(Array.<number>|Uint8Array)} */
  var input = this.input;
  /** @type {number} */
  var ip = this.ip;
  /** @type {Array.<string>} */
  var charArray = [];
  /** @type {number} */
  var i;

  for (i = 0; i < length; ++i) {
    charArray[i] = String.fromCharCode(input[ip++]);
  }

  this.ip = ip;

  return charArray.join('');
};

/**
 * @param {number} length read length.
 * @return {string}
 */
StreamReader.prototype.readWideString = function(length) {
  /** @type {!(Array.<number>|Uint8Array)} */
  var input = this.input;
  /** @type {number} */
  var ip = this.ip;
  /** @type {Array.<string>} */
  var charArray = [];
  /** @type {number} */
  var i;

  for (i = 0; i < length; ++i) {
    charArray[i] = String.fromCharCode((input[ip++] << 8) | input[ip++]);
  }

  this.ip = ip;

  return charArray.join('');
};

StreamReader.prototype.readUnicode = function() {
  var length = this.readUint32();
  return this.readWideString(length);
};

/**
 * @return {string}
 */
StreamReader.prototype.readPascalString = function() {
  return this.readString(this.input[this.ip++]);
};

/**
 * @return {number}
 */
StreamReader.prototype.tell = function() {
  return this.ip;
};

/**
 * @param {number} pos position.
 * @param {number=} opt_base base position.
 */
StreamReader.prototype.seek = function(pos, opt_base) {
  if (typeof opt_base !== 'number') {
    opt_base = this.ip;
  }
  this.ip = opt_base + pos;
};

/**
 * @param {number} length read length.
 * @return {Array.<Number>} plain data.
 */
StreamReader.prototype.readPackBits = function(length) {
  /** @type {number} */
  var limit;
  /** @type {number} */
  var runLength;
  /** @type {number} */
  var copyValue;
  /** @type {Array.<number>} */
  var data = [];
  /** @type {number} */
  var pos = 0;

  limit = this.ip + length;

  // decode
  while (this.ip < limit) {
    runLength = this.readInt8();

    // runlength copy
    if (runLength < 0) {
      runLength = 1 - runLength;
      copyValue = this.readUint8();
      while (runLength-- > 0) {
        data[pos++] = copyValue;
      }
      // plain copy
    } else {
      runLength = 1 + runLength;
      while (runLength-- > 0) {
        data[pos++] = this.readUint8();
      }
    }
  }

  return data;
};

module.exports = StreamReader;

},{"__browserify_Buffer":124}],109:[function(require,module,exports){
var Buffer=require("__browserify_Buffer").Buffer;// Copyright (c) 2012 Kuba Niegowski
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

'use strict';


var util = require('util'),
    Stream = require('stream');


var ChunkStream = module.exports = function() {
    Stream.call(this);

    this._buffers = [];
    this._buffered = 0;

    this._reads = [];
    this._paused = false;

    this._encoding = 'utf8';
    this.writable = true;
};
util.inherits(ChunkStream, Stream);


ChunkStream.prototype.read = function(length, callback) {

    this._reads.push({
        length: Math.abs(length),  // if length < 0 then at most this length
        allowLess: length < 0,
        func: callback
    });

    this._process();

    // its paused and there is not enought data then ask for more
    if (this._paused && this._reads.length > 0) {
        this._paused = false;

        this.emit('drain');
    }
};

ChunkStream.prototype.write = function(data, encoding) {

    if (!this.writable) {
        this.emit('error', new Error('Stream not writable'));
        return false;
    }

    if (!Buffer.isBuffer(data))
        data = new Buffer(data, encoding || this._encoding);

    this._buffers.push(data);
    this._buffered += data.length;

    this._process();

    // ok if there are no more read requests
    if (this._reads && this._reads.length == 0)
        this._paused = true;

    return this.writable && !this._paused;
};

ChunkStream.prototype.end = function(data, encoding) {

    if (data) this.write(data, encoding);

    this.writable = false;

    // already destroyed
    if (!this._buffers) return;

    // enqueue or handle end
    if (this._buffers.length == 0) {
        this._end();
    } else {
        this._buffers.push(null);
        this._process();
    }
};

ChunkStream.prototype.destroySoon = ChunkStream.prototype.end;

ChunkStream.prototype._end = function() {

    if (this._reads.length > 0) {
        this.emit('error',
            new Error('There are some read requests waitng on finished stream')
        );
    }

    this.destroy();
};

ChunkStream.prototype.destroy = function() {

    if (!this._buffers) return;

    this.writable = false;
    this._reads = null;
    this._buffers = null;

    this.emit('close');
};

ChunkStream.prototype._process = function() {

    // as long as there is any data and read requests
    while (this._buffered > 0 && this._reads && this._reads.length > 0) {

        var read = this._reads[0];

        // read any data (but no more than length)
        if (read.allowLess) {

            // ok there is any data so that we can satisfy this request
            this._reads.shift(); // == read

            // first we need to peek into first buffer
            var buf = this._buffers[0];

            // ok there is more data than we need
            if (buf.length > read.length) {

                this._buffered -= read.length;
                this._buffers[0] = buf.slice(read.length);

                read.func.call(this, buf.slice(0, read.length));

            } else {
                // ok this is less than maximum length so use it all
                this._buffered -= buf.length;
                this._buffers.shift(); // == buf

                read.func.call(this, buf);
            }

        } else if (this._buffered >= read.length) {
            // ok we can meet some expectations

            this._reads.shift(); // == read

            var pos = 0,
                count = 0,
                data = new Buffer(read.length);

            // create buffer for all data
            while (pos < read.length) {

                var buf = this._buffers[count++],
                    len = Math.min(buf.length, read.length - pos);

                buf.copy(data, pos, 0, len);
                pos += len;

                // last buffer wasn't used all so just slice it and leave
                if (len != buf.length)
                    this._buffers[--count] = buf.slice(len);
            }

            // remove all used buffers
            if (count > 0)
                this._buffers.splice(0, count);

            this._buffered -= read.length;

            read.func.call(this, data);

        } else {
            // not enought data to satisfy first request in queue
            // so we need to wait for more
            break;
        }
    }

    if (this._buffers && this._buffers.length > 0 && this._buffers[0] == null) {
        this._end();
    }
};

},{"__browserify_Buffer":124,"stream":120,"util":121}],110:[function(require,module,exports){
// Copyright (c) 2012 Kuba Niegowski
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

'use strict';


module.exports = {

    PNG_SIGNATURE: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],

    TYPE_IHDR: 0x49484452,
    TYPE_IEND: 0x49454e44,
    TYPE_IDAT: 0x49444154,
    TYPE_PLTE: 0x504c5445,
    TYPE_tRNS: 0x74524e53,
    TYPE_gAMA: 0x67414d41,

    COLOR_PALETTE: 1,
    COLOR_COLOR: 2,
    COLOR_ALPHA: 4
};

},{}],111:[function(require,module,exports){
// Copyright (c) 2012 Kuba Niegowski
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

'use strict';

var util = require('util'),
    Stream = require('stream');


var CrcStream = module.exports = function() {
    Stream.call(this);

    this._crc = -1;

    this.writable = true;
};
util.inherits(CrcStream, Stream);


CrcStream.prototype.write = function(data) {

    for (var i = 0; i < data.length; i++) {
        this._crc = crcTable[(this._crc ^ data[i]) & 0xff] ^ (this._crc >>> 8);
    }
    return true;
};

CrcStream.prototype.end = function(data) {
    if (data) this.write(data);

    this.emit('crc', this.crc32());
};

CrcStream.prototype.crc32 = function() {
    return this._crc ^ -1;
};


CrcStream.crc32 = function(buf) {

    var crc = -1;
    for (var i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return crc ^ -1;
};



var crcTable = [];

for (var i = 0; i < 256; i++) {
    var c = i;
    for (var j = 0; j < 8; j++) {
        if (c & 1) {
            c = 0xedb88320 ^ (c >>> 1);
        } else {
            c = c >>> 1;
        }
    }
    crcTable[i] = c;
}

},{"stream":120,"util":121}],112:[function(require,module,exports){
var Buffer=require("__browserify_Buffer").Buffer;// Copyright (c) 2012 Kuba Niegowski
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

'use strict';

var util = require('util'),
    zlib = require('zlib'),
    ChunkStream = require('./chunkstream');


var Filter = module.exports = function(width, height, Bpp, data, options) {
    ChunkStream.call(this);

    this._width = width;
    this._height = height;
    this._Bpp = Bpp;
    this._data = data;
    this._options = options;

    this._line = 0;

    if (!('filterType' in options) || options.filterType == -1) {
        options.filterType = [0, 1, 2, 3, 4];
    } else if (typeof options.filterType == 'number') {
        options.filterType = [options.filterType];
    }

    this._filters = {
        0: this._filterNone.bind(this),
        1: this._filterSub.bind(this),
        2: this._filterUp.bind(this),
        3: this._filterAvg.bind(this),
        4: this._filterPaeth.bind(this)
    };

    this.read(this._width * Bpp + 1, this._reverseFilterLine.bind(this));
};
util.inherits(Filter, ChunkStream);


var pixelBppMap = {
    1: { // L
        0: 0,
        1: 0,
        2: 0,
        3: 0xff
    },
    2: { // LA
        0: 0,
        1: 0,
        2: 0,
        3: 1
    },
    3: { // RGB
        0: 0,
        1: 1,
        2: 2,
        3: 0xff
    },
    4: { // RGBA
        0: 0,
        1: 1,
        2: 2,
        3: 3
    }
};

Filter.prototype._reverseFilterLine = function(rawData) {

    var pxData = this._data,
        pxLineLength = this._width << 2,
        pxRowPos = this._line * pxLineLength,
        filter = rawData[0];

    if (filter == 0) {
        for (var x = 0; x < this._width; x++) {
            var pxPos = pxRowPos + (x << 2),
                rawPos = 1 + x * this._Bpp;

            for (var i = 0; i < 4; i++) {
                var idx = pixelBppMap[this._Bpp][i];
                pxData[pxPos + i] = idx != 0xff ? rawData[rawPos + idx] : 0xff;
            }
        }

    } else if (filter == 1) {
        for (var x = 0; x < this._width; x++) {
            var pxPos = pxRowPos + (x << 2),
                rawPos = 1 + x * this._Bpp;

            for (var i = 0; i < 4; i++) {
                var idx = pixelBppMap[this._Bpp][i],
                    left = x > 0 ? pxData[pxPos + i - 4] : 0;

                pxData[pxPos + i] = idx != 0xff ? rawData[rawPos + idx] + left : 0xff;
            }
        }

    } else if (filter == 2) {
        for (var x = 0; x < this._width; x++) {
            var pxPos = pxRowPos + (x << 2),
                rawPos = 1 + x * this._Bpp;

            for (var i = 0; i < 4; i++) {
                var idx = pixelBppMap[this._Bpp][i],
                    up = this._line > 0 ? pxData[pxPos - pxLineLength + i] : 0;

                pxData[pxPos + i] = idx != 0xff ? rawData[rawPos + idx] + up : 0xff;
            }

        }

    } else if (filter == 3) {
        for (var x = 0; x < this._width; x++) {
            var pxPos = pxRowPos + (x << 2),
                rawPos = 1 + x * this._Bpp;

            for (var i = 0; i < 4; i++) {
                var idx = pixelBppMap[this._Bpp][i],
                    left = x > 0 ? pxData[pxPos + i - 4] : 0,
                    up = this._line > 0 ? pxData[pxPos - pxLineLength + i] : 0,
                    add = Math.floor((left + up) / 2);

                 pxData[pxPos + i] = idx != 0xff ? rawData[rawPos + idx] + add : 0xff;
            }

        }

    } else if (filter == 4) {
        for (var x = 0; x < this._width; x++) {
            var pxPos = pxRowPos + (x << 2),
                rawPos = 1 + x * this._Bpp;

            for (var i = 0; i < 4; i++) {
                var idx = pixelBppMap[this._Bpp][i],
                    left = x > 0 ? pxData[pxPos + i - 4] : 0,
                    up = this._line > 0 ? pxData[pxPos - pxLineLength + i] : 0,
                    upLeft = x > 0 && this._line > 0
                            ? pxData[pxPos - pxLineLength + i - 4] : 0,
                    add = PaethPredictor(left, up, upLeft);

                pxData[pxPos + i] = idx != 0xff ? rawData[rawPos + idx] + add : 0xff;
            }
        }
    }


    this._line++;

    if (this._line < this._height)
        this.read(this._width * this._Bpp + 1, this._reverseFilterLine.bind(this));
    else
        this.emit('complete', this._data, this._width, this._height);
};




Filter.prototype.filter = function() {

    var pxData = this._data,
        rawData = new Buffer(((this._width << 2) + 1) * this._height);

    for (var y = 0; y < this._height; y++) {

        // find best filter for this line (with lowest sum of values)
        var filterTypes = this._options.filterType,
            min = Infinity,
            sel = 0;

        for (var i = 0; i < filterTypes.length; i++) {
            var sum = this._filters[filterTypes[i]](pxData, y, null);
            if (sum < min) {
                sel = filterTypes[i];
                min = sum;
            }
        }

        this._filters[sel](pxData, y, rawData);
    }
    return rawData;
};

Filter.prototype._filterNone = function(pxData, y, rawData) {

    var pxRowLength = this._width << 2,
        rawRowLength = pxRowLength + 1,
        sum = 0;

    if (!rawData) {
        for (var x = 0; x < pxRowLength; x++)
            sum += Math.abs(pxData[y * pxRowLength + x]);

    } else {
        rawData[y * rawRowLength] = 0;
        pxData.copy(rawData, rawRowLength * y + 1, pxRowLength * y, pxRowLength * (y + 1));
    }

    return sum;
};

Filter.prototype._filterSub = function(pxData, y, rawData) {

    var pxRowLength = this._width << 2,
        rawRowLength = pxRowLength + 1,
        sum = 0;

    if (rawData)
        rawData[y * rawRowLength] = 1;

    for (var x = 0; x < pxRowLength; x++) {

        var left = x >= 4 ? pxData[y * pxRowLength + x - 4] : 0,
            val = pxData[y * pxRowLength + x] - left;

        if (!rawData) sum += Math.abs(val);
        else rawData[y * rawRowLength + 1 + x] = val;
    }
    return sum;
};

Filter.prototype._filterUp = function(pxData, y, rawData) {

    var pxRowLength = this._width << 2,
        rawRowLength = pxRowLength + 1,
        sum = 0;

    if (rawData)
        rawData[y * rawRowLength] = 2;

    for (var x = 0; x < pxRowLength; x++) {

        var up = y > 0 ? pxData[(y - 1) * pxRowLength + x] : 0,
            val = pxData[y * pxRowLength + x] - up;

        if (!rawData) sum += Math.abs(val);
        else rawData[y * rawRowLength + 1 + x] = val;
    }
    return sum;
};

Filter.prototype._filterAvg = function(pxData, y, rawData) {

    var pxRowLength = this._width << 2,
        rawRowLength = pxRowLength + 1,
        sum = 0;

    if (rawData)
        rawData[y * rawRowLength] = 3;

    for (var x = 0; x < pxRowLength; x++) {

        var left = x >= 4 ? pxData[y * pxRowLength + x - 4] : 0,
            up = y > 0 ? pxData[(y - 1) * pxRowLength + x] : 0,
            val = pxData[y * pxRowLength + x] - ((left + up) >> 1);

        if (!rawData) sum += Math.abs(val);
        else rawData[y * rawRowLength + 1 + x] = val;
    }
    return sum;
};

Filter.prototype._filterPaeth = function(pxData, y, rawData) {

    var pxRowLength = this._width << 2,
        rawRowLength = pxRowLength + 1,
        sum = 0;

    if (rawData)
        rawData[y * rawRowLength] = 4;

    for (var x = 0; x < pxRowLength; x++) {

        var left = x >= 4 ? pxData[y * pxRowLength + x - 4] : 0,
            up = y > 0 ? pxData[(y - 1) * pxRowLength + x] : 0,
            upLeft = x >= 4 && y > 0 ? pxData[(y - 1) * pxRowLength + x - 4] : 0,
            val = pxData[y * pxRowLength + x] - PaethPredictor(left, up, upLeft);

        if (!rawData) sum += Math.abs(val);
        else rawData[y * rawRowLength + 1 + x] = val;
    }
    return sum;
};



var PaethPredictor = function(left, above, upLeft) {

    var p = left + above - upLeft,
        pLeft = Math.abs(p - left),
        pAbove = Math.abs(p - above),
        pUpLeft = Math.abs(p - upLeft);

    if (pLeft <= pAbove && pLeft <= pUpLeft) return left;
    else if (pAbove <= pUpLeft) return above;
    else return upLeft;
};

},{"./chunkstream":109,"__browserify_Buffer":124,"util":121,"zlib":122}],113:[function(require,module,exports){
var Buffer=require("__browserify_Buffer").Buffer;// Copyright (c) 2012 Kuba Niegowski
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

'use strict';


var util = require('util'),
    Stream = require('stream'),
    zlib = require('zlib'),
    Filter = require('./filter'),
    CrcStream = require('./crc'),
    constants = require('./constants');

var bops = require('bops')

var Packer = module.exports = function(options) {
    Stream.call(this);

    this._options = options;

    options.deflateChunkSize = options.deflateChunkSize || 32 * 1024;
    options.deflateLevel = options.deflateLevel || 9;
    options.deflateStrategy = options.deflateStrategy || 3;

    this.readable = true;
};
util.inherits(Packer, Stream);


Packer.prototype.pack = function(data, width, height) {

    // Signature
    this.emit('data', new Buffer(constants.PNG_SIGNATURE));
    this.emit('data', this._packIHDR(width, height));

    // filter pixel data
    var filter = new Filter(width, height, 4, data, this._options);
    var data = filter.filter();

    // compress it
    var deflatejs = require('deflate-js')
    var deflated = deflatejs.deflate(data, this._options.deflateLevel)
    this.emit('data', this._packIDAT(deflated))
    this.emit('data', this._packIEND());
    this.emit('end');
    // var deflate = zlib.createDeflate({
    //         chunkSize: this._options.deflateChunkSize,
    //         level: this._options.deflateLevel,
    //         strategy: this._options.deflateStrategy
    //     });
    // deflate.on('error', this.emit.bind(this, 'error'));
    // 
    // deflate.on('data', function(data) {
    //     this.emit('data', this._packIDAT(data));
    // }.bind(this));
    // 
    // deflate.on('end', function() {
    //     this.emit('data', this._packIEND());
    //     this.emit('end');
    // }.bind(this));
    // 
    // deflate.end(data);
};

Packer.prototype._packChunk = function(type, data) {

    var len = (data ? data.length : 0),
        buf = new Uint8Array(len + 12);

    bops.writeUInt32BE(buf, len, 0);
    bops.writeUInt32BE(buf, type, 4);

    if (data) bops.copy(data, buf, 8);

    bops.writeInt32BE(buf, CrcStream.crc32(bops.subarray(buf, 4, buf.length - 4)), buf.length - 4);
    return buf;
};

Packer.prototype._packIHDR = function(width, height) {

    var buf = new Buffer(13);
    buf.writeUInt32BE(width, 0);
    buf.writeUInt32BE(height, 4);
    buf[8] = 8;
    buf[9] = 6; // colorType
    buf[10] = 0; // compression
    buf[11] = 0; // filter
    buf[12] = 0; // interlace

    return this._packChunk(constants.TYPE_IHDR, buf);
};

Packer.prototype._packIDAT = function(data) {
    return this._packChunk(constants.TYPE_IDAT, data);
};

Packer.prototype._packIEND = function() {
    return this._packChunk(constants.TYPE_IEND, null);
};

},{"./constants":110,"./crc":111,"./filter":112,"__browserify_Buffer":124,"bops":1,"deflate-js":28,"stream":120,"util":121,"zlib":122}],114:[function(require,module,exports){
var Buffer=require("__browserify_Buffer").Buffer;// Copyright (c) 2012 Kuba Niegowski
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

'use strict';


var util = require('util'),
    zlib = require('zlib'),
    CrcStream = require('./crc'),
    ChunkStream = require('./chunkstream'),
    constants = require('./constants'),
    Filter = require('./filter');


var Parser = module.exports = function(options) {
    ChunkStream.call(this);

    this._options = options;
    options.checkCRC = options.checkCRC !== false;

    this._hasIHDR = false;
    this._hasIEND = false;

    this._inflate = null;
    this._filter = null;
    this._crc = null;

    // input flags/metadata
    this._palette = [];
    this._colorType = 0;

    this._chunks = {};
    this._chunks[constants.TYPE_IHDR] = this._handleIHDR.bind(this);
    this._chunks[constants.TYPE_IEND] = this._handleIEND.bind(this);
    this._chunks[constants.TYPE_IDAT] = this._handleIDAT.bind(this);
    this._chunks[constants.TYPE_PLTE] = this._handlePLTE.bind(this);
    this._chunks[constants.TYPE_tRNS] = this._handleTRNS.bind(this);
    this._chunks[constants.TYPE_gAMA] = this._handleGAMA.bind(this);

    this.writable = true;

    this.on('error', this._handleError.bind(this));
    this._handleSignature();
};
util.inherits(Parser, ChunkStream);


Parser.prototype._handleError = function() {

    this.writable = false;

    this.destroy();

    if (this._inflate)
        this._inflate.destroy();
};

Parser.prototype._handleSignature = function() {
    this.read(constants.PNG_SIGNATURE.length,
        this._parseSignature.bind(this)
    );
};

Parser.prototype._parseSignature = function(data) {

    var signature = constants.PNG_SIGNATURE;

    for (var i = 0; i < signature.length; i++) {
        if (data[i] != signature[i]) {
            this.emit('error', new Error('Invalid file signature'));
            return;
        }
    }
    this.read(8, this._parseChunkBegin.bind(this));
};

Parser.prototype._parseChunkBegin = function(data) {

    // chunk content length
    var length = data.readUInt32BE(0);

    // chunk type
    var type = data.readUInt32BE(4),
        name = '';
    for (var i = 4; i < 8; i++)
        name += String.fromCharCode(data[i]);

    // console.log('chunk ', name, length);

    // chunk flags
    var ancillary  = !!(data[4] & 0x20),  // or critical
        priv       = !!(data[5] & 0x20),  // or public
        safeToCopy = !!(data[7] & 0x20);  // or unsafe

    if (!this._hasIHDR && type != constants.TYPE_IHDR) {
        this.emit('error', new Error('Expected IHDR on beggining'));
        return;
    }

    this._crc = new CrcStream();
    this._crc.write(new Buffer(name));

    if (this._chunks[type]) {
        return this._chunks[type](length);

    } else if (!ancillary) {
        this.emit('error', new Error('Unsupported critical chunk type ' + name));
        return;
    } else {
        this.read(length + 4, this._skipChunk.bind(this));
    }
};

Parser.prototype._skipChunk = function(data) {
    this.read(8, this._parseChunkBegin.bind(this));
};

Parser.prototype._handleChunkEnd = function() {
    this.read(4, this._parseChunkEnd.bind(this));
};

Parser.prototype._parseChunkEnd = function(data) {

    var fileCrc = data.readInt32BE(0),
        calcCrc = this._crc.crc32();

    // check CRC
    if (this._options.checkCRC && calcCrc != fileCrc) {
        this.emit('error', new Error('Crc error'));
        return;
    }

    if (this._hasIEND) {
        this.destroySoon();

    } else {
        this.read(8, this._parseChunkBegin.bind(this));
    }
};


Parser.prototype._handleIHDR = function(length) {
    this.read(length, this._parseIHDR.bind(this));
};
Parser.prototype._parseIHDR = function(data) {

    this._crc.write(data);

    var width = data.readUInt32BE(0),
        height = data.readUInt32BE(4),
        depth = data[8],
        colorType = data[9], // bits: 1 palette, 2 color, 4 alpha
        compr = data[10],
        filter = data[11],
        interlace = data[12];

    // console.log('    width', width, 'height', height,
    //     'depth', depth, 'colorType', colorType,
    //     'compr', compr, 'filter', filter, 'interlace', interlace
    // );

    if (depth != 8) {
        this.emit('error', new Error('Unsupported bit depth ' + depth));
        return;
    }
    if (!(colorType in colorTypeToBppMap)) {
        this.emit('error', new Error('Unsupported color type'));
        return;
    }
    if (compr != 0) {
        this.emit('error', new Error('Unsupported compression method'));
        return;
    }
    if (filter != 0) {
        this.emit('error', new Error('Unsupported filter method'));
        return;
    }
    if (interlace != 0) {
        this.emit('error', new Error('Unsupported interlace method'));
        return;
    }

    this._colorType = colorType;

    this._data = new Buffer(width * height * 4);
    this._filter = new Filter(
        width, height,
        colorTypeToBppMap[this._colorType],
        this._data,
        this._options
    );

    this._hasIHDR = true;

    this.emit('metadata', {
        width: width,
        height: height,
        palette: !!(colorType & constants.COLOR_PALETTE),
        color: !!(colorType & constants.COLOR_COLOR),
        alpha: !!(colorType & constants.COLOR_ALPHA),
        data: this._data
    });

    this._handleChunkEnd();
};


Parser.prototype._handlePLTE = function(length) {
    this.read(length, this._parsePLTE.bind(this));
};
Parser.prototype._parsePLTE = function(data) {

    this._crc.write(data);

    var entries = Math.floor(data.length / 3);
    // console.log('Palette:', entries);

    for (var i = 0; i < entries; i++) {
        this._palette.push([
            data.readUInt8(i * 3),
            data.readUInt8(i * 3 + 1),
            data.readUInt8(i * 3 + 2 ),
            0xff
        ]);
    }

    this._handleChunkEnd();
};

Parser.prototype._handleTRNS = function(length) {
    this.read(length, this._parseTRNS.bind(this));
};
Parser.prototype._parseTRNS = function(data) {

    this._crc.write(data);

    // palette
    if (this._colorType == 3) {
        if (this._palette.length == 0) {
            this.emit('error', new Error('Transparency chunk must be after palette'));
            return;
        }
        if (data.length > this._palette.length) {
            this.emit('error', new Error('More transparent colors than palette size'));
            return;
        }
        for (var i = 0; i < this._palette.length; i++) {
            this._palette[i][3] = i < data.length ? data.readUInt8(i) : 0xff;
        }
    }

    // for colorType 0 (grayscale) and 2 (rgb)
    // there might be one gray/color defined as transparent

    this._handleChunkEnd();
};

Parser.prototype._handleGAMA = function(length) {
    this.read(length, this._parseGAMA.bind(this));
};
Parser.prototype._parseGAMA = function(data) {

    this._crc.write(data);
    this.emit('gamma', data.readUInt32BE(0) / 100000);

    this._handleChunkEnd();
};

Parser.prototype._handleIDAT = function(length) {
    this.read(-length, this._parseIDAT.bind(this, length));
};
Parser.prototype._parseIDAT = function(length, data) {

    this._crc.write(data);

    if (this._colorType == 3 && this._palette.length == 0)
        throw new Error('Expected palette not found');

    if (!this._inflate) {
        this._inflate = zlib.createInflate();

        this._inflate.on('error', this.emit.bind(this, 'error'));
        this._filter.on('complete', this._reverseFiltered.bind(this));

        this._inflate.pipe(this._filter);
    }

    this._inflate.write(data);
    length -= data.length;

    if (length > 0)
        this._handleIDAT(length);
    else
        this._handleChunkEnd();
};


Parser.prototype._handleIEND = function(length) {
    this.read(length, this._parseIEND.bind(this));
};
Parser.prototype._parseIEND = function(data) {

    this._crc.write(data);

    // no more data to inflate
    this._inflate.end();

    this._hasIEND = true;
    this._handleChunkEnd();
};


var colorTypeToBppMap = {
    0: 1,
    2: 3,
    3: 1,
    4: 2,
    6: 4
};

Parser.prototype._reverseFiltered = function(data, width, height) {

    if (this._colorType == 3) { // paletted

        // use values from palette
        var pxLineLength = width << 2;

        for (var y = 0; y < height; y++) {
            var pxRowPos = y * pxLineLength;

            for (var x = 0; x < width; x++) {
                var pxPos = pxRowPos + (x << 2),
                    color = this._palette[data[pxPos]];

                for (var i = 0; i < 4; i++)
                    data[pxPos + i] = color[i];
            }
        }
    }

    this.emit('parsed', data);
};

},{"./chunkstream":109,"./constants":110,"./crc":111,"./filter":112,"__browserify_Buffer":124,"util":121,"zlib":122}],115:[function(require,module,exports){
var process=require("__browserify_process"),Buffer=require("__browserify_Buffer").Buffer;// Copyright (c) 2012 Kuba Niegowski
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

'use strict';


var util = require('util'),
    Stream = require('stream'),
    Parser = require('./parser'),
    Packer = require('./packer');


var PNG = exports.PNG = function(options) {
    Stream.call(this);

    options = options || {};

    this.width = options.width || 0;
    this.height = options.height || 0;

    this.data = this.width > 0 && this.height > 0
            ? new Buffer(4 * this.width * this.height) : null;

    this.gamma = 0;
    this.readable = this.writable = true;

    this._parser = new Parser(options || {});

    this._parser.on('error', this.emit.bind(this, 'error'));
    this._parser.on('close', this._handleClose.bind(this));
    this._parser.on('metadata', this._metadata.bind(this));
    this._parser.on('gamma', this._gamma.bind(this));
    this._parser.on('parsed', function(data) {
        this.data = data;
        this.emit('parsed', data);
    }.bind(this));

    this._packer = new Packer(options);
    this._packer.on('data', this.emit.bind(this, 'data'));
    this._packer.on('end', this.emit.bind(this, 'end'));
    this._parser.on('close', this._handleClose.bind(this));
    this._packer.on('error', this.emit.bind(this, 'error'));

};
util.inherits(PNG, Stream);


PNG.prototype.pack = function() {

    process.nextTick(function() {
        this._packer.pack(this.data, this.width, this.height);
    }.bind(this));

    return this;
};


PNG.prototype.parse = function(data, callback) {

    if (callback) {
        var onParsed = null, onError = null;

        this.once('parsed', onParsed = function(data) {
            this.removeListener('error', onError);

            this.data = data;
            callback(null, this);

        }.bind(this));

        this.once('error', onError = function(err) {
            this.removeListener('parsed', onParsed);

            callback(err, null);
        }.bind(this));
    }

    this.end(data);
    return this;
};

PNG.prototype.write = function(data) {
    this._parser.write(data);
    return true;
};

PNG.prototype.end = function(data) {
    this._parser.end(data);
};

PNG.prototype._metadata = function(metadata) {
    this.width = metadata.width;
    this.height = metadata.height;
    this.data = metadata.data;

    delete metadata.data;
    this.emit('metadata', metadata);
};

PNG.prototype._gamma = function(gamma) {
    this.gamma = gamma;
};

PNG.prototype._handleClose = function() {
    if (!this._parser.writable && !this._packer.readable)
        this.emit('close');
};


PNG.prototype.bitblt = function(dst, sx, sy, w, h, dx, dy) {

    var src = this;

    if (sx > src.width || sy > src.height
            || sx + w > src.width || sy + h > src.height)
        throw new Error('bitblt reading outside image');
    if (dx > dst.width || dy > dst.height
            || dx + w > dst.width || dy + h > dst.height)
        throw new Error('bitblt writing outside image');

    for (var y = 0; y < h; y++) {
        src.data.copy(dst.data,
            ((dy + y) * dst.width + dx) << 2,
            ((sy + y) * src.width + sx) << 2,
            ((sy + y) * src.width + sx + w) << 2
        );
    }

    return this;
};

},{"./packer":113,"./parser":114,"__browserify_Buffer":124,"__browserify_process":125,"stream":120,"util":121}],116:[function(require,module,exports){
var process=require("__browserify_process");var Stream = require('stream')

// through
//
// a stream that does nothing but re-emit the input.
// useful for aggregating a series of changing but not ending streams into one stream)

exports = module.exports = through
through.through = through

//create a readable writable stream.

function through (write, end, opts) {
  write = write || function (data) { this.queue(data) }
  end = end || function () { this.queue(null) }

  var ended = false, destroyed = false, buffer = [], _ended = false
  var stream = new Stream()
  stream.readable = stream.writable = true
  stream.paused = false

//  stream.autoPause   = !(opts && opts.autoPause   === false)
  stream.autoDestroy = !(opts && opts.autoDestroy === false)

  stream.write = function (data) {
    write.call(this, data)
    return !stream.paused
  }

  function drain() {
    while(buffer.length && !stream.paused) {
      var data = buffer.shift()
      if(null === data)
        return stream.emit('end')
      else
        stream.emit('data', data)
    }
  }

  stream.queue = stream.push = function (data) {
//    console.error(ended)
    if(_ended) return stream
    if(data == null) _ended = true
    buffer.push(data)
    drain()
    return stream
  }

  //this will be registered as the first 'end' listener
  //must call destroy next tick, to make sure we're after any
  //stream piped from here.
  //this is only a problem if end is not emitted synchronously.
  //a nicer way to do this is to make sure this is the last listener for 'end'

  stream.on('end', function () {
    stream.readable = false
    if(!stream.writable && stream.autoDestroy)
      process.nextTick(function () {
        stream.destroy()
      })
  })

  function _end () {
    stream.writable = false
    end.call(stream)
    if(!stream.readable && stream.autoDestroy)
      stream.destroy()
  }

  stream.end = function (data) {
    if(ended) return
    ended = true
    if(arguments.length) stream.write(data)
    _end() // will emit or queue
    return stream
  }

  stream.destroy = function () {
    if(destroyed) return
    destroyed = true
    ended = true
    buffer.length = 0
    stream.writable = stream.readable = false
    stream.emit('close')
    return stream
  }

  stream.pause = function () {
    if(stream.paused) return
    stream.paused = true
    return stream
  }

  stream.resume = function () {
    if(stream.paused) {
      stream.paused = false
      stream.emit('resume')
    }
    drain()
    //may have become paused again,
    //as drain emits 'data'.
    if(!stream.paused)
      stream.emit('drain')
    return stream
  }
  return stream
}


},{"__browserify_process":125,"stream":120}],117:[function(require,module,exports){
"use strict"

var PNG = require("pngjs").PNG
var through = require("through")

function handleData(array, data) {
  var i, j, ptr = 0, c
  if(array.shape.length === 3) {
    if(array.shape[2] === 3) {
      for(i=0; i<array.shape[0]; ++i) {
        for(j=0; j<array.shape[1]; ++j) {
          data[ptr++] = array.get(i,j,0)>>>0
          data[ptr++] = array.get(i,j,1)>>>0
          data[ptr++] = array.get(i,j,2)>>>0
          data[ptr++] = 255
        }
      }
    } else if(array.shape[2] === 4) {
      for(i=0; i<array.shape[0]; ++i) {
        for(j=0; j<array.shape[1]; ++j) {
          data[ptr++] = array.get(i,j,0)>>>0
          data[ptr++] = array.get(i,j,1)>>>0
          data[ptr++] = array.get(i,j,2)>>>0
          data[ptr++] = array.get(i,j,3)>>>0
        }
      }
    } else if(array.shape[3] === 1) {
      for(i=0; i<array.shape[0]; ++i) {
        for(j=0; j<array.shape[1]; ++j) {
          var c = array.get(i,j,0)>>>0
          data[ptr++] = c
          data[ptr++] = c
          data[ptr++] = c
          data[ptr++] = 255
        }
      }
    } else {
      return new Error("Incompatible array shape")
    }
  } else if(array.shape.length === 2) {
    for(i=0; i<array.shape[0]; ++i) {
      for(j=0; j<array.shape[1]; ++j) {
        var c = array.get(i,j,0)>>>0
        data[ptr++] = c
        data[ptr++] = c
        data[ptr++] = c
        data[ptr++] = 255
      }
    }
  } else {
    return new Error("Incompatible array shape")
  }
  return data
}

function haderror(err) {
  var result = through()
  result.emit("error", err)
  return result
}

module.exports = function savePixels(array, type) {
  switch(type.toUpperCase()) {
    case "PNG":
    case ".PNG":
      var png = new PNG({
        width: array.shape[1],
        height: array.shape[0]
      })
      var data = handleData(array, png.data)
      if (typeof data === "Error") return haderror(data)
      png.data = data
      return png.pack()

    case "CANVAS":
      var canvas = document.createElement("canvas")
      var context = canvas.getContext("2d")
      canvas.width = array.shape[1]
      canvas.height = array.shape[0]
      var imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      var data = imageData.data
      data = handleData(array, data)
      if (typeof data === "Error") return haderror(data)
      context.putImageData(imageData, 0, 0)
      return canvas
    
    default:
      return haderror(new Error("Unsupported file type: " + type))
  }
}

},{"pngjs":115,"through":116}],118:[function(require,module,exports){
var global = window
var Parser = require('psd').Parser
var ndarray = require('ndarray')
var savePixels = require('save-pixels')
var concat = require('concat-stream')

var body = document.body

function noop(event) {
  event.preventDefault()
  event.stopPropagation()
  return false
}

['dragenter',
 'dragleave',
 'dragexit',
 'dragover'
].forEach(function (eventType) {
   body.addEventListener(eventType, noop)
})

body.addEventListener('drop', function (event) {
  event.stopPropagation()
  event.preventDefault()

  var firstFile = event.dataTransfer.files[0]
  var reader = new FileReader();
  reader.onload = function(e) {
    var canvas = convertPSD(e.target.result)
    body.appendChild(canvas)
  }
  reader.readAsArrayBuffer(firstFile)

  return false
})

function convertPSD(data) {
  var psd = new Parser(data);
  psd.parse();

  var height = psd.header.rows;
  var width = psd.header.columns;

  var pixels = ndarray(new Uint8Array(height * width * 3), [height, width, 3])
  var channels = psd.imageData.image.channel;

  var color = psd.imageData.createColor(psd.header, psd.colorModeData);

  var x, y, index;
  for(y = 0; y < height; ++y) {
    for(x = 0; x < width; ++x) {
      index = (y * width + x);
      pixels.set(y, x, 0, color[0][index])
      pixels.set(y, x, 1, color[1][index])
      pixels.set(y, x, 2, color[2][index])
    }
  }

  return savePixels(pixels, "canvas")
}

},{"concat-stream":14,"ndarray":31,"psd":33,"save-pixels":117}],119:[function(require,module,exports){
var process=require("__browserify_process");if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;
function indexOf (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (x === xs[i]) return i;
    }
    return -1;
}

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = indexOf(list, listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  if (arguments.length === 0) {
    this._events = {};
    return this;
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (typeof emitter._events[type] === 'function')
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

},{"__browserify_process":125}],120:[function(require,module,exports){
var events = require('events');
var util = require('util');

function Stream() {
  events.EventEmitter.call(this);
}
util.inherits(Stream, events.EventEmitter);
module.exports = Stream;
// Backwards-compat with node 0.4.x
Stream.Stream = Stream;

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once, and
  // only when all sources have ended.
  if (!dest._isStdio && (!options || options.end !== false)) {
    dest._pipeCount = dest._pipeCount || 0;
    dest._pipeCount++;

    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest._pipeCount--;

    // remove the listeners
    cleanup();

    if (dest._pipeCount > 0) {
      // waiting for other incoming streams to end.
      return;
    }

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest._pipeCount--;

    // remove the listeners
    cleanup();

    if (dest._pipeCount > 0) {
      // waiting for other incoming streams to end.
      return;
    }

    dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (this.listeners('error').length === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('end', cleanup);
    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('end', cleanup);
  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":119,"util":121}],121:[function(require,module,exports){
var events = require('events');

exports.isArray = isArray;
exports.isDate = function(obj){return Object.prototype.toString.call(obj) === '[object Date]'};
exports.isRegExp = function(obj){return Object.prototype.toString.call(obj) === '[object RegExp]'};


exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
          'italic' : [3, 23],
          'underline' : [4, 24],
          'inverse' : [7, 27],
          'white' : [37, 39],
          'grey' : [90, 39],
          'black' : [30, 39],
          'blue' : [34, 39],
          'cyan' : [36, 39],
          'green' : [32, 39],
          'magenta' : [35, 39],
          'red' : [31, 39],
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\u001b[' + styles[style][0] + 'm' + str +
             '\u001b[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {
    stylize = function(str, styleType) { return str; };
  }

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object_keys(value);
    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > 50) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return Array.isArray(ar) ||
         (typeof ar === 'object' && Object.prototype.toString.call(ar) === '[object Array]');
}


function isRegExp(re) {
  typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]';
}


function isDate(d) {
  return typeof d === 'object' && Object.prototype.toString.call(d) === '[object Date]';
}

function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}

exports.log = function (msg) {};

exports.pump = null;

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
};

var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
    var res = [];
    for (var key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) res.push(key);
    }
    return res;
};

var Object_create = Object.create || function (prototype, properties) {
    // from es5-shim
    var object;
    if (prototype === null) {
        object = { '__proto__' : null };
    }
    else {
        if (typeof prototype !== 'object') {
            throw new TypeError(
                'typeof prototype[' + (typeof prototype) + '] != \'object\''
            );
        }
        var Type = function () {};
        Type.prototype = prototype;
        object = new Type();
        object.__proto__ = prototype;
    }
    if (typeof properties !== 'undefined' && Object.defineProperties) {
        Object.defineProperties(object, properties);
    }
    return object;
};

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object_create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (typeof f !== 'string') {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(exports.inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j': return JSON.stringify(args[i++]);
      default:
        return x;
    }
  });
  for(var x = args[i]; i < len; x = args[++i]){
    if (x === null || typeof x !== 'object') {
      str += ' ' + x;
    } else {
      str += ' ' + exports.inspect(x);
    }
  }
  return str;
};

},{"events":119}],122:[function(require,module,exports){
var Buffer=require("__browserify_Buffer").Buffer;const Zlib = module.exports = require('./zlib');

// the least I can do is make error messages for the rest of the node.js/zlib api.
// (thanks, dominictarr)
function error () {
  var m = [].slice.call(arguments).join(' ')
  throw new Error([
    m,
    'we accept pull requests',
    'http://github.com/brianloveswords/zlib-browserify'
    ].join('\n'))
}

;['createGzip'
, 'createGunzip'
, 'createDeflate'
, 'createDeflateRaw'
, 'createInflate'
, 'createInflateRaw'
, 'createUnzip'
, 'Gzip'
, 'Gunzip'
, 'Inflate'
, 'InflateRaw'
, 'Deflate'
, 'DeflateRaw'
, 'Unzip'
, 'inflateRaw'
, 'deflateRaw'].forEach(function (name) {
  Zlib[name] = function () {
    error('sorry,', name, 'is not implemented yet')
  }
});

const _deflate = Zlib.deflate;
const _gzip = Zlib.gzip;

Zlib.deflate = function deflate(stringOrBuffer, callback) {
  return _deflate(Buffer(stringOrBuffer), callback);
};
Zlib.gzip = function gzip(stringOrBuffer, callback) {
  return _gzip(Buffer(stringOrBuffer), callback);
};
},{"./zlib":123,"__browserify_Buffer":124}],123:[function(require,module,exports){
var process=require("__browserify_process"),Buffer=require("__browserify_Buffer").Buffer;/** @license zlib.js 2012 - imaya [ https://github.com/imaya/zlib.js ] The MIT License */
(function() {'use strict';function m(c){throw c;}var r=void 0,u=!0;var B="undefined"!==typeof Uint8Array&&"undefined"!==typeof Uint16Array&&"undefined"!==typeof Uint32Array;function aa(c){if("string"===typeof c){var a=c.split(""),b,e;b=0;for(e=a.length;b<e;b++)a[b]=(a[b].charCodeAt(0)&255)>>>0;c=a}for(var f=1,d=0,g=c.length,h,j=0;0<g;){h=1024<g?1024:g;g-=h;do f+=c[j++],d+=f;while(--h);f%=65521;d%=65521}return(d<<16|f)>>>0};function I(c,a){this.index="number"===typeof a?a:0;this.n=0;this.buffer=c instanceof(B?Uint8Array:Array)?c:new (B?Uint8Array:Array)(32768);2*this.buffer.length<=this.index&&m(Error("invalid index"));this.buffer.length<=this.index&&this.f()}I.prototype.f=function(){var c=this.buffer,a,b=c.length,e=new (B?Uint8Array:Array)(b<<1);if(B)e.set(c);else for(a=0;a<b;++a)e[a]=c[a];return this.buffer=e};
I.prototype.d=function(c,a,b){var e=this.buffer,f=this.index,d=this.n,g=e[f],h;b&&1<a&&(c=8<a?(K[c&255]<<24|K[c>>>8&255]<<16|K[c>>>16&255]<<8|K[c>>>24&255])>>32-a:K[c]>>8-a);if(8>a+d)g=g<<a|c,d+=a;else for(h=0;h<a;++h)g=g<<1|c>>a-h-1&1,8===++d&&(d=0,e[f++]=K[g],g=0,f===e.length&&(e=this.f()));e[f]=g;this.buffer=e;this.n=d;this.index=f};I.prototype.finish=function(){var c=this.buffer,a=this.index,b;0<this.n&&(c[a]<<=8-this.n,c[a]=K[c[a]],a++);B?b=c.subarray(0,a):(c.length=a,b=c);return b};
var ba=new (B?Uint8Array:Array)(256),Q;for(Q=0;256>Q;++Q){for(var R=Q,ga=R,ha=7,R=R>>>1;R;R>>>=1)ga<<=1,ga|=R&1,--ha;ba[Q]=(ga<<ha&255)>>>0}var K=ba;var S={k:function(c,a,b){return S.update(c,0,a,b)},update:function(c,a,b,e){for(var f=S.L,d="number"===typeof b?b:b=0,g="number"===typeof e?e:c.length,a=a^4294967295,d=g&7;d--;++b)a=a>>>8^f[(a^c[b])&255];for(d=g>>3;d--;b+=8)a=a>>>8^f[(a^c[b])&255],a=a>>>8^f[(a^c[b+1])&255],a=a>>>8^f[(a^c[b+2])&255],a=a>>>8^f[(a^c[b+3])&255],a=a>>>8^f[(a^c[b+4])&255],a=a>>>8^f[(a^c[b+5])&255],a=a>>>8^f[(a^c[b+6])&255],a=a>>>8^f[(a^c[b+7])&255];return(a^4294967295)>>>0}},ia=S,ja,ka=[0,1996959894,3993919788,2567524794,
124634137,1886057615,3915621685,2657392035,249268274,2044508324,3772115230,2547177864,162941995,2125561021,3887607047,2428444049,498536548,1789927666,4089016648,2227061214,450548861,1843258603,4107580753,2211677639,325883990,1684777152,4251122042,2321926636,335633487,1661365465,4195302755,2366115317,997073096,1281953886,3579855332,2724688242,1006888145,1258607687,3524101629,2768942443,901097722,1119000684,3686517206,2898065728,853044451,1172266101,3705015759,2882616665,651767980,1373503546,3369554304,
3218104598,565507253,1454621731,3485111705,3099436303,671266974,1594198024,3322730930,2970347812,795835527,1483230225,3244367275,3060149565,1994146192,31158534,2563907772,4023717930,1907459465,112637215,2680153253,3904427059,2013776290,251722036,2517215374,3775830040,2137656763,141376813,2439277719,3865271297,1802195444,476864866,2238001368,4066508878,1812370925,453092731,2181625025,4111451223,1706088902,314042704,2344532202,4240017532,1658658271,366619977,2362670323,4224994405,1303535960,984961486,
2747007092,3569037538,1256170817,1037604311,2765210733,3554079995,1131014506,879679996,2909243462,3663771856,1141124467,855842277,2852801631,3708648649,1342533948,654459306,3188396048,3373015174,1466479909,544179635,3110523913,3462522015,1591671054,702138776,2966460450,3352799412,1504918807,783551873,3082640443,3233442989,3988292384,2596254646,62317068,1957810842,3939845945,2647816111,81470997,1943803523,3814918930,2489596804,225274430,2053790376,3826175755,2466906013,167816743,2097651377,4027552580,
2265490386,503444072,1762050814,4150417245,2154129355,426522225,1852507879,4275313526,2312317920,282753626,1742555852,4189708143,2394877945,397917763,1622183637,3604390888,2714866558,953729732,1340076626,3518719985,2797360999,1068828381,1219638859,3624741850,2936675148,906185462,1090812512,3747672003,2825379669,829329135,1181335161,3412177804,3160834842,628085408,1382605366,3423369109,3138078467,570562233,1426400815,3317316542,2998733608,733239954,1555261956,3268935591,3050360625,752459403,1541320221,
2607071920,3965973030,1969922972,40735498,2617837225,3943577151,1913087877,83908371,2512341634,3803740692,2075208622,213261112,2463272603,3855990285,2094854071,198958881,2262029012,4057260610,1759359992,534414190,2176718541,4139329115,1873836001,414664567,2282248934,4279200368,1711684554,285281116,2405801727,4167216745,1634467795,376229701,2685067896,3608007406,1308918612,956543938,2808555105,3495958263,1231636301,1047427035,2932959818,3654703836,1088359270,936918E3,2847714899,3736837829,1202900863,
817233897,3183342108,3401237130,1404277552,615818150,3134207493,3453421203,1423857449,601450431,3009837614,3294710456,1567103746,711928724,3020668471,3272380065,1510334235,755167117];ja=B?new Uint32Array(ka):ka;ia.L=ja;function na(){};function oa(c){this.buffer=new (B?Uint16Array:Array)(2*c);this.length=0}oa.prototype.getParent=function(c){return 2*((c-2)/4|0)};oa.prototype.push=function(c,a){var b,e,f=this.buffer,d;b=this.length;f[this.length++]=a;for(f[this.length++]=c;0<b;)if(e=this.getParent(b),f[b]>f[e])d=f[b],f[b]=f[e],f[e]=d,d=f[b+1],f[b+1]=f[e+1],f[e+1]=d,b=e;else break;return this.length};
oa.prototype.pop=function(){var c,a,b=this.buffer,e,f,d;a=b[0];c=b[1];this.length-=2;b[0]=b[this.length];b[1]=b[this.length+1];for(d=0;;){f=2*d+2;if(f>=this.length)break;f+2<this.length&&b[f+2]>b[f]&&(f+=2);if(b[f]>b[d])e=b[d],b[d]=b[f],b[f]=e,e=b[d+1],b[d+1]=b[f+1],b[f+1]=e;else break;d=f}return{index:c,value:a,length:this.length}};function T(c){var a=c.length,b=0,e=Number.POSITIVE_INFINITY,f,d,g,h,j,i,q,l,k;for(l=0;l<a;++l)c[l]>b&&(b=c[l]),c[l]<e&&(e=c[l]);f=1<<b;d=new (B?Uint32Array:Array)(f);g=1;h=0;for(j=2;g<=b;){for(l=0;l<a;++l)if(c[l]===g){i=0;q=h;for(k=0;k<g;++k)i=i<<1|q&1,q>>=1;for(k=i;k<f;k+=j)d[k]=g<<16|l;++h}++g;h<<=1;j<<=1}return[d,b,e]};function pa(c,a){this.l=qa;this.F=0;this.input=c;this.b=0;a&&(a.lazy&&(this.F=a.lazy),"number"===typeof a.compressionType&&(this.l=a.compressionType),a.outputBuffer&&(this.a=B&&a.outputBuffer instanceof Array?new Uint8Array(a.outputBuffer):a.outputBuffer),"number"===typeof a.outputIndex&&(this.b=a.outputIndex));this.a||(this.a=new (B?Uint8Array:Array)(32768))}var qa=2,ra={NONE:0,K:1,u:qa,W:3},sa=[],U;
for(U=0;288>U;U++)switch(u){case 143>=U:sa.push([U+48,8]);break;case 255>=U:sa.push([U-144+400,9]);break;case 279>=U:sa.push([U-256+0,7]);break;case 287>=U:sa.push([U-280+192,8]);break;default:m("invalid literal: "+U)}
pa.prototype.h=function(){var c,a,b,e,f=this.input;switch(this.l){case 0:b=0;for(e=f.length;b<e;){a=B?f.subarray(b,b+65535):f.slice(b,b+65535);b+=a.length;var d=a,g=b===e,h=r,j=r,i=r,q=r,l=r,k=this.a,p=this.b;if(B){for(k=new Uint8Array(this.a.buffer);k.length<=p+d.length+5;)k=new Uint8Array(k.length<<1);k.set(this.a)}h=g?1:0;k[p++]=h|0;j=d.length;i=~j+65536&65535;k[p++]=j&255;k[p++]=j>>>8&255;k[p++]=i&255;k[p++]=i>>>8&255;if(B)k.set(d,p),p+=d.length,k=k.subarray(0,p);else{q=0;for(l=d.length;q<l;++q)k[p++]=
d[q];k.length=p}this.b=p;this.a=k}break;case 1:var t=new I(new Uint8Array(this.a.buffer),this.b);t.d(1,1,u);t.d(1,2,u);var v=ta(this,f),x,F,w;x=0;for(F=v.length;x<F;x++)if(w=v[x],I.prototype.d.apply(t,sa[w]),256<w)t.d(v[++x],v[++x],u),t.d(v[++x],5),t.d(v[++x],v[++x],u);else if(256===w)break;this.a=t.finish();this.b=this.a.length;break;case qa:var A=new I(new Uint8Array(this.a),this.b),C,n,s,E,D,ca=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],V,La,da,Ma,la,va=Array(19),Na,Z,ma,G,Oa;C=qa;A.d(1,
1,u);A.d(C,2,u);n=ta(this,f);V=ua(this.T,15);La=wa(V);da=ua(this.S,7);Ma=wa(da);for(s=286;257<s&&0===V[s-1];s--);for(E=30;1<E&&0===da[E-1];E--);var Pa=s,Qa=E,M=new (B?Uint32Array:Array)(Pa+Qa),y,N,z,ea,L=new (B?Uint32Array:Array)(316),J,H,O=new (B?Uint8Array:Array)(19);for(y=N=0;y<Pa;y++)M[N++]=V[y];for(y=0;y<Qa;y++)M[N++]=da[y];if(!B){y=0;for(ea=O.length;y<ea;++y)O[y]=0}y=J=0;for(ea=M.length;y<ea;y+=N){for(N=1;y+N<ea&&M[y+N]===M[y];++N);z=N;if(0===M[y])if(3>z)for(;0<z--;)L[J++]=0,O[0]++;else for(;0<
z;)H=138>z?z:138,H>z-3&&H<z&&(H=z-3),10>=H?(L[J++]=17,L[J++]=H-3,O[17]++):(L[J++]=18,L[J++]=H-11,O[18]++),z-=H;else if(L[J++]=M[y],O[M[y]]++,z--,3>z)for(;0<z--;)L[J++]=M[y],O[M[y]]++;else for(;0<z;)H=6>z?z:6,H>z-3&&H<z&&(H=z-3),L[J++]=16,L[J++]=H-3,O[16]++,z-=H}c=B?L.subarray(0,J):L.slice(0,J);la=ua(O,7);for(G=0;19>G;G++)va[G]=la[ca[G]];for(D=19;4<D&&0===va[D-1];D--);Na=wa(la);A.d(s-257,5,u);A.d(E-1,5,u);A.d(D-4,4,u);for(G=0;G<D;G++)A.d(va[G],3,u);G=0;for(Oa=c.length;G<Oa;G++)if(Z=c[G],A.d(Na[Z],
la[Z],u),16<=Z){G++;switch(Z){case 16:ma=2;break;case 17:ma=3;break;case 18:ma=7;break;default:m("invalid code: "+Z)}A.d(c[G],ma,u)}var Ra=[La,V],Sa=[Ma,da],P,Ta,fa,ya,Ua,Va,Wa,Xa;Ua=Ra[0];Va=Ra[1];Wa=Sa[0];Xa=Sa[1];P=0;for(Ta=n.length;P<Ta;++P)if(fa=n[P],A.d(Ua[fa],Va[fa],u),256<fa)A.d(n[++P],n[++P],u),ya=n[++P],A.d(Wa[ya],Xa[ya],u),A.d(n[++P],n[++P],u);else if(256===fa)break;this.a=A.finish();this.b=this.a.length;break;default:m("invalid compression type")}return this.a};
function xa(c,a){this.length=c;this.N=a}
function za(){var c=Aa;switch(u){case 3===c:return[257,c-3,0];case 4===c:return[258,c-4,0];case 5===c:return[259,c-5,0];case 6===c:return[260,c-6,0];case 7===c:return[261,c-7,0];case 8===c:return[262,c-8,0];case 9===c:return[263,c-9,0];case 10===c:return[264,c-10,0];case 12>=c:return[265,c-11,1];case 14>=c:return[266,c-13,1];case 16>=c:return[267,c-15,1];case 18>=c:return[268,c-17,1];case 22>=c:return[269,c-19,2];case 26>=c:return[270,c-23,2];case 30>=c:return[271,c-27,2];case 34>=c:return[272,c-
31,2];case 42>=c:return[273,c-35,3];case 50>=c:return[274,c-43,3];case 58>=c:return[275,c-51,3];case 66>=c:return[276,c-59,3];case 82>=c:return[277,c-67,4];case 98>=c:return[278,c-83,4];case 114>=c:return[279,c-99,4];case 130>=c:return[280,c-115,4];case 162>=c:return[281,c-131,5];case 194>=c:return[282,c-163,5];case 226>=c:return[283,c-195,5];case 257>=c:return[284,c-227,5];case 258===c:return[285,c-258,0];default:m("invalid length: "+c)}}var Ba=[],Aa,Ca;
for(Aa=3;258>=Aa;Aa++)Ca=za(),Ba[Aa]=Ca[2]<<24|Ca[1]<<16|Ca[0];var Da=B?new Uint32Array(Ba):Ba;
function ta(c,a){function b(a,c){var b=a.N,d=[],e=0,f;f=Da[a.length];d[e++]=f&65535;d[e++]=f>>16&255;d[e++]=f>>24;var g;switch(u){case 1===b:g=[0,b-1,0];break;case 2===b:g=[1,b-2,0];break;case 3===b:g=[2,b-3,0];break;case 4===b:g=[3,b-4,0];break;case 6>=b:g=[4,b-5,1];break;case 8>=b:g=[5,b-7,1];break;case 12>=b:g=[6,b-9,2];break;case 16>=b:g=[7,b-13,2];break;case 24>=b:g=[8,b-17,3];break;case 32>=b:g=[9,b-25,3];break;case 48>=b:g=[10,b-33,4];break;case 64>=b:g=[11,b-49,4];break;case 96>=b:g=[12,b-
65,5];break;case 128>=b:g=[13,b-97,5];break;case 192>=b:g=[14,b-129,6];break;case 256>=b:g=[15,b-193,6];break;case 384>=b:g=[16,b-257,7];break;case 512>=b:g=[17,b-385,7];break;case 768>=b:g=[18,b-513,8];break;case 1024>=b:g=[19,b-769,8];break;case 1536>=b:g=[20,b-1025,9];break;case 2048>=b:g=[21,b-1537,9];break;case 3072>=b:g=[22,b-2049,10];break;case 4096>=b:g=[23,b-3073,10];break;case 6144>=b:g=[24,b-4097,11];break;case 8192>=b:g=[25,b-6145,11];break;case 12288>=b:g=[26,b-8193,12];break;case 16384>=
b:g=[27,b-12289,12];break;case 24576>=b:g=[28,b-16385,13];break;case 32768>=b:g=[29,b-24577,13];break;default:m("invalid distance")}f=g;d[e++]=f[0];d[e++]=f[1];d[e++]=f[2];var h,i;h=0;for(i=d.length;h<i;++h)k[p++]=d[h];v[d[0]]++;x[d[3]]++;t=a.length+c-1;l=null}var e,f,d,g,h,j={},i,q,l,k=B?new Uint16Array(2*a.length):[],p=0,t=0,v=new (B?Uint32Array:Array)(286),x=new (B?Uint32Array:Array)(30),F=c.F,w;if(!B){for(d=0;285>=d;)v[d++]=0;for(d=0;29>=d;)x[d++]=0}v[256]=1;e=0;for(f=a.length;e<f;++e){d=h=0;
for(g=3;d<g&&e+d!==f;++d)h=h<<8|a[e+d];j[h]===r&&(j[h]=[]);i=j[h];if(!(0<t--)){for(;0<i.length&&32768<e-i[0];)i.shift();if(e+3>=f){l&&b(l,-1);d=0;for(g=f-e;d<g;++d)w=a[e+d],k[p++]=w,++v[w];break}if(0<i.length){var A=r,C=r,n=0,s=r,E=r,D=r,ca=r,V=a.length,E=0,ca=i.length;a:for(;E<ca;E++){A=i[ca-E-1];s=3;if(3<n){for(D=n;3<D;D--)if(a[A+D-1]!==a[e+D-1])continue a;s=n}for(;258>s&&e+s<V&&a[A+s]===a[e+s];)++s;s>n&&(C=A,n=s);if(258===s)break}q=new xa(n,e-C);l?l.length<q.length?(w=a[e-1],k[p++]=w,++v[w],b(q,
0)):b(l,-1):q.length<F?l=q:b(q,0)}else l?b(l,-1):(w=a[e],k[p++]=w,++v[w])}i.push(e)}k[p++]=256;v[256]++;c.T=v;c.S=x;return B?k.subarray(0,p):k}
function ua(c,a){function b(a){var c=x[a][F[a]];c===l?(b(a+1),b(a+1)):--t[c];++F[a]}var e=c.length,f=new oa(572),d=new (B?Uint8Array:Array)(e),g,h,j,i,q;if(!B)for(i=0;i<e;i++)d[i]=0;for(i=0;i<e;++i)0<c[i]&&f.push(i,c[i]);g=Array(f.length/2);h=new (B?Uint32Array:Array)(f.length/2);if(1===g.length)return d[f.pop().index]=1,d;i=0;for(q=f.length/2;i<q;++i)g[i]=f.pop(),h[i]=g[i].value;var l=h.length,k=new (B?Uint16Array:Array)(a),p=new (B?Uint8Array:Array)(a),t=new (B?Uint8Array:Array)(l),v=Array(a),x=
Array(a),F=Array(a),w=(1<<a)-l,A=1<<a-1,C,n,s,E,D;k[a-1]=l;for(n=0;n<a;++n)w<A?p[n]=0:(p[n]=1,w-=A),w<<=1,k[a-2-n]=(k[a-1-n]/2|0)+l;k[0]=p[0];v[0]=Array(k[0]);x[0]=Array(k[0]);for(n=1;n<a;++n)k[n]>2*k[n-1]+p[n]&&(k[n]=2*k[n-1]+p[n]),v[n]=Array(k[n]),x[n]=Array(k[n]);for(C=0;C<l;++C)t[C]=a;for(s=0;s<k[a-1];++s)v[a-1][s]=h[s],x[a-1][s]=s;for(C=0;C<a;++C)F[C]=0;1===p[a-1]&&(--t[0],++F[a-1]);for(n=a-2;0<=n;--n){E=C=0;D=F[n+1];for(s=0;s<k[n];s++)E=v[n+1][D]+v[n+1][D+1],E>h[C]?(v[n][s]=E,x[n][s]=l,D+=2):
(v[n][s]=h[C],x[n][s]=C,++C);F[n]=0;1===p[n]&&b(n)}j=t;i=0;for(q=g.length;i<q;++i)d[g[i].index]=j[i];return d}function wa(c){var a=new (B?Uint16Array:Array)(c.length),b=[],e=[],f=0,d,g,h,j;d=0;for(g=c.length;d<g;d++)b[c[d]]=(b[c[d]]|0)+1;d=1;for(g=16;d<=g;d++)e[d]=f,f+=b[d]|0,f<<=1;d=0;for(g=c.length;d<g;d++){f=e[c[d]];e[c[d]]+=1;h=a[d]=0;for(j=c[d];h<j;h++)a[d]=a[d]<<1|f&1,f>>>=1}return a};function Ea(c,a){this.input=c;this.a=new (B?Uint8Array:Array)(32768);this.l=Fa.u;var b={},e;if((a||!(a={}))&&"number"===typeof a.compressionType)this.l=a.compressionType;for(e in a)b[e]=a[e];b.outputBuffer=this.a;this.H=new pa(this.input,b)}var Fa=ra;
Ea.prototype.h=function(){var c,a,b,e,f,d,g,h=0;g=this.a;c=Ga;switch(c){case Ga:a=Math.LOG2E*Math.log(32768)-8;break;default:m(Error("invalid compression method"))}b=a<<4|c;g[h++]=b;switch(c){case Ga:switch(this.l){case Fa.NONE:f=0;break;case Fa.K:f=1;break;case Fa.u:f=2;break;default:m(Error("unsupported compression type"))}break;default:m(Error("invalid compression method"))}e=f<<6|0;g[h++]=e|31-(256*b+e)%31;d=aa(this.input);this.H.b=h;g=this.H.h();h=g.length;B&&(g=new Uint8Array(g.buffer),g.length<=
h+4&&(this.a=new Uint8Array(g.length+4),this.a.set(g),g=this.a),g=g.subarray(0,h+4));g[h++]=d>>24&255;g[h++]=d>>16&255;g[h++]=d>>8&255;g[h++]=d&255;return g};function Ha(c,a){this.input=c;this.b=this.c=0;this.g={};a&&(a.flags&&(this.g=a.flags),"string"===typeof a.filename&&(this.filename=a.filename),"string"===typeof a.comment&&(this.comment=a.comment),a.deflateOptions&&(this.m=a.deflateOptions));this.m||(this.m={})}
Ha.prototype.h=function(){var c,a,b,e,f,d,g,h,j=new (B?Uint8Array:Array)(32768),i=0,q=this.input,l=this.c,k=this.filename,p=this.comment;j[i++]=31;j[i++]=139;j[i++]=8;c=0;this.g.fname&&(c|=Ia);this.g.fcomment&&(c|=Ja);this.g.fhcrc&&(c|=Ka);j[i++]=c;a=(Date.now?Date.now():+new Date)/1E3|0;j[i++]=a&255;j[i++]=a>>>8&255;j[i++]=a>>>16&255;j[i++]=a>>>24&255;j[i++]=0;j[i++]=Ya;if(this.g.fname!==r){g=0;for(h=k.length;g<h;++g)d=k.charCodeAt(g),255<d&&(j[i++]=d>>>8&255),j[i++]=d&255;j[i++]=0}if(this.g.comment){g=
0;for(h=p.length;g<h;++g)d=p.charCodeAt(g),255<d&&(j[i++]=d>>>8&255),j[i++]=d&255;j[i++]=0}this.g.fhcrc&&(b=S.k(j,0,i)&65535,j[i++]=b&255,j[i++]=b>>>8&255);this.m.outputBuffer=j;this.m.outputIndex=i;f=new pa(q,this.m);j=f.h();i=f.b;B&&(i+8>j.buffer.byteLength?(this.a=new Uint8Array(i+8),this.a.set(new Uint8Array(j.buffer)),j=this.a):j=new Uint8Array(j.buffer));e=S.k(q);j[i++]=e&255;j[i++]=e>>>8&255;j[i++]=e>>>16&255;j[i++]=e>>>24&255;h=q.length;j[i++]=h&255;j[i++]=h>>>8&255;j[i++]=h>>>16&255;j[i++]=
h>>>24&255;this.c=l;B&&i<j.length&&(this.a=j=j.subarray(0,i));return j};var Ya=255,Ka=2,Ia=8,Ja=16;function W(c,a){this.p=[];this.q=32768;this.e=this.j=this.c=this.t=0;this.input=B?new Uint8Array(c):c;this.v=!1;this.r=Za;this.J=!1;if(a||!(a={}))a.index&&(this.c=a.index),a.bufferSize&&(this.q=a.bufferSize),a.bufferType&&(this.r=a.bufferType),a.resize&&(this.J=a.resize);switch(this.r){case $a:this.b=32768;this.a=new (B?Uint8Array:Array)(32768+this.q+258);break;case Za:this.b=0;this.a=new (B?Uint8Array:Array)(this.q);this.f=this.R;this.z=this.O;this.s=this.Q;break;default:m(Error("invalid inflate mode"))}}
var $a=0,Za=1;
W.prototype.i=function(){for(;!this.v;){var c=X(this,3);c&1&&(this.v=u);c>>>=1;switch(c){case 0:var a=this.input,b=this.c,e=this.a,f=this.b,d=r,g=r,h=r,j=e.length,i=r;this.e=this.j=0;d=a[b++];d===r&&m(Error("invalid uncompressed block header: LEN (first byte)"));g=d;d=a[b++];d===r&&m(Error("invalid uncompressed block header: LEN (second byte)"));g|=d<<8;d=a[b++];d===r&&m(Error("invalid uncompressed block header: NLEN (first byte)"));h=d;d=a[b++];d===r&&m(Error("invalid uncompressed block header: NLEN (second byte)"));h|=
d<<8;g===~h&&m(Error("invalid uncompressed block header: length verify"));b+g>a.length&&m(Error("input buffer is broken"));switch(this.r){case $a:for(;f+g>e.length;){i=j-f;g-=i;if(B)e.set(a.subarray(b,b+i),f),f+=i,b+=i;else for(;i--;)e[f++]=a[b++];this.b=f;e=this.f();f=this.b}break;case Za:for(;f+g>e.length;)e=this.f({B:2});break;default:m(Error("invalid inflate mode"))}if(B)e.set(a.subarray(b,b+g),f),f+=g,b+=g;else for(;g--;)e[f++]=a[b++];this.c=b;this.b=f;this.a=e;break;case 1:this.s(ab,bb);break;
case 2:cb(this);break;default:m(Error("unknown BTYPE: "+c))}}return this.z()};
var db=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],eb=B?new Uint16Array(db):db,fb=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,258,258],gb=B?new Uint16Array(fb):fb,hb=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0],ib=B?new Uint8Array(hb):hb,jb=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],kb=B?new Uint16Array(jb):jb,lb=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,
10,11,11,12,12,13,13],mb=B?new Uint8Array(lb):lb,nb=new (B?Uint8Array:Array)(288),Y,ob;Y=0;for(ob=nb.length;Y<ob;++Y)nb[Y]=143>=Y?8:255>=Y?9:279>=Y?7:8;var ab=T(nb),pb=new (B?Uint8Array:Array)(30),qb,rb;qb=0;for(rb=pb.length;qb<rb;++qb)pb[qb]=5;var bb=T(pb);function X(c,a){for(var b=c.j,e=c.e,f=c.input,d=c.c,g;e<a;)g=f[d++],g===r&&m(Error("input buffer is broken")),b|=g<<e,e+=8;g=b&(1<<a)-1;c.j=b>>>a;c.e=e-a;c.c=d;return g}
function sb(c,a){for(var b=c.j,e=c.e,f=c.input,d=c.c,g=a[0],h=a[1],j,i,q;e<h;)j=f[d++],j===r&&m(Error("input buffer is broken")),b|=j<<e,e+=8;i=g[b&(1<<h)-1];q=i>>>16;c.j=b>>q;c.e=e-q;c.c=d;return i&65535}
function cb(c){function a(a,b,c){var d,f,e,g;for(g=0;g<a;)switch(d=sb(this,b),d){case 16:for(e=3+X(this,2);e--;)c[g++]=f;break;case 17:for(e=3+X(this,3);e--;)c[g++]=0;f=0;break;case 18:for(e=11+X(this,7);e--;)c[g++]=0;f=0;break;default:f=c[g++]=d}return c}var b=X(c,5)+257,e=X(c,5)+1,f=X(c,4)+4,d=new (B?Uint8Array:Array)(eb.length),g,h,j,i;for(i=0;i<f;++i)d[eb[i]]=X(c,3);g=T(d);h=new (B?Uint8Array:Array)(b);j=new (B?Uint8Array:Array)(e);c.s(T(a.call(c,b,g,h)),T(a.call(c,e,g,j)))}
W.prototype.s=function(c,a){var b=this.a,e=this.b;this.A=c;for(var f=b.length-258,d,g,h,j;256!==(d=sb(this,c));)if(256>d)e>=f&&(this.b=e,b=this.f(),e=this.b),b[e++]=d;else{g=d-257;j=gb[g];0<ib[g]&&(j+=X(this,ib[g]));d=sb(this,a);h=kb[d];0<mb[d]&&(h+=X(this,mb[d]));e>=f&&(this.b=e,b=this.f(),e=this.b);for(;j--;)b[e]=b[e++-h]}for(;8<=this.e;)this.e-=8,this.c--;this.b=e};
W.prototype.Q=function(c,a){var b=this.a,e=this.b;this.A=c;for(var f=b.length,d,g,h,j;256!==(d=sb(this,c));)if(256>d)e>=f&&(b=this.f(),f=b.length),b[e++]=d;else{g=d-257;j=gb[g];0<ib[g]&&(j+=X(this,ib[g]));d=sb(this,a);h=kb[d];0<mb[d]&&(h+=X(this,mb[d]));e+j>f&&(b=this.f(),f=b.length);for(;j--;)b[e]=b[e++-h]}for(;8<=this.e;)this.e-=8,this.c--;this.b=e};
W.prototype.f=function(){var c=new (B?Uint8Array:Array)(this.b-32768),a=this.b-32768,b,e,f=this.a;if(B)c.set(f.subarray(32768,c.length));else{b=0;for(e=c.length;b<e;++b)c[b]=f[b+32768]}this.p.push(c);this.t+=c.length;if(B)f.set(f.subarray(a,a+32768));else for(b=0;32768>b;++b)f[b]=f[a+b];this.b=32768;return f};
W.prototype.R=function(c){var a,b=this.input.length/this.c+1|0,e,f,d,g=this.input,h=this.a;c&&("number"===typeof c.B&&(b=c.B),"number"===typeof c.M&&(b+=c.M));2>b?(e=(g.length-this.c)/this.A[2],d=258*(e/2)|0,f=d<h.length?h.length+d:h.length<<1):f=h.length*b;B?(a=new Uint8Array(f),a.set(h)):a=h;return this.a=a};
W.prototype.z=function(){var c=0,a=this.a,b=this.p,e,f=new (B?Uint8Array:Array)(this.t+(this.b-32768)),d,g,h,j;if(0===b.length)return B?this.a.subarray(32768,this.b):this.a.slice(32768,this.b);d=0;for(g=b.length;d<g;++d){e=b[d];h=0;for(j=e.length;h<j;++h)f[c++]=e[h]}d=32768;for(g=this.b;d<g;++d)f[c++]=a[d];this.p=[];return this.buffer=f};
W.prototype.O=function(){var c,a=this.b;B?this.J?(c=new Uint8Array(a),c.set(this.a.subarray(0,a))):c=this.a.subarray(0,a):(this.a.length>a&&(this.a.length=a),c=this.a);return this.buffer=c};function tb(c){this.input=c;this.c=0;this.member=[]}
tb.prototype.i=function(){for(var c=this.input.length;this.c<c;){var a=new na,b=r,e=r,f=r,d=r,g=r,h=r,j=r,i=r,q=r,l=this.input,k=this.c;a.C=l[k++];a.D=l[k++];(31!==a.C||139!==a.D)&&m(Error("invalid file signature:",a.C,a.D));a.w=l[k++];switch(a.w){case 8:break;default:m(Error("unknown compression method: "+a.w))}a.o=l[k++];i=l[k++]|l[k++]<<8|l[k++]<<16|l[k++]<<24;a.Z=new Date(1E3*i);a.aa=l[k++];a.$=l[k++];0<(a.o&4)&&(a.V=l[k++]|l[k++]<<8,k+=a.V);if(0<(a.o&Ia)){j=[];for(h=0;0<(g=l[k++]);)j[h++]=String.fromCharCode(g);
a.name=j.join("")}if(0<(a.o&Ja)){j=[];for(h=0;0<(g=l[k++]);)j[h++]=String.fromCharCode(g);a.comment=j.join("")}0<(a.o&Ka)&&(a.P=S.k(l,0,k)&65535,a.P!==(l[k++]|l[k++]<<8)&&m(Error("invalid header crc16")));b=l[l.length-4]|l[l.length-3]<<8|l[l.length-2]<<16|l[l.length-1]<<24;l.length-k-4-4<512*b&&(d=b);e=new W(l,{index:k,bufferSize:d});a.data=f=e.i();k=e.c;a.X=q=(l[k++]|l[k++]<<8|l[k++]<<16|l[k++]<<24)>>>0;S.k(f)!==q&&m(Error("invalid CRC-32 checksum: 0x"+S.k(f).toString(16)+" / 0x"+q.toString(16)));
a.Y=b=(l[k++]|l[k++]<<8|l[k++]<<16|l[k++]<<24)>>>0;(f.length&4294967295)!==b&&m(Error("invalid input size: "+(f.length&4294967295)+" / "+b));this.member.push(a);this.c=k}var p=this.member,t,v,x=0,F=0,w;t=0;for(v=p.length;t<v;++t)F+=p[t].data.length;if(B){w=new Uint8Array(F);for(t=0;t<v;++t)w.set(p[t].data,x),x+=p[t].data.length}else{w=[];for(t=0;t<v;++t)w[t]=p[t].data;w=Array.prototype.concat.apply([],w)}return w};function ub(c,a){var b,e;this.input=c;this.c=0;if(a||!(a={}))a.index&&(this.c=a.index),a.verify&&(this.U=a.verify);b=c[this.c++];e=c[this.c++];switch(b&15){case Ga:this.method=Ga;break;default:m(Error("unsupported compression method"))}0!==((b<<8)+e)%31&&m(Error("invalid fcheck flag:"+((b<<8)+e)%31));e&32&&m(Error("fdict flag is not supported"));this.I=new W(c,{index:this.c,bufferSize:a.bufferSize,bufferType:a.bufferType,resize:a.resize})}
ub.prototype.i=function(){var c=this.input,a,b;a=this.I.i();this.c=this.I.c;this.U&&(b=(c[this.c++]<<24|c[this.c++]<<16|c[this.c++]<<8|c[this.c++])>>>0,b!==aa(a)&&m(Error("invalid adler-32 checksum")));return a};exports.deflate=vb;exports.deflateSync=wb;exports.inflate=xb;exports.inflateSync=yb;exports.gzip=zb;exports.gzipSync=Ab;exports.gunzip=Bb;exports.gunzipSync=Cb;function vb(c,a,b){process.nextTick(function(){var e,f;try{f=wb(c,b)}catch(d){e=d}a(e,f)})}function wb(c,a){var b;b=(new Ea(c)).h();a||(a={});return a.G?b:Db(b)}function xb(c,a,b){process.nextTick(function(){var e,f;try{f=yb(c,b)}catch(d){e=d}a(e,f)})}
function yb(c,a){var b;c.subarray=c.slice;b=(new ub(c)).i();a||(a={});return a.noBuffer?b:Db(b)}function zb(c,a,b){process.nextTick(function(){var e,f;try{f=Ab(c,b)}catch(d){e=d}a(e,f)})}function Ab(c,a){var b;c.subarray=c.slice;b=(new Ha(c)).h();a||(a={});return a.G?b:Db(b)}function Bb(c,a,b){process.nextTick(function(){var e,f;try{f=Cb(c,b)}catch(d){e=d}a(e,f)})}function Cb(c,a){var b;c.subarray=c.slice;b=(new tb(c)).i();a||(a={});return a.G?b:Db(b)}
function Db(c){var a=new Buffer(c.length),b,e;b=0;for(e=c.length;b<e;++b)a[b]=c[b];return a};var Eb=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];B&&new Uint16Array(Eb);var Fb=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,258,258];B&&new Uint16Array(Fb);var Gb=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0];B&&new Uint8Array(Gb);var Hb=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];B&&new Uint16Array(Hb);
var Ib=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];B&&new Uint8Array(Ib);var Jb=new (B?Uint8Array:Array)(288),$,Kb;$=0;for(Kb=Jb.length;$<Kb;++$)Jb[$]=143>=$?8:255>=$?9:279>=$?7:8;T(Jb);var Lb=new (B?Uint8Array:Array)(30),Mb,Nb;Mb=0;for(Nb=Lb.length;Mb<Nb;++Mb)Lb[Mb]=5;T(Lb);var Ga=8;}).call(this);

},{"__browserify_Buffer":124,"__browserify_process":125}],124:[function(require,module,exports){
require=(function(e,t,n,r){function i(r){if(!n[r]){if(!t[r]){if(e)return e(r);throw new Error("Cannot find module '"+r+"'")}var s=n[r]={exports:{}};t[r][0](function(e){var n=t[r][1][e];return i(n?n:e)},s,s.exports)}return n[r].exports}for(var s=0;s<r.length;s++)i(r[s]);return i})(typeof require!=="undefined"&&require,{1:[function(require,module,exports){
// UTILITY
var util = require('util');
var Buffer = require("buffer").Buffer;
var pSlice = Array.prototype.slice;

function objectKeys(object) {
  if (Object.keys) return Object.keys(object);
  var result = [];
  for (var name in object) {
    if (Object.prototype.hasOwnProperty.call(object, name)) {
      result.push(name);
    }
  }
  return result;
}

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.message = options.message;
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
};
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (value === undefined) {
    return '' + value;
  }
  if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (typeof value === 'function' || value instanceof RegExp) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (typeof s == 'string') {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

assert.AssertionError.prototype.toString = function() {
  if (this.message) {
    return [this.name + ':', this.message].join(' ');
  } else {
    return [
      this.name + ':',
      truncate(JSON.stringify(this.actual, replacer), 128),
      this.operator,
      truncate(JSON.stringify(this.expected, replacer), 128)
    ].join(' ');
  }
};

// assert.AssertionError instanceof Error

assert.AssertionError.__proto__ = Error.prototype;

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!!!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (Buffer.isBuffer(actual) && Buffer.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (typeof actual != 'object' && typeof expected != 'object') {
    return actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isUndefinedOrNull(value) {
  return value === null || value === undefined;
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (expected instanceof RegExp) {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (typeof expected === 'string') {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail('Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail('Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

},{"util":2,"buffer":3}],2:[function(require,module,exports){
var events = require('events');

exports.isArray = isArray;
exports.isDate = function(obj){return Object.prototype.toString.call(obj) === '[object Date]'};
exports.isRegExp = function(obj){return Object.prototype.toString.call(obj) === '[object RegExp]'};


exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
          'italic' : [3, 23],
          'underline' : [4, 24],
          'inverse' : [7, 27],
          'white' : [37, 39],
          'grey' : [90, 39],
          'black' : [30, 39],
          'blue' : [34, 39],
          'cyan' : [36, 39],
          'green' : [32, 39],
          'magenta' : [35, 39],
          'red' : [31, 39],
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\033[' + styles[style][0] + 'm' + str +
             '\033[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {
    stylize = function(str, styleType) { return str; };
  }

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object_keys(value);
    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > 50) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return ar instanceof Array ||
         Array.isArray(ar) ||
         (ar && ar !== Object.prototype && isArray(ar.__proto__));
}


function isRegExp(re) {
  return re instanceof RegExp ||
    (typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');
}


function isDate(d) {
  if (d instanceof Date) return true;
  if (typeof d !== 'object') return false;
  var properties = Date.prototype && Object_getOwnPropertyNames(Date.prototype);
  var proto = d.__proto__ && Object_getOwnPropertyNames(d.__proto__);
  return JSON.stringify(proto) === JSON.stringify(properties);
}

function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}

exports.log = function (msg) {};

exports.pump = null;

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
};

var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
    var res = [];
    for (var key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) res.push(key);
    }
    return res;
};

var Object_create = Object.create || function (prototype, properties) {
    // from es5-shim
    var object;
    if (prototype === null) {
        object = { '__proto__' : null };
    }
    else {
        if (typeof prototype !== 'object') {
            throw new TypeError(
                'typeof prototype[' + (typeof prototype) + '] != \'object\''
            );
        }
        var Type = function () {};
        Type.prototype = prototype;
        object = new Type();
        object.__proto__ = prototype;
    }
    if (typeof properties !== 'undefined' && Object.defineProperties) {
        Object.defineProperties(object, properties);
    }
    return object;
};

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object_create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (typeof f !== 'string') {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(exports.inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j': return JSON.stringify(args[i++]);
      default:
        return x;
    }
  });
  for(var x = args[i]; i < len; x = args[++i]){
    if (x === null || typeof x !== 'object') {
      str += ' ' + x;
    } else {
      str += ' ' + exports.inspect(x);
    }
  }
  return str;
};

},{"events":4}],5:[function(require,module,exports){
exports.readIEEE754 = function(buffer, offset, isBE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isBE ? 0 : (nBytes - 1),
      d = isBE ? 1 : -1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.writeIEEE754 = function(buffer, value, offset, isBE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isBE ? (nBytes - 1) : 0,
      d = isBE ? -1 : 1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],6:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],4:[function(require,module,exports){
(function(process){if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;
function indexOf (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (x === xs[i]) return i;
    }
    return -1;
}

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = indexOf(list, listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  if (arguments.length === 0) {
    this._events = {};
    return this;
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

})(require("__browserify_process"))
},{"__browserify_process":6}],"buffer-browserify":[function(require,module,exports){
module.exports=require('q9TxCC');
},{}],"q9TxCC":[function(require,module,exports){
function SlowBuffer (size) {
    this.length = size;
};

var assert = require('assert');

exports.INSPECT_MAX_BYTES = 50;


function toHex(n) {
  if (n < 16) return '0' + n.toString(16);
  return n.toString(16);
}

function utf8ToBytes(str) {
  var byteArray = [];
  for (var i = 0; i < str.length; i++)
    if (str.charCodeAt(i) <= 0x7F)
      byteArray.push(str.charCodeAt(i));
    else {
      var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16));
    }

  return byteArray;
}

function asciiToBytes(str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++ )
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push( str.charCodeAt(i) & 0xFF );

  return byteArray;
}

function base64ToBytes(str) {
  return require("base64-js").toByteArray(str);
}

SlowBuffer.byteLength = function (str, encoding) {
  switch (encoding || "utf8") {
    case 'hex':
      return str.length / 2;

    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(str).length;

    case 'ascii':
    case 'binary':
      return str.length;

    case 'base64':
      return base64ToBytes(str).length;

    default:
      throw new Error('Unknown encoding');
  }
};

function blitBuffer(src, dst, offset, length) {
  var pos, i = 0;
  while (i < length) {
    if ((i+offset >= dst.length) || (i >= src.length))
      break;

    dst[i + offset] = src[i];
    i++;
  }
  return i;
}

SlowBuffer.prototype.utf8Write = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten =  blitBuffer(utf8ToBytes(string), this, offset, length);
};

SlowBuffer.prototype.asciiWrite = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten =  blitBuffer(asciiToBytes(string), this, offset, length);
};

SlowBuffer.prototype.binaryWrite = SlowBuffer.prototype.asciiWrite;

SlowBuffer.prototype.base64Write = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten = blitBuffer(base64ToBytes(string), this, offset, length);
};

SlowBuffer.prototype.base64Slice = function (start, end) {
  var bytes = Array.prototype.slice.apply(this, arguments)
  return require("base64-js").fromByteArray(bytes);
}

function decodeUtf8Char(str) {
  try {
    return decodeURIComponent(str);
  } catch (err) {
    return String.fromCharCode(0xFFFD); // UTF 8 invalid char
  }
}

SlowBuffer.prototype.utf8Slice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var res = "";
  var tmp = "";
  var i = 0;
  while (i < bytes.length) {
    if (bytes[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(bytes[i]);
      tmp = "";
    } else
      tmp += "%" + bytes[i].toString(16);

    i++;
  }

  return res + decodeUtf8Char(tmp);
}

SlowBuffer.prototype.asciiSlice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var ret = "";
  for (var i = 0; i < bytes.length; i++)
    ret += String.fromCharCode(bytes[i]);
  return ret;
}

SlowBuffer.prototype.binarySlice = SlowBuffer.prototype.asciiSlice;

SlowBuffer.prototype.inspect = function() {
  var out = [],
      len = this.length;
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }
  return '<SlowBuffer ' + out.join(' ') + '>';
};


SlowBuffer.prototype.hexSlice = function(start, end) {
  var len = this.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; i++) {
    out += toHex(this[i]);
  }
  return out;
};


SlowBuffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();
  start = +start || 0;
  if (typeof end == 'undefined') end = this.length;

  // Fastpath empty strings
  if (+end == start) {
    return '';
  }

  switch (encoding) {
    case 'hex':
      return this.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.utf8Slice(start, end);

    case 'ascii':
      return this.asciiSlice(start, end);

    case 'binary':
      return this.binarySlice(start, end);

    case 'base64':
      return this.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


SlowBuffer.prototype.hexWrite = function(string, offset, length) {
  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2) {
    throw new Error('Invalid hex string');
  }
  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(byte)) throw new Error('Invalid hex string');
    this[offset + i] = byte;
  }
  SlowBuffer._charsWritten = i * 2;
  return i;
};


SlowBuffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  switch (encoding) {
    case 'hex':
      return this.hexWrite(string, offset, length);

    case 'utf8':
    case 'utf-8':
      return this.utf8Write(string, offset, length);

    case 'ascii':
      return this.asciiWrite(string, offset, length);

    case 'binary':
      return this.binaryWrite(string, offset, length);

    case 'base64':
      return this.base64Write(string, offset, length);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Write(string, offset, length);

    default:
      throw new Error('Unknown encoding');
  }
};


// slice(start, end)
SlowBuffer.prototype.slice = function(start, end) {
  if (end === undefined) end = this.length;

  if (end > this.length) {
    throw new Error('oob');
  }
  if (start > end) {
    throw new Error('oob');
  }

  return new Buffer(this, end - start, +start);
};

SlowBuffer.prototype.copy = function(target, targetstart, sourcestart, sourceend) {
  var temp = [];
  for (var i=sourcestart; i<sourceend; i++) {
    assert.ok(typeof this[i] !== 'undefined', "copying undefined buffer bytes!");
    temp.push(this[i]);
  }

  for (var i=targetstart; i<targetstart+temp.length; i++) {
    target[i] = temp[i-targetstart];
  }
};

SlowBuffer.prototype.fill = function(value, start, end) {
  if (end > this.length) {
    throw new Error('oob');
  }
  if (start > end) {
    throw new Error('oob');
  }

  for (var i = start; i < end; i++) {
    this[i] = value;
  }
}

function coerce(length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length);
  return length < 0 ? 0 : length;
}


// Buffer

function Buffer(subject, encoding, offset) {
  if (!(this instanceof Buffer)) {
    return new Buffer(subject, encoding, offset);
  }

  var type;

  // Are we slicing?
  if (typeof offset === 'number') {
    this.length = coerce(encoding);
    this.parent = subject;
    this.offset = offset;
  } else {
    // Find the length
    switch (type = typeof subject) {
      case 'number':
        this.length = coerce(subject);
        break;

      case 'string':
        this.length = Buffer.byteLength(subject, encoding);
        break;

      case 'object': // Assume object is an array
        this.length = coerce(subject.length);
        break;

      default:
        throw new Error('First argument needs to be a number, ' +
                        'array or string.');
    }

    if (this.length > Buffer.poolSize) {
      // Big buffer, just alloc one.
      this.parent = new SlowBuffer(this.length);
      this.offset = 0;

    } else {
      // Small buffer.
      if (!pool || pool.length - pool.used < this.length) allocPool();
      this.parent = pool;
      this.offset = pool.used;
      pool.used += this.length;
    }

    // Treat array-ish objects as a byte array.
    if (isArrayIsh(subject)) {
      for (var i = 0; i < this.length; i++) {
        if (subject instanceof Buffer) {
          this.parent[i + this.offset] = subject.readUInt8(i);
        }
        else {
          this.parent[i + this.offset] = subject[i];
        }
      }
    } else if (type == 'string') {
      // We are a string
      this.length = this.write(subject, 0, encoding);
    }
  }

}

function isArrayIsh(subject) {
  return Array.isArray(subject) || Buffer.isBuffer(subject) ||
         subject && typeof subject === 'object' &&
         typeof subject.length === 'number';
}

exports.SlowBuffer = SlowBuffer;
exports.Buffer = Buffer;

Buffer.poolSize = 8 * 1024;
var pool;

function allocPool() {
  pool = new SlowBuffer(Buffer.poolSize);
  pool.used = 0;
}


// Static methods
Buffer.isBuffer = function isBuffer(b) {
  return b instanceof Buffer || b instanceof SlowBuffer;
};

Buffer.concat = function (list, totalLength) {
  if (!Array.isArray(list)) {
    throw new Error("Usage: Buffer.concat(list, [totalLength])\n \
      list should be an Array.");
  }

  if (list.length === 0) {
    return new Buffer(0);
  } else if (list.length === 1) {
    return list[0];
  }

  if (typeof totalLength !== 'number') {
    totalLength = 0;
    for (var i = 0; i < list.length; i++) {
      var buf = list[i];
      totalLength += buf.length;
    }
  }

  var buffer = new Buffer(totalLength);
  var pos = 0;
  for (var i = 0; i < list.length; i++) {
    var buf = list[i];
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer;
};

// Inspect
Buffer.prototype.inspect = function inspect() {
  var out = [],
      len = this.length;

  for (var i = 0; i < len; i++) {
    out[i] = toHex(this.parent[i + this.offset]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }

  return '<Buffer ' + out.join(' ') + '>';
};


Buffer.prototype.get = function get(i) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this.parent[this.offset + i];
};


Buffer.prototype.set = function set(i, v) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this.parent[this.offset + i] = v;
};


// write(string, offset = 0, length = buffer.length-offset, encoding = 'utf8')
Buffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  var ret;
  switch (encoding) {
    case 'hex':
      ret = this.parent.hexWrite(string, this.offset + offset, length);
      break;

    case 'utf8':
    case 'utf-8':
      ret = this.parent.utf8Write(string, this.offset + offset, length);
      break;

    case 'ascii':
      ret = this.parent.asciiWrite(string, this.offset + offset, length);
      break;

    case 'binary':
      ret = this.parent.binaryWrite(string, this.offset + offset, length);
      break;

    case 'base64':
      // Warning: maxLength not taken into account in base64Write
      ret = this.parent.base64Write(string, this.offset + offset, length);
      break;

    case 'ucs2':
    case 'ucs-2':
      ret = this.parent.ucs2Write(string, this.offset + offset, length);
      break;

    default:
      throw new Error('Unknown encoding');
  }

  Buffer._charsWritten = SlowBuffer._charsWritten;

  return ret;
};


// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();

  if (typeof start == 'undefined' || start < 0) {
    start = 0;
  } else if (start > this.length) {
    start = this.length;
  }

  if (typeof end == 'undefined' || end > this.length) {
    end = this.length;
  } else if (end < 0) {
    end = 0;
  }

  start = start + this.offset;
  end = end + this.offset;

  switch (encoding) {
    case 'hex':
      return this.parent.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.parent.utf8Slice(start, end);

    case 'ascii':
      return this.parent.asciiSlice(start, end);

    case 'binary':
      return this.parent.binarySlice(start, end);

    case 'base64':
      return this.parent.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.parent.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


// byteLength
Buffer.byteLength = SlowBuffer.byteLength;


// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill(value, start, end) {
  value || (value = 0);
  start || (start = 0);
  end || (end = this.length);

  if (typeof value === 'string') {
    value = value.charCodeAt(0);
  }
  if (!(typeof value === 'number') || isNaN(value)) {
    throw new Error('value is not a number');
  }

  if (end < start) throw new Error('end < start');

  // Fill 0 bytes; we're done
  if (end === start) return 0;
  if (this.length == 0) return 0;

  if (start < 0 || start >= this.length) {
    throw new Error('start out of bounds');
  }

  if (end < 0 || end > this.length) {
    throw new Error('end out of bounds');
  }

  return this.parent.fill(value,
                          start + this.offset,
                          end + this.offset);
};


// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function(target, target_start, start, end) {
  var source = this;
  start || (start = 0);
  end || (end = this.length);
  target_start || (target_start = 0);

  if (end < start) throw new Error('sourceEnd < sourceStart');

  // Copy 0 bytes; we're done
  if (end === start) return 0;
  if (target.length == 0 || source.length == 0) return 0;

  if (target_start < 0 || target_start >= target.length) {
    throw new Error('targetStart out of bounds');
  }

  if (start < 0 || start >= source.length) {
    throw new Error('sourceStart out of bounds');
  }

  if (end < 0 || end > source.length) {
    throw new Error('sourceEnd out of bounds');
  }

  // Are we oob?
  if (end > this.length) {
    end = this.length;
  }

  if (target.length - target_start < end - start) {
    end = target.length - target_start + start;
  }

  return this.parent.copy(target.parent,
                          target_start + target.offset,
                          start + this.offset,
                          end + this.offset);
};


// slice(start, end)
Buffer.prototype.slice = function(start, end) {
  if (end === undefined) end = this.length;
  if (end > this.length) throw new Error('oob');
  if (start > end) throw new Error('oob');

  return new Buffer(this.parent, end - start, +start + this.offset);
};


// Legacy methods for backwards compatibility.

Buffer.prototype.utf8Slice = function(start, end) {
  return this.toString('utf8', start, end);
};

Buffer.prototype.binarySlice = function(start, end) {
  return this.toString('binary', start, end);
};

Buffer.prototype.asciiSlice = function(start, end) {
  return this.toString('ascii', start, end);
};

Buffer.prototype.utf8Write = function(string, offset) {
  return this.write(string, offset, 'utf8');
};

Buffer.prototype.binaryWrite = function(string, offset) {
  return this.write(string, offset, 'binary');
};

Buffer.prototype.asciiWrite = function(string, offset) {
  return this.write(string, offset, 'ascii');
};

Buffer.prototype.readUInt8 = function(offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  return buffer.parent[buffer.offset + offset];
};

function readUInt16(buffer, offset, isBigEndian, noAssert) {
  var val = 0;


  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    val = buffer.parent[buffer.offset + offset] << 8;
    if (offset + 1 < buffer.length) {
      val |= buffer.parent[buffer.offset + offset + 1];
    }
  } else {
    val = buffer.parent[buffer.offset + offset];
    if (offset + 1 < buffer.length) {
      val |= buffer.parent[buffer.offset + offset + 1] << 8;
    }
  }

  return val;
}

Buffer.prototype.readUInt16LE = function(offset, noAssert) {
  return readUInt16(this, offset, false, noAssert);
};

Buffer.prototype.readUInt16BE = function(offset, noAssert) {
  return readUInt16(this, offset, true, noAssert);
};

function readUInt32(buffer, offset, isBigEndian, noAssert) {
  var val = 0;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    if (offset + 1 < buffer.length)
      val = buffer.parent[buffer.offset + offset + 1] << 16;
    if (offset + 2 < buffer.length)
      val |= buffer.parent[buffer.offset + offset + 2] << 8;
    if (offset + 3 < buffer.length)
      val |= buffer.parent[buffer.offset + offset + 3];
    val = val + (buffer.parent[buffer.offset + offset] << 24 >>> 0);
  } else {
    if (offset + 2 < buffer.length)
      val = buffer.parent[buffer.offset + offset + 2] << 16;
    if (offset + 1 < buffer.length)
      val |= buffer.parent[buffer.offset + offset + 1] << 8;
    val |= buffer.parent[buffer.offset + offset];
    if (offset + 3 < buffer.length)
      val = val + (buffer.parent[buffer.offset + offset + 3] << 24 >>> 0);
  }

  return val;
}

Buffer.prototype.readUInt32LE = function(offset, noAssert) {
  return readUInt32(this, offset, false, noAssert);
};

Buffer.prototype.readUInt32BE = function(offset, noAssert) {
  return readUInt32(this, offset, true, noAssert);
};


/*
 * Signed integer types, yay team! A reminder on how two's complement actually
 * works. The first bit is the signed bit, i.e. tells us whether or not the
 * number should be positive or negative. If the two's complement value is
 * positive, then we're done, as it's equivalent to the unsigned representation.
 *
 * Now if the number is positive, you're pretty much done, you can just leverage
 * the unsigned translations and return those. Unfortunately, negative numbers
 * aren't quite that straightforward.
 *
 * At first glance, one might be inclined to use the traditional formula to
 * translate binary numbers between the positive and negative values in two's
 * complement. (Though it doesn't quite work for the most negative value)
 * Mainly:
 *  - invert all the bits
 *  - add one to the result
 *
 * Of course, this doesn't quite work in Javascript. Take for example the value
 * of -128. This could be represented in 16 bits (big-endian) as 0xff80. But of
 * course, Javascript will do the following:
 *
 * > ~0xff80
 * -65409
 *
 * Whoh there, Javascript, that's not quite right. But wait, according to
 * Javascript that's perfectly correct. When Javascript ends up seeing the
 * constant 0xff80, it has no notion that it is actually a signed number. It
 * assumes that we've input the unsigned value 0xff80. Thus, when it does the
 * binary negation, it casts it into a signed value, (positive 0xff80). Then
 * when you perform binary negation on that, it turns it into a negative number.
 *
 * Instead, we're going to have to use the following general formula, that works
 * in a rather Javascript friendly way. I'm glad we don't support this kind of
 * weird numbering scheme in the kernel.
 *
 * (BIT-MAX - (unsigned)val + 1) * -1
 *
 * The astute observer, may think that this doesn't make sense for 8-bit numbers
 * (really it isn't necessary for them). However, when you get 16-bit numbers,
 * you do. Let's go back to our prior example and see how this will look:
 *
 * (0xffff - 0xff80 + 1) * -1
 * (0x007f + 1) * -1
 * (0x0080) * -1
 */
Buffer.prototype.readInt8 = function(offset, noAssert) {
  var buffer = this;
  var neg;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  neg = buffer.parent[buffer.offset + offset] & 0x80;
  if (!neg) {
    return (buffer.parent[buffer.offset + offset]);
  }

  return ((0xff - buffer.parent[buffer.offset + offset] + 1) * -1);
};

function readInt16(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt16(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x8000;
  if (!neg) {
    return val;
  }

  return (0xffff - val + 1) * -1;
}

Buffer.prototype.readInt16LE = function(offset, noAssert) {
  return readInt16(this, offset, false, noAssert);
};

Buffer.prototype.readInt16BE = function(offset, noAssert) {
  return readInt16(this, offset, true, noAssert);
};

function readInt32(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt32(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x80000000;
  if (!neg) {
    return (val);
  }

  return (0xffffffff - val + 1) * -1;
}

Buffer.prototype.readInt32LE = function(offset, noAssert) {
  return readInt32(this, offset, false, noAssert);
};

Buffer.prototype.readInt32BE = function(offset, noAssert) {
  return readInt32(this, offset, true, noAssert);
};

function readFloat(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.readFloatLE = function(offset, noAssert) {
  return readFloat(this, offset, false, noAssert);
};

Buffer.prototype.readFloatBE = function(offset, noAssert) {
  return readFloat(this, offset, true, noAssert);
};

function readDouble(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 7 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.readDoubleLE = function(offset, noAssert) {
  return readDouble(this, offset, false, noAssert);
};

Buffer.prototype.readDoubleBE = function(offset, noAssert) {
  return readDouble(this, offset, true, noAssert);
};


/*
 * We have to make sure that the value is a valid integer. This means that it is
 * non-negative. It has no fractional component and that it does not exceed the
 * maximum allowed value.
 *
 *      value           The number to check for validity
 *
 *      max             The maximum value
 */
function verifuint(value, max) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value >= 0,
      'specified a negative value for writing an unsigned value');

  assert.ok(value <= max, 'value is larger than maximum value for type');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

Buffer.prototype.writeUInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xff);
  }

  if (offset < buffer.length) {
    buffer.parent[buffer.offset + offset] = value;
  }
};

function writeUInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 2); i++) {
    buffer.parent[buffer.offset + offset + i] =
        (value & (0xff << (8 * (isBigEndian ? 1 - i : i)))) >>>
            (isBigEndian ? 1 - i : i) * 8;
  }

}

Buffer.prototype.writeUInt16LE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt16BE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, true, noAssert);
};

function writeUInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffffffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 4); i++) {
    buffer.parent[buffer.offset + offset + i] =
        (value >>> (isBigEndian ? 3 - i : i) * 8) & 0xff;
  }
}

Buffer.prototype.writeUInt32LE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt32BE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, true, noAssert);
};


/*
 * We now move onto our friends in the signed number category. Unlike unsigned
 * numbers, we're going to have to worry a bit more about how we put values into
 * arrays. Since we are only worrying about signed 32-bit values, we're in
 * slightly better shape. Unfortunately, we really can't do our favorite binary
 * & in this system. It really seems to do the wrong thing. For example:
 *
 * > -32 & 0xff
 * 224
 *
 * What's happening above is really: 0xe0 & 0xff = 0xe0. However, the results of
 * this aren't treated as a signed number. Ultimately a bad thing.
 *
 * What we're going to want to do is basically create the unsigned equivalent of
 * our representation and pass that off to the wuint* functions. To do that
 * we're going to do the following:
 *
 *  - if the value is positive
 *      we can pass it directly off to the equivalent wuint
 *  - if the value is negative
 *      we do the following computation:
 *         mb + val + 1, where
 *         mb   is the maximum unsigned value in that byte size
 *         val  is the Javascript negative integer
 *
 *
 * As a concrete value, take -128. In signed 16 bits this would be 0xff80. If
 * you do out the computations:
 *
 * 0xffff - 128 + 1
 * 0xffff - 127
 * 0xff80
 *
 * You can then encode this value as the signed version. This is really rather
 * hacky, but it should work and get the job done which is our goal here.
 */

/*
 * A series of checks to make sure we actually have a signed 32-bit number
 */
function verifsint(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

function verifIEEE754(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');
}

Buffer.prototype.writeInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7f, -0x80);
  }

  if (value >= 0) {
    buffer.writeUInt8(value, offset, noAssert);
  } else {
    buffer.writeUInt8(0xff + value + 1, offset, noAssert);
  }
};

function writeInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fff, -0x8000);
  }

  if (value >= 0) {
    writeUInt16(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt16(buffer, 0xffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt16LE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt16BE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, true, noAssert);
};

function writeInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fffffff, -0x80000000);
  }

  if (value >= 0) {
    writeUInt32(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt32(buffer, 0xffffffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt32LE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt32BE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, true, noAssert);
};

function writeFloat(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.writeFloatLE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, false, noAssert);
};

Buffer.prototype.writeFloatBE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, true, noAssert);
};

function writeDouble(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 7 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.writeDoubleLE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, false, noAssert);
};

Buffer.prototype.writeDoubleBE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, true, noAssert);
};

SlowBuffer.prototype.readUInt8 = Buffer.prototype.readUInt8;
SlowBuffer.prototype.readUInt16LE = Buffer.prototype.readUInt16LE;
SlowBuffer.prototype.readUInt16BE = Buffer.prototype.readUInt16BE;
SlowBuffer.prototype.readUInt32LE = Buffer.prototype.readUInt32LE;
SlowBuffer.prototype.readUInt32BE = Buffer.prototype.readUInt32BE;
SlowBuffer.prototype.readInt8 = Buffer.prototype.readInt8;
SlowBuffer.prototype.readInt16LE = Buffer.prototype.readInt16LE;
SlowBuffer.prototype.readInt16BE = Buffer.prototype.readInt16BE;
SlowBuffer.prototype.readInt32LE = Buffer.prototype.readInt32LE;
SlowBuffer.prototype.readInt32BE = Buffer.prototype.readInt32BE;
SlowBuffer.prototype.readFloatLE = Buffer.prototype.readFloatLE;
SlowBuffer.prototype.readFloatBE = Buffer.prototype.readFloatBE;
SlowBuffer.prototype.readDoubleLE = Buffer.prototype.readDoubleLE;
SlowBuffer.prototype.readDoubleBE = Buffer.prototype.readDoubleBE;
SlowBuffer.prototype.writeUInt8 = Buffer.prototype.writeUInt8;
SlowBuffer.prototype.writeUInt16LE = Buffer.prototype.writeUInt16LE;
SlowBuffer.prototype.writeUInt16BE = Buffer.prototype.writeUInt16BE;
SlowBuffer.prototype.writeUInt32LE = Buffer.prototype.writeUInt32LE;
SlowBuffer.prototype.writeUInt32BE = Buffer.prototype.writeUInt32BE;
SlowBuffer.prototype.writeInt8 = Buffer.prototype.writeInt8;
SlowBuffer.prototype.writeInt16LE = Buffer.prototype.writeInt16LE;
SlowBuffer.prototype.writeInt16BE = Buffer.prototype.writeInt16BE;
SlowBuffer.prototype.writeInt32LE = Buffer.prototype.writeInt32LE;
SlowBuffer.prototype.writeInt32BE = Buffer.prototype.writeInt32BE;
SlowBuffer.prototype.writeFloatLE = Buffer.prototype.writeFloatLE;
SlowBuffer.prototype.writeFloatBE = Buffer.prototype.writeFloatBE;
SlowBuffer.prototype.writeDoubleLE = Buffer.prototype.writeDoubleLE;
SlowBuffer.prototype.writeDoubleBE = Buffer.prototype.writeDoubleBE;

},{"assert":1,"./buffer_ieee754":5,"base64-js":7}],7:[function(require,module,exports){
(function (exports) {
	'use strict';

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	function b64ToByteArray(b64) {
		var i, j, l, tmp, placeHolders, arr;
	
		if (b64.length % 4 > 0) {
			throw 'Invalid string. Length must be a multiple of 4';
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		placeHolders = b64.indexOf('=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (lookup.indexOf(b64[i]) << 18) | (lookup.indexOf(b64[i + 1]) << 12) | (lookup.indexOf(b64[i + 2]) << 6) | lookup.indexOf(b64[i + 3]);
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (lookup.indexOf(b64[i]) << 2) | (lookup.indexOf(b64[i + 1]) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (lookup.indexOf(b64[i]) << 10) | (lookup.indexOf(b64[i + 1]) << 4) | (lookup.indexOf(b64[i + 2]) >> 2);
			arr.push((tmp >> 8) & 0xFF);
			arr.push(tmp & 0xFF);
		}

		return arr;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1];
				output += lookup[temp >> 2];
				output += lookup[(temp << 4) & 0x3F];
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup[temp >> 10];
				output += lookup[(temp >> 4) & 0x3F];
				output += lookup[(temp << 2) & 0x3F];
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

},{}],8:[function(require,module,exports){
exports.readIEEE754 = function(buffer, offset, isBE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isBE ? 0 : (nBytes - 1),
      d = isBE ? 1 : -1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.writeIEEE754 = function(buffer, value, offset, isBE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isBE ? (nBytes - 1) : 0,
      d = isBE ? -1 : 1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],3:[function(require,module,exports){
function SlowBuffer (size) {
    this.length = size;
};

var assert = require('assert');

exports.INSPECT_MAX_BYTES = 50;


function toHex(n) {
  if (n < 16) return '0' + n.toString(16);
  return n.toString(16);
}

function utf8ToBytes(str) {
  var byteArray = [];
  for (var i = 0; i < str.length; i++)
    if (str.charCodeAt(i) <= 0x7F)
      byteArray.push(str.charCodeAt(i));
    else {
      var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16));
    }

  return byteArray;
}

function asciiToBytes(str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++ )
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push( str.charCodeAt(i) & 0xFF );

  return byteArray;
}

function base64ToBytes(str) {
  return require("base64-js").toByteArray(str);
}

SlowBuffer.byteLength = function (str, encoding) {
  switch (encoding || "utf8") {
    case 'hex':
      return str.length / 2;

    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(str).length;

    case 'ascii':
      return str.length;

    case 'base64':
      return base64ToBytes(str).length;

    default:
      throw new Error('Unknown encoding');
  }
};

function blitBuffer(src, dst, offset, length) {
  var pos, i = 0;
  while (i < length) {
    if ((i+offset >= dst.length) || (i >= src.length))
      break;

    dst[i + offset] = src[i];
    i++;
  }
  return i;
}

SlowBuffer.prototype.utf8Write = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten =  blitBuffer(utf8ToBytes(string), this, offset, length);
};

SlowBuffer.prototype.asciiWrite = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten =  blitBuffer(asciiToBytes(string), this, offset, length);
};

SlowBuffer.prototype.base64Write = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten = blitBuffer(base64ToBytes(string), this, offset, length);
};

SlowBuffer.prototype.base64Slice = function (start, end) {
  var bytes = Array.prototype.slice.apply(this, arguments)
  return require("base64-js").fromByteArray(bytes);
}

function decodeUtf8Char(str) {
  try {
    return decodeURIComponent(str);
  } catch (err) {
    return String.fromCharCode(0xFFFD); // UTF 8 invalid char
  }
}

SlowBuffer.prototype.utf8Slice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var res = "";
  var tmp = "";
  var i = 0;
  while (i < bytes.length) {
    if (bytes[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(bytes[i]);
      tmp = "";
    } else
      tmp += "%" + bytes[i].toString(16);

    i++;
  }

  return res + decodeUtf8Char(tmp);
}

SlowBuffer.prototype.asciiSlice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var ret = "";
  for (var i = 0; i < bytes.length; i++)
    ret += String.fromCharCode(bytes[i]);
  return ret;
}

SlowBuffer.prototype.inspect = function() {
  var out = [],
      len = this.length;
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }
  return '<SlowBuffer ' + out.join(' ') + '>';
};


SlowBuffer.prototype.hexSlice = function(start, end) {
  var len = this.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; i++) {
    out += toHex(this[i]);
  }
  return out;
};


SlowBuffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();
  start = +start || 0;
  if (typeof end == 'undefined') end = this.length;

  // Fastpath empty strings
  if (+end == start) {
    return '';
  }

  switch (encoding) {
    case 'hex':
      return this.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.utf8Slice(start, end);

    case 'ascii':
      return this.asciiSlice(start, end);

    case 'binary':
      return this.binarySlice(start, end);

    case 'base64':
      return this.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


SlowBuffer.prototype.hexWrite = function(string, offset, length) {
  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2) {
    throw new Error('Invalid hex string');
  }
  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(byte)) throw new Error('Invalid hex string');
    this[offset + i] = byte;
  }
  SlowBuffer._charsWritten = i * 2;
  return i;
};


SlowBuffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  switch (encoding) {
    case 'hex':
      return this.hexWrite(string, offset, length);

    case 'utf8':
    case 'utf-8':
      return this.utf8Write(string, offset, length);

    case 'ascii':
      return this.asciiWrite(string, offset, length);

    case 'binary':
      return this.binaryWrite(string, offset, length);

    case 'base64':
      return this.base64Write(string, offset, length);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Write(string, offset, length);

    default:
      throw new Error('Unknown encoding');
  }
};


// slice(start, end)
SlowBuffer.prototype.slice = function(start, end) {
  if (end === undefined) end = this.length;

  if (end > this.length) {
    throw new Error('oob');
  }
  if (start > end) {
    throw new Error('oob');
  }

  return new Buffer(this, end - start, +start);
};

SlowBuffer.prototype.copy = function(target, targetstart, sourcestart, sourceend) {
  var temp = [];
  for (var i=sourcestart; i<sourceend; i++) {
    assert.ok(typeof this[i] !== 'undefined', "copying undefined buffer bytes!");
    temp.push(this[i]);
  }

  for (var i=targetstart; i<targetstart+temp.length; i++) {
    target[i] = temp[i-targetstart];
  }
};

function coerce(length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length);
  return length < 0 ? 0 : length;
}


// Buffer

function Buffer(subject, encoding, offset) {
  if (!(this instanceof Buffer)) {
    return new Buffer(subject, encoding, offset);
  }

  var type;

  // Are we slicing?
  if (typeof offset === 'number') {
    this.length = coerce(encoding);
    this.parent = subject;
    this.offset = offset;
  } else {
    // Find the length
    switch (type = typeof subject) {
      case 'number':
        this.length = coerce(subject);
        break;

      case 'string':
        this.length = Buffer.byteLength(subject, encoding);
        break;

      case 'object': // Assume object is an array
        this.length = coerce(subject.length);
        break;

      default:
        throw new Error('First argument needs to be a number, ' +
                        'array or string.');
    }

    if (this.length > Buffer.poolSize) {
      // Big buffer, just alloc one.
      this.parent = new SlowBuffer(this.length);
      this.offset = 0;

    } else {
      // Small buffer.
      if (!pool || pool.length - pool.used < this.length) allocPool();
      this.parent = pool;
      this.offset = pool.used;
      pool.used += this.length;
    }

    // Treat array-ish objects as a byte array.
    if (isArrayIsh(subject)) {
      for (var i = 0; i < this.length; i++) {
        this.parent[i + this.offset] = subject[i];
      }
    } else if (type == 'string') {
      // We are a string
      this.length = this.write(subject, 0, encoding);
    }
  }

}

function isArrayIsh(subject) {
  return Array.isArray(subject) || Buffer.isBuffer(subject) ||
         subject && typeof subject === 'object' &&
         typeof subject.length === 'number';
}

exports.SlowBuffer = SlowBuffer;
exports.Buffer = Buffer;

Buffer.poolSize = 8 * 1024;
var pool;

function allocPool() {
  pool = new SlowBuffer(Buffer.poolSize);
  pool.used = 0;
}


// Static methods
Buffer.isBuffer = function isBuffer(b) {
  return b instanceof Buffer || b instanceof SlowBuffer;
};

Buffer.concat = function (list, totalLength) {
  if (!Array.isArray(list)) {
    throw new Error("Usage: Buffer.concat(list, [totalLength])\n \
      list should be an Array.");
  }

  if (list.length === 0) {
    return new Buffer(0);
  } else if (list.length === 1) {
    return list[0];
  }

  if (typeof totalLength !== 'number') {
    totalLength = 0;
    for (var i = 0; i < list.length; i++) {
      var buf = list[i];
      totalLength += buf.length;
    }
  }

  var buffer = new Buffer(totalLength);
  var pos = 0;
  for (var i = 0; i < list.length; i++) {
    var buf = list[i];
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer;
};

// Inspect
Buffer.prototype.inspect = function inspect() {
  var out = [],
      len = this.length;

  for (var i = 0; i < len; i++) {
    out[i] = toHex(this.parent[i + this.offset]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }

  return '<Buffer ' + out.join(' ') + '>';
};


Buffer.prototype.get = function get(i) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this.parent[this.offset + i];
};


Buffer.prototype.set = function set(i, v) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this.parent[this.offset + i] = v;
};


// write(string, offset = 0, length = buffer.length-offset, encoding = 'utf8')
Buffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  var ret;
  switch (encoding) {
    case 'hex':
      ret = this.parent.hexWrite(string, this.offset + offset, length);
      break;

    case 'utf8':
    case 'utf-8':
      ret = this.parent.utf8Write(string, this.offset + offset, length);
      break;

    case 'ascii':
      ret = this.parent.asciiWrite(string, this.offset + offset, length);
      break;

    case 'binary':
      ret = this.parent.binaryWrite(string, this.offset + offset, length);
      break;

    case 'base64':
      // Warning: maxLength not taken into account in base64Write
      ret = this.parent.base64Write(string, this.offset + offset, length);
      break;

    case 'ucs2':
    case 'ucs-2':
      ret = this.parent.ucs2Write(string, this.offset + offset, length);
      break;

    default:
      throw new Error('Unknown encoding');
  }

  Buffer._charsWritten = SlowBuffer._charsWritten;

  return ret;
};


// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();

  if (typeof start == 'undefined' || start < 0) {
    start = 0;
  } else if (start > this.length) {
    start = this.length;
  }

  if (typeof end == 'undefined' || end > this.length) {
    end = this.length;
  } else if (end < 0) {
    end = 0;
  }

  start = start + this.offset;
  end = end + this.offset;

  switch (encoding) {
    case 'hex':
      return this.parent.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.parent.utf8Slice(start, end);

    case 'ascii':
      return this.parent.asciiSlice(start, end);

    case 'binary':
      return this.parent.binarySlice(start, end);

    case 'base64':
      return this.parent.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.parent.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


// byteLength
Buffer.byteLength = SlowBuffer.byteLength;


// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill(value, start, end) {
  value || (value = 0);
  start || (start = 0);
  end || (end = this.length);

  if (typeof value === 'string') {
    value = value.charCodeAt(0);
  }
  if (!(typeof value === 'number') || isNaN(value)) {
    throw new Error('value is not a number');
  }

  if (end < start) throw new Error('end < start');

  // Fill 0 bytes; we're done
  if (end === start) return 0;
  if (this.length == 0) return 0;

  if (start < 0 || start >= this.length) {
    throw new Error('start out of bounds');
  }

  if (end < 0 || end > this.length) {
    throw new Error('end out of bounds');
  }

  return this.parent.fill(value,
                          start + this.offset,
                          end + this.offset);
};


// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function(target, target_start, start, end) {
  var source = this;
  start || (start = 0);
  end || (end = this.length);
  target_start || (target_start = 0);

  if (end < start) throw new Error('sourceEnd < sourceStart');

  // Copy 0 bytes; we're done
  if (end === start) return 0;
  if (target.length == 0 || source.length == 0) return 0;

  if (target_start < 0 || target_start >= target.length) {
    throw new Error('targetStart out of bounds');
  }

  if (start < 0 || start >= source.length) {
    throw new Error('sourceStart out of bounds');
  }

  if (end < 0 || end > source.length) {
    throw new Error('sourceEnd out of bounds');
  }

  // Are we oob?
  if (end > this.length) {
    end = this.length;
  }

  if (target.length - target_start < end - start) {
    end = target.length - target_start + start;
  }

  return this.parent.copy(target.parent,
                          target_start + target.offset,
                          start + this.offset,
                          end + this.offset);
};


// slice(start, end)
Buffer.prototype.slice = function(start, end) {
  if (end === undefined) end = this.length;
  if (end > this.length) throw new Error('oob');
  if (start > end) throw new Error('oob');

  return new Buffer(this.parent, end - start, +start + this.offset);
};


// Legacy methods for backwards compatibility.

Buffer.prototype.utf8Slice = function(start, end) {
  return this.toString('utf8', start, end);
};

Buffer.prototype.binarySlice = function(start, end) {
  return this.toString('binary', start, end);
};

Buffer.prototype.asciiSlice = function(start, end) {
  return this.toString('ascii', start, end);
};

Buffer.prototype.utf8Write = function(string, offset) {
  return this.write(string, offset, 'utf8');
};

Buffer.prototype.binaryWrite = function(string, offset) {
  return this.write(string, offset, 'binary');
};

Buffer.prototype.asciiWrite = function(string, offset) {
  return this.write(string, offset, 'ascii');
};

Buffer.prototype.readUInt8 = function(offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  return buffer.parent[buffer.offset + offset];
};

function readUInt16(buffer, offset, isBigEndian, noAssert) {
  var val = 0;


  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (isBigEndian) {
    val = buffer.parent[buffer.offset + offset] << 8;
    val |= buffer.parent[buffer.offset + offset + 1];
  } else {
    val = buffer.parent[buffer.offset + offset];
    val |= buffer.parent[buffer.offset + offset + 1] << 8;
  }

  return val;
}

Buffer.prototype.readUInt16LE = function(offset, noAssert) {
  return readUInt16(this, offset, false, noAssert);
};

Buffer.prototype.readUInt16BE = function(offset, noAssert) {
  return readUInt16(this, offset, true, noAssert);
};

function readUInt32(buffer, offset, isBigEndian, noAssert) {
  var val = 0;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (isBigEndian) {
    val = buffer.parent[buffer.offset + offset + 1] << 16;
    val |= buffer.parent[buffer.offset + offset + 2] << 8;
    val |= buffer.parent[buffer.offset + offset + 3];
    val = val + (buffer.parent[buffer.offset + offset] << 24 >>> 0);
  } else {
    val = buffer.parent[buffer.offset + offset + 2] << 16;
    val |= buffer.parent[buffer.offset + offset + 1] << 8;
    val |= buffer.parent[buffer.offset + offset];
    val = val + (buffer.parent[buffer.offset + offset + 3] << 24 >>> 0);
  }

  return val;
}

Buffer.prototype.readUInt32LE = function(offset, noAssert) {
  return readUInt32(this, offset, false, noAssert);
};

Buffer.prototype.readUInt32BE = function(offset, noAssert) {
  return readUInt32(this, offset, true, noAssert);
};


/*
 * Signed integer types, yay team! A reminder on how two's complement actually
 * works. The first bit is the signed bit, i.e. tells us whether or not the
 * number should be positive or negative. If the two's complement value is
 * positive, then we're done, as it's equivalent to the unsigned representation.
 *
 * Now if the number is positive, you're pretty much done, you can just leverage
 * the unsigned translations and return those. Unfortunately, negative numbers
 * aren't quite that straightforward.
 *
 * At first glance, one might be inclined to use the traditional formula to
 * translate binary numbers between the positive and negative values in two's
 * complement. (Though it doesn't quite work for the most negative value)
 * Mainly:
 *  - invert all the bits
 *  - add one to the result
 *
 * Of course, this doesn't quite work in Javascript. Take for example the value
 * of -128. This could be represented in 16 bits (big-endian) as 0xff80. But of
 * course, Javascript will do the following:
 *
 * > ~0xff80
 * -65409
 *
 * Whoh there, Javascript, that's not quite right. But wait, according to
 * Javascript that's perfectly correct. When Javascript ends up seeing the
 * constant 0xff80, it has no notion that it is actually a signed number. It
 * assumes that we've input the unsigned value 0xff80. Thus, when it does the
 * binary negation, it casts it into a signed value, (positive 0xff80). Then
 * when you perform binary negation on that, it turns it into a negative number.
 *
 * Instead, we're going to have to use the following general formula, that works
 * in a rather Javascript friendly way. I'm glad we don't support this kind of
 * weird numbering scheme in the kernel.
 *
 * (BIT-MAX - (unsigned)val + 1) * -1
 *
 * The astute observer, may think that this doesn't make sense for 8-bit numbers
 * (really it isn't necessary for them). However, when you get 16-bit numbers,
 * you do. Let's go back to our prior example and see how this will look:
 *
 * (0xffff - 0xff80 + 1) * -1
 * (0x007f + 1) * -1
 * (0x0080) * -1
 */
Buffer.prototype.readInt8 = function(offset, noAssert) {
  var buffer = this;
  var neg;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  neg = buffer.parent[buffer.offset + offset] & 0x80;
  if (!neg) {
    return (buffer.parent[buffer.offset + offset]);
  }

  return ((0xff - buffer.parent[buffer.offset + offset] + 1) * -1);
};

function readInt16(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt16(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x8000;
  if (!neg) {
    return val;
  }

  return (0xffff - val + 1) * -1;
}

Buffer.prototype.readInt16LE = function(offset, noAssert) {
  return readInt16(this, offset, false, noAssert);
};

Buffer.prototype.readInt16BE = function(offset, noAssert) {
  return readInt16(this, offset, true, noAssert);
};

function readInt32(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt32(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x80000000;
  if (!neg) {
    return (val);
  }

  return (0xffffffff - val + 1) * -1;
}

Buffer.prototype.readInt32LE = function(offset, noAssert) {
  return readInt32(this, offset, false, noAssert);
};

Buffer.prototype.readInt32BE = function(offset, noAssert) {
  return readInt32(this, offset, true, noAssert);
};

function readFloat(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.readFloatLE = function(offset, noAssert) {
  return readFloat(this, offset, false, noAssert);
};

Buffer.prototype.readFloatBE = function(offset, noAssert) {
  return readFloat(this, offset, true, noAssert);
};

function readDouble(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 7 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.readDoubleLE = function(offset, noAssert) {
  return readDouble(this, offset, false, noAssert);
};

Buffer.prototype.readDoubleBE = function(offset, noAssert) {
  return readDouble(this, offset, true, noAssert);
};


/*
 * We have to make sure that the value is a valid integer. This means that it is
 * non-negative. It has no fractional component and that it does not exceed the
 * maximum allowed value.
 *
 *      value           The number to check for validity
 *
 *      max             The maximum value
 */
function verifuint(value, max) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value >= 0,
      'specified a negative value for writing an unsigned value');

  assert.ok(value <= max, 'value is larger than maximum value for type');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

Buffer.prototype.writeUInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xff);
  }

  buffer.parent[buffer.offset + offset] = value;
};

function writeUInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffff);
  }

  if (isBigEndian) {
    buffer.parent[buffer.offset + offset] = (value & 0xff00) >>> 8;
    buffer.parent[buffer.offset + offset + 1] = value & 0x00ff;
  } else {
    buffer.parent[buffer.offset + offset + 1] = (value & 0xff00) >>> 8;
    buffer.parent[buffer.offset + offset] = value & 0x00ff;
  }
}

Buffer.prototype.writeUInt16LE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt16BE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, true, noAssert);
};

function writeUInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffffffff);
  }

  if (isBigEndian) {
    buffer.parent[buffer.offset + offset] = (value >>> 24) & 0xff;
    buffer.parent[buffer.offset + offset + 1] = (value >>> 16) & 0xff;
    buffer.parent[buffer.offset + offset + 2] = (value >>> 8) & 0xff;
    buffer.parent[buffer.offset + offset + 3] = value & 0xff;
  } else {
    buffer.parent[buffer.offset + offset + 3] = (value >>> 24) & 0xff;
    buffer.parent[buffer.offset + offset + 2] = (value >>> 16) & 0xff;
    buffer.parent[buffer.offset + offset + 1] = (value >>> 8) & 0xff;
    buffer.parent[buffer.offset + offset] = value & 0xff;
  }
}

Buffer.prototype.writeUInt32LE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt32BE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, true, noAssert);
};


/*
 * We now move onto our friends in the signed number category. Unlike unsigned
 * numbers, we're going to have to worry a bit more about how we put values into
 * arrays. Since we are only worrying about signed 32-bit values, we're in
 * slightly better shape. Unfortunately, we really can't do our favorite binary
 * & in this system. It really seems to do the wrong thing. For example:
 *
 * > -32 & 0xff
 * 224
 *
 * What's happening above is really: 0xe0 & 0xff = 0xe0. However, the results of
 * this aren't treated as a signed number. Ultimately a bad thing.
 *
 * What we're going to want to do is basically create the unsigned equivalent of
 * our representation and pass that off to the wuint* functions. To do that
 * we're going to do the following:
 *
 *  - if the value is positive
 *      we can pass it directly off to the equivalent wuint
 *  - if the value is negative
 *      we do the following computation:
 *         mb + val + 1, where
 *         mb   is the maximum unsigned value in that byte size
 *         val  is the Javascript negative integer
 *
 *
 * As a concrete value, take -128. In signed 16 bits this would be 0xff80. If
 * you do out the computations:
 *
 * 0xffff - 128 + 1
 * 0xffff - 127
 * 0xff80
 *
 * You can then encode this value as the signed version. This is really rather
 * hacky, but it should work and get the job done which is our goal here.
 */

/*
 * A series of checks to make sure we actually have a signed 32-bit number
 */
function verifsint(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

function verifIEEE754(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');
}

Buffer.prototype.writeInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7f, -0x80);
  }

  if (value >= 0) {
    buffer.writeUInt8(value, offset, noAssert);
  } else {
    buffer.writeUInt8(0xff + value + 1, offset, noAssert);
  }
};

function writeInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fff, -0x8000);
  }

  if (value >= 0) {
    writeUInt16(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt16(buffer, 0xffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt16LE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt16BE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, true, noAssert);
};

function writeInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fffffff, -0x80000000);
  }

  if (value >= 0) {
    writeUInt32(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt32(buffer, 0xffffffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt32LE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt32BE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, true, noAssert);
};

function writeFloat(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.writeFloatLE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, false, noAssert);
};

Buffer.prototype.writeFloatBE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, true, noAssert);
};

function writeDouble(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 7 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.writeDoubleLE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, false, noAssert);
};

Buffer.prototype.writeDoubleBE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, true, noAssert);
};

SlowBuffer.prototype.readUInt8 = Buffer.prototype.readUInt8;
SlowBuffer.prototype.readUInt16LE = Buffer.prototype.readUInt16LE;
SlowBuffer.prototype.readUInt16BE = Buffer.prototype.readUInt16BE;
SlowBuffer.prototype.readUInt32LE = Buffer.prototype.readUInt32LE;
SlowBuffer.prototype.readUInt32BE = Buffer.prototype.readUInt32BE;
SlowBuffer.prototype.readInt8 = Buffer.prototype.readInt8;
SlowBuffer.prototype.readInt16LE = Buffer.prototype.readInt16LE;
SlowBuffer.prototype.readInt16BE = Buffer.prototype.readInt16BE;
SlowBuffer.prototype.readInt32LE = Buffer.prototype.readInt32LE;
SlowBuffer.prototype.readInt32BE = Buffer.prototype.readInt32BE;
SlowBuffer.prototype.readFloatLE = Buffer.prototype.readFloatLE;
SlowBuffer.prototype.readFloatBE = Buffer.prototype.readFloatBE;
SlowBuffer.prototype.readDoubleLE = Buffer.prototype.readDoubleLE;
SlowBuffer.prototype.readDoubleBE = Buffer.prototype.readDoubleBE;
SlowBuffer.prototype.writeUInt8 = Buffer.prototype.writeUInt8;
SlowBuffer.prototype.writeUInt16LE = Buffer.prototype.writeUInt16LE;
SlowBuffer.prototype.writeUInt16BE = Buffer.prototype.writeUInt16BE;
SlowBuffer.prototype.writeUInt32LE = Buffer.prototype.writeUInt32LE;
SlowBuffer.prototype.writeUInt32BE = Buffer.prototype.writeUInt32BE;
SlowBuffer.prototype.writeInt8 = Buffer.prototype.writeInt8;
SlowBuffer.prototype.writeInt16LE = Buffer.prototype.writeInt16LE;
SlowBuffer.prototype.writeInt16BE = Buffer.prototype.writeInt16BE;
SlowBuffer.prototype.writeInt32LE = Buffer.prototype.writeInt32LE;
SlowBuffer.prototype.writeInt32BE = Buffer.prototype.writeInt32BE;
SlowBuffer.prototype.writeFloatLE = Buffer.prototype.writeFloatLE;
SlowBuffer.prototype.writeFloatBE = Buffer.prototype.writeFloatBE;
SlowBuffer.prototype.writeDoubleLE = Buffer.prototype.writeDoubleLE;
SlowBuffer.prototype.writeDoubleBE = Buffer.prototype.writeDoubleBE;

},{"assert":1,"./buffer_ieee754":8,"base64-js":9}],9:[function(require,module,exports){
(function (exports) {
	'use strict';

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	function b64ToByteArray(b64) {
		var i, j, l, tmp, placeHolders, arr;
	
		if (b64.length % 4 > 0) {
			throw 'Invalid string. Length must be a multiple of 4';
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		placeHolders = b64.indexOf('=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (lookup.indexOf(b64[i]) << 18) | (lookup.indexOf(b64[i + 1]) << 12) | (lookup.indexOf(b64[i + 2]) << 6) | lookup.indexOf(b64[i + 3]);
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (lookup.indexOf(b64[i]) << 2) | (lookup.indexOf(b64[i + 1]) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (lookup.indexOf(b64[i]) << 10) | (lookup.indexOf(b64[i + 1]) << 4) | (lookup.indexOf(b64[i + 2]) >> 2);
			arr.push((tmp >> 8) & 0xFF);
			arr.push(tmp & 0xFF);
		}

		return arr;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1];
				output += lookup[temp >> 2];
				output += lookup[(temp << 4) & 0x3F];
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup[temp >> 10];
				output += lookup[(temp >> 4) & 0x3F];
				output += lookup[(temp << 2) & 0x3F];
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

},{}]},{},[])
;;module.exports=require("buffer-browserify")

},{}],125:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[118])
;