export default class Resize {

    static NONE = 0;
    static TOP_LEFT = 1;
    static TOP_MIDDLE = 2;
    static TOP_RIGHT = 3;
    static BOTTOM_LEFT = 4;
    static BOTTOM_MIDDLE = 5;
    static BOTTOM_RIGHT = 6;
    static MIDDLE_LEFT = 7;
    static MIDDLE_MIDDLE = 8;
    static MIDDLE_RIGHT = 9;

    static ORIGIN_LEFT_BOTTOM = 'left bottom'
    static ORIGIN_LEFT_TOP = 'left top'
    static ORIGIN_RIGHT_BOTTOM = 'right bottom'
    static ORIGIN_RIGHT_TOP = 'right top'
    static ORIGIN_MIDDLE_MIDDLE = 'center center'

    constructor(elementResize, ctrl_tl, ctrl_tm, ctrl_tr, ctrl_ml, ctrl_mr, ctrl_bl, ctrl_bm, ctrl_br) {

        this.offset = [];

        this.keepProportion = false;

        this.element_style = getComputedStyle(elementResize, null);

        this.normalWidth = parseFloat(this.element_style.getPropertyValue("width"));

        this.normalHeight = parseFloat(this.element_style.getPropertyValue("height"));

        this.aspectRatio = this.normalWidth / this.normalHeight;

        //console.log("normalWidth:", this.normalWidth, "normalHeight:", this.normalHeight, "aspectRatio:", this.aspectRatio);

        this.isResizing = false;

        this.isMoving = false;

        this.wasMoving = false;

        this.elementResize = elementResize;

        this.ctrl_type = Resize.NONE;

        this.ctrl_tl = ctrl_tl;

        this.ctrl_tm = ctrl_tm;

        this.ctrl_tr = ctrl_tr;

        this.ctrl_bl = ctrl_bl;

        this.ctrl_ml = ctrl_ml;

        this.ctrl_mr = ctrl_mr;

        this.ctrl_bm = ctrl_bm;

        this.ctrl_br = ctrl_br;

        this.canExecute = true;

        this.snapPointsX = [];
        this.snapPointsY = [];
        this.snapThreshold = 5;

        this.onInitResizeEvent = () => false;

        this.onEndResizeEvent = () => false;

        this.onBeforeResize = null//(ctrl_type, x, y, dx, dy) => null;
        this.onResize = (ctrl_type, dx, dy) => false;

        this.boundMouseMove = (e) => this.Resize(e);
        this.boundMouseUp = (e) => this.StopResize(e);
        this.boundResizeTL = (e) => this.InitResize(e, Resize.TOP_LEFT);
        this.boundResizeTM = (e) => this.InitResize(e, Resize.TOP_MIDDLE);
        this.boundResizeTR = (e) => this.InitResize(e, Resize.TOP_RIGHT);
        this.boundResizeBL = (e) => this.InitResize(e, Resize.BOTTOM_LEFT);
        this.boundResizeBM = (e) => this.InitResize(e, Resize.BOTTOM_MIDDLE);
        this.boundResizeBR = (e) => this.InitResize(e, Resize.BOTTOM_RIGHT);
        this.boundResizeML = (e) => this.InitResize(e, Resize.MIDDLE_LEFT);
        this.boundResizeMR = (e) => this.InitResize(e, Resize.MIDDLE_RIGHT);

        this.mapInverseOrigin = {
            [Resize.TOP_LEFT]: Resize.ORIGIN_RIGHT_BOTTOM,
            [Resize.TOP_MIDDLE]: Resize.ORIGIN_RIGHT_BOTTOM,
            [Resize.TOP_RIGHT]: Resize.ORIGIN_LEFT_BOTTOM,
            [Resize.MIDDLE_LEFT]: Resize.ORIGIN_RIGHT_BOTTOM,
            [Resize.MIDDLE_MIDDLE]: Resize.ORIGIN_MIDDLE_MIDDLE,
            [Resize.MIDDLE_RIGHT]: Resize.ORIGIN_LEFT_TOP,
            [Resize.BOTTOM_LEFT]: Resize.ORIGIN_RIGHT_TOP,
            [Resize.BOTTOM_MIDDLE]: Resize.ORIGIN_LEFT_TOP,
            [Resize.BOTTOM_RIGHT]: Resize.ORIGIN_LEFT_TOP,
        };

        this.AddEvents();
    }

