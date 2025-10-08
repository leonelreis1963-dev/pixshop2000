/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useEffect } from 'react';
import { UploadIcon, MagicWandIcon, PaletteIcon, SunIcon, CombineIcon } from './icons';

interface StartScreenProps {
  onStartEditor: (file: File) => void;
  onStartCombine: (sourceFile: File, destinationFile: File) => void;
}

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

const FileDropZone: React.FC<{
  onFileSelect: (file: File) => void;
  label: string;
  file: File | null;
}> = ({ onFileSelect, label, file }) => {
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const inputId = `file-upload-${label.replace(/\s+/g, '-')}`;
    const fileUrl = useObjectURL(file);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };
    
    return (
        <div 
          className={`relative w-full text-center p-2 transition-all duration-300 rounded-xl border-2 aspect-video flex items-center justify-center ${isDraggingOver ? 'bg-blue-500/10 border-dashed border-blue-400' : 'bg-gray-800/50 border-gray-700'}`}
          onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            if(e.dataTransfer.files && e.dataTransfer.files[0]) {
                onFileSelect(e.dataTransfer.files[0]);
            }
          }}
        >
          <input id={inputId} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          <label htmlFor={inputId} className="cursor-pointer flex flex-col items-center justify-center h-full w-full bg-black/20 rounded-lg">
            {fileUrl ? (
                <img src={fileUrl} alt={label} className="w-full h-full object-cover rounded-lg" />
            ) : (
                <div className="flex flex-col items-center justify-center h-full w-full p-4">
                    <UploadIcon className="w-8 h-8 mb-2 text-gray-400" />
                    <span className="text-lg font-semibold text-gray-300">{label}</span>
                    <span className="text-sm text-gray-500">Clique ou arraste a imagem</span>
                </div>
            )}
          </label>
        </div>
    );
};


const StartScreen: React.FC<StartScreenProps> = ({ onStartEditor, onStartCombine }) => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [destinationFile, setDestinationFile] = useState<File | null>(null);

  const handleSingleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
        onStartEditor(files[0]);
    }
  };

  const handleStartCombineClick = () => {
    if (sourceFile && destinationFile) {
        onStartCombine(sourceFile, destinationFile);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-10 animate-fade-in p-4">
        <div className="text-center">
            <h1 className="text-5xl font-extrabold tracking-tight text-gray-100 sm:text-6xl md:text-7xl">
            Edição de Fotos com IA, <span className="text-blue-400">Simplificada</span>.
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-400 md:text-xl">
            Escolha um modo para começar. Edite uma única foto ou combine elementos de duas imagens para criar algo novo.
            </p>
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Single Image Editor */}
            <div className="bg-black/20 p-6 rounded-lg border border-gray-700/50 flex flex-col items-center text-center">
                <div className="flex items-center justify-center w-16 h-16 bg-gray-700 rounded-full mb-4">
                    <MagicWandIcon className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-100">Editor de Foto Única</h3>
                <p className="mt-2 text-gray-400 mb-6">
                    Retoque, aplique filtros e faça ajustes profissionais em uma única imagem usando simples comandos de texto.
                </p>
                <label htmlFor="image-upload-start" className="relative w-full max-w-xs inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-blue-600 rounded-full cursor-pointer group hover:bg-blue-500 transition-colors">
                    <UploadIcon className="w-6 h-6 mr-3" />
                    Carregar Imagem
                </label>
                <input id="image-upload-start" type="file" className="hidden" accept="image/*" onChange={(e) => handleSingleFileSelect(e.target.files)} />
            </div>

            {/* Combine Two Images */}
             <div className="bg-black/20 p-6 rounded-lg border border-gray-700/50 flex flex-col items-center text-center">
                <div className="flex items-center justify-center w-16 h-16 bg-gray-700 rounded-full mb-4">
                    <CombineIcon className="w-8 h-8 text-cyan-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-100">Combinar Duas Imagens</h3>
                <p className="mt-2 text-gray-400 mb-6">
                    Copie um elemento de uma imagem de origem e cole-o em uma imagem de destino. A IA ajustará tudo para você.
                </p>
                <div className="w-full flex flex-col md:flex-row gap-4 mb-4">
                    <FileDropZone onFileSelect={setSourceFile} label="Imagem de Origem" file={sourceFile} />
                    <FileDropZone onFileSelect={setDestinationFile} label="Imagem de Destino" file={destinationFile} />
                </div>
                 <button 
                    onClick={handleStartCombineClick}
                    disabled={!sourceFile || !destinationFile}
                    className="w-full max-w-xs bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-bold py-4 px-6 rounded-full transition-all duration-300 ease-in-out shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-lg disabled:from-gray-600 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                >
                    Começar a Combinar
                </button>
            </div>
        </div>
    </div>
  );
};

export default StartScreen;