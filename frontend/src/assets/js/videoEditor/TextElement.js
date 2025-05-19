import EditorElement from './EditorElement.js'

export default class TextElement extends EditorElement {
    constructor(text, preset, font = 'Arial', size = '16px') {
        super('text')
        this.preset = preset
        this.text = text
        this.visible = true // controla se o elemento está visível na timeline
        this.style = {
            fontFamily: font,
            fontSize: size,
            color: '#FFFFFF',
            textAlign: 'center',
        }
    }

    hide() {
        this.visible = false
    }

    show() {
        this.visible = true
    }
}
