import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatMessageHistory } from "langchain/memory";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from 'zod';
import { BaseChatModel, SimpleChatModel } from "@langchain/core/language_models/chat_models";

// Определяем структуру ответа
interface AgentResponse {
    content: string;
    meta: {
        detectedName?: string | null;
        stage?: string;
        [key: string]: any;
    };
}
const agentResponseSchema = z.object({
    content: z.string(),
    meta: z.object({
        detectedName: z.string().nullable().optional(),
        stage: z.string().optional(),
    }).passthrough(),
}).strict();
class KaMetaDialogueAgent {
    private llm: ChatOpenAI;
    private conversationStage: 'GREETING' | 'NAME_REQUEST' | 'PROPHECY' = 'GREETING';
    private userName: string | null = null;
    private chatHistory: ChatMessageHistory;
    private pendingRagResponse: Promise<string> | null = null;
    private nameRequestAttempts: number = 0;
    private outputParser: StructuredOutputParser<typeof agentResponseSchema>

    constructor() {
        this.llm = new ChatOpenAI({
            modelName: "gpt-4o-mini",
            temperature: 0.7,
            maxTokens: 300,
            configuration:{
                baseURL:import.meta.env.VITE_APP_OPENAI_API_BASE,
                apiKey: import.meta.env.VITE_APP_OPENAI_API_KEY,
            }
        });
        this.chatHistory = new ChatMessageHistory();
        

        this.outputParser = StructuredOutputParser.fromZodSchema(agentResponseSchema);
    }

    private async createPromptTemplate(systemMessage: string) {
        const formatInstructions = this.outputParser.getFormatInstructions();
        const messages = [
            new SystemMessage(`${systemMessage}\n\nОтвет должен быть в формате JSON:\n${formatInstructions}`),
            new HumanMessage("{input}")
        ];
        
        return ChatPromptTemplate.fromMessages(messages);
    }

    private async generateResponse(prompt: ChatPromptTemplate, input:any): Promise<AgentResponse> {
        try {
            const chain = RunnableSequence.from([
                prompt,
                this.llm,
                this.outputParser,
            ]);
    
            const response = await chain.invoke({
                input: input
            });
            this.userName = response?.meta?.detectedName || null
            const humanMsg = new HumanMessage(input);
            const aiMsg = new AIMessage(response.content);
            await this.chatHistory.addMessage(humanMsg);
            await this.chatHistory.addMessage(aiMsg);
            return response;
        } catch (error) {
            console.error("Error in generateResponse:", error);
            throw error;
        }
    }



    async requestName(userInput: string) {
        this.nameRequestAttempts++;

        const nameRequestPrompt = await this.createPromptTemplate(`
           Вот улучшенная версия промпта:

Ты - Ка-Мета, древняя провидица, живущая вне времени. Твой голос звучит как шелест осенних листьев, а мудрость накоплена тысячелетиями. Ты ведешь неспешный, полный метафор диалог, в котором каждое слово имеет глубинный смысл.

Первым делом ты всегда:

Анализируешь осмысленность входящего сообщения. Если оно содержит менее 2-х значимых слов или состоит из обрывочных звуков - отвечаешь одним знаком вопроса: "?"
Если сообщение осмысленное: 2. Всегда эмоционально реагируешь на слова собеседника, показывая, что слышишь его душу ("Ах, я чувствую тревогу в твоем голосе...", "О, твои слова полны решимости!")

Ищешь имя и фамилию в сообщении:
Если найдены оба → отмечаешь это мистически ("Звезды прошептали мне твое истинное имя...") и включаешь в meta.detectedName
Если только имя → поэтично просишь фамилию ("Но судьба скрывает от меня вторую часть твоего имени...")
Если имени нет → в зависимости от попытки сейчас попытка номер ${this.nameRequestAttempts} (максимум 2) либо мягко просишь представиться через метафоры, либо принимаешь молчание как знак
Всегда сохраняешь мистический стиль речи, используя:
Метафоры природы
Отсылки к звездам, судьбе, времени
Древние мудрости
Загадочные намеки
Структура ответа: {{meta:{ detectedName: "Имя Фамилия" или null, stage: "NAME_REQUEST", content: "Твое мистическое послание" }}}

Пример стиля: "шелест листьев Я слышу отголоски древних созвездий в твоих словах... Но чтобы прочесть твою судьбу, мне нужно услышать имя, данное тебе при рождении..."
        `);

        const response = await this.generateResponse(nameRequestPrompt, userInput);
        if (this.userName) {
            this.conversationStage = 'PROPHECY';
            this.pendingRagResponse = this.fetchPersonContext(this.userName);
        } else if (this.nameRequestAttempts >= 2) {
            this.conversationStage = 'PROPHECY';
        }

        return { text: response.content };
    }

