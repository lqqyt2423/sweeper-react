import React from 'react';
import cellBg from './assets/closed.svg';
import flagBg from './assets/flag.svg';
import mineBg from './assets/mine.svg';
import mineRedBg from './assets/mine_red.svg';
import mineWrongBg from './assets/mine_wrong.svg';
import faceUnpressedBg from './assets/face_unpressed.svg';
import facePressedBg from './assets/face_pressed.svg';
import faceLoseBg from './assets/face_lose.svg';
import './App.css';

enum CELL_STATE {
  HIDE,
  SHOW,
  FLAG
}

class App extends React.Component {
  private topCanvasRef: React.RefObject<HTMLCanvasElement>;
  private canvasRef: React.RefObject<HTMLCanvasElement>;
  private cellBgImg: HTMLImageElement;
  private flagBgImg: HTMLImageElement;
  private mineBgImg: HTMLImageElement;
  private mineRedBgImg: HTMLImageElement;
  private mineWrongBgImg: HTMLImageElement;
  private faceUnpressedBgImg: HTMLImageElement;
  private facePressedBgImg: HTMLImageElement;
  private faceLoseBgImg: HTMLImageElement;

  private cellLen = 30;
  private lines = 9;
  private rows = 9;
  private canvasWidth = this.cellLen * this.rows;
  private canvasHeight = this.cellLen * this.lines;
  private topCanvasHeight = this.cellLen * 2;
  private bombs = 10;
  // @ts-ignore
  private cells: number[][];
  // @ts-ignore
  private cellStates: CELL_STATE[][];
  private bomb = false;

  private flags = 0;
  private beginTime = 0;
  private bombAt = 0;
  private resetting = 0;

  // @ts-ignore
  private topCanvas: HTMLCanvasElement;
  // @ts-ignore
  private topCtx: CanvasRenderingContext2D;
  // @ts-ignore
  private canvas: HTMLCanvasElement;
  // @ts-ignore
  private ctx: CanvasRenderingContext2D;

  constructor(props: any) {
    super(props);

    this.topCanvasRef = React.createRef<HTMLCanvasElement>();
    this.canvasRef = React.createRef<HTMLCanvasElement>();
    this.cellBgImg = new Image();
    this.flagBgImg = new Image();
    this.mineBgImg = new Image();
    this.mineRedBgImg = new Image();
    this.mineWrongBgImg = new Image();
    this.faceUnpressedBgImg = new Image();
    this.facePressedBgImg = new Image();
    this.faceLoseBgImg = new Image();

    this.initBombs();
  }

  initBombs() {
    const cells: number[][] = [];
    const cellStates: CELL_STATE[][] = [];
    for (let i = 0; i < this.lines; i++) {
      const line = [];
      const lineState = [];
      for (let j = 0; j < this.rows; j++) {
        line.push(0);
        lineState.push(CELL_STATE.HIDE);
      }
      cells.push(line);
      cellStates.push(lineState);
    }
    this.cells = cells;
    this.cellStates = cellStates;

    // 初始化炸弹位置
    const nums = this.lines * this.rows;
    const bombIndexs = new Set<number>();
    while (bombIndexs.size < this.bombs) {
      bombIndexs.add(Math.floor(Math.random() * nums));
    }
    for (const bombIndex of Array.from(bombIndexs)) {
      const x = Math.floor(bombIndex / this.rows);
      const y = bombIndex % this.rows;
      cells[x][y] = -1;
    }

    // 计算每个 cell 周围炸弹数量
    for (let i = 0; i < this.lines; i++) {
      for (let j = 0; j < this.rows; j++) {
        this.setCellValue(i, j);
      }
    }
  }

