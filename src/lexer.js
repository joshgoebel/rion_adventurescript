
const SIMPLE_TOKENS = [
  [ "comment", /#.*(?=\n)/ ],
  [ "comment", /\/\/.*(?=\n)/ ],
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
		this.tokens = []
	}
	lex() {
    let processed = false
		this.remaining = this.source
		this.position = 0
		while (this.remaining.length > 0) {
      processed = false

      if (this.peek(/"/)) {
        this.lexLiteralString();
        continue;
      }
      if (this.peek(/=(?!=)/)) {
        this.lexAssignment();
        continue;
      }

      // simple tokens
      for (const [type,match] of SIMPLE_TOKENS) {
        if (this.peek(match)) {
          this.tokenize(type, match)
          processed = true
          break;
        }
      }
      if (processed) { continue };

      // unknown
      this.tokenize("unknown", /./)
		}
	}
  eatWhitespace() {
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
    this.eatWhitespace();
    // for normal brackets or string literals or arrays, 
    // we don't nede special handling
    if (this.peek(/\{|\"|\[/)) return;

    if (this.peek(/\\/)) {
      // TODO: fix this
      this.lexMultiLineString();
      return;
    }

    // string is until end of line
    this.tokenize("string", /[^\n]+/)
  }
  lexLiteralString() {
    let buff = "";
    buff += `"`;
    this.consume(/"/);
    while (this.remaining.length > 0) {
      // end
      if (this.peek(/"/)) {
        buff += `"`;
        this.consume(/"/);
        break;
      } else if (this.peek(/\\/)) {
        buff += this.consume(/\\./)
      } else {
        buff += this.consume(/./)
      }
    }
    this.tokens.push({
      type: "string",
      raw: buff
    })
  }
	tokenize(type, match) {
		// if (!this.peek(match)) return;
    let data = {
			type,
			raw: this.consume(match),
		}
    if (type==="unknown") {
      let context = this.source.slice(this.position-10, this.position+10)
      data.context = context
    }
		this.tokens.push(data)
	}
	peek(x) {
		const re = new RegExp("^" + x.source)
    // const re = x
    re.lastIndex = 0
		const match = re.exec(this.remaining)
    // if (match) {
    //   console.log(match.index, match[0])
    // }
		if (match && match.index === 0) {
			// console.log(match[0])
			return match[0];
		} else {
			return null
		}
	}
	consume(x) {
		let str = this.peek(x)
		if (str) {
			// console.log(this.remaining.length)
			this.remaining = this.remaining.slice(str.length)
			this.position += str.length
			return str
		} else {
			console.log("no match")
			console.log("Remaining: ", this.remaining.length)
			console.log("next up: ", this.remaining.slice(0, 5))
			throw ("error");
		}

	}




}