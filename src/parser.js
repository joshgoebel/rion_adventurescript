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
    let i = this.index - 1
    // console.log("index is", this.index, "i is", i)
    while (i >= 0) {
      if (
        this.tokens[i].type === "whitespace" ||
        this.tokens[i].type === "newline"
      ) {
        i -= 1
        console.log("seeking backwards")
        continue;
      }
      console.log("previous sig", this.tokens[i].type)
      return this.tokens[i].type === type
    }
    return false;
  }
  popContext() {
    console.log("closing bracket, leaving context:", this.top._id)
    this.stack.pop()
    console.log("STACK LEN", this.stack.length)
    console.log("STACK", this.stack.map(x => x._id))
  }
  pushContext(context) {
    console.log("pushing context:", context._id)
    this.stack.push(context)
    console.log("STACK LEN", this.stack.length)
    console.log("STACK", this.stack.map(x => x._id))
  }
  parse() {
    this.data = this.newCollection()
    this.data._id = "_root"
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
        this.popContext()        
        
        continue
      }
      // parseObject already should have opened a context
      // on the stack for us, so we just need to skip over this
      if (this.is("openBracket")) {
        this.eat("openBracket")
        if (this.top._inline) { this.top._inline = false }
        continue
      }
      if (this.is("openParen")) {
        // console.log("FOUND OPEN PAREN")
        let tokens = this.eatExpression();
        // assume an expression we find is a value for the most
        // recently opened context
        if (this.top._value === null) {
          this.top._value = tokens
        }
        continue
      }
      // end of a non {} item/line
      // although these are also allowed to fllow after the {} also
      if (this.is("semicolon")) {
        let canSafelyIgnore = this.isPreviousSig("closeBracket")
        this.eat("semicolon")
        if (canSafelyIgnore) {
          console.log("safely ignoring ;")
          continue;
        }

        if (this.top._inline) {
          console.log("semicolon!")
          this.popContext()
        } else {
          console.log("safely ignoring, not inline")
        }
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
          console.log("open bracket for context: ", name)
          let collection = this.newCollection()
          collection._id = name
          collection._inline = false
          this.top[name] = collection
          this.pushContext(collection)
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
  eatExpression() {
    if (this.isSig("openParen")) {
      // console.log("found COMBO")
      let tokens = []
      let depth = 0
      while (!this.isEOF) {
        if (this.is("closeParen") && depth===1) { break }
        if (this.is("closeParen")) { depth-=1 }
        if (this.is("openParen")) { depth+=1 }
        // console.log("inside expr", this.peek(), depth)
        tokens.push(this.peek())
        this.skip()  
      }
      tokens.push(this.peek())
      this.eat("closeParen")
      // this.eatWS()
      // tokens.push(this.peek())
      // this.eat("closeBracket")
      // this.eatWS()
      return tokens
    } else {
      this.error("expecting a () expression");
    }
  }
  parseObject(id) {
    this.skip()
    this.eatWS()
    let type = this.eat("ident")
    this.eatWS()
    let s = null
    if (this.is("string")) {
      s = this.eat("string")
    }
    this.eatWS()
    let o = {
      _id: id,
      _type: type.raw,
      _value: s,
      _inline: true,
      _items: []
    }
    this.top._items.push(o)
    this.pushContext(o)
    // this.stack.push(o)
    // console.log(o)
  }
  parseIdentEqualsValue(name) {
    this.skip() // assignment
    this.eatWS()
    let s = this.eat("string")
    // semi-colon after assigment is a NO-OP
    // while (this.is("semicolon")) {
    //   this.eat("semicolon");
    // }
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
    if (this.tokens[this.index])
      this.tokens[this.index].broken="HERE"
    console.log(this.tokens.splice(this.index-6, 10))
    throw(msg)
  }
  get isEOF() {
    return this.index >= this.tokens.length
  }
}