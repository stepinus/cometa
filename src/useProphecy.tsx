import { useState, useCallback, useEffect } from 'react'
import { initialMessage, makeProphecyMessage, makeProphecyPrompt } from './prophecy/prompts';
import { generateObject, generateText } from "ai"
import {createOpenAI } from "@ai-sdk/openai"
import { z } from 'zod';
import { set } from 'lodash';
const gpt4o = 'openai/gpt-4o-mini'



const intelligentCollectionSchema =  z.object({
      response: z.string(),
      traits: z.string().array(),
      command: z.string(),
      name: z.string(),
      summary: z.string()
    })
const prophecySchema = z.object({
    response: z.string(),
})  
type ProphecyStage = 'introduction' | 'prophecy' ;

const openai = createOpenAI({
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
const info = await getInfoCompletion(token, userName)
return info;
}
export function useProphecyGenerator(){
    const [maxCount, setMaxCount] = useState<number>(5)
    const [stage, setStage] = useState<ProphecyStage>('introduction')
    const [pendingInfo, setPendingInfo] = useState<any>(null);
    const [userName, setUserName] = useState<string>('');
    const [traits, setTraits] = useState<string[]>([]);
    const [messages, setMessages] = useState<any[]>([initialMessage]);
    const [summary, setSummary] = useState<string>('');
    const [count, setCount] = useState<number>(0);

    const resetState = () =>{
        setPendingInfo(null);
        setStage('introduction');
        setMessages([initialMessage])
        setUserName('');
        setTraits([]);
        setSummary('');
        setCount(maxCount)
   
      }
     
const processUserInput = useCallback(async (input)=>{
  if(stage === 'introduction' && count > 0) { 
    const countMessage = {role:'system',content:`осталось вопросов ${count} , узнанная информация о собеседнике: ${traits.join(', ')}`};
    const newMessages = [...messages,countMessage,{role:'user',content:input}];
    console.log(newMessages)
    setMessages(newMessages);
    const result = await generateObject({
      model: openai(gpt4o, { structuredOutputs: true }),
      messages: newMessages,
      schema :intelligentCollectionSchema,
      temperature: 0.8,
      frequencyPenalty: 0.8,
      presencePenalty: 0.8,
    });
    setCount(prev=>prev-1);

    setMessages(prev=>[...prev,{role:'assistant',content:result.object.response}])
      console.log(result.object)
      if(result.object.name || !pendingInfo){
        setPendingInfo(getInfo(result.object.name));
      }
      if(result.object.traits){
        setTraits(result.object.traits)
      }
      if(result.object.command === 'reset'){
        resetState();
      }
      if(result.object.command.includes('max_questions')){
        const splitted = result.object.command.split('_')
        setMaxCount(+splitted[2])
      }
      if(result.object.command === 'prophecy'){
        setStage('prophecy')
      }
      return result.object.response;

  }
  if (stage === 'prophecy'){
    const facts = await pendingInfo
    const prophecyMessage = makeProphecyMessage(userName, traits,facts,summary)
    const prophecy = await generateObject({
      model: openai('openai/gpt-4o',  {  structuredOutputs: true}),
      messages: [prophecyMessage, {role:'user',content:input}],
      schema:prophecySchema,
      temperature: 0.8,
      frequencyPenalty: 0.8,
      presencePenalty: 0.8,
    });
    // Возвращаем пророчество перед сбросом состояния
    const prophecyAnswer = prophecy.object.response;
    
    // Сбрасываем состояние ПОСЛЕ возврата пророчества
    resetState();
    console.log('userName', userName)
    return prophecyAnswer
  }
  resetState()
  return 'ошибка'
}
    

,[pendingInfo, stage, messages, count])



useEffect(()=>{
  setCount(maxCount)
},[])
return {processUserInput, stage, resetState}
}
