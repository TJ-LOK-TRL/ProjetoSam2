export default class SlideShow {
    constructor(obj_container, obj_container_overflow, id_obj, obj_gap = 0) {
        this.obj_container = obj_container
        this.obj_container_overflow = obj_container_overflow
        this.objs = this.obj_container_overflow.getElementsByClassName(id_obj);

        this.num = 0;
        let _num = this.num;
        this.onNumChange = () => { };
        Object.defineProperty(this, 'num', {
            get() { return _num; },
            set(value) {
                _num = value;
                this.onNumChange(this.getNavigationState());
            }
        });

        this.obj_gap = obj_gap;
        this.init();
    }

    getNavigationState() {
        return {
            canGoLeft: this.num < 0,
            canGoRight: this.num > -(this.objs.length - this.getObjVisible()),
            currentPosition: this.num
        };
    }

    getObjVisible() {
        //if (innerWidth > 1400) return 3;
        //if (innerWidth > 900) return 2;
        //return 1;
        return 2.5
    }

    getObjWidth() {
        const style = getComputedStyle(this.obj_container);

        const containerWidthPx = style.width;

        const paddingLeft = parseFloat(style.paddingLeft) || 0;
        const paddingRight = parseFloat(style.paddingRight) || 0;
        const totalPadding = paddingLeft + paddingRight;
        const containerWidth = parseFloat(containerWidthPx.replace('px', '')) - totalPadding;

        const visibleCount = this.getObjVisible();

        const baseWidth = containerWidth / visibleCount;

        const marginLeftPx = getComputedStyle(this.objs[0]).marginLeft;
        const marginLeft = parseFloat(marginLeftPx.replace('px', '')) || 0;
        const marginRightPx = getComputedStyle(this.objs[0]).marginRight;
        const marginRight = parseFloat(marginRightPx.replace('px', '')) || 0;
        const totalMargins = marginLeft + marginRight;
        
        const totalGap = ((visibleCount - 1) * this.obj_gap) / visibleCount;
        const finalWidth = baseWidth + totalMargins - totalGap - 0;

        return finalWidth;
    }

    setObjWidth() {
        let obj_width = this.getObjWidth();
        for (let x = 0; x < this.objs.length; x++)
            this.objs[x].style.width = `${obj_width}px`;
    }

    setContainerWidth() {
        this.obj_container_overflow.style.width = `${this.getObjWidth() * this.objs.length}px`;
    }

    moveLeft(times = 1) {
        for (let x = 0; x < times; x++)
            if (this.num < 0)
                this.obj_container_overflow.style.transform = `translateX(${++this.num * this.getObjWidth() + this.obj_gap * this.num}px)`;
            else
                this.obj_container_overflow.style.transform = `translateX(${(this.num = (-(this.objs.length - this.getObjVisible()))) * this.getObjWidth() + this.obj_gap * this.num}px)`;
    }

    moveRight(times = 1) {
        for (let x = 0; x < times; x++)
            if (this.num > -(this.objs.length - this.getObjVisible()))
                this.obj_container_overflow.style.transform = `translateX(${--this.num * this.getObjWidth() + this.obj_gap * this.num}px)`;
            else
                this.obj_container_overflow.style.transform = `translateX(${(this.num = 0) * this.getObjWidth() + this.obj_gap * this.num}px)`;
    }

    init() {
        this.setContainerWidth();
        this.setObjWidth();
        //addEventListener('resize', () => { this.setContainerWidth(); this.setObjWidth() });      
    }

    setArrowLeft(element) {
        element.addEventListener('mouseup', () => this.moveLeft());
    }

    setArrowRight(element) {
        element.addEventListener('mouseup', () => this.moveRight());
    }
}