    AddEvents() {
        this.ctrl_tl?.addEventListener("mousedown", this.boundResizeTL);
        this.ctrl_tm?.addEventListener("mousedown", this.boundResizeTM);
        this.ctrl_tr?.addEventListener("mousedown", this.boundResizeTR);
        this.ctrl_bl?.addEventListener("mousedown", this.boundResizeBL);
        this.ctrl_bm?.addEventListener("mousedown", this.boundResizeBM);
        this.ctrl_br?.addEventListener("mousedown", this.boundResizeBR);
        this.ctrl_ml?.addEventListener("mousedown", this.boundResizeML);
        this.ctrl_mr?.addEventListener("mousedown", this.boundResizeMR);

        window.addEventListener("mousemove", this.boundMouseMove);
        window.addEventListener("mouseup", this.boundMouseUp);
    }

    Destroy() {
        this.ctrl_tl?.removeEventListener("mousedown", this.boundResizeTL);
        this.ctrl_tm?.removeEventListener("mousedown", this.boundResizeTM);
        this.ctrl_tr?.removeEventListener("mousedown", this.boundResizeTR);
        this.ctrl_bl?.removeEventListener("mousedown", this.boundResizeBL);
        this.ctrl_bm?.removeEventListener("mousedown", this.boundResizeBM);
        this.ctrl_br?.removeEventListener("mousedown", this.boundResizeBR);
        this.ctrl_ml?.removeEventListener("mousedown", this.boundResizeML);
        this.ctrl_mr?.removeEventListener("mousedown", this.boundResizeMR);

        window.removeEventListener("mousemove", this.boundMouseMove);
        window.removeEventListener("mouseup", this.boundMouseUp);
    }

    InitResize(event, ctrl) {

        if (this.canExecute == true) {

            let offsetX = event.clientX;

            let offsetY = event.clientY;

            this.isResizing = true;

            this.offset = [offsetX, offsetY];

            this.ctrl_type = ctrl;

            //console.log('TOP_LEFT:', this.getTransformTopLeftPoint())
            //console.log('TOP_RIGHT:', this.getTransformTopRightPoint())
            //console.log('BOTTOM_LEFT:', this.getTransformBottomLeftPoint())
            //console.log('BOTTOM_RIGHT:', this.getTransformBottomRightPoint())

            this.onInitResizeEvent();

            console.log(`resize -> Cords: X = ${offsetX} , Y = ${offsetY}`);
        }
    }

