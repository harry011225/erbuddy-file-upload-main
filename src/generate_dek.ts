const crypto = require('crypto');

export function generateAES256Key() {

// 256-bit key = 32 bytes

return crypto.randomBytes(32);

}

// Usage example

// const key = generateAES256Key();

// console.log('Generated AES-256 Key:', key.toString('hex'));