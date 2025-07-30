// 测试环境设置

// 模拟Tauri环境
Object.defineProperty(window, '__TAURI__', {
  value: {},
  writable: true
});

// 模拟IndexedDB（如果需要）
if (!global.indexedDB) {
  const FDBFactory = require('fake-indexeddb/lib/FDBFactory');
  const FDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
  
  global.indexedDB = new FDBFactory();
  global.IDBKeyRange = FDBKeyRange;
}

// 模拟localStorage
if (!global.localStorage) {
  global.localStorage = {
    getItem: (key: string) => null,
    setItem: (key: string, value: string) => {},
    removeItem: (key: string) => {},
    clear: () => {},
    length: 0,
    key: (index: number) => null
  };
}

console.log('测试环境设置完成');