    Resize(event) {

        if (this.canExecute == true) {

            if (this.isResizing == true) {
                this.setTransformOrigin(this.ctrl_type)

                let { x: left, y: top, width: offsetW, height: offsetH } = this.getRect();

                let dx = event.clientX - this.offset[0];
                let dy = event.clientY - this.offset[1];

                if (this.onBeforeResize) {
                    const result = this.onBeforeResize(this.ctrl_type, event.clientX, event.clientY, dx, dy);

                    if (!result || (result.dx === 0 && result.dy === 0)) return;

                    dx = result.dx;
                    dy = result.dy;
                }

                let getProportion = () => {
                    let _dx = dx;
                    let _dy = dy;
                    if (Math.abs(_dx) > Math.abs(_dy)) {
                        _dy = (_dx / this.aspectRatio);
                    }
                    else {
                        _dx = (_dy * this.aspectRatio);
                    }

                    console.log("dx:", dx, "dy:", dy, "_dx:", _dx, "_dy:", _dy, "aspectRatio:", this.aspectRatio);
                    return [_dx, _dy];
                }

                switch (this.ctrl_type) {
                    case Resize.TOP_LEFT:
                        if (this.keepProportion) {
                            let [_dx, _dy] = getProportion();
                            this.elementResize.style.left = (left + _dx) + "px";
                            this.elementResize.style.top = (top + _dy) + "px";
                            this.elementResize.style.width = (offsetW - _dx) + "px";
                            this.elementResize.style.height = (offsetH - _dy) + "px";
                        }
                        else {
                            this.elementResize.style.left = (left + dx) + "px";
                            this.elementResize.style.top = (top + dy) + "px";
                            this.elementResize.style.width = (offsetW - dx) + "px";
                            this.elementResize.style.height = (offsetH - dy) + "px";
                        }
                        break;
                    case Resize.TOP_MIDDLE:
                        this.elementResize.style.top = (top + dy) + "px";
                        this.elementResize.style.height = (offsetH - dy) + "px";
                        break;
                    case Resize.TOP_RIGHT:
                        if (this.keepProportion) {
                            let [_dx, _dy] = getProportion();
                            this.elementResize.style.top = (top + _dy) + "px";
                            this.elementResize.style.width = (offsetW + _dx) + "px";
                            this.elementResize.style.height = (offsetH - _dy) + "px";
                        }
                        else {
                            this.elementResize.style.top = (top + dy) + "px";
                            this.elementResize.style.width = (offsetW + dx) + "px";
                            this.elementResize.style.height = (offsetH - dy) + "px";
                        }
                        break;
                    case Resize.BOTTOM_LEFT:
                        if (this.keepProportion) {
                            let [_dx, _dy] = getProportion();
                            this.elementResize.style.left = (left + _dx) + "px";
                            this.elementResize.style.width = (offsetW - _dx) + "px";
                            this.elementResize.style.height = (offsetH + _dy) + "px";
                        }
                        else {
                            this.elementResize.style.left = (left + dx) + "px";
                            this.elementResize.style.width = (offsetW - dx) + "px";
                            this.elementResize.style.height = (offsetH + dy) + "px";
                        }
                        break;
                    case Resize.BOTTOM_MIDDLE:
                        this.elementResize.style.height = (offsetH + dy) + "px";
                        break;
                    case Resize.BOTTOM_RIGHT:
                        if (this.keepProportion) {
                            let [_dx, _dy] = getProportion();
                            this.elementResize.style.width = (offsetW + _dx) + "px";
                            this.elementResize.style.height = (offsetH + _dy) + "px";
                        }
                        else {
                            this.elementResize.style.width = (offsetW + dx) + "px";
                            this.elementResize.style.height = (offsetH + dy) + "px";
                        }
                        break;
                    case Resize.MIDDLE_LEFT:
                        this.elementResize.style.left = (left + dx) + "px";
                        this.elementResize.style.width = (offsetW - dx) + "px";
                        break;
                    case Resize.MIDDLE_RIGHT:
                        this.elementResize.style.width = (offsetW + dx) + "px";
                        break;
                }

                this.onResize(this.ctrl_type, dx, dy);

                this.offset[0] = event.clientX;
                this.offset[1] = event.clientY;
            }
        }
    }

    StopResize(event) {

        if (this.canExecute == true) {

            if (this.isResizing == true) {

                let offsetX = event.clientX + this.offset[0]

                let offsetY = event.clientY + this.offset[1];

                this.isMoving = false;

                this.isResizing = false;

                this.onEndResizeEvent(this.ctrl_type);

                this.setTransformOrigin(Resize.MIDDLE_MIDDLE)

                console.log(`drop -> Cords: X = ${offsetX} , Y = ${offsetY}`);
            }
        }
    }

