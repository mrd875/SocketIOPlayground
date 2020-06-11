module.exports = {
  env: {
    commonjs: true,
    es6: true,
    mocha: true
  },
  extends: ['standard'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 11
  },
  rules: {}
}
