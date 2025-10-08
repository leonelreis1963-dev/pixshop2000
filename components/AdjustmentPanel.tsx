/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface AdjustmentPanelProps {
  onApplyAdjustment: (prompt: string) => void;
  isLoading: boolean;
}

const AdjustmentPanel: React.FC<AdjustmentPanelProps> = ({ onApplyAdjustment, isLoading }) => {

  const presets = [
    { name: 'Desfocar Fundo', prompt: 'Aplique um efeito de profundidade de campo realista, desfocando o fundo enquanto mantém o assunto principal em foco nítido.' },
    { name: 'Realçar Detalhes', prompt: 'Aprimore levemente a nitidez e os detalhes da imagem sem que pareça artificial.' },
    { name: 'Iluminação Mais Quente', prompt: 'Ajuste a temperatura da cor para dar à imagem uma iluminação mais quente, estilo "golden hour".' },
    { name: 'Luz de Estúdio', prompt: 'Adicione uma iluminação de estúdio profissional e dramática ao assunto principal.' },
  ];

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-center text-gray-300">Aplicar um Ajuste Rápido</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {presets.map(preset => (
          <button
            key={preset.name}
            onClick={() => onApplyAdjustment(preset.prompt)}
            disabled={isLoading}
            className={`w-full text-center bg-white/10 border border-transparent text-gray-200 font-semibold py-3 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/20 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {preset.name}
          </button>
        ))}
      </div>
      <p className="text-sm text-center text-gray-400 mt-2">
        Para ajustes personalizados, use a caixa de texto na aba "Retocar".
      </p>
    </div>
  );
};

export default AdjustmentPanel;