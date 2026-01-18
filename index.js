import fetch from "node-fetch"

const MAIN_BOT_TOKEN="8586460757:AAGX9K3yT-44wXNkPHD5IEQ79UsqM7QG7m4"
const DB="https://tg-token-finder-default-rtdb.firebaseio.com"

const POS=["👍","❤","🔥","🥰","👏","🎉","💯","😍","🤩","⚡"]
const NEG=["👎","🤬","💔","🤮","💩","😡","😢"]

const api=(t,m,d)=>fetch("https://api.telegram.org/bot"+t+"/"+m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)})
const get=p=>fetch(DB+p+".json").then(r=>r.json())
const set=(p,d)=>fetch(DB+p+".json",{method:"PUT",body:JSON.stringify(d)})
const del=p=>fetch(DB+p+".json",{method:"DELETE"})

const rnd=(a,w)=>{
 if(!w)return a[Math.floor(Math.random()*a.length)]
 let s=w.reduce((x,y)=>x+y,0),r=Math.random()*s
 for(let i=0;i<a.length;i++){if(r<w[i])return a[i];r-=w[i]}
 return a[0]
}

const sleep=m=>new Promise(r=>setTimeout(r,m))

const react=(t,c,m,e)=>fetch("https://api.telegram.org/bot"+t+"/setMessageReaction",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:c,message_id:m,reaction:e.map(x=>({type:"emoji",emoji:x}))})})

export default async(req,res)=>{
 if(req.method!=="POST")return res.end("OK")
 const u=req.body

 if(u.message){
  const c=u.message.chat.id
  const t=u.message.text||""
  const mid=u.message.message_id

  if(t==="/start"){
   await api(MAIN_BOT_TOKEN,"sendMessage",{chat_id:c,text:"Reaction system online",reply_markup:{inline_keyboard:[
    [{text:"Settings",callback_data:"settings"}],
    [{text:"Backup",callback_data:"backup"}],
    [{text:"Reset",callback_data:"reset"}]
   ]}})
  }

  if(t==="/test"){
   const l=await get("/last")
   if(l)await react(MAIN_BOT_TOKEN,l.chat,l.msg,[rnd(POS)])
  }

  if(t.startsWith("/add ")){
   const b=t.split(" ")[1]
   await set("/bots/"+b.replace(/\W/g,""),{token:b})
   await api(MAIN_BOT_TOKEN,"sendMessage",{chat_id:c,text:"Bot added",reply_to_message_id:mid})
  }

  if(t.startsWith("/remove ")){
   const b=t.split(" ")[1]
   await del("/bots/"+b.replace(/\W/g,""))
   await api(MAIN_BOT_TOKEN,"sendMessage",{chat_id:c,text:"Bot removed",reply_to_message_id:mid})
  }
 }

 if(u.callback_query){
  const q=u.callback_query
  const c=q.message.chat.id
  const m=q.message.message_id

  if(q.data==="reset"){
   await del("/channels/"+c)
   await api(MAIN_BOT_TOKEN,"editMessageText",{chat_id:c,message_id:m,text:"All rules cleared"})
  }

  if(q.data==="backup"){
   const cfg=await get("/channels/"+c)||{}
   await api(MAIN_BOT_TOKEN,"editMessageText",{chat_id:c,message_id:m,text:JSON.stringify(cfg)})
  }

  if(q.data==="settings"){
   await api(MAIN_BOT_TOKEN,"editMessageText",{chat_id:c,message_id:m,text:"Configure reactions",reply_markup:{inline_keyboard:[
    [{text:"Positive",callback_data:"pos"}],
    [{text:"Negative",callback_data:"neg"}],
    [{text:"Mixed",callback_data:"mix"}]
   ]}})
  }

  if(["pos","neg","mix"].includes(q.data)){
   await set("/channels/"+c+"/mode",q.data)
   await api(MAIN_BOT_TOKEN,"editMessageText",{chat_id:c,message_id:m,text:"Mode saved"})
  }
 }

 if(u.channel_post){
  const p=u.channel_post
  const chat=p.chat.id
  const msg=p.message_id
  const cfg=await get("/channels/"+chat)||{}
  const bots=await get("/bots")||{}
  const txt=p.text||""

  if(cfg.night && new Date().getHours()<6)return res.end("OK")
  if(cfg.textOnly && !p.text)return res.end("OK")
  if(cfg.mediaOnly && !p.photo && !p.video)return res.end("OK")
  if(cfg.skipPoll && p.poll)return res.end("OK")
  if(cfg.skipForward && p.forward_from)return res.end("OK")
  if(cfg.prob && Math.random()>cfg.prob)return res.end("OK")

  let pack=cfg.mode==="neg"?NEG:cfg.mode==="pos"?POS:[...POS,...NEG]
  if(/http/.test(txt))pack=["🔗","🌐","⚡"]
  if(/#/.test(txt))pack=["🏷","🔥","📢"]
  if(txt.length>200)pack=["📝","👀","🤓"]
  if(p.pinned_message)pack.push("🚀")

  let cnt=cfg.multi?Math.floor(Math.random()*4)+2:1
  let chosen=[]
  for(let i=0;i<cnt;i++)chosen.push(rnd(pack,cfg.weight))

  if(cfg.delay)await sleep(cfg.delay*1000)

  try{
   await react(MAIN_BOT_TOKEN,chat,msg,chosen)
   for(const k in bots)await react(bots[k].token,chat,msg,chosen)
  }catch{await set("/channels/"+chat+"/disabled",true)}

  await set("/last",{chat,msg})
  await set("/history/"+chat+"/"+msg,{emojis:chosen,time:Date.now()})
 }

 res.json({ok:true})
}
