// jsdom doesn't expose structuredClone, which fake-indexeddb needs to copy
// records. Use the v8 serializer as a stand-in for the test environment.
const v8 = require('v8');

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (value) => v8.deserialize(v8.serialize(value));
}

// Real IndexedDB (in memory) for every test file
require('fake-indexeddb/auto');
