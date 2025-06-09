export default function slideshowGrab(slideshow, minMoveFactor=5, onDragEnter=null, onDragMove=null, onDragLeave=null) {

    let start = false

    let element = slideshow.obj_container_overflow

    let mouse_x = null

    let element_translateX = null

    let dx = null

    function handler_mousemove(event) {
        if (start) {
            dx = mouse_x - event.clientX
            element.style.transform = `translateX(${element_translateX - dx}px)`

            if (Math.abs(dx) > minMoveFactor) {
                onDragMove?.(dx)
            }

            removeElementsSelect();
        }
    }

    function handler_mousedown(event) {
        dx = 0
        mouse_x = event.clientX
        //element_translateX = slideshow.num * slideshow.getObjWidth() WRONG
        element_translateX = getTranslateX(element)
        element.style.transition = "0s"
        document.body.style.cursor = "grab"
        start = true
        onDragEnter?.(event)
        document.addEventListener("mousemove", handler_mousemove)
    }

    function handler_mouseup(event) {
        if (start) {
            start = false

            element.style.transition = ".4s"
            document.body.style.cursor = "initial"
            document.removeEventListener("mousemove", handler_mousemove)

            if (Math.abs(dx) > minMoveFactor) {
                let times = Math.ceil(Math.abs(dx) / slideshow.getObjWidth()) || 1

                if (event.clientX - mouse_x > 0)
                    slideshow.moveLeft(times)
                else
                    slideshow.moveRight(times)

                onDragLeave?.(event, dx)
            }

            addElementsSelect()
        }
    }

    function removeElementsSelect() {
        let elements = document.querySelectorAll("p");
        for (let num = 0; num < elements.length; num++)
            elements[num].style.userSelect = "none"
    }

    function addElementsSelect() {
        let elements = document.querySelectorAll("p");
        for (let num = 0; num < elements.length; num++)
            elements[num].style.userSelect = "text"
    }

    function getTranslateX(element) {
        const style = getComputedStyle(element);
        const transform = style.transform;

        if (!transform || transform === 'none') return 0;

        // Exemplo de transform: matrix(1, 0, 0, 1, 100, 0)
        const match = transform.match(/matrix\(([^)]+)\)/);

        if (match) {
            const values = match[1].split(', ');
            const translateX = parseFloat(values[4]); // o quinto valor é o X
            return translateX;
        }

        // Se for transform: translateX(120px)
        const matchTranslate = transform.match(/translateX\((-?\d+\.?\d*)px\)/);
        if (matchTranslate) {
            return parseFloat(matchTranslate[1]);
        }

        return 0; // fallback
    }


    element.addEventListener("mousedown", handler_mousedown)
    document.addEventListener("mouseup", handler_mouseup)
}
