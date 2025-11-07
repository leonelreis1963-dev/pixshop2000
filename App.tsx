/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, generateBackgroundImageRemoved, combineImages } from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import RemoveBackgroundPanel from './components/CropPanel';
import { UndoIcon, RedoIcon, EyeIcon } from './components/icons';
import StartScreen from './components/StartScreen';
import CombineImagesPanel from './components/CombineImagesPanel';

// Helper to convert a data URL to a File object
const dataURLtoFile = async (dataUrl: string, filename: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const mimeType = dataUrl.split(',')[0].match(/:(.*?);/)?.[1] || blob.type;
    return new File([blob], filename, { type: mimeType });
};

type Tab = 'retouch' | 'adjust' | 'filters' | 'remove-bg';
type AppMode = 'start' | 'editor' | 'combine';

const tabNames: { [key in Tab]: string } = {
  retouch: 'Retocar',
  adjust: 'Ajustar',
  filters: 'Filtros',
  'remove-bg': 'Remover Fundo',
};

const App: React.FC = () => {
  // Common state
  const [mode, setMode] = useState<AppMode>('start');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Editor mode state
  const [editorHistory, setEditorHistory] = useState<File[]>([]);
  const [editorHistoryIndex, setEditorHistoryIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('retouch');
  const [isComparing, setIsComparing] = useState<boolean>(false);

  // Combine mode state
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [destinationHistory, setDestinationHistory] = useState<File[]>([]);
  const [destinationHistoryIndex, setDestinationHistoryIndex] = useState<number>(-1);
  const [sourceSelection, setSourceSelection] = useState<{ x: number, y: number } | null>(null);
  const [destinationTarget, setDestinationTarget] = useState<{ x: number, y: number } | null>(null);
  const [displaySourceSelection, setDisplaySourceSelection] = useState<{ x: number, y: number } | null>(null);
  const [displayDestinationTarget, setDisplayDestinationTarget] = useState<{ x: number, y: number } | null>(null);


  // --- URL Management ---
  const useObjectURL = (file: File | null) => {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
      if (file) {
        const newUrl = URL.createObjectURL(file);
        setUrl(newUrl);
        return () => URL.revokeObjectURL(newUrl);
      } else {
        setUrl(null);
      }
    }, [file]);
    return url;
  };
  
  // Editor URLs
  const currentEditorImage = editorHistory[editorHistoryIndex] ?? null;
  const originalEditorImage = editorHistory[0] ?? null;
  const currentEditorImageUrl = useObjectURL(currentEditorImage);
  const originalEditorImageUrl = useObjectURL(originalEditorImage);

  // Combine URLs
  const sourceImageUrl = useObjectURL(sourceImage);
  const currentDestinationImage = destinationHistory[destinationHistoryIndex] ?? null;
  const originalDestinationImage = destinationHistory[0] ?? null;
  const currentDestinationImageUrl = useObjectURL(currentDestinationImage);


  // --- Computed State ---
  const canUndo = editorHistoryIndex > 0;
  const canRedo = editorHistoryIndex < editorHistory.length - 1;
  const canUndoCombine = destinationHistoryIndex > 0;
  const canRedoCombine = destinationHistoryIndex < destinationHistory.length - 1;


  // --- History Management ---
  const addImageToEditorHistory = useCallback((newImageFile: File) => {
    const newHistory = editorHistory.slice(0, editorHistoryIndex + 1);
    newHistory.push(newImageFile);
    setEditorHistory(newHistory);
    setEditorHistoryIndex(newHistory.length - 1);
  }, [editorHistory, editorHistoryIndex]);

  const addImageToDestinationHistory = useCallback((newImageFile: File) => {
    const newHistory = destinationHistory.slice(0, destinationHistoryIndex + 1);
    newHistory.push(newImageFile);
    setDestinationHistory(newHistory);
    setDestinationHistoryIndex(newHistory.length - 1);
  }, [destinationHistory, destinationHistoryIndex]);


  // --- Mode Handling ---
  const handleStartEditor = useCallback((file: File) => {
    setError(null);
    setEditorHistory([file]);
    setEditorHistoryIndex(0);
    setEditHotspot(null);
    setDisplayHotspot(null);
    setActiveTab('retouch');
    setMode('editor');
  }, []);

  const handleStartCombine = useCallback((sourceFile: File, destinationFile: File) => {
    setError(null);
    setSourceImage(sourceFile);
    setDestinationHistory([destinationFile]);
    setDestinationHistoryIndex(0);
    setSourceSelection(null);
    setDestinationTarget(null);
    setDisplaySourceSelection(null);
    setDisplayDestinationTarget(null);
    setMode('combine');
  }, []);
  
  const handleGoToStart = useCallback(() => {
    setMode('start');
    setError(null);
    // Reset all state
    setEditorHistory([]);
    setEditorHistoryIndex(-1);
    setPrompt('');
    setEditHotspot(null);
    setDisplayHotspot(null);
    setSourceImage(null);
    setDestinationHistory([]);
    setDestinationHistoryIndex(-1);
    setSourceSelection(null);
    setDestinationTarget(null);
    setDisplaySourceSelection(null);
    setDisplayDestinationTarget(null);
  }, []);


  // --- Editor Mode Handlers ---
  const handleGenerate = useCallback(async () => {
    if (!currentEditorImage) {
      setError('Nenhuma imagem carregada para editar.');
      return;
    }
    if (!prompt.trim()) {
        setError('Por favor, insira uma descrição para sua edição.');
        return;
    }
    setIsLoading(true);
    setLoadingMessage('A IA está fazendo sua mágica...');
    setError(null);
    try {
        let newImageUrl: string;
        if (editHotspot) {
            newImageUrl = await generateEditedImage(currentEditorImage, prompt, editHotspot);
        } else {
            newImageUrl = await generateAdjustedImage(currentEditorImage, prompt);
        }
        const newImageFile = await dataURLtoFile(newImageUrl, `edited-${Date.now()}.png`);
        addImageToEditorHistory(newImageFile);
        setEditHotspot(null);
        setDisplayHotspot(null);
        setPrompt('');
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
        setError(`Falha ao gerar a imagem. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [currentEditorImage, prompt, editHotspot, addImageToEditorHistory]);
  
  const handleApplyFilter = useCallback(async (filterPrompt: string) => {
    if (!currentEditorImage) {
      setError('Nenhuma imagem carregada para aplicar um filtro.');
      return;
    }
    setIsLoading(true);
    setLoadingMessage('Aplicando filtro...');
    setError(null);
    try {
        const filteredImageUrl = await generateFilteredImage(currentEditorImage, filterPrompt);
        const newImageFile = await dataURLtoFile(filteredImageUrl, `filtered-${Date.now()}.png`);
        addImageToEditorHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
        setError(`Falha ao aplicar o filtro. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [currentEditorImage, addImageToEditorHistory]);
  
  const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
    if (!currentEditorImage) {
      setError('Nenhuma imagem carregada para aplicar um ajuste.');
      return;
    }
    setIsLoading(true);
    setLoadingMessage('Aplicando ajuste...');
    setError(null);
    try {
        const adjustedImageUrl = await generateAdjustedImage(currentEditorImage, adjustmentPrompt);
        const newImageFile = await dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`);
        addImageToEditorHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
        setError(`Falha ao aplicar o ajuste. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [currentEditorImage, addImageToEditorHistory]);

  const handleRemoveBackground = useCallback(async (aggressiveness: number) => {
    if (!currentEditorImage) {
      setError('Nenhuma imagem carregada para remover o fundo.');
      return;
    }
    setIsLoading(true);
    setLoadingMessage('Removendo o fundo...');
    setError(null);
    try {
        const newImageUrl = await generateBackgroundImageRemoved(currentEditorImage, aggressiveness);
        const newImageFile = await dataURLtoFile(newImageUrl, `bg-removed-${Date.now()}.png`);
        addImageToEditorHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
        setError(`Falha ao remover o fundo. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [currentEditorImage, addImageToEditorHistory]);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      setEditorHistoryIndex(editorHistoryIndex - 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [canUndo, editorHistoryIndex]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) {
      setEditorHistoryIndex(editorHistoryIndex + 1);
    }
  }, [canRedo, editorHistoryIndex]);

  const handleReset = useCallback(() => {
    if (editorHistory.length > 0) {
      setEditorHistoryIndex(0);
      setError(null);
      setEditHotspot(null);
      setDisplayHotspot(null);
    }
  }, [editorHistory]);

  const handleDownload = useCallback(async (format: 'png' | 'jpg') => {
      const imageToDownload = currentEditorImage || currentDestinationImage;
      if (!imageToDownload) return;

      const filename = `edited-${Date.now()}.${format}`;
      
      if (format === 'png') {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(imageToDownload);
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      } else { // format is 'jpg'
          const image = new Image();
          const objectUrl = URL.createObjectURL(imageToDownload);
          
          image.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = image.naturalWidth;
              canvas.height = image.naturalHeight;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                  setError('Não foi possível criar o contexto do canvas para conversão.');
                  URL.revokeObjectURL(objectUrl);
                  return;
              }
              
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(image, 0, 0);
              
              const jpgUrl = canvas.toDataURL('image/jpeg', 0.95);
              
              const link = document.createElement('a');
              link.href = jpgUrl;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(objectUrl);
          };

          image.onerror = () => {
              setError('Falha ao carregar a imagem para conversão para JPG.');
              URL.revokeObjectURL(objectUrl);
          };
          image.src = objectUrl;
      }
  }, [currentEditorImage, currentDestinationImage]);
  
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeTab !== 'retouch') return;
    
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDisplayHotspot({ x: offsetX, y: offsetY });

    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
    const scaleX = naturalWidth / clientWidth;
    const scaleY = naturalHeight / clientHeight;

    const originalX = Math.round(offsetX * scaleX);
    const originalY = Math.round(offsetY * scaleY);

    setEditHotspot({ x: originalX, y: originalY });
  };

  // --- Combine Mode Handlers ---
  const handleCombineGenerate = useCallback(async (elementPrompt: string) => {
      if (!sourceImage || !currentDestinationImage || !sourceSelection || !destinationTarget) {
          setError('Por favor, selecione um elemento de origem e um local de destino antes de combinar.');
          return;
      }
      if (!elementPrompt.trim()) {
        setError('Por favor, descreva o elemento que você deseja mover.');
        return;
    }
      
      setIsLoading(true);
      setLoadingMessage('A IA está combinando as imagens...');
      setError(null);

      try {
          const newImageUrl = await combineImages(sourceImage, currentDestinationImage, elementPrompt, sourceSelection, destinationTarget);
          const newImageFile = await dataURLtoFile(newImageUrl, `combined-${Date.now()}.png`);
          addImageToDestinationHistory(newImageFile);
          
          // Reset selections for next operation
          setSourceSelection(null);
          setDestinationTarget(null);
          setDisplaySourceSelection(null);
          setDisplayDestinationTarget(null);

      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
          setError(`Falha ao combinar as imagens. ${errorMessage}`);
          console.error(err);
      } finally {
          setIsLoading(false);
          setLoadingMessage('');
      }
  }, [sourceImage, currentDestinationImage, sourceSelection, destinationTarget, addImageToDestinationHistory]);

  const handleImageClickForCombine = (e: React.MouseEvent<HTMLImageElement>, type: 'source' | 'destination') => {
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
    const scaleX = naturalWidth / clientWidth;
    const scaleY = naturalHeight / clientHeight;
    const originalX = Math.round(offsetX * scaleX);
    const originalY = Math.round(offsetY * scaleY);

    if (type === 'source') {
        setDisplaySourceSelection({ x: offsetX, y: offsetY });
        setSourceSelection({ x: originalX, y: originalY });
    } else {
        setDisplayDestinationTarget({ x: offsetX, y: offsetY });
        setDestinationTarget({ x: originalX, y: originalY });
    }
  };
  
  const handleUndoCombine = useCallback(() => {
    if (canUndoCombine) {
      setDestinationHistoryIndex(destinationHistoryIndex - 1);
    }
  }, [canUndoCombine, destinationHistoryIndex]);
  
  const handleRedoCombine = useCallback(() => {
    if (canRedoCombine) {
      setDestinationHistoryIndex(destinationHistoryIndex + 1);
    }
  }, [canRedoCombine, destinationHistoryIndex]);


  // --- Render Logic ---
  const renderContent = () => {
    if (error) {
       return (
           <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-red-300">Ocorreu um Erro</h2>
            <p className="text-md text-red-400">{error}</p>
            <button
                onClick={() => setError(null)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
              >
                Tentar Novamente
            </button>
          </div>
        );
    }
    
    if (mode === 'start') {
      return <StartScreen onStartEditor={handleStartEditor} onStartCombine={handleStartCombine} />;
    }

    if (mode === 'editor' && currentEditorImage) {
      return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
          <div className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-black/20">
              {isLoading && (
                  <div className="absolute inset-0 bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
                      <Spinner />
                      <p className="text-gray-300">{loadingMessage}</p>
                  </div>
              )}
              
              <div className="relative">
                {originalEditorImageUrl && (
                    <img
                        key={originalEditorImageUrl}
                        src={originalEditorImageUrl}
                        alt="Original"
                        className="w-full h-auto object-contain max-h-[60vh] rounded-xl pointer-events-none"
                    />
                )}
                <img
                    key={currentEditorImageUrl}
                    src={currentEditorImageUrl}
                    alt="Atual"
                    onClick={handleImageClick}
                    className={`absolute top-0 left-0 w-full h-auto object-contain max-h-[60vh] rounded-xl transition-opacity duration-200 ease-in-out ${isComparing ? 'opacity-0' : 'opacity-100'} ${activeTab === 'retouch' ? 'cursor-crosshair' : ''}`}
                />
              </div>
  
              {displayHotspot && !isLoading && activeTab === 'retouch' && (
                  <div 
                      className="absolute rounded-full w-6 h-6 bg-blue-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
                      style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}
                  >
                      <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-blue-400"></div>
                  </div>
              )}
          </div>
          
          <div className="w-full bg-gray-800/80 border border-gray-700/80 rounded-lg p-2 flex items-center justify-center gap-2 backdrop-blur-sm">
              {(['retouch', 'remove-bg', 'adjust', 'filters'] as Tab[]).map(tab => (
                   <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`w-full capitalize font-semibold py-3 px-5 rounded-md transition-all duration-200 text-base ${
                          activeTab === tab 
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40' 
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                  >
                      {tabNames[tab]}
                  </button>
              ))}
          </div>
          
          <div className="w-full">
              {activeTab === 'retouch' && (
                  <div className="flex flex-col items-center gap-4">
                      <p className="text-md text-gray-400 text-center">
                          Clique em um ponto para uma edição local ou apenas descreva uma alteração para aplicá-la a toda a imagem.
                      </p>
                      <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex items-center gap-2">
                          <input
                              type="text"
                              value={prompt}
                              onChange={(e) => setPrompt(e.target.value)}
                              placeholder={editHotspot ? "Edição local: 'mude a cor da camisa para azul'" : "Ajuste global: 'faça o fundo parecer uma floresta'"}
                              className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-5 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={isLoading}
                          />
                          <button 
                              type="submit"
                              className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-5 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                              disabled={isLoading || !prompt.trim()}
                          >
                              Gerar
                          </button>
                      </form>
                  </div>
              )}
              {activeTab === 'remove-bg' && <RemoveBackgroundPanel onRemoveBackground={handleRemoveBackground} isLoading={isLoading} />}
              {activeTab === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} />}
              {activeTab === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} />}
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <button onClick={handleUndo} disabled={!canUndo} className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Desfazer"><UndoIcon className="w-5 h-5 mr-2" />Desfazer</button>
              <button onClick={handleRedo} disabled={!canRedo} className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Refazer"><RedoIcon className="w-5 h-5 mr-2" />Refazer</button>
              <div className="h-6 w-px bg-gray-600 mx-1 hidden sm:block"></div>
              {canUndo && (<button onMouseDown={() => setIsComparing(true)} onMouseUp={() => setIsComparing(false)} onMouseLeave={() => setIsComparing(false)} onTouchStart={() => setIsComparing(true)} onTouchEnd={() => setIsComparing(false)} className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base" aria-label="Comparar com original"><EyeIcon className="w-5 h-5 mr-2" />Comparar</button>)}
              <button onClick={handleReset} disabled={!canUndo} className="text-center bg-transparent border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed">Redefinir</button>
              <button onClick={handleGoToStart} className="text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base">Começar de Novo</button>
              <div className="flex-grow sm:flex-grow-0 ml-auto flex gap-2">
                  <button onClick={() => handleDownload('png')} className="bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base">Baixar PNG</button>
                  <button onClick={() => handleDownload('jpg')} className="bg-gradient-to-br from-teal-600 to-teal-500 text-white font-bold py-3 px-5 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-teal-500/20 hover:shadow-xl hover:shadow-teal-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base">Baixar JPG</button>
              </div>
          </div>
        </div>
      );
    }
    
    if (mode === 'combine' && sourceImage && currentDestinationImage) {
      return (
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
          {isLoading && (
              <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center gap-4 animate-fade-in">
                  <Spinner />
                  <p className="text-gray-300 text-lg">{loadingMessage}</p>
              </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            {/* Source Image */}
            <div className="flex flex-col gap-2 items-center">
              <h2 className="text-lg font-semibold text-gray-300">Imagem de Origem (Copiar daqui)</h2>
              <div className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-black/20">
                <img
                    key={sourceImageUrl}
                    src={sourceImageUrl}
                    alt="Fonte"
                    onClick={(e) => handleImageClickForCombine(e, 'source')}
                    className="w-full h-auto object-contain max-h-[50vh] rounded-xl cursor-crosshair"
                />
                {displaySourceSelection && (
                    <div className="absolute rounded-full w-6 h-6 bg-green-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10" style={{ left: `${displaySourceSelection.x}px`, top: `${displaySourceSelection.y}px` }}>
                        <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-green-400"></div>
                    </div>
                )}
              </div>
            </div>
            
            {/* Destination Image */}
            <div className="flex flex-col gap-2 items-center">
              <h2 className="text-lg font-semibold text-gray-300">Imagem de Destino (Colar aqui)</h2>
              <div className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-black/20">
                <img
                    key={currentDestinationImageUrl}
                    src={currentDestinationImageUrl}
                    alt="Destino"
                    onClick={(e) => handleImageClickForCombine(e, 'destination')}
                    className="w-full h-auto object-contain max-h-[50vh] rounded-xl cursor-crosshair"
                />
                 {displayDestinationTarget && (
                    <div className="absolute rounded-full w-6 h-6 bg-blue-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10" style={{ left: `${displayDestinationTarget.x}px`, top: `${displayDestinationTarget.y}px` }}>
                       <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-blue-400"></div>
                    </div>
                )}
              </div>
            </div>
          </div>

          <CombineImagesPanel
            onGenerate={handleCombineGenerate}
            isLoading={isLoading}
            sourceSelected={!!sourceSelection}
            destinationSelected={!!destinationTarget}
          />

          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <button onClick={handleUndoCombine} disabled={!canUndoCombine} className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all disabled:opacity-50"><UndoIcon className="w-5 h-5 mr-2" />Desfazer</button>
              <button onClick={handleRedoCombine} disabled={!canRedoCombine} className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all disabled:opacity-50"><RedoIcon className="w-5 h-5 mr-2" />Refazer</button>
              <div className="h-6 w-px bg-gray-600 mx-1 hidden sm:block"></div>
              <button onClick={handleGoToStart} className="text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all">Começar de Novo</button>
              <div className="flex-grow sm:flex-grow-0 ml-auto flex gap-2">
                  <button onClick={() => handleDownload('png')} className="bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-md">Baixar PNG</button>
                  <button onClick={() => handleDownload('jpg')} className="bg-gradient-to-br from-teal-600 to-teal-500 text-white font-bold py-3 px-5 rounded-md">Baixar JPG</button>
              </div>
          </div>

        </div>
      );
    }

    // Fallback if something goes wrong with mode/state
    if (mode !== 'start') {
        handleGoToStart();
    }
    return <StartScreen onStartEditor={handleStartEditor} onStartCombine={handleStartCombine} />;
  };
  
  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <Header />
      <main className={`flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex justify-center ${mode !== 'start' ? 'items-start' : 'items-center'}`}>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;