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
    baseURL: import.meta.env.VITE_APP_OPENAI_API_BASE2,
    apiKey:import.meta.env.VITE_APP_OPENAI_API_KEY2,
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
const getInfoCompletion = async (token, prompt) =>{
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
              "content": `${prompt}`,
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
// return await generateObject({
//   model: cometaAi('kameta',{structuredOutputs:true}),
//   messages:[{role:'user', content:`что ты знаешь о ${userName}`}],
//   schema:answerSchema,
// })
return info;
}
// const chatInit = [{'role':'system',}]
export function useProphecyGenerator(){

    const [stage, setStage] = useState<ProphecyStage>('introduction')
    const [userName, setUserName] = useState<string>('');
    const [userDesire, setUserDesire] = useState<string>('');
    const [userEnergy, setUserEnergy] = useState<string>('');
    const [pendingInfo, setPendingInfo] = useState<any>(null);
    const [loading, setLoading] = useState(false);


    const systemMessage =`Ты - мистическая предсказательница КА МЕТА. 
  Общайся таинственно, эмоционально и интригующе. 
  Твоя задача - собрать необходимую информацию для создания пророчества.
  для этого тебе нужно узнать у гостя:
  1) его имя и фамилию userName  
  2) заветное желание userDesire
  3) Энергетический источник userEnergy
  текущий статус:
  имя и фамилия: ${userName || 'не известно'} ;
  заветное желание : ${userDesire || 'не известно'} ;
  нергетический источник: ${userEnergy || 'не известно'} ;
  проанализируй сообщение пользователя если он представился сразу или дал иную информацию в следующем сообщении
  добавь эту информацию в соотвествующее поле ответа.
  не забудь в процессе реагировать и овтечать на встречные вопросы пользователя но помни о главной цели
  когда вся информация будет собрана скажи скажи человеку что пророчество готовитсья и спроси его ще что нибудь креативное и в поле done поставь true;
  РЕАГИРУЙ НА ВОПРОСЫ ПОЛЬЗОВАТЕЛЯ!
  СПРАШИВАЙ ПО ОДНОМУ ВОПРОСУ ЗА СООБЩЕНИЕ!
  ВНИМАТЕЛЬНО СЛЕДИ ЗА ИСТОРИЙЕЙ СООБЩЕНИЙ И ХРАНИ КОНТЕКСТ БЕСЕДЫ!

  `
  const prophecyPrompt = useCallback((facts)=>{
    
    return`
    Используя следующую информацию о пользователе и историю сообщений:
    Имя: ${userName}
    Желание: ${userDesire}
    Энергия: ${userEnergy}
    Дополнительные факты: ${facts}
    Создай красивое и детализированное художественное пророчество, которое отражает личность пользователя и использует все дополнительные факты для усиления эффекта если они предоставлены. 
    ВАЖНО: если факты есть то ИСПОЛЬЗУЙ ВСЕ ДОПОЛНИТЕЛОЬНЫЕ ФАКТЫ ДЛЯ УСИЛЕНИЯ ЭФФЕКТА ПРОРОЧЕСТВА!
    Пророчество должно быть вдохновляющим и содержать положительные прогнозы, основанные на предоставленной информации.
    в конце пророчества красиво попрощайся.
`},[userName, userDesire, userEnergy, pendingInfo]);
  const [messages, setMessages] = useState<any[]>([{role:'system', content:systemMessage}]);

const resetState = () =>{
  setUserName('');
  setUserDesire('');
  setUserEnergy('');
  setPendingInfo(null);
  setStage('introduction');
  setMessages([{role:'system', content:systemMessage}])
}
     
const processUserInput = async (input) =>{
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
            model: openai('gpt-4o-mini',  {  structuredOutputs: true}),
            messages: [...messages, {role:'user',content:input},{ role: 'system', content: propmpt }],
            schema:answerSchema
          });
          resetState();
          return prophecy.object.answer;
    
    }

}
return {processUserInput, stage}
}