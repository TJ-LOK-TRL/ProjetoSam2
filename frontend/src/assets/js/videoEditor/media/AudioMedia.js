import Media from './Media.js'

export default class AudioMedia extends Media {
    constructor(file) {
        super('audio', file)
    }
}
