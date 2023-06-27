import { nanoid } from 'nanoid';

import { Elements } from '@renderer/types/diagram';
import { Transition } from './Transition';
import { State } from './State';
import { GhostTransition } from './GhostTransition';
import { Container } from '../basic/Container';

export class Transitions {
  container!: Container;

  items: Map<string, Transition> = new Map();

  ghost = new GhostTransition();
  showGhost = false;

  constructor(container: Container, items: Elements['transitions']) {
    this.container = container;

    this.initItems(items);
    this.initEvents();
  }

  private initItems(items: Elements['transitions']) {
    for (const id in items) {
      const { source, target, condition, color } = items[id];

      const sourceState = this.container.states.items.get(source) as State;
      const targetState = this.container.states.items.get(target) as State;

      const transition = new Transition(this.container, sourceState, targetState, condition, color);

      this.items.set(id, transition);
    }
  }

  private initEvents() {
    this.container.app.mouse.on('mousemove', this.handleMouseMove);
    this.container.app.mouse.on('mouseup', this.handleMouseUp);

    this.container.states.on('startNewTransition', this.handleStartNewTransition);
    this.container.states.on('mouseUpOnState', this.handleMouseUpOnState as any);
  }

  draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    this.items.forEach((state) => {
      state.draw(ctx, canvas);
    });

    if (this.showGhost) {
      this.ghost.draw(ctx, canvas);
    }
  }

  handleStartNewTransition = () => {
    this.ghost.setSource(this.container.states.edgeHandlers.currentState as State);
    this.showGhost = true;
  };

  handleMouseMove = () => {
    if (!this.showGhost) return;

    this.ghost.setTarget({ x: this.container.app.mouse.x, y: this.container.app.mouse.y });

    this.container.app.isDirty = true;
  };

  handleMouseUpOnState = (e: { mouseUpState: State }) => {
    if (!this.showGhost) return;

    const target = e.mouseUpState;

    // TODO Доделать парвильный condition
    const transition = new Transition(
      this.container,
      this.ghost.source as State,
      target,
      {
        component: 'a',
        method: 'a',
        position: {
          x: 100,
          y: 100,
        },
      },
      '#ccc'
    );

    this.items.set(nanoid(), transition);
  };

  handleMouseUp = () => {
    this.removeGhost();
  };

  removeGhost() {
    this.showGhost = false;
    this.ghost.clear();
  }
}