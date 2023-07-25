import { State } from './State';
import { EventEmitter } from '../common/EventEmitter';
import { Container } from '../basic/Container';
import { machine } from 'os';

type CreateStateCallback = (state) => void;

/**
 * Хранилище {@link State|состояний}.
 * Предоставляет подписку на события, связанные с состояниями,
 * а также метод для создания новых состояний.
 * Реализует отрисовку и обработку выделения состояний.
 */
export class States extends EventEmitter {
  container!: Container;

  constructor(container: Container) {
    super();
    this.container = container;
  }

  createCallback?: CreateStateCallback;

  initEvents() {
    this.container.app.mouse.on('mouseup', this.handleMouseUp);
  }

  onStateCreate = (callback: CreateStateCallback) => {
    this.createCallback = callback;
  };

  draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    this.container.machine.states.forEach((state) => {
      state.draw(ctx, canvas);
    });
  }

  handleMouseUp = () => {
    this.removeSelection();
  };

  handleStartNewTransition = (state: State) => {
    this.emit('startNewTransition', state);
  };

  handleMouseUpOnState = (e: { target: State; event: any }) => {
    this.emit('mouseUpOnState', e);
  };

  private removeSelection() {
    this.container.machine.states.forEach((state) => {
      state.setIsSelected(false, '');
      state.setIsSelected(false, '');
    });
    console.log("States.removeSelection")
    this.container.isDirty = true;
  }

  handleStateClick = ({ target, event }: { target: State; event: any }) => {
    event.stopPropagation();
    this.removeSelection();

    target.setIsSelected(true, JSON.stringify(target));
  };

  handleStateDoubleClick = (e: { target: State; event: any }) => {
    e.event.stopPropagation();

    this.createCallback?.(e);
  };

  handleContextMenu = ({ target, event }: { target: State; event: any }) => {
    event.stopPropagation();
    this.removeSelection();

    target.setIsSelectedMenu(true);
  };

  watchState (state: State) {
    state.on('mouseup', this.handleMouseUpOnState as any);
    state.on('click', this.handleStateClick as any);
    state.on('dblclick', this.handleStateDoubleClick as any);
    state.on('contextmenu', this.handleContextMenu as any);

    state.edgeHandlers.onStartNewTransition = this.handleStartNewTransition;
  }
}
