export default class Grab {

    constructor(elementGrab, elementMove) {

        this.offset = [];

        this.isGrabing = false;

        this.isMoving = false;

        this.wasMoving = false;

        this.elementGrab = elementGrab;

        this.elementMove = elementMove;

        this.canExecute = true;

        this.useViewportOffsets = false;

        this.useRelativeOffsets = false;

        this.xspeed = null

        this.onIniGrabEvent = (eg, em, x, y, e) => false;

        this.onEndGrabEvent = (eg, em, x, y, e) => false;

        this.onMoveGrabEvent = (eg, em, dx, dy, e) => [dx, dy];

        this.boundGrab = (e) => this.Grab(e);
        this.boundMove = (e) => this.Move(e);
        this.boundDrop = (e) => this.Drop(e);

        this.AddEvents();
    }

    Grab(event) {
        if (this.canExecute) {
            let offsetX, offsetY;

            if (this.useViewportOffsets) {
                const rect = this.elementMove.getBoundingClientRect();
                offsetX = rect.left - event.clientX;
                offsetY = rect.top - event.clientY;
            } else if (this.useRelativeOffsets) {
                offsetX = event.clientX;
                offsetY = event.clientY;
            } else {
                offsetX = this.elementMove.offsetLeft - event.clientX / (this.xspeed === null ? 1 : this.xspeed());
                offsetY = this.elementMove.offsetTop - event.clientY / (this.xspeed === null ? 1 : this.xspeed());
            }

            this.offset = [offsetX, offsetY];
            this.isGrabing = true;

            this.onIniGrabEvent(this.elementGrab, this.elementMove, offsetX, offsetY, event);

            console.log(`grab -> Cords: X = ${offsetX}, Y = ${offsetY}`);
        }
    }

    Move(event) {

        if (this.canExecute == true) {

            if (this.isGrabing == true) {

                if (this.useRelativeOffsets) {
                    let _dx = event.clientX - this.offset[0]
                    let _dy = event.clientY - this.offset[1]
                    let [dx, dy] = this.onMoveGrabEvent(this.elementGrab, this.elementMove, _dx, _dy, event)
                    let x = (parseFloat(this.elementMove.style.left.replace('px', '')) || 0) + dx;
                    let y = (parseFloat(this.elementMove.style.top.replace('px', '')) || 0) + dy;
                    this.elementMove.style.left = x + "px";
                    this.elementMove.style.top = y + "px";
                    this.offset = [event.clientX, event.clientY];
                    this.isMoving = true;
                    this.wasMoving = true;
                    return
                }

                let _dx = event.clientX / (this.xspeed === null ? 1 : this.xspeed()) + this.offset[0]
                let _dy = event.clientY / (this.xspeed === null ? 1 : this.xspeed()) + this.offset[1]
                let [dx, dy] = this.onMoveGrabEvent(this.elementGrab, this.elementMove, _dx, _dy)

                if (dx === 0 && _dx !== 0) {
                    // Ajusta o offset para refletir que não podemos mover mais para a esquerda
                    this.offset[0] = -event.clientX;
                }

                this.elementMove.style.left = dx + "px";

                this.elementMove.style.top = dy + "px";

                this.isMoving = true;

                this.wasMoving = true;

                console.log(`moving -> ... `);
                //console.log(`moving -> Cords: X = ${dx} , Y = ${dy}`);

            }

        }


    }

    Drop(event) {

        if (this.canExecute == true) {

            if (this.isGrabing == true) {

                let coords;

                if (this.useRelativeOffsets) {
                    const style = window.getComputedStyle(this.elementMove);
                    coords = {
                        x: parseFloat(style.left || 0),
                        y: parseFloat(style.top || 0)
                    };
                } else {
                    coords = {
                        x: event.clientX + this.offset[0],
                        y: event.clientY + this.offset[1]
                    };
                }

                this.isMoving = false;

                this.isGrabing = false;

                this.onEndGrabEvent(this.elementGrab, this.elementMove, coords.x, coords.y, event);

                console.log(`drop -> Cords: X = ${coords.x} , Y = ${coords.y}`);

            }

        }

    }

    AddEvents() {
        this.elementGrab.addEventListener("mousedown", this.boundGrab);
        window.addEventListener("mousemove", this.boundMove);
        window.addEventListener("mouseup", this.boundDrop);
    }

    Destroy() {
        this.elementGrab.removeEventListener("mousedown", this.boundGrab);
        window.removeEventListener("mousemove", this.boundMove);
        window.removeEventListener("mouseup", this.boundDrop);
    }
}