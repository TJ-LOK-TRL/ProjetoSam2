export default class SnapLine {
    constructor(parent) {
        this.parent = parent;
        this.line = document.createElement("div");
        this.line.style.position = "absolute";
        this.line.style.backgroundColor = "rgba(255, 0, 0, 1)";
        this.line.style.pointerEvents = "none";
        this.line.style.zIndex = "9999";
        this.line.style.display = "none";
        this.parent.appendChild(this.line);

        // Bind da função para manter o "this"
        this.boundHide = this.hide.bind(this);

        // Adiciona evento com função ligada
        window.addEventListener("mouseup", this.boundHide);
    }

    showVertical(x) {
        this.line.style.top = "0";
        this.line.style.left = `${x}px`;
        this.line.style.width = "3px";
        this.line.style.height = "100%";
        this.line.style.display = "block";
    }

    showHorizontal(y) {
        this.line.style.left = "0";
        this.line.style.top = `${y}px`;
        this.line.style.width = "100%";
        this.line.style.height = "3px";
        this.line.style.display = "block";
    }

    hide() {
        this.line.style.display = "none";
    }

    Destroy() {
        window.removeEventListener("mouseup", this.boundHide);
    }
}
