export class Parser {
	constructor(lexer) {
		this.lexer = lexer
    this.index = 0;
	}
  // stack
  get top() {
    return this.stack[this.stack.length-1]
  }

  // parser

  peek(offset = 0) {
    if (this.isEOF) return null;

    return this.tokens[this.index + offset];
  }
  consume() {
    let v = this.peek()
    this.skip()
    return v
  }
  is(type) {
    if (this.isEOF) return false;

    return this.peek().type === type
  }
  next() {
    this.index += 1
  }
  skip() {
    this.index += 1
  }
  eatWS() {
    while (!this.isEOF && (this.is("whitespace") || this.is("newline"))) {
      this.skip();
      }
  }
  eat(type) {
    if (!this.is(type)) this.raiseExpected(type)

    let v = this.peek()
    this.skip()  
    return v
  }
  newCollection() {
    return { _items: [] };
  }
  get tokens() { return this.lexer.tokens }
  isPreviousSig(type) {
    let i = this.index
    while (i >= 0) {
      if (
        this.tokens[i].type === "whitespace" ||
        this.tokens[i].type === "newline"
      ) {
        i -= 1
        continue;
      }

      return this.tokens[i].type === type
    }
    return false;
  }
  parse() {
    this.data = this.newCollection()
    this.stack = [this.data]
    while (!this.isEOF) {
      if (this.is("comment")) { this.skip(); continue }
      if (this.is("whitespace")) { this.skip(); continue }
      if (this.is("newline")) { this.skip(); continue }
      if (this.is("global")) { this.parseGlobal(); continue }
      if (this.is("closeBracket")) {
        if (this.stack.length === 1) {
          this.error("closing bracket, but no collection to close")
        }
        this.eat("closeBracket")
        this.stack.pop()
        continue
      }
      // end of a non {} item/line
      // although these are also allowed to fllow after the {} also
      if (this.is("semicolon")) {
        this.eat("semicolon")
        if (this.isPreviousSig("closeBracket")) continue;

        this.stack.pop()
        continue
      }
      // unnamed object
      if (this.is("colon")) {
        this.parseObject(null)
        continue
      }
      if (this.is("ident")) {
        let name = this.consume().raw
        this.eatWS()
        if (this.is("colon")) {
          this.parseObject(name)
        } else if (this.is("assignment")) {
          this.parseIdentEqualsValue(name)
        } else if (this.is("openBracket")) {
          this.skip()
          let collection = this.newCollection()
          this.data[name] = collection
          this.stack.push(collection)
          continue
        } else {
          this.unexpectedToken();    
        }
        continue
      }

      this.unexpectedToken();
    }
  }
  isSig(...args) {
    let i = this.index
    let toMatch = []
    while (i < this.tokens.length && toMatch.length < args.length) {
      if ( this.tokens[i].type === "whitespace" ||
        this.tokens[i].type === "newline") {
        i++;
        continue
      }

      toMatch.push(this.tokens[i].type)
      i++
    }
    // console.log(toMatch, args);
    return toMatch.join(":") === args.join(":")
  }
  eatStringOrExpression() {
    if (this.is("string")) {
      return this.eat("string");
    } else if (this.isSig("openBracket","openParen")) {
      console.log("found COMBO")
      let tokens = []
      while (!this.isEOF) {
        if (this.is("closeParen")) {
          if (this.isSig("closeParen","closeBracket")) break;
        }
        console.log(this.peek())
        tokens.push(this.peek())
        this.skip()  
      }
      tokens.push(this.peek())
      this.eat("closeParen")
      this.eatWS()
      tokens.push(this.peek())
      this.eat("closeBracket")
      this.eatWS()
      return tokens
    } else {
      this.error("expecting a string or {( )} expression combo");
    }
  }
  parseObject(id) {
    this.skip()
    this.eatWS()
    let type = this.eat("ident")
    this.eatWS()
    let s = this.eatStringOrExpression()
    this.eatWS()
    let o = {
      _id: id,
      _type: type.raw,
      _value: s,
      _items: []
    }
    this.top._items.push(o)
    this.stack.push(o)

    // if (this.is("semicolon")) { 
    //   this.skip()
    // }
    console.log(o)
  }
  parseIdentEqualsValue(name) {
    this.skip() // assignment
    this.eatWS()
    let s = this.eat("string")
    this.top[name] = s
  }
  parseGlobal() {
    let name = this.consume().raw
    this.eatWS()
    this.eat("assignment")
    this.eatWS()
    this.data[name] = this.consume().raw
  }
  raiseExpected(type) {
    console.log("unexpected token: ", this.peek())
    console.log("I was expecting: ", type)
    this.error()
  }
  unexpectedToken() {
    console.log("unexpected token: ", this.peek())
    this.error()
  }
  error(msg) {
    console.dir(this.data, {depth: null})
    console.log("context")
    this.tokens[this.index].broken="HERE"
    console.log(this.tokens.splice(this.index-3, 6))
    throw(msg)
  }
  get isEOF() {
    this.index >= this.tokens.length
  }
}