    setTransformOrigin(origin) {
        const newOrigin = this.mapInverseOrigin[origin] || Resize.ORIGIN_MIDDLE_MIDDLE;
        const currentOrigin = this.elementResize.style.transformOrigin || Resize.ORIGIN_MIDDLE_MIDDLE;
        if (currentOrigin !== newOrigin) {
            const { x, y } = this.getRect()
            const inverted = this.getCurrentScaleX() == -1

            this.getTransformPoint = {
                [Resize.ORIGIN_LEFT_TOP]: this.getTransformTopLeftPoint.bind(this),
                [Resize.ORIGIN_LEFT_BOTTOM]: this.getTransformBottomLeftPoint.bind(this),
                [Resize.ORIGIN_RIGHT_TOP]: this.getTransformTopRightPoint.bind(this),
                [Resize.ORIGIN_RIGHT_BOTTOM]: this.getTransformBottomRightPoint.bind(this),
                [Resize.ORIGIN_MIDDLE_MIDDLE]: this.getTransformMiddleMiddlePoint?.bind(this),
            }[newOrigin]

            //console.log(this.getTransformPoint, newOrigin)
            if (this.getTransformPoint == null) {
                this.getTransformPoint = () => {
                    let { left: offsetX, top: offsetY } = this.prev_getTransform()
                    return { left: -offsetX, top: -offsetY }
                }
            } else {
                this.prev_getTransform = this.getTransformPoint
            }

            let { left: offsetX, top: offsetY } = this.getTransformPoint()
            this.elementResize.style.transformOrigin = newOrigin;
            this.elementResize.style.left = `${x + offsetX}px`;
            this.elementResize.style.top = `${y + offsetY}px`;

            //console.log(origin, offsetX, offsetY, x + offsetX, y + offsetY)
        }
    }

    getTransformTopLeftPoint() {
        const { width, height } = this.getRect()

        const rotationAngle = this.getRotation();

        // Centro do retângulo (ponto de rotação)
        const cx = width / 2;
        const cy = height / 2;

        // Coordenadas do canto superior esquerdo (top-left) relativo ao centro
        const relX = -width / 2;  // x - cx
        const relY = -height / 2; // y - cy

        // Converte o ângulo de rotação para radianos
        const radians = rotationAngle * Math.PI / 180;

        // Aplica a rotação ao ponto relX, relY
        const rotatedX = relX * Math.cos(radians) - relY * Math.sin(radians);
        const rotatedY = relX * Math.sin(radians) + relY * Math.cos(radians);

        const rx = cx + rotatedX;
        const ry = cy + rotatedY;

        return { left: rx, top: ry }
    }

    getTransformTopRightPoint() {
        const { width, height } = this.getRect()

        const rotationAngle = this.getRotation();

        // Centro do retângulo (ponto de rotação)
        const cx = width / 2;
        const cy = height / 2;

        const relX = width / 2;  // x - cx
        const relY = -height / 2; // y - cy

        // Converte o ângulo de rotação para radianos
        const radians = rotationAngle * Math.PI / 180;

        // Aplica a rotação ao ponto relX, relY
        const rotatedX = relX * Math.cos(radians) - relY * Math.sin(radians);
        const rotatedY = relX * Math.sin(radians) + relY * Math.cos(radians);

        const rx = cx + rotatedX;
        const ry = cy + rotatedY;

        return { left: -(width - rx), top: ry }
    }

    getTransformBottomLeftPoint() {
        const { width, height } = this.getRect()

        const rotationAngle = this.getRotation();

        // Centro do retângulo (ponto de rotação)
        const cx = width / 2;
        const cy = height / 2;

        const relX = -width / 2;  // x - cx
        const relY = height / 2; // y - cy

        // Converte o ângulo de rotação para radianos
        const radians = rotationAngle * Math.PI / 180;

        // Aplica a rotação ao ponto relX, relY
        const rotatedX = relX * Math.cos(radians) - relY * Math.sin(radians);
        const rotatedY = relX * Math.sin(radians) + relY * Math.cos(radians);

        const rx = cx + rotatedX;
        const ry = cy + rotatedY;

        return { left: rx, top: -(height - ry) }
    }

