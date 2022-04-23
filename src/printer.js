export class Printer {
  constructor(data) {
    this.data = data
    this.indent = 0
  }
  writeIndent() {
    this.out += "".padStart(this.indent, " ")
  }
  writeLine(s) {
    this.writeIndent()
    this.out += `${s}\n`
  }
  write(s) {
    this.out += `${s}`
  }
  print() {
    this.out = ""
    for (let [key, data] of Object.entries(this.data)) {
      if (key === "_id") continue;
      if (key === "_items") continue;

      if (key.startsWith("__")) {
        this.writeLine(`${key} = ${data}`)
        continue
      }

      if (data._token) {
        this.writeLine(`${key} = ${data.raw}`)
        continue
      }

      this.printSection(key,data)
    }
    console.log(this.out)
  }
  isSection(item) {
    if (item._array) return false;
    if (item._token) return false;
    if (item._type) return false;
    if (Array.isArray(item)) return false;
    if (Array.isArray(item._value)) return false;

    return true
  }
  printItem(item) {
    this.writeIndent()
    this.write(`${item._id ? item._id : ""}:${item._type}`)
    console.log(item)

    if (item._value) {
      if (Array.isArray(item._value)) { 
        this.write(item._value.map(x => x.raw).join(""))
      } else {
        this.write(` ` + item._value.raw?.trim())
      }
      
    }
    if (item._items && item._items.length > 0) {
      this.write(" {\n")
      this.indent += 2  
      item._items.forEach(item => {
        if (this.isSection(item)) {
          this.printSection(item._id, item)
        } else {
          this.printItem(item)
        }
        
      })
      this.indent -= 2
      this.writeLine("}")
    } else {
      let settings = {...item}
      delete settings._id
      delete settings._type
      delete settings._value
      let items = Object.entries(settings)
      if (items.length===0) {
        this.write(";\n")
        return
      }
      this.write(" {\n")
      this.indent += 2  
      for (let [k,v] of items) {
        if (this.isSection(v)) {
          this.printSection(k, v)
        } else {
          this.printValue(k, v)
          
        }
      }
      this.indent -= 2  
      this.writeLine("}")
    }
  }
  printValue(k,v) {
    if (Array.isArray(v)) {
      console.log(v)
      let ass = v[0].type === "openParen" ? "->" : "="
      let out = v.map(x => x.raw).join("")
      this.writeLine(`${k} ${ass} ${out}`)
    } else if (v._array) {
      let out = v._tokens.map(x => x.raw).join("")
      this.writeLine(`${k} = ${out}`)
    } else if (v._token) {
      this.writeLine(`${k} = ${v.raw}`)
    }
  }
  printSection(name, data) {
    this.writeLine(`${name} {`)
    this.indent += 2
    if (data._items?.length > 0) {
      data._items.forEach(item => this.printItem(item))
      this.indent -= 2
      this.writeLine(`}\n`)
      return;
    }

    for (let [key, value] of Object.entries(data)) {
      if (key.startsWith("_")) continue;

      if (this.isSection(value)) {
        this.printSection(key, value)
        continue
      }

      this.printValue(key, value)
      // if (value?._token) {
      //   this.writeLine(`${key} = ${value.raw}`)
      //   continue
      // }

      // this.writeLine(`${key} = ${value}`)
    }

    this.indent -= 2
    this.writeLine(`}\n`)
  }
}