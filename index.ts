const w : number = window.innerWidth 
const h : number = window.innerHeight
const parts : number = 4  
const scGap : number = 0.02 / parts 
const strokeFactor : number = 90
const sizeFactor : number = 5.6 
const delay : number = 20 
const backColor : string = "#BDBDBD"
const colors : Array<string> = [
    "#F44336",
    "#4CAF50",
    "#3F51B5",
    "#FF9800",
    "#03A9F4"
]

class ScaleUtil {

    static maxScale(scale : number, i : number, n : number) : number {
        return Math.max(0, scale - i / n)
    }

    static divideScale(scale : number, i : number, n : number) : number {
        return Math.min(1 / n, ScaleUtil.maxScale(scale, i, n))
    }

    static sinify(scale : number) : number {
        return Math.sin(scale * Math.PI)
    }

    static updateFromTo(a : number, b : number, scale : number) : number {
        return a + (b - a) * scale 
    }
}

class DrawingUtil {

    static drawLine(context : CanvasRenderingContext2D, x1 : number, y1 : number, x2 : number, y2 : number) {
        context.beginPath()
        context.moveTo(x1, y1)
        context.lineTo(x2, y2)
        context.stroke()
    }
}

class Point {

    constructor(public x : number, public y : number) {

    }

    drawLine(context : CanvasRenderingContext2D, point : Point, scale : number) {
        DrawingUtil.drawLine(context, this.x, this.y, ScaleUtil.updateFromTo(scale, this.x, point.x), ScaleUtil.updateFromTo(scale, this.y, point.y))
    }

    static zipToPoint(xVertices : Array<number>, yVertices : Array<number>) : Array<Point> {
        const points : Array<Point> = []
        for (var i = 0; i < xVertices.length; i++) {
            points.push(new Point(xVertices[i], yVertices[i]))
        }
        return points 
    }
}

class NodeDrawingUtil {

    static drawClipTriLineFillPath(context : CanvasRenderingContext2D, size : number, scale : number) {
        context.beginPath()
        context.moveTo(0, h - size)
        context.lineTo(w / 2 - size, h - size)
        context.lineTo(w / 2, h / 2)
        context.lineTo(w / 2 + size, h - size)
        context.lineTo(w, h - size)
        context.lineTo(w, h)
        context.lineTo(0, h)
        context.lineTo(0, h - size)
        context.clip()
        context.fillRect(0, 0, w * scale, h / 2)
    } 

    static drawClipTriLineFill(context : CanvasRenderingContext2D, scale : number) {
        const sf : number = ScaleUtil.sinify(scale)
        const size : number = Math.min(w, h) / sizeFactor 
        const xs : Array<number> = [0, w / 2 - size / 2, w / 2, w / 2 + size / 2, w]
        const ys : Array<number> = [h - size, h - size, h / 2, h - size, h - size]
        const points : Array<Point> = Point.zipToPoint(xs, ys) 
        let prevPoint : Point = points[0]
        for (var j = 1; j < points.length; j++) {
            const sfj : number = ScaleUtil.divideScale(sf, j - 1, parts)
            prevPoint.drawLine(context, points[j], sfj)
            prevPoint = points[j]
        }
        NodeDrawingUtil.drawClipTriLineFillPath(context, size, ScaleUtil.divideScale(sf, j, parts))
    }

    static drawLCTPNode(context : CanvasRenderingContext2D, i : number, scale : number) {
        context.strokeStyle = colors[i]
        context.fillStyle = colors[i]
        context.lineWidth = Math.min(w, h) / strokeFactor 
        context.lineCap = 'round'
        NodeDrawingUtil.drawClipTriLineFill(context, scale)
    }
}

class Stage {

    canvas : HTMLCanvasElement = document.createElement('canvas')
    context : CanvasRenderingContext2D 
    renderer : Renderer = new Renderer()

    initCanvas() {
        this.canvas.width = w 
        this.canvas.height = h 
        this.context = this.canvas.getContext('2d')
        document.body.appendChild(this.canvas)
    }

    render() {
        this.context.fillStyle = backColor 
        this.context.fillRect(0, 0, w, h)
        this.renderer.draw(this.context)
    }

    handleTap() {
        this.canvas.onmousedown = () => {
            this.renderer.handleTap(() => {
                this.render()
            })
        }
    }

    static init() {
        const stage : Stage = new Stage()
        stage.initCanvas()
        stage.render()
        stage.handleTap()
    }
}

class Animator {

    animated : boolean = false 
    interval : number 

    start(cb : Function) {
        if (!this.animated) {
            this.animated = true 
            this.interval = setInterval(cb, delay)
        }
    }

    stop() {
        if (this.animated) {
            this.animated = false 
            clearInterval(this.interval)
        }
    }
}

class State {

    scale : number = 0 
    dir : number = 0 
    prevScale : number = 0 

    update(cb : Function) {
        this.scale = this.prevScale + this.dir 
        if (Math.abs(this.scale - this.prevScale) > 1) {
            this.scale = this.prevScale + this.dir 
            this.dir = 0 
            this.prevScale = this.scale 
            cb()
        }
    }

    startUpdating(cb : Function) {
        if (this.dir == 0) {
            this.dir = 1 - 2 * this.prevScale 
            cb()
        }
    }
}

class LCTPNode {

    next : LCTPNode 
    prev : LCTPNode 
    state : State = new State()
    
    constructor(private i : number) {
        this.addNeighbor()
    }

    addNeighbor() {
        if (this.i < colors.length - 1) {
            this.next = new LCTPNode(this.i + 1)
            this.next.prev = this 
        }
    }

    draw(context : CanvasRenderingContext2D) {
        NodeDrawingUtil.drawLCTPNode(context, this.i, this.state.scale)
    } 

    update(cb : Function) {
        this.state.update(cb)
    }

    startUpdating(cb : Function) {
        this.state.startUpdating(cb)
    }

    getNext(dir : number, cb : Function) : LCTPNode {
        var curr : LCTPNode = this.prev 
        if (dir == 1) {
            curr = this.next 
        }
        if (curr) {
            return curr 
        }
        cb()
        return this 
    }
}

class LineClipTriPath {

    curr : LCTPNode = new LCTPNode(0)
    dir : number = 1 

    draw(context : CanvasRenderingContext2D) {
        this.curr.draw(context)
    }
    
    update(cb : Function) {
        this.curr.update(() => {
            this.curr = this.curr.getNext(this.dir, () => {
                this.dir *= -1
            })
            cb()
        })
    }

    startUpdating(cb : Function) {
        this.curr.startUpdating(cb)
    }
}

class Renderer {

    animator : Animator = new Animator()
    lctp : LineClipTriPath = new LineClipTriPath()
    
    draw(context : CanvasRenderingContext2D) {
        this.lctp.draw(context)
    }

    handleTap(cb : Function) {
        this.lctp.startUpdating(() => {
            this.animator.start(() => {
                cb()
                this.lctp.update(() => {
                    this.animator.stop()
                    cb()
                })
            })
        })
    }
}