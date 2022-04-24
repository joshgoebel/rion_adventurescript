// const sum = require('../src/lexer.js');
import { Lexer } from "../src/lexer.js";


const lexAll = (s) => {
  let lexer = new Lexer(s)
  lexer.lex()
  return lexer.tokens
}

const lex = (s) => {
  return lexAll(s).filter(s => {
    return (s.type != "whitespace" && s.type != "newline")
  })
}

const lexType = (s) => {
  return lex(s).map(x => x.type)
}

test('whitespace', () => {
  let s = `game_info {
    cherry = mario
  }`
  expect(lexAll(s).map(x => x.type)).toEqual(
    [
      "ident", 
      "whitespace", 
      "openBracket", 
      "newline", 
      "whitespace", 
      "ident", 
      "whitespace", 
      "assignment", 
      "whitespace", 
      "string", 
      "newline", 
      "whitespace", 
      "closeBracket", 
    ]
  )
});

test('globals', () => {
  let s = `
  __name = Josh Goebel
  __id = 12345
  `.trim()
  
  expect(lexType(s)).toEqual(
    [
      "global",
      "assignment",
      "string",
      "global",
      "assignment",
      "string"
    ]
  )
})

test('comments', () => {
  let s = `
  # signal
  // more than life
  /* how are you */
  `.trim()
  
  expect(lexType(s)).toEqual(
    [
      "comment",
      "comment",
      "comment"
    ])
})

test('arrays', () => {
  let s = `
    items = [ bob, smith]
  `
  expect(lexType(s)).toEqual(
    [
      "ident",
      "assignment",
      "openArray",
      "ident", "comma", "ident",
      "closeArray"
    ])
})

test('simple object', () => {
  let s = `
    attic:location "dusty" header="attic"
  `
  expect(lexType(s)).toEqual(
    [
      "ident",
      "colon",
      "ident",
      "string",
      "ident",
      "assignment",
      "string"
    ])
})

test('simple block', () => {
  let s = `
  on_command {
    :match "go town" {
      :goto "town";
    }
  }
`
expect(lexType(s)).toEqual(
  [
    "ident", "openBracket",
    "colon", "ident", "string", "openBracket",
    "colon", "ident", "string", "semicolon",
    "closeBracket",
    "closeBracket",
  ])
})

test('simple conditional', () => {
  let s = `
  :if (verb_is("talk")) {
    :print "Hello."
  }
`
expect(lexType(s)).toEqual(
  [
    "colon", "ident", "openParen", 'ident', "openParen", "string", "closeParen",
      "closeParen", "openBracket",
    "colon", "ident", "string",
    "closeBracket" 
  ])
})

test("complex conditional", () => {
  let s = `
  (x > 6 
    && y < 19 
    || !one
    || b == 2 
    || a >= 20
    || a <= 20
    || xyz != 3
    || (a ? 1 : 2)
  )
`
expect(lexType(s)).toEqual(
  [
    "openParen", "ident", "greaterThan", "number",
    "and", "ident", "lessThan", "number",
    "or", "negation", "ident",
    "or", "ident", "equality", "number",
    "or", "ident", "greaterOrEqual", "number",
    "or", "ident", "lessOrEqual", "number",
    "or", "ident", "notEqual", "number",
    "or", "openParen", "ident", "ternary", "number", "colon", "number", "closeParen",
    "closeParen"
  ])
})

test("math", () => {
  let s = `
  :set_number var="x" {(
    1 + 2 * 3 / 5
  )}
`
expect(lexType(s)).toEqual(
  [
    "colon", "ident", "ident", "assignment", "string", "openBracket", "openParen",
    "number", "plus", "number", "times", "number", "forwardSlash", "number",
    "closeParen", "closeBracket"
  ])
})

test("pointer", () => {
  let s = `
  :set_number "x" value -> (42)
`
expect(lexType(s)).toEqual(
  [
    "colon", "ident", "string","ident", "pointer", 
      "openParen", "number", "closeParen"
  ])
})

// TODO should this be tokenize as a single entity reference?
test("global reference outside string", () => {
  let s = '${{__booger}}'

  expect(lexType(s)).toEqual(
    [
      "dollar", "openBracket", "openBracket","global", 
      "closeBracket","closeBracket"
    ])
})