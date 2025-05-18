import EditorElement from './EditorElement.js'

export default class TextElement extends EditorElement {
    constructor(text, style, size = 16, font = "Arial") {
        super('text')
        this.style = style
        this.text = text
        this.font = font
        this.size = size
        this.color = 'black'
        this.visible = true
    }

    render() {
        console.log(`Rendering text: "${this.text}" with font ${this.font} and size ${this.size}`)
    }
}