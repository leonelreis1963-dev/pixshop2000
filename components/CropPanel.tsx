/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface RemoveBackgroundPanelProps {
  onRemoveBackground: (aggressiveness: number) => void;
  isLoading: boolean;
}

const RemoveBackgroundPanel: React.FC<RemoveBackgroundPanelProps> = ({ onRemoveBackground, isLoading }) => {
  const [aggressiveness, setAggressiveness] = useState(3);

  const aggressionLabels: { [key: number]: string } = {
    1: 'Mínima (Preservar Detalhes)',
    2: 'Leve',
    3: 'Normal (Balanceado)',
    4: 'Forte',
    5: 'Máxima (Limpeza Agressiva)',
  }

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm text-center">
      <h3 className="text-xl font-semibold text-gray-200">Remover Fundo da Imagem</h3>
      <p className="text-md text-gray-400 max-w-lg">
        Esta ferramenta irá identificar o assunto principal, remover o fundo e substituí-lo por branco. Use o controle abaixo para ajustar a precisão do recorte.
      </p>

      <div className="w-full max-w-sm flex flex-col gap-2 my-4">
        <label htmlFor="aggressiveness" className="text-sm font-medium text-gray-300">
          Nível de Agressividade: <span className="font-bold text-blue-400">{aggressionLabels[aggressiveness]}</span>
        </label>
        <input
          id="aggressiveness"
          type="range"
          min="1"
          max="5"
          step="1"
          value={aggressiveness}
          onChange={(e) => setAggressiveness(Number(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          disabled={isLoading}
        />
        <div className="flex justify-between text-xs text-gray-500 px-1">
          <span>Menos</span>
          <span>Mais</span>
        </div>
      </div>


      <button
        onClick={() => onRemoveBackground(aggressiveness)}
        disabled={isLoading}
        className="w-full max-w-xs mt-2 bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
      >
        {isLoading ? 'Processando...' : 'Remover Fundo'}
      </button>
    </div>
  );
};

export default RemoveBackgroundPanel;