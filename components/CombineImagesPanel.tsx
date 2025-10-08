/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface CombineImagesPanelProps {
  onGenerate: (elementPrompt: string) => void;
  isLoading: boolean;
  sourceSelected: boolean;
  destinationSelected: boolean;
}

const CombineImagesPanel: React.FC<CombineImagesPanelProps> = ({ onGenerate, isLoading, sourceSelected, destinationSelected }) => {
  const [elementPrompt, setElementPrompt] = useState('');

  const canGenerate = sourceSelected && destinationSelected && elementPrompt.trim() !== '' && !isLoading;

  const getStatusText = () => {
    if (!sourceSelected) return 'Aguardando seleção na imagem de origem...';
    if (!destinationSelected) return 'Aguardando seleção na imagem de destino...';
    if (!elementPrompt.trim()) return 'Descreva o elemento a ser movido...';
    return 'Pronto para combinar!';
  }

  return (
    <div className="w-full max-w-4xl bg-gray-800/80 border border-gray-700/80 rounded-lg p-6 flex flex-col items-center gap-4 backdrop-blur-sm animate-fade-in">
        <h3 className="text-xl font-semibold text-gray-200">Painel de Combinação</h3>
        
        <ol className="list-decimal list-inside text-gray-400 space-y-2 text-center">
            <li><span className={sourceSelected ? 'text-green-400 font-semibold' : ''}>Descreva e clique no elemento que deseja copiar da imagem de origem.</span></li>
            <li><span className={destinationSelected ? 'text-green-400 font-semibold' : ''}>Clique onde deseja colar na imagem de destino.</span></li>
            <li>Clique em "Combinar Imagens" para gerar o resultado.</li>
        </ol>
        
        <form onSubmit={(e) => { e.preventDefault(); if(canGenerate) onGenerate(elementPrompt); }} className="w-full flex flex-col md:flex-row items-center gap-3 mt-4">
            <input
                type="text"
                value={elementPrompt}
                onChange={(e) => setElementPrompt(e.target.value)}
                placeholder="Descreva o elemento a ser movido (ex: 'o gato laranja')"
                className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-4 text-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
            />
            <button 
                type="submit"
                className="w-full md:w-auto bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-bold py-4 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-gray-600 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                disabled={!canGenerate}
            >
                Combinar Imagens
            </button>
        </form>
        <p className="text-sm text-gray-500 mt-2">{getStatusText()}</p>
    </div>
  );
};

export default CombineImagesPanel;