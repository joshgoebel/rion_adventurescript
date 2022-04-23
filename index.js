import fs from "fs";
import { Lexer } from "./src/lexer.js";
import { Parser } from "./src/parser.js";

const data = fs.readFileSync('../island/island.adv', { encoding: 'utf8', flag: 'r' });

const lexer = new Lexer(data)
lexer.lex()
const tokens = lexer.tokens
// console.log(tokens)
// console.log("unknown", tokens.filter(x => x.type =="unknown").length)
// console.log(tokens.filter(x => x.type =="unknown"))
for (const t of tokens) {
  // console.log(t)
}

const parser = new Parser(lexer)
parser.parse()
console.log(parser.data)