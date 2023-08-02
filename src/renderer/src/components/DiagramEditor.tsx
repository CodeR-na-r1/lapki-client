import React, { useEffect, useRef, useState } from 'react';
import { Elements } from '@renderer/types/diagram';
import { CanvasEditor } from '@renderer/lib/CanvasEditor';
import { CreateStateModal, CreateStateModalFormValues } from './CreateStateModal';
import { CreateTransitionModal, CreateTransitionModalFormValues } from './CreateTransitionModal';
import { State } from '@renderer/lib/drawable/State';
import { ContextMenu, StateContextMenu } from './StateContextMenu';
import { Condition } from '@renderer/lib/drawable/Condition';
import { Rectangle } from '@renderer/types/graphics';
import { EditorManager } from '@renderer/lib/data/EditorManager';

export var canvasEditor: CanvasEditor;
interface DiagramEditorProps {
  elements: Elements;
  manager: EditorManager;
  editor: CanvasEditor | null;
  setEditor: (editor: CanvasEditor | null) => void;
  setIdTextCode: (id: string | null) => void;
  setElementCode: (content: string | null) => void;
}

export const DiagramEditor: React.FC<DiagramEditorProps> = ({
  elements,
  manager,
  editor,
  setEditor,
  setIdTextCode,
  setElementCode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<{ state: State }>();
  const [isStateModalOpen, setIsStateModalOpen] = useState(false);
  const openStateModal = () => setIsStateModalOpen(true);
  const closeStateModal = () => setIsStateModalOpen(false);

  const [transition, setTransition] = useState<{ source: State; target: State } | null>(null);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const openTransitionModal = () => setIsTransitionModalOpen(true);
  const closeTransitionModal = () => setIsTransitionModalOpen(false);

  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuData, setContextMenuData] = useState<{
    data: State | Condition;
    bounds: Rectangle;
  }>();

  useEffect(() => {
    if (!containerRef.current) return;
    const editor = new CanvasEditor(containerRef.current, elements);
    let i: number = 0;

    //Добавляем пустую ноду в редактор
    editor.container.onStateDrop((position) => {
      i = i + 1;
      editor?.container.machine.createNewState('Состояние ' + i, position);
    });

    //Здесь мы открываем модальное окно редактирования ноды
    editor.container.states.onStateCreate((state) => {
      setState({ state });
      openStateModal();
      // manager.triggerDataUpdate();
    });

    //Обработка правой кнопки на пустом поле
    editor.container.onFieldContextMenu((position) => {
      // TODO: меню для пустого поля
      console.log({
        context: 'DiagramEditor',
        log: 'free field right click',
        data: position,
      });
    });

    // Закрытие контекстного меню
    editor.container.onContextMenuClose(() => {
      setIsContextMenuOpen(false);
    });

    //Здесь мы открываем контекстное меню для состояния
    editor.container.states.onStateContextMenu((state: State) => {
      const bounds = state.drawBounds;
      setContextMenuData({ data: state, bounds });
      setIsContextMenuOpen(true);
      // manager.triggerDataUpdate();
    });

    //Здесь мы открываем модальное окно редактирования связи
    editor.container.transitions.onTransitionCreate((source, target) => {
      setTransition({ source, target });
      openTransitionModal();
      // manager.triggerDataUpdate();
    });

    //Здесь мы открываем контекстное меню для связи
    editor.container.transitions.onTransitionContextMenu((condition: Condition) => {
      const bounds = condition.drawBounds;
      setContextMenuData({ data: condition, bounds });
      setIsContextMenuOpen(true);
    });

    //Таймер для сохранения изменений сделанных в редакторе
    const SaveEditor = setInterval(() => {
      manager.triggerDataUpdate();
    }, 5000);

    setEditor(editor);
    manager.watchEditor(editor);

    return () => {
      editor.cleanUp();
      clearInterval(SaveEditor);
    };
  }, [containerRef.current]);
  const handleCreateState = (data: CreateStateModalFormValues) => {
    editor?.container.machine.updateState(
      data.id,
      data.newName,
      data.events,
      data.component,
      data.method
    );
    closeStateModal();
  };

  const handleCreateTransition = (data: CreateTransitionModalFormValues) => {
    if (transition) {
      editor?.container.machine.createNewTransition(
        transition.source,
        transition.target,
        data.color,
        data.component,
        data.method
      );
    }
    closeTransitionModal();
  };

  const handleinitialState = (data: ContextMenu) => {
    editor?.container.machine.changeInitialState(data.id);
  };

  const handleShowCode = (data: ContextMenu) => {
    setIdTextCode(data.id);
    setElementCode(data.content);
    setIsContextMenuOpen(false);
  };

  const handleDeleteState = (data: ContextMenu) => {
    editor?.container.machine.deleteState(data.id);
  };

  const handleDelTranState = (data: ContextMenu) => {
    editor?.container.machine.deleteTransition(data.id);
  };

  return (
    <>
      <div className="relative h-full overflow-hidden bg-neutral-800" ref={containerRef}>
        <StateContextMenu
          isOpen={isContextMenuOpen}
          isData={contextMenuData}
          onClickDelState={handleDeleteState}
          onClickInitial={handleinitialState}
          onClickDelTran={handleDelTranState}
          onClickShowCode={handleShowCode}
          closeMenu={() => {
            setIsContextMenuOpen(false);
          }}
        />
      </div>

      <CreateStateModal
        isOpen={isStateModalOpen}
        isData={state}
        onClose={closeStateModal}
        onSubmit={handleCreateState}
      />

      <CreateTransitionModal
        isOpen={isTransitionModalOpen}
        onClose={closeTransitionModal}
        onSubmit={handleCreateTransition}
      />
    </>
  );
};
