/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface RemoveBackgroundPanelProps {
  onRemoveBackground: () => void;
  isLoading: boolean;
}

const RemoveBackgroundPanel: React.FC<RemoveBackgroundPanelProps> = ({ onRemoveBackground, isLoading }) => {
  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm text-center">
      <h3 className="text-xl font-semibold text-gray-200">Remover Fundo da Imagem</h3>
      <p className="text-md text-gray-400 max-w-md">
        Esta ferramenta irá identificar o assunto principal da sua foto, remover o fundo original e substituí-lo por um fundo branco puro (#FFFFFF). Ideal para fotos de produtos ou para destacar o seu assunto.
      </p>
      <button
        onClick={onRemoveBackground}
        disabled={isLoading}
        className="w-full max-w-xs mt-4 bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
      >
        {isLoading ? 'Processando...' : 'Remover Fundo'}
      </button>
    </div>
  );
};

export default RemoveBackgroundPanel;