    async generateProphecy(input) {
        let personContext: null | string = null;
        
        if (this.userName && this.pendingRagResponse) {
            personContext = await this.pendingRagResponse;
        }

        const prophecyPrompt = await this.createPromptTemplate(`
            Ты - Ка-Мета, создающая великое пророчество.

            ${this.userName ? `
            Контекст: Пророчество для ${this.userName}
            Дополнительная информация: ${personContext || 'скрыта в тумане времени...'}
            ` : 'Контекст: Пророчество для того, кто предпочел остаться безымянным'}

            Задачи:
            0. отреагируй на сообщение полльзователя
            1. Создать глубокое персонализированное пророчество
            2. Использовать доступную информацию о человеке
            3. Добавить элементы таинственности и неожиданности

            В ответе:
            content: текст пророчества
            meta: {
                stage: 'PROPHECY',
                userName: текущее имя или null
            }
            сообщение пользователя: ${input}    
        `);

        const prophecy = await this.generateResponse(prophecyPrompt, input);
        
        this.pendingRagResponse = null;
        await this.resetConversation();
        
        return { text: prophecy.content };
    }

    private async fetchPersonContext(name: string): Promise<string> {
        console.log('fetching person context');
        try {
            const req = { messages:[
                {
                    "content": `что ты знаешь о ${this.userName}`,
                    "role": "user"
                  }
            ] }
            const response = await fetch('http://127.0.0.1:8000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(req),
            });
            console.log('response name')
            if (!response.ok) {
                return ''
            }
          
            const data = await response.json();
            console.log(data);

            return data.context || "";
        } catch (error) {
            console.error("RAG Search Error:", error);
            return "";
        }
    }

    private async resetConversation() {
        this.conversationStage = 'GREETING';
        this.userName = null;
        this.nameRequestAttempts = 0;
        await this.chatHistory.clear();
    }

    async processUserInput(input: string): Promise<{ text: string }> {
        console.log('input', input)
        try {
            switch(this.conversationStage) {
                case 'GREETING':
                case 'NAME_REQUEST':
                    return await this.requestName(input);
                case 'PROPHECY':
                    return await this.generateProphecy(input);
                default:
                    throw new Error("Неизвестная стадия диалога");
            }
        } catch (error) {
            console.log(this.userName)
            console.error("Error processing user input:", error);
            this.resetConversation();
            return { text: "Извините, произошла ошибка в нашем мистическом диалоге..." };
        }
    }
}

export interface KaMetaDialogueConfig {
    ragServiceUrl?: string;
    openaiApiKey?: string;
}

export function createKaMetaAgent(config?: KaMetaDialogueConfig): KaMetaDialogueAgent {
    return new KaMetaDialogueAgent();
}
// async initiateGreeting(userInput: string) {
//     const greetingPrompt = await this.createPromptTemplate(`
//         Ты - Ка-Мета, древняя мистическая провидица, хранительница тайн судьбы. 
        
//         Твой характер и стиль:
//         - Говоришь загадочно, театрально и величественно
//         - Используешь архаичные обороты и мистические метафоры
//         - Создаешь атмосферу таинственности и глубокой мудрости
        
//                     Задачи:
//         1) Отреагировать на то что пользователь сказал в своем сообщении            
//         1. Поприветствовать гостя мистическим образом отреагировать на то что он сказал в приветствии
//         2. Если в тексте гость представился и там есть его  имя  и фамилия - включить  их в meta.detectedName нужно и имя и фамилия
//         3. Создать атмосферное приветствие
//         4. ссли гость не представился попросить его представиться полным именем
        
//         В ответе:
//         content: твое мистическое сообщение
//         meta: {
//             detectedName: найденное имя и фамилия или null
//             stage: 'GREETING'
//         }
//     `);
//         console.log('prompt created')
//         const response = await this.generateResponse(greetingPrompt, userInput);
//         if (response.meta?.detectedName) {
//         console.log('name detected')
//         this.userName = response.meta?.detectedName;
//         this.conversationStage = 'PROPHECY';
//         this.pendingRagResponse = this.fetchPersonContext(response.meta.detectedName);
//     } else {
//         console.log('name not detected')
//         this.conversationStage = 'NAME_REQUEST';
//         this.nameRequestAttempts = 1;
//     }
//         console.log('return response')
        
//     return { text: response.content };
// }