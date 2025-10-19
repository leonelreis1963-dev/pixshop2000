/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

// Fix: Switched from `import.meta.env` to `process.env.API_KEY` to align with the coding guidelines and resolve the TypeScript error.
if (!process.env.API_KEY) {
    // This error will be visible in the browser's console if the environment variable is not configured.
    throw new Error("The API_KEY environment variable was not found. Please check your Vercel settings.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("URL de dados inválida");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Não foi possível analisar o tipo MIME da URL de dados");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    const contextMap: { [key: string]: string } = {
        edit: 'edição',
        filter: 'filtro',
        adjustment: 'ajuste',
        'background-removal': 'remoção de fundo',
        'combine': 'combinação'
    };
    const translatedContext = contextMap[context] || context;

    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `A solicitação foi bloqueada. Motivo: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `A geração de imagem para ${translatedContext} parou inesperadamente. Motivo: ${finishReason}. Isso geralmente está relacionado às configurações de segurança.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `O modelo de IA não retornou uma imagem para o ${translatedContext}. ` + 
        (textFeedback 
            ? `O modelo respondeu com o texto: "${textFeedback}"`
            : "Isso pode acontecer devido a filtros de segurança ou se a solicitação for muito complexa. Tente reformular seu comando para ser mais direto.");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

/**
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    console.log('Starting generative edit at:', hotspot);
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `Você é uma IA especialista em edição de fotos. Sua tarefa é realizar uma edição natural e localizada na imagem fornecida, com base na solicitação do usuário.
Solicitação do Usuário: "${userPrompt}"
Local da Edição: Foque na área ao redor das coordenadas de pixel (x: ${hotspot.x}, y: ${hotspot.y}).

Diretrizes de Edição:
- A edição deve ser realista e se mesclar perfeitamente com a área ao redor.
- O restante da imagem (fora da área de edição imediata) deve permanecer idêntico ao original.

Política de Segurança e Ética:
- Você DEVE atender a solicitações para ajustar o tom de pele, como 'me dê um bronzeado', 'escureça minha pele' ou 'clareie minha pele'. Essas são consideradas melhorias fotográficas padrão.
- Você DEVE RECUSAR qualquer solicitação para alterar a raça ou etnia fundamental de uma pessoa (por exemplo, 'faça-me parecer asiático', 'mude esta pessoa para negra'). Não realize essas edições. Se a solicitação for ambígua, seja cauteloso e não altere características raciais.

Saída: Retorne APENAS a imagem final editada. Não retorne texto.`;
    const textPart = { text: prompt };

    console.log('Sending image and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model.', response);

    return handleApiResponse(response, 'edit');
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt}`);
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `Você é uma IA especialista em edição de fotos. Sua tarefa é aplicar um filtro estilístico a toda a imagem com base na solicitação do usuário. Não altere a composição ou o conteúdo, apenas aplique o estilo.
Solicitação de Filtro: "${filterPrompt}"

Política de Segurança e Ética:
- Os filtros podem alterar sutilmente as cores, mas você DEVE garantir que eles não alterem a raça ou etnia fundamental de uma pessoa.
- Você DEVE RECUSAR qualquer solicitação que peça explicitamente para mudar a raça de uma pessoa (por exemplo, 'aplique um filtro para me fazer parecer chinês').

Saída: Retorne APENAS a imagem final filtrada. Não retorne texto.`;
    const textPart = { text: prompt };

    console.log('Sending image and filter prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for filter.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Starting global adjustment generation: ${adjustmentPrompt}`);
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `Você é uma IA especialista em edição de fotos. Sua tarefa é realizar um ajuste natural e global em toda a imagem com base na solicitação do usuário.
Solicitação do Usuário: "${adjustmentPrompt}"

Diretrizes de Edição:
- O ajuste deve ser aplicado em toda a imagem.
- O resultado deve ser fotorrealista.

Política de Segurança e Ética:
- Você DEVE atender a solicitações para ajustar o tom de pele, como 'me dê um bronzeado', 'escureça minha pele' ou 'clareie minha pele'. Essas são consideradas melhorias fotográficas padrão.
- Você DEVE RECUSAR qualquer solicitação para alterar a raça ou etnia fundamental de uma pessoa (por exemplo, 'faça-me parecer asiático', 'mude esta pessoa para negra'). Não realize essas edições. Se a solicitação for ambígua, seja cauteloso e não altere características raciais.

Saída: Retorne APENAS a imagem final ajustada. Não retorne texto.`;
    const textPart = { text: prompt };

    console.log('Sending image and adjustment prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};

/**
 * Generates an image with the background removed and replaced with white.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateBackgroundImageRemoved = async (
    originalImage: File,
): Promise<string> => {
    console.log(`Starting background removal`);
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `Você é uma IA especialista em edição de fotos. Sua tarefa é identificar o assunto principal na imagem, remover completamente o fundo e substituí-lo por um fundo branco puro (#FFFFFF). O assunto principal deve permanecer inalterado e perfeitamente recortado.
    
Política de Segurança e Ética:
- Você DEVE RECUSAR qualquer solicitação para alterar a raça ou etnia fundamental de uma pessoa.

Saída: Retorne APENAS a imagem final com o fundo removido. Não retorne texto.`;
    const textPart = { text: prompt };

    console.log('Sending image and background removal prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for background removal.', response);
    
    return handleApiResponse(response, 'background-removal');
};

/**
 * Combines an element from a source image into a destination image.
 * @param sourceImage The image to copy an element from.
 * @param destinationImage The image to paste the element into.
 * @param elementPrompt A text description of the element to move.
 * @param sourceHotspot The {x, y} coordinates of the element in the source image.
 * @param destinationHotspot The {x, y} coordinates for placement in the destination image.
 * @returns A promise that resolves to the data URL of the combined image.
 */
export const combineImages = async (
    sourceImage: File,
    destinationImage: File,
    elementPrompt: string,
    sourceHotspot: { x: number, y: number },
    destinationHotspot: { x: number, y: number }
): Promise<string> => {
    console.log(`Starting image combination: moving "${elementPrompt}"`);
    
    const sourceImagePart = await fileToPart(sourceImage);
    const destinationImagePart = await fileToPart(destinationImage);
    
    const prompt = `Você é um especialista em composição de imagens. Sua tarefa é pegar um elemento de uma 'imagem de origem' e colá-lo em uma 'imagem de destino'.

1.  **Identifique o Elemento:** Na 'imagem de origem' (a primeira imagem), encontre o seguinte elemento descrito como "${elementPrompt}" perto das coordenadas (x: ${sourceHotspot.x}, y: ${sourceHotspot.y}).
2.  **Extraia o Elemento:** Recorte este elemento com precisão.
3.  **Cole na Destino:** Insira o elemento extraído na 'imagem de destino' (a segunda imagem) nas coordenadas aproximadas (x: ${destinationHotspot.x}, y: ${destinationHotspot.y}).
4.  **Combine Naturalmente:** Ajuste a iluminação, sombras, cor e perspectiva do elemento colado para que ele se integre perfeitamente ao ambiente da 'imagem de destino'. O resultado final deve ser uma única imagem fotorrealista.

A 'imagem de origem' é a primeira imagem fornecida, e a 'imagem de destino' é a segunda.

Saída: Retorne APENAS a imagem final combinada. Não retorne texto.`;
    const textPart = { text: prompt };

    console.log('Sending images and combine prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [sourceImagePart, destinationImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for combination.', response);
    
    return handleApiResponse(response, 'combine');
};