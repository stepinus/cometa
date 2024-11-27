import { useState, useCallback, useEffect, useRef } from 'react'
import { initialMessage, makeProphecyMessage, makeProphecyPrompt } from './prophecy/prompts';
import { generateObject, generateText } from "ai"
import {createOpenAI } from "@ai-sdk/openai"
import { z } from 'zod';
const gpt4o = import.meta.env.VITE_APP_MODEL;



const intelligentCollectionSchema =  z.object({
      response: z.string().nullish(),
      traits: z.string().array(),
      command: z.string().nullish(),
      name: z.string().nullish(),
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
    const [maxCount, setMaxCount] = useState<number>(6)
    const [stage, setStage] = useState<ProphecyStage>('introduction');
    const [pendingInfo, setPendingInfo] = useState<any>(null);
    const [userName, setUserName] = useState<string>('');
    const [traits, setTraits] = useState<string[]>([]);
    const [messages, setMessages] = useState<any[]>([initialMessage]);
    const [summary, setSummary] = useState<string>('');
    const [count, setCount] = useState<number>(maxCount);
    const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

    const resetState = () =>{
        if (inactivityTimer.current) {
            clearTimeout(inactivityTimer.current);
            inactivityTimer.current = null;
        }
        setPendingInfo(null);
        setStage('introduction');
        setMessages([initialMessage])
        setUserName('');
        setTraits([]);
        setSummary('');
        setCount(maxCount)
    }
     
const processUserInput = useCallback(async (input)=>{
  // Reset inactivity timer
  if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
  }
  inactivityTimer.current = setTimeout(() => {
      resetState();
  }, 5 * 60 * 1000); // 5 minutes in milliseconds

  console.log('count', count)
  if(stage === 'introduction' && count > 0){ 
   const updatedMessages = messages.map((message, i)=>(i === 0 ? {role:'system',content: message.content + `\n ВНИМАНИЕ!!! ВАЖНАЯ ИНФОРМАЦИЯ : У ТЕБЯ ОСТАЛОСЬ ${count} ВОПРОСОВ! . ВЫЯВЛЕННЫЕ ЧЕРТЫ ХАРАКТЕРА: ${traits.join(',')}, ИМЯ СОБЕСЕДНИКА: ${userName}` } : message));
    const newMessages = [...updatedMessages,{role:'user',content:input}];
    setMessages(newMessages);
    const result = await generateObject({
      model: openai(gpt4o),
      messages: newMessages,
      schema :intelligentCollectionSchema,
      temperature: 0.8,
      frequencyPenalty: 0.9,
      presencePenalty: 0.9,
    });

    setCount(prev=>prev-1);

      if(result.object.name && !pendingInfo && !userName){
        setPendingInfo(getInfo(result.object.name));
        setUserName(result.object.name)
        if(count < 2) setCount(2);
      }

      if(result.object.traits){
        setTraits(result.object.traits)
        console.log(traits.join(', '))
      }
      if(result.object.command === 'reset'){
        resetState();
      }
      if(result.object.command === 'change_name'){
        if(result.object.name){
          setUserName(result.object.name as string)
          setPendingInfo(getInfo(result.object.name));
        }
      }
      if(result.object.command?.includes('max_questions')){
        const splitted = result.object.command.split('_')
        setMaxCount(+splitted[2])
        setCount(+splitted[2])
      }
      if(result.object.command === 'prophecy'){
        setStage('prophecy');
        setCount(0);
      }
      setMessages(prev=>[...prev,{role:'assistant',content:result.object.response}])

      return {
        text: result.object.response,
        isLastProphecy: false
      };
  }
  if (stage === 'prophecy' || count <= 0){
    const facts = await pendingInfo
    const prophecyMessages = messages.map((message,i)=> i===0 ? makeProphecyMessage(userName, traits,facts,summary) : message)
    const prophecy = await generateObject({
      model: openai(gpt4o),
      messages: [...prophecyMessages, {role:'user',content:input}],
      schema:prophecySchema,
      temperature: 0.6,
      frequencyPenalty: 1.5,
      presencePenalty: 1.5,
      maxTokens:4000,
    });

    const prophecyAnswer = prophecy.object.response;
    console.log('prophecyAnswer', prophecyAnswer)
        resetState();
    return {
      text: prophecyAnswer,
      isLastProphecy: true
    };
  }
  resetState();
  return {
    text: 'ошибка',
    isLastProphecy: false
  };
},[pendingInfo, stage, messages, count, userName, maxCount, traits, summary])



useEffect(()=>{
  setCount(maxCount)
  // Clear timer on component unmount
  return () => {
      if (inactivityTimer.current) {
          clearTimeout(inactivityTimer.current);
      }
  }
},[])
return {processUserInput, stage, resetState}
}
