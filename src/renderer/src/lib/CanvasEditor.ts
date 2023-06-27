import { Elements } from '@renderer/types/diagram';
import { Canvas } from './basic/Canvas';
import { Mouse } from './basic/Mouse';
import { Render } from './common/Render';
import { Container } from './basic/Container';
import { Keyboard } from './basic/Keyboard';

export class CanvasEditor {
  root!: HTMLElement;
  canvas!: Canvas;
  mouse!: Mouse;
  keyboard!: Keyboard;
  render!: Render;

  container!: Container;

  isDirty = true;

  constructor(container: HTMLDivElement, elements: Elements) {
    this.root = container;
    this.canvas = new Canvas('rgb(38, 38, 38)');
    this.mouse = new Mouse(this.canvas.element);
    this.keyboard = new Keyboard();
    this.render = new Render();

    this.root.append(this.canvas.element);
    this.canvas.resize();

    this.container = new Container(this, elements);

    this.canvas.onResize = () => {
      this.isDirty = true;
    };

    this.render.subscribe(() => {
      if (!this.isDirty) return;

      this.mouse.tick();

      this.canvas.clear();

      this.canvas.draw((ctx, canvas) => {
        this.container.draw(ctx, canvas);
      });

      this.isDirty = false;
    });
  }

  cleanUp() {
    this.canvas.cleanUp();
    this.keyboard.cleanUp();
  }
}