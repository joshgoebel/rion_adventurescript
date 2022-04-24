
const SIMPLE_TOKENS = [
  [ "comment", /#.*(?=\n)/ ],
  [ "comment", /\/\/.*(?=\n)/ ],
  // TODO: is more complex parsing needed here for comments inside comments?
  [ "comment", /\/\*.*?\*\// ],
  [ "global", /__[a-z]+[a-z0-9_]*/ ],
  [ "ident", /[a-z]+[a-z_0-9]*/ ],
  [ "newline", /\n/ ],
  [ "whitespace", /\s+/ ],
  [ "forwardSlash", /\// ],
  [ "openParen", /\(/ ],
  [ "closeParen", /\)/ ],
  [ "openBracket", /\{/ ],
  [ "closeBracket", /\}/ ],
  [ "openArray", /\[/ ],
  [ "closeArray", /\]/ ],
  [ "pointer", /\->/ ],
  [ "notEquality", /!=/ ],
  [ "equality", /==/ ],
  [ "and", /&&/ ],
  [ "number", /\d+/ ],
  [ "ternary", /\?/ ],
  [ "or", /\|\|/ ],
  [ "greaterOrEqual", />=/ ],
  [ "lessOrEqual", /<=/ ],
  [ "lessThan", /</ ],
  [ "greaterThan", />/ ],
  [ "plus", /\+/ ],
  [ "negation", /!/ ],
  [ "minus", /[-]/ ],
  [ "times", /[*]/ ],
  [ "dollar", /\$/ ],
  [ "comma", /,/ ],
  [ "colon", /:/ ],
  [ "semicolon", /;/ ]
]

export class Lexer {
	constructor(source) {
		this.source = source
	}
  get isEOF() {
    return this.remaining.length === 0
  }
	lex() {
    this.tokens = []
		this.remaining = this.source
		this.position = 0
		next_token: 
    while (!this.isEOF) {

      if (this.peek(/"/)) {
        this.lexLiteralString();
        continue;
      }
      if (this.peek(/=(?!=)/)) {
        this.lexAssignment();
        continue;
      }

      // simple tokens
      for (const [type, regex] of SIMPLE_TOKENS) {
        if (!this.peek(regex)) { continue }
        
        this.tokenize(type, regex)
        continue next_token
        break;
      }

      // unknown
      this.tokenize("unknown", /./)
		}
	}
  tokenizeWS() {
    while (this.peek(/\s/)) {
      if (this.peek(/\n/)) { 
        this.tokenize("newline", /\n/) 
      } else {
        this.tokenize("whitespace", /\s+/) 
      }
    }
  }
  lexAssignment() {
    this.tokenize("assignment",/=/)
    this.tokenizeWS();
    // for normal brackets or string literals or arrays, 
    // we don't nede special handling
    if (this.peek(/\{|\"|\[/)) return;

    if (this.peek(/\\/)) {
      // TODO: fix this
      this.lexMultiLineString();
      return;
    }

    // unquoted string is until end of line
    this.tokenize("string", /[^\n]+/, {quoted: false})
  }
  lexLiteralString() {
    let buff = ""
    buff += this.consume(/"/)
    while (!this.isEOF) {
      if (this.peek(/"/)) { break } 

      if (this.peek(/\\/)) {
        buff += this.consume(/\\./)
      } else {
        buff += this.consume(/./)
      }
    }

    buff += this.consume(/"/)
    this.tokens.push({
      type: "string",
      quoted: true,
      raw: buff
    })
  }
	tokenize(type, match, opts = {}) {
		// if (!this.peek(match)) return;
    let result = {
			type,
			raw: this.consume(match),
      ...opts
		}
    if (type==="unknown") {
      let context = this.source.slice(this.position-10, this.position+10)
      result.context = context
    }
		this.tokens.push(result)
	}
	peek(x) {
		const re = new RegExp("^" + x.source)
		const match = re.exec(this.remaining)
		if (match && match.index === 0) {
			return match[0];
		} else {
			return null
		}
	}
	consume(re) {
		let result = this.peek(re)
		if (result) {
			this.remaining = this.remaining.slice(result.length)
			this.position += result.length
			return result
		} else {
			console.log("failed to consume", re)
			console.log("Remaining len: ", this.remaining.length)
			console.log("next up: ", this.remaining.slice(0, 10))
			throw("error");
		}
	}
}