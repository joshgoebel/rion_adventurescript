const DEBUG = false

export class Parser {
	constructor(lexer) {
		this.lexer = lexer
    this.index = 0;
	}
  get isEOF() {
    return this.index >= this.tokens.length
  }
  // stack
  get top() {
    return this.stack[this.stack.length-1]
  }

  // parser
  peek() {
    if (this.isEOF) return null;

    return this.tokens[this.index];
  }
  consume() {
    let v = this.peek()
    this.advance()
    return v
  }
  is(type) {
    if (this.isEOF) return false;

    return this.peek().type === type
  }
  advance() {
    this.index += 1
  }
  eatWS() {
    while (this.is("whitespace") || this.is("newline")) {
      this.advance();
    }
  }
  eat(type) {
    if (!this.is(type)) this.raiseExpected(type)

    let v = this.peek()
    this.advance()  
    return v
  }
  newCollection({id}) {
    return { _id: id, _items: [] };
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
        // console.log("seeking backwards")
        continue;
      }
      // console.log("previous sig", this.tokens[i].type)
      return this.tokens[i].type === type
    }
    return false;
  }
  popContext() {
    // console.log("closing bracket, leaving context:", this.top._id)
    const ctx = this.stack.pop()
    if (ctx._items.length===0) { delete ctx._items }
    if (!DEBUG) { delete ctx._inline }
    // console.log("STACK LEN", this.stack.length)
    // console.log("STACK", this.stack.map(x => x._id))
  }
  pushContext(context) {
    // console.log("pushing context:", context._id)
    this.stack.push(context)
    // console.log("STACK LEN", this.stack.length)
    // console.log("STACK", this.stack.map(x => x._id))
  }
  parse() {
    this.data = this.newCollection({id: "_root"})
    this.stack = [this.data]
    while (!this.isEOF) {
      if (this.is("comment")) { this.advance(); continue }
      if (this.is("whitespace")) { this.advance(); continue }
      if (this.is("newline")) { this.advance(); continue }
      if (this.is("global")) { this.parseGlobal(); continue }

      if (this.is("closeBracket")) {
        if (this.stack.length === 1) {
          this.error("closing bracket, but no collection to close")
        }
        this.advance()
        this.popContext()        
        
        continue
      }

      if (this.is("openBracket")) {
        this.advance()
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

      // end of a non {} block item/line
      // although these are also allowed to fllow after the {} also
      if (this.is("semicolon")) {
        let canSafelyIgnore = this.isPreviousSig("closeBracket")
        this.advance()
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
        this.parseObject({id: null})
        continue
      }

      if (this.is("ident")) {
        let id = this.consume().raw
        this.eatWS()
        // TODO: FIX THIS, it's a huge hack
        while (this.isSig("comma","ident")) {
          console.log("SKIPPING MULTI_ARRAY")
          this.eat("comma")
          this.eatWS()
          this.eat("ident")
          this.eatWS()
        }
        if (this.is("colon")) {
          this.parseObject({id})
          continue
        } else if (this.is("pointer")) {
          this.parseIdentPointerValue(id)
          continue
        } else if (this.is("assignment")) {
          this.parseIdentEqualsValue(id)
          continue
        } else if (this.is("openBracket")) {
          this.advance()
          console.log("open bracket for context: ", id)
          let collection = this.newCollection({id})
          collection._inline = false
          this.top[id] = collection
          this.pushContext(collection)
          // this.parseObject({id})
          continue
        }
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
        this.advance()  
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
  parseObject({id}) {
    this.advance()
    this.eatWS()
    let type = this.eat("ident")
    this.eatWS()
    let s = null
    if (this.is("string")) {
      s = {...this.eat("string"), _token: true }
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
  parseStringOrArray() {
    if (this.is("string")) {
      return {...this.eat("string"), _token: true}
    }
    if (this.is("openArray")) {
      let tokens = []
      while (!this.isEOF) {
        if (this.is("closeArray")) break;
        tokens.push(this.peek())
        this.advance()
      }
      tokens.push(this.peek())
      this.eat("closeArray")
      return {
        _array: true,
        _tokens: tokens
      }
    }
    this.error("expecting string or array for assignment")
  }
  parseIdentEqualsValue(name) {
    this.advance() // assignment
    this.eatWS()

    let s = this.parseStringOrArray()
    // semi-colon after assigment is a NO-OP
    // while (this.is("semicolon")) {
    //   this.eat("semicolon");
    // }
    this.top[name] = s
  }
  parseIdentPointerValue(name) {
    this.advance() // pointer
    this.eatWS()

    let s = this.eatExpression()
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
}