  componentDidMount() {
    const topCanvas = this.topCanvas = this.topCanvasRef.current as HTMLCanvasElement;
    this.topCtx = topCanvas.getContext('2d') as CanvasRenderingContext2D;

    const canvas = this.canvas = this.canvasRef.current as HTMLCanvasElement;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    const afterLoad = (img: HTMLImageElement) => {
      return new Promise(resolve => {
        img.onload = resolve;
      });
    };
    Promise.all([
      afterLoad(this.cellBgImg),
      afterLoad(this.flagBgImg),
      afterLoad(this.mineBgImg),
      afterLoad(this.mineRedBgImg),
      afterLoad(this.mineWrongBgImg),
      afterLoad(this.faceUnpressedBgImg),
      afterLoad(this.facePressedBgImg),
      afterLoad(this.faceLoseBgImg),
    ]).then(() => {
      this.drawTop();
      this.draw();
    })
    this.cellBgImg.src = cellBg;
    this.flagBgImg.src = flagBg;
    this.mineBgImg.src = mineBg;
    this.mineRedBgImg.src = mineRedBg;
    this.mineWrongBgImg.src = mineWrongBg;
    this.faceUnpressedBgImg.src = faceUnpressedBg;
    this.facePressedBgImg.src = facePressedBg;
    this.faceLoseBgImg.src = faceLoseBg;

    const topStateFn = () => {
      if (this.beginTime === 0) {
        this.beginTime = Date.now();
        window.requestAnimationFrame(this.drawTop.bind(this));
      }
    };

    topCanvas.addEventListener('click', event => {
      if (!this.beginTime) return;

      const rect = this.topCanvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const faceLen = this.cellLen * 1.5;
      const faceX = this.canvasWidth / 2 - faceLen / 2;
      const faceY = this.topCanvasHeight / 2 - faceLen / 2;

      // 是否点击的圆脸区域
      if (x > faceX && x < (faceX + faceLen) && y > faceY && y < (faceY + faceLen)) {
        // 重置状态
        this.resetting = Date.now();
        this.bomb = false;
        this.flags = 0;
        this.beginTime = 0;
        this.bombAt = 0;
        this.initBombs();
        this.drawTop();
        this.draw();
      }
    });

    topCanvas.addEventListener('contextmenu', event => {
      event.preventDefault();
    });

    // https://stackoverflow.com/questions/55677/how-do-i-get-the-coordinates-of-a-mouse-click-on-a-canvas-element
    canvas.addEventListener('click', (event) => {
      topStateFn();
      if (this.bomb) return;
      const [i, j] = this.getCellIndexFromEvent(event);
      this.showCell(i, j);
    });

    canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      topStateFn();
      if (this.bomb) return;
      const [i, j] = this.getCellIndexFromEvent(event);
      if (this.cellStates[i][j] === CELL_STATE.SHOW) return;

      if (this.cellStates[i][j] === CELL_STATE.FLAG) {
        this.cellStates[i][j] = CELL_STATE.HIDE;
        this.flags--;
      } else {
        this.cellStates[i][j] = CELL_STATE.FLAG;
        this.flags++;
      }
      this.draw();
    });
  }

  drawTop() {
    const ctx = this.topCtx;
    ctx.clearRect(0, 0, this.canvasWidth, this.topCanvasHeight);

    const faceLen = this.cellLen * 1.5;
    const faceX = this.canvasWidth / 2 - faceLen / 2;
    const faceY = this.topCanvasHeight / 2 - faceLen / 2;

    if (this.resetting) {
      if (this.beginTime) this.resetting = 0;
      else if (Date.now() - this.resetting > 150) this.resetting = 0;
    }

    if (this.resetting) {
      ctx.drawImage(this.facePressedBgImg, faceX, faceY, faceLen, faceLen);
    } else if (this.bomb) {
      ctx.drawImage(this.faceLoseBgImg, faceX, faceY, faceLen, faceLen);
    } else {
      ctx.drawImage(this.faceUnpressedBgImg, faceX, faceY, faceLen, faceLen);
    }

    ctx.font = `bold ${this.cellLen * 1.5}px serif`;
    ctx.fillStyle = 'red';
    ctx.textBaseline = 'top';

    const leftBombs = this.bombs - this.flags;
    const leftText = String(leftBombs).padStart(3, '0');
    ctx.fillText(leftText, this.cellLen / 2, this.topCanvasHeight / 2 - (this.cellLen * 1.5) / 2);

    const seconds = this.beginTime === 0 ? 0 : Math.floor((Date.now() - this.beginTime) / 1000);
    const rightText = String(seconds).padStart(3, '0');
    const rightTextInfo = ctx.measureText(rightText);
    ctx.fillText(rightText, this.canvasWidth - rightTextInfo.width - this.cellLen / 2, this.topCanvasHeight / 2 - (this.cellLen * 1.5) / 2);

    const reDraw = (this.beginTime && !this.bomb) || this.resetting;
    if (reDraw) {
      window.requestAnimationFrame(this.drawTop.bind(this));
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#808080';
    for (let i = 1; i < this.lines; i++) {
      ctx.moveTo(0, i * this.cellLen);
      ctx.lineTo(this.canvasWidth, i * this.cellLen);
    }
    for (let i = 1; i < this.rows; i++) {
      ctx.moveTo(i * this.cellLen, 0);
      ctx.lineTo(i * this.cellLen, this.canvasHeight);
    }
    ctx.stroke();

    ctx.font = `bold ${this.cellLen}px serif`;
    ctx.textBaseline = 'top';
    for (let i = 0; i < this.lines; i++) {
      for (let j = 0; j < this.rows; j++) {
        if (this.cells[i][j] > 0) {
          if (this.cells[i][j] === 1) ctx.fillStyle = '#00f';
          else if (this.cells[i][j] === 2) ctx.fillStyle = '#008001';
          else if (this.cells[i][j] === 3) ctx.fillStyle = '#ff0000';
          else if (this.cells[i][j] === 4) ctx.fillStyle = '#000080';
          else if (this.cells[i][j] === 5) ctx.fillStyle = '#800001';
          else ctx.fillStyle = '#800001';
          const text = String(this.cells[i][j]);
          const textInfo = ctx.measureText(text);
          ctx.fillText(text, j * this.cellLen + (this.cellLen - textInfo.width) / 2, i * this.cellLen);
        }
      }
    }

    for (let i = 0; i < this.lines; i++) {
      for (let j = 0; j < this.rows; j++) {
        if (this.bomb && this.cells[i][j] === -1) {
          if (this.cellStates[i][j] === CELL_STATE.SHOW) {
            ctx.drawImage(this.mineRedBgImg, j * this.cellLen, i * this.cellLen, this.cellLen, this.cellLen);
          } else if (this.cellStates[i][j] === CELL_STATE.HIDE) {
            ctx.drawImage(this.mineBgImg, j * this.cellLen, i * this.cellLen, this.cellLen, this.cellLen);
          } else {
            ctx.drawImage(this.flagBgImg, j * this.cellLen, i * this.cellLen, this.cellLen, this.cellLen);
          }
          continue;
        }

        if (this.cellStates[i][j] === CELL_STATE.HIDE) {
          ctx.drawImage(this.cellBgImg, j * this.cellLen, i * this.cellLen, this.cellLen, this.cellLen);
        } else if (this.cellStates[i][j] === CELL_STATE.FLAG) {
          if (this.bomb) {
            ctx.drawImage(this.mineWrongBgImg, j * this.cellLen, i * this.cellLen, this.cellLen, this.cellLen);
          } else {
            ctx.drawImage(this.flagBgImg, j * this.cellLen, i * this.cellLen, this.cellLen, this.cellLen);
          }
        }
      }
    }
  }

  setCellValue(x: number, y: number) {
    const cells = this.cells;
    if (cells[x][y] === -1) return;
    let num = 0;
    [
      [x - 1, y - 1],
      [x - 1, y],
      [x - 1, y + 1],
      [x, y - 1],
      [x, y + 1],
      [x + 1, y - 1],
      [x + 1, y],
      [x + 1, y + 1]
    ].forEach(([i, j]) => {
      if ((cells[i] || [])[j] === -1) num++;
    });
    cells[x][y] = num;
  }

  showCell(x: number, y: number) {
    const state = this.cellStates[x][y];
    if (state === CELL_STATE.SHOW || state === CELL_STATE.FLAG) return;
    if (this.cells[x][y] === -1) {
      this.cellStates[x][y] = CELL_STATE.SHOW;
      this.bomb = true;
      this.bombAt = Date.now();
      this.draw();
      return;
    }

    const showQueue: [number, number][] = [[x, y]];
    while (showQueue.length) {
      const [i, j] = showQueue.shift() as [number, number];
      if (this.cellStates[i][j] === CELL_STATE.SHOW || this.cellStates[i][j] === CELL_STATE.FLAG) continue;
      this.cellStates[i][j] = CELL_STATE.SHOW;
      if (this.cells[i][j] !== 0) continue;
      [
        [i - 1, j - 1],
        [i - 1, j],
        [i - 1, j + 1],
        [i, j - 1],
        [i, j + 1],
        [i + 1, j - 1],
        [i + 1, j],
        [i + 1, j + 1]
      ].forEach(([ii, jj]) => {
        if (ii >= 0 && jj >= 0 && ii < this.rows && jj < this.lines) {
          showQueue.push([ii, jj]);
        }
      })
    }
    this.draw();
  }

  getCellIndexFromEvent(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const i = Math.floor(y / this.cellLen);
    const j = Math.floor(x / this.cellLen);
    return [i, j];
  }

  render() {
    return (
      <div className="App">
        <p>扫雷</p>
        <div>
          <div
            style={{
              display: 'inline-block',
              padding: '10px',
              paddingBottom: 0,
              background: '#c6c6c6'
            }}
          >
            <canvas
              ref={this.topCanvasRef}
              style={{
                border: '4px solid #808080',
                borderRightColor: '#fff',
                borderBottomColor: '#fff'
              }}
              width={this.canvasWidth}
              height={this.topCanvasHeight}
            ></canvas>
          </div>
        </div>

        <div>
          <div
            style={{
              display: 'inline-block',
              padding: '10px',
              background: '#c6c6c6'
            }}
          >
            <canvas
              ref={this.canvasRef}
              style={{
                border: '4px solid #808080',
                borderRightColor: '#fff',
                borderBottomColor: '#fff'
              }}
              width={this.canvasWidth}
              height={this.canvasHeight}
            ></canvas>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
