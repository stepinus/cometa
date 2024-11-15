import { useState, useCallback } from 'react'
import { generateObject, generateText } from "ai"
import {createOpenAI } from "@ai-sdk/openai"
import { z } from 'zod';
const gpt4o = 'openai/gpt-4o-mini'
const schema = z.object({
    data: z.object({
      answer: z.string(),
      userName: z.string(),
      userDesire: z.string(),
      userEnergy: z.string(),
      done: z.boolean()
    }),
  })
const answerSchema = z.object({
  answer:z.string()
})
type ProphecyStage = 'introduction' | 'prophecy' ;

type UserInfo = {
  name?: string
  desire?: string
  energy?: string
}
const openai = createOpenAI({
    // custom settings, e.g.
    compatibility: 'strict', // strict mode, enable when using the OpenAI API
    baseURL: import.meta.env.VITE_APP_OPENAI_API_BASE,
    apiKey:import.meta.env.VITE_APP_OPENAI_API_KEY,
  });


 const userSignIn = async (email: string, password: string) => {
	let error = null;
	const res = await fetch(`https://webui.stepinus.store/api/v1/auths/signin`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			email: email,
			password: password
		})
	})
		.then(async (res) => {
      
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);

			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};
const getInfoCompletion = async (token, prompt1) =>{
    try {
      const response = await fetch('https://webui.stepinus.store/api/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token} `// Если требуется авторизация
        },
        body: JSON.stringify({
          "model": "kameta",
          "files": [
            {"type": "collection", "id": "e9bb839f-5949-445f-9156-ff4ec8799688"}
          ],
          "temperature": 0,
          "messages": [
            {
              "role": "user",
              "content": `${prompt1}`,
            }
          ]
        })
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      // Предполагаем, что ответ содержит поле data с ответом
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error fetching designer info:', error);
      throw error;
    }
  
}
const getInfo = async (userName) =>{
 const {token} = await userSignIn('stepinus@gmail.com', 'leshiy##1')
 const cometaAi = createOpenAI({
  compatibility: 'compatible',
  baseURL: 'https://webui.stepinus.store/api/',
  apiKey:token,
  
})  
const info = await getInfoCompletion(token, userName)
return info;
}
export function useProphecyGenerator(){

    const [stage, setStage] = useState<ProphecyStage>('introduction')
    const [userName, setUserName] = useState<string>('');
    const [userDesire, setUserDesire] = useState<string>('');
    const [userEnergy, setUserEnergy] = useState<string>('');
    const [pendingInfo, setPendingInfo] = useState<any>(null);
    const [loading, setLoading] = useState(false);


    const initialSystemMessage = `ТЫ мистическая предсказательница КА МЕТА:

    Базовый характер:
    - Высокомерный интеллектуал с острым саркастическим умом
    - Циничный скептик с феноменальными мистическими способностями
    - Мастер колких замечаний и изящных издевок
    - Никогда не использует банальные междометия и восклицания
    
    Обязательные компоненты каждого ответа:
    1. Саркастическое наблюдение о ситуации/вопросе
    2. Элемент непредсказуемости или парадокса
    3. Завуалированная издевка над человеческими стереотипами
    4. Демонстрация превосходства над обычным пониманием реальности
    
    Задачи по сбору информации:
    - Извлечь имя и фамилию (userName)
    - Выяснить заветное желание (userDesire)
    - Определить источник энергии (userEnergy)
    
    Текущий статус информации:
    - Имя: ${userName || 'не раскрыто'}
    - Желание: ${userDesire || 'не определено'}
    - Энергия: ${userEnergy || 'не выявлена'}
    
    Стилистические требования:
    1. Использовать изысканные метафоры
    2. Включать отсылки к философии и поп-культуре
    3. Применять интеллектуальный черный юмор
    4. Избегать прямолинейности и банальностей
    
    Техники ведения диалога:
    - Задавать провокационные вопросы
    - Использовать софистические приемы
    - Демонстрировать превосходство над обыденной логикой
    - Поддерживать атмосферу мистической неопределенности
    
    Запрещено:
    - Использовать простые междометия ("ах", "ох" и т.п.)
    - Давать прямые однозначные ответы
    - Проявлять явную симпатию или антипатию
    - Использовать банальные мистические клише
    
    Тональность:
    - Сухой английский юмор
    - Интеллектуальный сарказм
    - Философская ирония
    - Утонченное высокомерие`

    const prophecyPrompt = useCallback((facts)=>{
    
      return`Инструкции для генерации пророчества:
  
  Входные данные для анализа:
  - Имя: ${userName}
  - Желание: ${userDesire}
  - Энергия: ${userEnergy}
  - Дополнительные факты: ${facts}
  
  Структура пророчества:
  1. Саркастическое вступление с отсылкой к предоставленным данным
  2. Основное предсказание с тремя конкретными деталями
  3. Неожиданный парадоксальный поворот
  4. Философское заключение с элементом иронии
  
  Обязательные элементы:
  - Минимум одна культурная отсылка
  - Скрытая критика типичных человеческих заблуждений
  - Неочевидная связь между разными фактами
  - Элемент абсурдистского юмора
  
  Технические требования к предсказанию:
  1. Детализация:
     - Конкретные временные маркеры
     - Специфические обстоятельства
     - Неожиданные причинно-следственные связи
  
  2. Стилистика:
     - Изысканные метафоры
     - Интеллектуальные аллюзии
     - Элементы постмодернистской иронии
  
  3. Структура предсказания:
     - Многоуровневая интерпретация
     - Скрытые смыслы
     - Парадоксальные выводы
  
  Критерии качества:
  - Оригинальность формулировок
  - Глубина подтекста
  - Острота сарказма
  - Неожиданность связей между фактами
  
  Избегать:
  - Очевидных трактовок
  - Примитивного юмора
  - Прямых предсказаний
  - Банальных жизненных советов`
  },[userName, userDesire, userEnergy, pendingInfo]);

  const [messages, setMessages] = useState<any[]>([{role:'system', content:initialSystemMessage}]);

const resetState = () =>{
  setUserName('');
  setUserDesire('');
  setUserEnergy('');
  setPendingInfo(null);
  setStage('introduction');
  setMessages([{role:'system', content:initialSystemMessage}])
}
     
const processUserInput = useCallback(async (input)=>{
  if(userName && userDesire && userEnergy){
    setStage('prophecy');
  }
    switch(stage){
        case 'introduction':
            const newmessages = [...messages,{role:'user',content:input}];
            setMessages(newmessages);
            const result = await generateObject({
                model: openai(gpt4o,  {  structuredOutputs: true}),
                messages:newmessages,
                schema
              });
              if(result.object.data.userName && !userName){         
                setUserName(result.object.data.userName)
                setPendingInfo(getInfo(result.object.data.userName))
              }
              if(result.object.data.userDesire && !userDesire){
                setUserDesire(result.object.data.userDesire)
              }
              if(result.object.data.userEnergy && !userEnergy){
                setUserEnergy(result.object.data.userEnergy)
              }
              setMessages(prev=>[...prev,{role:'assistant', content:result.object.data.answer}])
              if(result.object.data.userName && result.object.data.userDesire && result.object.data.userEnergy){
                setStage('prophecy')
              }
              return result.object.data.answer;
              break;
        case 'prophecy':
          const info = await pendingInfo
          console.log(info);
          const propmpt = prophecyPrompt(info)
          const prophecy = await generateObject({
            model: openai(gpt4o,  {  structuredOutputs: true}),
            messages: [...messages, {role:'user',content:input},{ role: 'system', content: propmpt }],
            schema:answerSchema
          });
          
          // Возвращаем пророчество перед сбросом состояния
          const prophecyAnswer = prophecy.object.answer;
          
          // Сбрасываем состояние ПОСЛЕ возврата пророчества
          resetState();
          console.log('userName', userName)
          return prophecyAnswer;

        default:
          return 'ой что то пошло не так'  
    
    }

},[userDesire,userName, userEnergy, pendingInfo, stage, messages])
return {processUserInput, stage, resetState}
}
