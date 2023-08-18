import { useEffect, useState } from 'react';
import { Panel, PanelGroup } from 'react-resizable-panels';
import { twMerge } from 'tailwind-merge';
import {
  CodeEditor,
  CompilerProps,
  DiagramEditor,
  Documentations,
  FlasherProps,
  LoadingOverlay,
  MenuProps,
  PlatformSelectModal,
  SaveModalData,
  SaveRemindModal,
  MessageModal,
  MessageModalData,
  Sidebar,
  Tabs,
} from './components';
import { ReactComponent as Arrow } from '@renderer/assets/icons/arrow.svg';
import { isLeft, unwrapEither } from './types/Either';
import {
  getPlatformsErrors,
  preloadPlatforms,
  preparePreloadImages,
} from './lib/data/PlatformLoader';
import { preloadPicto } from './lib/drawable/Picto';
import { Compiler } from './components/Modules/Compiler';
import { CompilerResult } from './types/CompilerTypes';
import { Flasher } from './components/Modules/Flasher';
import { Device } from './types/FlasherTypes';
import useEditorManager from './components/utils/useEditorManager';

/**
 * React-компонент приложения
 */
export const App: React.FC = () => {
  // TODO: а если у нас будет несколько редакторов?
  const [currentDevice, setCurrentDevice] = useState<string | undefined>(undefined);
  const [flasherConnectionStatus, setFlasherConnectionStatus] = useState<string>('Не подключен.');
  const [flasherDevices, setFlasherDevices] = useState<Map<string, Device>>(new Map());
  const [flasherLog, setFlasherLog] = useState<string | undefined>(undefined);

  const [compilerData, setCompilerData] = useState<CompilerResult | undefined>(undefined);
  const [compilerStatus, setCompilerStatus] = useState<string>('Не подключен.');

  const lapki = useEditorManager();
  const editor = lapki.editor;
  const manager = lapki.managerRef.current;
  const editorData = lapki.editorData;
  const [isDocOpen, setIsDocOpen] = useState(false);

  const [isLoadingOverlay, setLoadingOverlay] = useState<boolean>(true);

  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const openPlatformModal = () => setIsPlatformModalOpen(true);
  const closePlatformModal = () => setIsPlatformModalOpen(false);

  const [saveModalData, setSaveModalData] = useState<SaveModalData>();
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const openSaveModal = () => setIsSaveModalOpen(true);
  const closeSaveModal = () => setIsSaveModalOpen(false);

  const [msgModalData, setMsgModalData] = useState<MessageModalData>();
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const openMsgModal = (data: MessageModalData) => {
    setMsgModalData(data);
    setIsMsgModalOpen(true);
  };
  const closeMsgModal = () => setIsMsgModalOpen(false);
  const openSaveError = (cause) => {
    openMsgModal({
      caption: 'Ошибка',
      text: (
        <div>
          <p> Не удалось записать схему в </p>
          <code>{cause.name}</code>
          <br /> <br />
          <p> {cause.content} </p>
        </div>
      ),
    });
  };
  const openLoadError = (cause) => {
    openMsgModal({
      caption: 'Ошибка',
      text: (
        <div>
          <p> Не удалось прочесть схему из </p>
          <code>{cause.name}</code>
          <br /> <br />
          <p> {cause.content} </p>
        </div>
      ),
    });
  };
  const openPlatformError = (errs: { [k: string]: string }) => {
    openMsgModal({
      caption: 'Внимание',
      text: (
        <div>
          <p> Есть проблемы с загруженными платформами. </p>
          <br />
          <ul>
            {Object.entries(errs).map(([platform, err]) => {
              return (
                <li key={platform}>
                  <b>{platform}</b>: {err}
                </li>
              );
            })}
          </ul>
        </div>
      ),
    });
  };

  const handleGetList = async () => {
    manager?.getList();
  };

  const handleFlashBinary = async () => {
    //Рассчет на то, что пользователь не сможет нажать кнопку загрузки,
    //если нет данных от компилятора
    manager?.flash(compilerData!.binary!, currentDevice!);
  };

  const handleSaveBinaryIntoFolder = async () => {
    const preparedData = await Compiler.prepareToSave(compilerData!.binary!);
    manager?.saveIntoFolder(preparedData);
  };

  /*Открытие файла*/
  const handleOpenFile = async () => {
    if (editorData.content && editorData.modified) {
      setSaveModalData({
        shownName: editorData.shownName,
        question: 'Хотите сохранить файл перед тем, как открыть другой?',
        onConfirm: performOpenFile,
        onSave: handleSaveFile,
      });
      openSaveModal();
    } else {
      await performOpenFile();
    }
  };

  const performOpenFile = async () => {
    const result = await manager?.open();
    if (result && isLeft(result)) {
      const cause = unwrapEither(result);
      if (cause) {
        openLoadError(cause);
      }
    }
  };
  //Создание нового файла
  const handleNewFile = async () => {
    if (editorData.content && editorData.modified) {
      setSaveModalData({
        shownName: editorData.shownName,
        question: 'Хотите сохранить файл перед тем, как создать новый?',
        onConfirm: openPlatformModal,
        onSave: handleSaveFile,
      });
      openSaveModal();
    } else {
      openPlatformModal();
    }
  };

  const performNewFile = (idx: string) => {
    manager?.newFile(idx);
  };

  const handleCompile = async () => {
    manager?.compile(editor!.container.machine.platformIdx);
  };

  const handleSaveSourceIntoFolder = async () => {
    await manager?.saveIntoFolder(compilerData!.source);
  };

  const handleSaveAsFile = async () => {
    const result = await manager?.saveAs();
    if (result && isLeft(result)) {
      const cause = unwrapEither(result);
      if (cause) {
        openSaveError(cause);
      }
    }
  };

  const handleSaveFile = async () => {
    const result = await manager?.save();
    if (result && isLeft(result)) {
      const cause = unwrapEither(result);
      if (cause) {
        openSaveError(cause);
      }
    } else {
      // TODO: информировать об успешном сохранении
    }
  };

  const [tabData, setTabData] = useState<{ name: string; code: string } | null>(null);
  const onCodeSnippet = (name: string, code: string) => {
    setTabData({ name, code });
  };

  const handleAddStdoutTab = () => {
    console.log(compilerData!.stdout);
    onCodeSnippet('stdout', compilerData!.stdout);
  };

  const handleAddStderrTab = () => {
    onCodeSnippet('stderr', compilerData!.stderr);
  };

  const flasherProps: FlasherProps = {
    devices: flasherDevices,
    currentDevice: currentDevice,
    connectionStatus: flasherConnectionStatus,
    flasherLog: flasherLog,
    compilerData: compilerData,
    setCurrentDevice: setCurrentDevice,
    handleGetList: handleGetList,
    handleFlash: handleFlashBinary,
  };

  const compilerProps: CompilerProps = {
    compilerData: compilerData,
    compilerStatus: compilerStatus,
    fileReady: editor !== null,
    handleAddStdoutTab: handleAddStdoutTab,
    handleAddStderrTab: handleAddStderrTab,
    handleCompile: handleCompile,
    handleSaveSourceIntoFolder: handleSaveSourceIntoFolder,
    handleSaveBinaryIntoFolder: handleSaveBinaryIntoFolder,
  };

  const menuProps: MenuProps = {
    onRequestNewFile: handleNewFile,
    onRequestOpenFile: handleOpenFile,
    onRequestSaveFile: handleSaveFile,
    onRequestSaveAsFile: handleSaveAsFile,
  };

  useEffect(() => {
    Flasher.bindReact(setFlasherDevices, setFlasherConnectionStatus, setFlasherLog);
    Flasher.initReader();
    Flasher.connect(Flasher.base_address);

    Compiler.bindReact(setCompilerData, setCompilerStatus);
    Compiler.connect(`${Compiler.base_address}main`);
    preloadPlatforms(() => {
      preparePreloadImages();
      preloadPicto(() => void {});
      console.log('plaforms loaded!');
      setLoadingOverlay(false);
      const errs = getPlatformsErrors();
      if (Object.keys(errs).length > 0) {
        openPlatformError(errs);
      }
    });
  }, []);

  const tabsItems = [
    {
      tab: editorData.shownName ? 'SM: ' + editorData.shownName : 'SM: unnamed',
      cantClose: true,
      content: (
        <DiagramEditor
          manager={manager!}
          editor={editor}
          setEditor={lapki.setEditor}
          onCodeSnippet={onCodeSnippet}
        />
      ),
    },
    {
      tab: editorData.shownName ? 'CODE: ' + editorData.shownName : 'CODE: unnamed',
      cantClose: true,
      content: <CodeEditor value={editorData.content ?? ''} />,
    },
  ];
  return (
    <div className="h-screen select-none font-Fira">
      <PanelGroup direction="horizontal" id="group">
        <Sidebar
          editorRef={lapki}
          flasherProps={flasherProps}
          compilerProps={compilerProps}
          menuProps={menuProps}
        />

        <Panel order={1}>
          <div className="flex">
            <div className="flex-1">
              {editorData.content ? (
                <Tabs tabsItems={tabsItems} tabData={tabData} setTabData={setTabData} />
              ) : (
                <p className="pt-24 text-center font-Fira text-base">
                  Откройте файл или перенесите его сюда...
                </p>
              )}
            </div>

            <div className={twMerge('bottom-0 right-0 m-auto flex h-[calc(100vh-2rem)] bg-white')}>
              <button className="relative w-8" onClick={() => setIsDocOpen((p) => !p)}>
                <Arrow transform={isDocOpen ? 'rotate(0)' : 'rotate(180)'} />
              </button>

              <div className={twMerge('w-[400px] transition-all', !isDocOpen && 'hidden')}>
                <Documentations />
              </div>
            </div>
          </div>
        </Panel>
      </PanelGroup>

      <SaveRemindModal isOpen={isSaveModalOpen} isData={saveModalData} onClose={closeSaveModal} />
      <MessageModal isOpen={isMsgModalOpen} isData={msgModalData} onClose={closeMsgModal} />
      <PlatformSelectModal
        isOpen={isPlatformModalOpen}
        onCreate={performNewFile}
        onClose={closePlatformModal}
      />

      <LoadingOverlay isOpen={isLoadingOverlay}></LoadingOverlay>
    </div>
  );
};
