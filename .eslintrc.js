module.exports = {
  env: {
    commonjs: true,
    es6: true,
    mocha: true
  },
  extends: ['standard'],
  globals: {
    GT: true,
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 11
  },
  rules: {}
}
