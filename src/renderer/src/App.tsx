import { useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';
import DocumentTitle from 'react-document-title';

import {
  CompilerProps,
  FlasherProps,
  PlatformSelectModal,
  FlasherSelectModal,
  SaveModalData,
  SaveRemindModal,
  MessageModal,
  MessageModalData,
  Sidebar,
  SidebarCallbacks,
  Tabs,
  Documentations,
} from './components';

import { isLeft, isRight, unwrapEither } from './types/Either';
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
import { Component as ComponentData } from './types/diagram';
import useEditorManager from '@renderer/hooks/useEditorManager';
import {
  ComponentSelectData,
  ComponentSelectModal,
  emptyCompData,
} from './components/ComponentSelectModal';
import { hideLoadingOverlay } from './components/utils/OverlayControl';
import {
  ComponentEditData,
  ComponentEditModal,
  emptyCompEditData,
} from './components/ComponentEditModal';
import {
  ComponentDeleteData,
  ComponentDeleteModal,
  emptyCompDeleteData,
} from './components/ComponentDeleteModal';

import { getColor } from '@renderer/theme';

import { ThemeContext } from './store/ThemeContext';
import { Theme } from './types/theme';
import { Settings } from './components/Modules/Settings';
import { useTabs } from './hooks/useTabs';
/**
 * React-компонент приложения
 */
export const App: React.FC = () => {
  const [title, setTitle] = useState<string>('Lapki IDE');
  // TODO: а если у нас будет несколько редакторов?

  // для sidebar
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    tabItems,
    activeTab,
    setActiveTab,
    onCodeSnippet,
    handleCloseTab,
    handleSwapTabs,
    clearTabs,
  } = useTabs();

  const [currentDevice, setCurrentDevice] = useState<string | undefined>(undefined);
  const [flasherConnectionStatus, setFlasherConnectionStatus] = useState<string>('Не подключен.');
  const [flasherDevices, setFlasherDevices] = useState<Map<string, Device>>(new Map());
  const [flasherLog, setFlasherLog] = useState<string | undefined>(undefined);
  const [flasherFile, setFlasherFile] = useState<string | undefined | null>(undefined);
  const [flashing, setFlashing] = useState(false);

  const [compilerData, setCompilerData] = useState<CompilerResult | undefined>(undefined);
  const [compilerStatus, setCompilerStatus] = useState<string>('Не подключен.');
  const [openData, setOpenData] = useState<
    [boolean, string | null, string | null, string] | undefined
  >(undefined);
  const [importData, setImportData] = useState<string | undefined>(undefined);

  const [theme, setTheme] = useState<Theme>('dark');

  const lapki = useEditorManager();
  const editor = lapki.editor;
  const manager = lapki.managerRef.current;
  const editorData = lapki.editorData;

  // FIXME: много, очень много модальных флажков, возможно ли сократить это обилие...
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const openPlatformModal = () => setIsPlatformModalOpen(true);
  const closePlatformModal = () => setIsPlatformModalOpen(false);

  const [isFlasherModalOpen, setIsFlasherModalOpen] = useState(false);
  const openFlasherModal = () => setIsFlasherModalOpen(true);
  const closeFlasherModal = () => {
    Flasher.freezeReconnectionTimer(false);
    setIsFlasherModalOpen(false);
  };

  const [compAddModalData, setCompAddModalData] = useState<ComponentSelectData>(emptyCompData);
  const [isCompAddModalOpen, setIsCompAddModalOpen] = useState(false);
  const openCompAddModal = () => setIsCompAddModalOpen(true);
  const closeCompAddModal = () => setIsCompAddModalOpen(false);

  const [compEditModalData, setCompEditModalData] = useState<ComponentEditData>(emptyCompEditData);
  const [isCompEditModalOpen, setIsCompEditModalOpen] = useState(false);
  const openCompEditModal = (data: ComponentEditData) => {
    setCompEditModalData(data);
    setIsCompEditModalOpen(true);
  };
  const closeCompEditModal = () => setIsCompEditModalOpen(false);

  const [compDeleteModalData, setCompDeleteModalData] =
    useState<ComponentDeleteData>(emptyCompDeleteData);
  const [isCompDeleteModalOpen, setIsCompDeleteModalOpen] = useState(false);
  const openCompDeleteModal = (data: ComponentDeleteData) => {
    setCompDeleteModalData(data);
    setIsCompDeleteModalOpen(true);
  };
  const closeCompDeleteModal = () => setIsCompDeleteModalOpen(false);

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
    if (flasherFile) {
      Flasher.flash(currentDevice!);
    } else {
      Flasher.flashCompiler(compilerData!.binary!, currentDevice!);
    }
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

    if (result && isRight(result)) {
      clearTabs();
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
    clearTabs();
  };

  const handleCompile = async () => {
    Compiler.filename = title.split(' ')[0].split('.')[0];
    manager?.compile(editor!.container.machine.platformIdx);
  };

  const handleSaveSourceIntoFolder = async () => {
    await manager?.saveIntoFolder(compilerData!.source!);
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

  const handleFlasherHostChange = () => {
    Flasher.freezeReconnectionTimer(true);
    openFlasherModal();
  };

  const handleLocalFlasher = async () => {
    console.log('local');
    await manager?.startLocalModule('lapki-flasher');
    //Стандартный порт
    manager?.changeFlasherLocal();
  };

  const handleRemoteFlasher = (host: string, port: number) => {
    console.log('remote');
    // await manager?.stopLocalModule('lapki-flasher');
    manager?.changeFlasherHost(host, port);
  };

  const handleFlasherFileChoose = () => {
    if (flasherFile) {
      console.log('cancel file choose');
      setFlasherFile(undefined);
    } else {
      console.log('file chooser');
      Flasher.setFile();
    }
  };

  const handleAddStdoutTab = () => {
    onCodeSnippet({
      type: 'code',
      name: 'stdout',
      code: compilerData!.stdout ?? '',
      language: 'txt',
    });
  };

  const handleAddStderrTab = () => {
    onCodeSnippet({
      type: 'code',
      name: 'stderr',
      code: compilerData!.stderr ?? '',
      language: 'txt',
    });
  };

  const handleFlashButton = () => {
    // TODO: индекс должен браться из какой-то переменной
    handleTabChange(3);
    setFlasherFile(undefined);
  };

  const handleShowSource = () => {
    compilerData!.source!.forEach((element) => {
      onCodeSnippet({
        type: 'code',
        name: `${element.filename}.${element.extension}`,
        code: element.fileContent,
        language: 'cpp',
      });
    });
  };

  const handleImport = async (platform: string) => {
    await manager?.import(platform, setOpenData);
  };

  const handleChangeTheme = (theme: Theme) => {
    setTheme(theme);

    document.documentElement.dataset.theme = theme;

    monaco.editor.setTheme(getColor('codeEditorTheme').trim());

    if (editor) {
      editor.container.isDirty = true;
    }
  };

  // смена вкладок (Sidebar.tsx)
  const handleTabChange = (index: number) => {
    //console.log('tab changed');
    if (index === activeTabIndex) {
      setIsCollapsed((p) => !p);
    } else {
      setActiveTabIndex(index);
      isCollapsed && setIsCollapsed(false);
    }
  };

  useEffect(() => {
    if (importData && openData) {
      manager?.parseImportData(importData, openData!);
      setImportData(undefined);
    }
  }, [importData]);

  const flasherProps: FlasherProps = {
    devices: flasherDevices,
    currentDevice,
    connectionStatus: flasherConnectionStatus,
    flasherLog,
    compilerData,
    flasherFile,
    flashing,
    setCurrentDevice,
    handleGetList,
    handleFlash: handleFlashBinary,
    handleHostChange: handleFlasherHostChange,
    handleFileChoose: handleFlasherFileChoose,
  };

  const compilerProps: CompilerProps = {
    compilerData,
    compilerStatus,
    fileReady: editor !== null,
    handleAddStdoutTab,
    handleAddStderrTab,
    handleCompile,
    handleSaveSourceIntoFolder,
    handleSaveBinaryIntoFolder,
    handleShowSource,
    handleFlashButton,
  };

  const onRequestAddComponent = () => {
    const machine = editor!.container.machine;
    const vacantComponents = machine.getVacantComponents();
    const existingComponents = new Set<string>();
    for (const name of machine.components.keys()) {
      existingComponents.add(name);
    }
    setCompAddModalData({ vacantComponents, existingComponents });
    openCompAddModal();
  };

  const handleAddComponent = (idx: string, name?: string) => {
    const realName = name ?? idx;
    editor!.container.machine.addNewComponent(realName, idx);
    // console.log(['handleAddComponent', idx, name]);
  };

  const onRequestEditComponent = (idx: string) => {
    const machine = editor!.container.machine;
    const component = machine.components.get(idx);
    if (typeof component === 'undefined') return;
    const data = component.data;
    const proto = machine.platform.data.components[data.type];
    if (typeof proto === 'undefined') {
      console.error('non-existing %s %s', idx, data.type);
      return;
    }

    const existingComponents = new Set<string>();
    for (const name of machine.components.keys()) {
      if (name == idx) continue;
      existingComponents.add(name);
    }

    openCompEditModal({ idx, data, proto, existingComponents });
  };

  const onRequestDeleteComponent = (idx: string) => {
    const machine = editor!.container.machine;
    const component = machine.components.get(idx);
    if (typeof component === 'undefined') return;
    const data = component.data;
    const proto = machine.platform.data.components[data.type];
    if (typeof proto === 'undefined') {
      console.error('non-existing %s %s', idx, data.type);
      return;
    }

    openCompDeleteModal({ idx, type: data.type });
  };

  const handleEditComponent = (idx: string, data: ComponentData, newName?: string) => {
    console.log(['component-edit-apply', idx, data, newName]);
    editor!.container.machine.editComponent(idx, data, newName);
  };

  const handleDeleteComponent = (idx: string) => {
    editor!.container.machine.removeComponent(idx, false);
    closeCompEditModal();
  };

  const sidebarCallbacks: SidebarCallbacks = {
    onRequestNewFile: handleNewFile,
    onRequestOpenFile: handleOpenFile,
    onRequestSaveFile: handleSaveFile,
    onRequestSaveAsFile: handleSaveAsFile,
    onRequestAddComponent,
    onRequestEditComponent,
    onRequestDeleteComponent,
    onRequestImport: handleImport,
  };

  useEffect(() => {
    manager?.bindReact(setTitle);
  });

  useEffect(() => {
    if (importData && openData) {
      manager?.parseImportData(importData, openData!);
      setImportData(undefined);
    }
  }, [importData]);

  useEffect(() => {
    Compiler.bindReact(setCompilerData, setCompilerStatus, setImportData);
    Settings.getCompilerSettings().then((compiler) => {
      console.log('CONNECTING TO COMPILER');
      Compiler.connect(compiler.host, compiler.port);
    });

    preloadPlatforms(() => {
      preparePreloadImages();
      preloadPicto(() => void {});
      console.log('plaforms loaded!');
      hideLoadingOverlay();
      const errs = getPlatformsErrors();
      if (Object.keys(errs).length > 0) {
        openPlatformError(errs);
      }
    });
  }, []);

  useEffect(() => {
    Flasher.bindReact(
      setFlasherDevices,
      setFlasherConnectionStatus,
      setFlasherLog,
      setFlasherFile,
      setFlashing
    );
    const reader = new FileReader();
    Flasher.initReader(reader);
    console.log('CONNECTING TO FLASHER');
    Flasher.connect();
    // если не указывать второй аргумент '[]', то эта функция будет постоянно вызываться.
  }, []);

  return (
    <DocumentTitle title={title}>
      <ThemeContext.Provider value={{ theme, setTheme: handleChangeTheme }}>
        <div className="h-screen select-none">
          <div className="flex h-full w-full flex-row overflow-hidden">
            <Sidebar
              activeTabIndex={activeTabIndex}
              isCollapsed={isCollapsed}
              handleTabChange={handleTabChange}
              setIsCollapsed={setIsCollapsed}
              editorRef={lapki}
              flasherProps={flasherProps}
              compilerProps={compilerProps}
              callbacks={sidebarCallbacks}
            />

            <div className="relative w-full min-w-0 bg-bg-primary">
              {editorData.content ? (
                <Tabs
                  editorProps={{
                    manager: manager!,
                    editor,
                    setEditor: lapki.setEditor,
                    onCodeSnippet: onCodeSnippet,
                  }}
                  items={tabItems}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onClose={handleCloseTab}
                  onSwapTabs={handleSwapTabs}
                />
              ) : (
                <p className="pt-24 text-center text-base">
                  Откройте файл или перенесите его сюда...
                </p>
              )}

              <Documentations
                topOffset={!!editorData.content}
                baseUrl={'https://lapki-doc.polyus-nt.ru/'}
              />
            </div>
          </div>

          <SaveRemindModal
            isOpen={isSaveModalOpen}
            isData={saveModalData}
            onClose={closeSaveModal}
          />
          <MessageModal isOpen={isMsgModalOpen} isData={msgModalData} onClose={closeMsgModal} />
          <PlatformSelectModal
            isOpen={isPlatformModalOpen}
            onCreate={performNewFile}
            onClose={closePlatformModal}
          />
          <FlasherSelectModal
            isOpen={isFlasherModalOpen}
            handleLocal={handleLocalFlasher}
            handleRemote={handleRemoteFlasher}
            onClose={closeFlasherModal}
          />
          <ComponentSelectModal
            isOpen={isCompAddModalOpen}
            data={compAddModalData}
            onClose={closeCompAddModal}
            onSubmit={handleAddComponent}
          />
          <ComponentEditModal
            isOpen={isCompEditModalOpen}
            data={compEditModalData}
            onClose={closeCompEditModal}
            onComponentEdit={handleEditComponent}
            onComponentDelete={onRequestDeleteComponent}
          />
          <ComponentDeleteModal
            isOpen={isCompDeleteModalOpen}
            data={compDeleteModalData}
            onClose={closeCompDeleteModal}
            onComponentDelete={handleDeleteComponent}
          />
        </div>
      </ThemeContext.Provider>
    </DocumentTitle>
  );
};
