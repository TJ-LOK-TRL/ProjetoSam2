import EditorElement from './EditorElement.js'

export default class TextElement extends EditorElement {
    constructor(text, font = "Arial", size = 16) {
        super('text')
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