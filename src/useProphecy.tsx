import { useState, useCallback, useEffect } from 'react'
import { initialMessage, makeProphecyMessage, makeProphecyPrompt } from './prophecy/prompts';
import { generateObject, generateText } from "ai"
import {createOpenAI } from "@ai-sdk/openai"
import { z } from 'zod';
import { set } from 'lodash';
const gpt4o = 'anthropic/claude-3-5-haiku'



const intelligentCollectionSchema =  z.object({
      response: z.string().nullish(),
      traits: z.string().array(),
      command: z.string().nullish(),
      name: z.string().nullish(),
      summary: z.string().nullish()
    })
const prophecySchema = z.object({
    response: z.string(),
})  
type ProphecyStage = 'introduction' | 'prophecy' ;

const openai = createOpenAI({
    compatibility: 'compatible', // strict mode, enable when using the OpenAI API
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
    const [stage, setStage] = useState<ProphecyStage>('prophecy')
    const [pendingInfo, setPendingInfo] = useState<any>(null);
    const [userName, setUserName] = useState<string>('');
    const [traits, setTraits] = useState<string[]>([]);
    const [messages, setMessages] = useState<any[]>([initialMessage]);
    const [summary, setSummary] = useState<string>('');
    const [count, setCount] = useState<number>(maxCount);

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
  console.log('input', stage)
  if (count<0) setStage('prophecy');
  if(stage === 'introduction') { 
    const countMessage = {role:'system',content:`осталось вопросов ${count} , узнанная информация о собеседнике: ${traits.join(', ')}`};
    const newMessages = [...messages,countMessage,{role:'user',content:input}];
    setMessages(newMessages);
    const result = await generateObject({
      model: openai(gpt4o),
      messages: newMessages,
      schema :intelligentCollectionSchema,
      temperature: 0.7,
      frequencyPenalty: 0.8,
      presencePenalty: 0.8,
    });
      if(result.object.name && !pendingInfo){
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
      if(result.object.command === 'skip'){
        setCount(prev=>prev+1)
        return ''
      }
      if(result.object.command?.includes('max_questions')){
        const splitted = result.object.command.split('_')
        setMaxCount(+splitted[2])
        setCount(+splitted[2])
      }
      if(result.object.command === 'prophecy'){
        setStage('prophecy')
        console.log('смена стадии!')
      }
      setMessages(prev=>[...prev,{role:'assistant',content:result.object.response}])
      setCount(prev=>prev-1);

      return result.object.response;
  }
  if (stage === 'prophecy' || count < 0){
    const facts = await pendingInfo
    const prophecyMessage = makeProphecyMessage(userName, traits,facts,summary)
    console.log('prophecyMessage', prophecyMessage)
    const prophecy = await generateObject({
      model: openai(gpt4o),
      messages: [prophecyMessage, {role:'user',content:input}],
      schema:prophecySchema,
      temperature: 0.6,
      frequencyPenalty: 1.5,
      presencePenalty: 1.5,
      maxTokens:4000,
    });
    // Возвращаем пророчество перед сбросом состояния
    console.log('prophecyAnswer', prophecy)

    const prophecyAnswer = prophecy.object.response;
    console.log('prophecyAnswer', prophecyAnswer)
        resetState();
    return prophecyAnswer
  }
  resetState()
  return 'ошибка'
},[pendingInfo, stage, messages, count, userName, maxCount, traits, summary])



useEffect(()=>{
  setCount(maxCount)
},[])
return {processUserInput, stage, resetState}
}