    getTransformBottomRightPoint() {
        const { width, height } = this.getRect()

        const rotationAngle = this.getRotation();

        // Centro do retângulo (ponto de rotação)
        const cx = width / 2;
        const cy = height / 2;

        const relX = width / 2;  // x - cx
        const relY = height / 2; // y - cy

        // Converte o ângulo de rotação para radianos
        const radians = rotationAngle * Math.PI / 180;

        // Aplica a rotação ao ponto relX, relY
        const rotatedX = relX * Math.cos(radians) - relY * Math.sin(radians);
        const rotatedY = relX * Math.sin(radians) + relY * Math.cos(radians);

        const rx = cx + rotatedX;
        const ry = cy + rotatedY;

        return { left: -(width - rx), top: -(height - ry) }
    }

    getRotation() {
        const style = window.getComputedStyle(this.elementResize);
        const matrix = new DOMMatrix(style.transform);
        return Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
    }

    getRect() {
        let left = parseFloat(this.element_style.getPropertyValue("left") || "0");
        let top = parseFloat(this.element_style.getPropertyValue("top") || "0");
        let offsetW = parseFloat(this.element_style.getPropertyValue("width"));
        let offsetH = parseFloat(this.element_style.getPropertyValue("height"));
        return {
            x: left,
            y: top,
            width: offsetW,
            height: offsetH,
        }
    }

    cleanOffsets() {
        if (!this.elementResize) return;

        this.elementResize.style.removeProperty("top");
        this.elementResize.style.removeProperty("left");
        this.elementResize.style.removeProperty("width");
        this.elementResize.style.removeProperty("height");
    }

    snapToClosest(value, snapPoints, threshold) {
        for (let i = 0; i < snapPoints.length; i++) {
            const snap = snapPoints[i];
            if (Math.abs(value - snap) <= threshold) {
                return snap;
            }
        }
        return value;
    }

    AddFixOnX(x) {
        if (!this.snapPointsX.includes(x)) {
            this.snapPointsX.push(x);
        }
    }

    AddFixOnY(y) {
        if (!this.snapPointsY.includes(y)) {
            this.snapPointsY.push(y);
        }
    }

    /**
     * Robust implementation to get current scaleX with caching and validation
     */
    getCurrentScaleX() {
        // Check if we have a cached value that's still valid
        if (this._scaleXCache && this._scaleXCache.transform === this.elementResize.style.transform) {
            return this._scaleXCache.value;
        }

        const transform = this.elementResize.style.transform || '';
        let scaleX = 1;

        try {
            // Try direct scale functions first
            const scaleXMatch = transform.match(/scaleX\(([^)]+)\)/);
            if (scaleXMatch) {
                scaleX = parseFloat(scaleXMatch[1]);
            } else {
                const scaleMatch = transform.match(/scale\(([^)]+)\)/);
                if (scaleMatch) {
                    const scales = scaleMatch[1].trim().split(/\s*,\s*|\s+/);
                    if (scales.length > 0) {
                        scaleX = parseFloat(scales[0]) || 1;
                    }
                } else {
                    // Parse matrix transformations
                    const matrixMatch = transform.match(/matrix(3d)?\(([^)]+)\)/);
                    if (matrixMatch) {
                        const values = matrixMatch[2].split(/\s*,\s*|\s+/)
                            .map(v => parseFloat(v.trim()))
                            .filter(v => !isNaN(v));

                        if (matrixMatch[1] === '3d' && values.length >= 3) {
                            // matrix3d - calculate magnitude of first column
                            scaleX = Math.sqrt(
                                values[0] * values[0] +
                                values[1] * values[1] +
                                values[2] * values[2]
                            );
                        } else if (!matrixMatch[1] && values.length >= 2) {
                            // matrix - calculate magnitude of first column
                            scaleX = Math.sqrt(values[0] * values[0] + values[1] * values[1]);
                        }
                    }
                }
            }

            // Handle negative zero and other edge cases
            if (Object.is(scaleX, -0)) scaleX = 0;
            if (isNaN(scaleX)) scaleX = 1;

            // Cache the result
            this._scaleXCache = {
                transform: this.elementResize.style.transform,
                value: scaleX,
                timestamp: Date.now()
            };

            return scaleX;
        } catch (e) {
            console.error('Error parsing transform for scaleX:', e);
            return 1;
        }
    }
}