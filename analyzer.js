const fs = require('fs');

const html = fs.readFileSync('bet365.html', 'utf8');

const stakes = [];
const returns = [];

// Simple regex to find context around words
const stakeMatches = [...html.matchAll(/.{0,50}Stake.{0,50}/gi)];
const returnMatches = [...html.matchAll(/.{0,50}Retorno.{0,50}/gi)];
const winMatches = [...html.matchAll(/.{0,50}Ganhos.{0,50}/gi)];
const apostaMatches = [...html.matchAll(/.{0,50}Aposta.{0,50}/gi)];

console.log("=== STAKE MATCHES ===");
stakeMatches.slice(0, 5).forEach(m => console.log(m[0]));

console.log("\n=== RETORNO MATCHES ===");
returnMatches.slice(0, 5).forEach(m => console.log(m[0]));

console.log("\n=== GANHOS MATCHES ===");
winMatches.slice(0, 5).forEach(m => console.log(m[0]));

console.log("\n=== APOSTA MATCHES ===");
apostaMatches.slice(0, 5).forEach(m => console.log(m[0]));
