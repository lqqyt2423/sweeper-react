import React from 'react';
import cellBg from './assets/closed.svg';
import flagBg from './assets/flag.svg';
import mineBg from './assets/mine.svg';
import mineRedBg from './assets/mine_red.svg';
import mineWrongBg from './assets/mine_wrong.svg';
import './App.css';

enum CELL_STATE {
  HIDE,
  SHOW,
  FLAG
}

class App extends React.Component {
  private canvasRef: React.RefObject<HTMLCanvasElement>;
  private cellBgImg: HTMLImageElement;
  private flagBgImg: HTMLImageElement;
  private mineBgImg: HTMLImageElement;
  private mineRedBgImg: HTMLImageElement;
  private mineWrongBgImg: HTMLImageElement;

  private cellLen = 34;
  private lines = 9;
  private rows = 9;
  private canvasWidth = this.cellLen * this.rows;
  private canvasHeight = this.cellLen * this.lines;
  private bombs = 10;
  private cells: number[][];
  private cellStates: CELL_STATE[][];
  private bomb = false;

  // @ts-ignore
  private canvas: HTMLCanvasElement;
  // @ts-ignore
  private ctx: CanvasRenderingContext2D;

  constructor(props: any) {
    super(props);

    this.canvasRef = React.createRef<HTMLCanvasElement>();
    this.cellBgImg = new Image();
    this.flagBgImg = new Image();
    this.mineBgImg = new Image();
    this.mineRedBgImg = new Image();
    this.mineWrongBgImg = new Image();

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
      afterLoad(this.mineWrongBgImg)
    ]).then(() => {
      this.draw();
    })
    this.cellBgImg.src = cellBg;
    this.flagBgImg.src = flagBg;
    this.mineBgImg.src = mineBg;
    this.mineRedBgImg.src = mineRedBg;
    this.mineWrongBgImg.src = mineWrongBg;

    // https://stackoverflow.com/questions/55677/how-do-i-get-the-coordinates-of-a-mouse-click-on-a-canvas-element
    canvas.addEventListener('click', (event) => {
      const [i, j] = this.getCellIndexFromEvent(event);
      this.showCell(i, j);
    });

    canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      const [i, j] = this.getCellIndexFromEvent(event);
      if (this.cellStates[i][j] === CELL_STATE.SHOW) return;

      if (this.cellStates[i][j] === CELL_STATE.FLAG) {
        this.cellStates[i][j] = CELL_STATE.HIDE;
      } else {
        this.cellStates[i][j] = CELL_STATE.FLAG;
      }
      this.draw();
    })
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
    ctx.textBaseline = 'top'
    for (let i = 0; i < this.lines; i++) {
      for (let j = 0; j < this.rows; j++) {
        if (this.cells[i][j] > 0) {
          if (this.cells[i][j] === 1) ctx.fillStyle = '#00f';
          else if (this.cells[i][j] === 2) ctx.fillStyle = '#008001';
          else if (this.cells[i][j] === 3) ctx.fillStyle = '#ff0000';
          else if (this.cells[i][j] === 4) ctx.fillStyle = '#000080';
          else if (this.cells[i][j] === 5) ctx.fillStyle = '#800001';
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
    );
  }
}

export default App;
