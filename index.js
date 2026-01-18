import fetch from "node-fetch"

const MAIN_TOKEN="8586460757:AAGX9K3yT-44wXNkPHD5IEQ79UsqM7QG7m4"
const DB="https://tg-token-finder-default-rtdb.firebaseio.com"

const ALL=["👍","👎","❤","🔥","🥰","👏","😁","🤔","🤯","😱","🤬","😢","🎉","🤩","🤮","💩","🙏","👌","🕊","🤡","🥱","🥴","😍","🐳","❤‍🔥","🌚","🌭","💯","🤣","⚡","🍌","🏆","💔","🤨","😐","🍓","🍾","💋","🖕","😈","😴","😭","🤓","👻","👨‍💻","👀","🎃","🙈","😇","😨","🤝","✍","🤗","🫡","🎅","🎄","☃","💅","🤪","🗿","🆒","💘","🙉","🦄","😘","💊","🙊","😎","👾","🤷‍♂","🤷","🤷‍♀","😡"]
const POS=ALL.filter(e=>!["👎","🤬","💔","🤮","💩","🖕","😡"].includes(e))
const NEG=["👎","🤬","💔","🤮","💩","😡","😢","😭"]

const api=(token,m,d)=>fetch("https://api.telegram.org/bot"+token+"/"+m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)})
const get=p=>fetch(DB+p+".json").then(r=>r.json())
const set=(p,d)=>fetch(DB+p+".json",{method:"PUT",body:JSON.stringify(d)})
const del=p=>fetch(DB+p+".json",{method:"DELETE"})

const pick=(a,w)=>{
 if(!w)return a[Math.floor(Math.random()*a.length)]
 let s=w.reduce((x,y)=>x+y,0),r=Math.random()*s
 for(let i=0;i<a.length;i++){if(r<w[i])return a[i];r-=w[i]}
 return a[0]
}

const sleep=m=>new Promise(r=>setTimeout(r,m))

const react=(token,c,m,e)=>fetch("https://api.telegram.org/bot"+token+"/setMessageReaction",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:c,message_id:m,reaction:e.map(x=>({type:"emoji",emoji:x}))})})

const mainMenu=async(c,m,text="🤖 Auto Reaction Bot\nSelect feature 👇")=>{
 await api(MAIN_TOKEN,"editMessageText",{chat_id:c,message_id:m,text,reply_markup:{inline_keyboard:[
  [{text:"😊 Reaction Packs",callback_data:"packs"}],
  [{text:"🎛 Filters & Rules",callback_data:"filters"}],
  [{text:"⏱ Timing & Schedule",callback_data:"timing"}],
  [{text:"🛡 Admin Control",callback_data:"admin"}],
  [{text:"♻ Reset All Rules",callback_data:"reset"}]
 ]}})
}

const processReaction=(token,p,cfg)=>{
 let pack=cfg.mode==="neg"?NEG:cfg.mode==="pos"?POS:[...POS,...NEG]
 const txt=p.text||""
 if(/http/.test(txt))pack=["🔗","🌐","⚡"]
 if(/#/.test(txt))pack=["🏷","🔥","📢"]
 if(txt.length>200)pack=["📝","🤓","👀"]
 if(p.pinned_message || p.pinned)pack.push("🚀")
 if(/bad|scam|fake/i.test(txt))pack=NEG
 let count=cfg.multi?Math.floor(Math.random()*4)+2:1
 let chosen=[]
 for(let i=0;i<count;i++)chosen.push(pick(pack,cfg.weight))
 return react(token,p.chat.id,p.message_id,chosen)
}

export default async(req,res)=>{
 if(req.method!=="POST")return res.end("OK")
 const u=req.body

 if(u.message){
  const c=u.message.chat.id
  const t=u.message.text||""

  if(t.startsWith("/add ")){
   const botToken=t.split(" ")[1]
   if(!botToken)return
   let bots=await get("/added_bots")||[]
   if(!bots.includes(botToken))bots.push(botToken)
   await set("/added_bots",bots)
   await api(MAIN_TOKEN,"sendMessage",{chat_id:c,text:"✅ Bot added successfully!",reply_to_message_id:u.message.message_id})
   await api(MAIN_TOKEN,"answerCallbackQuery",{callback_query_id:u.message.message_id,text:"Bot added"})
  }

  if(t.startsWith("/remove ")){
   const botToken=t.split(" ")[1]
   let bots=await get("/added_bots")||[]
   bots=bots.filter(x=>x!==botToken)
   await set("/added_bots",bots)
   await api(MAIN_TOKEN,"sendMessage",{chat_id:c,text:"🗑 Bot removed!",reply_to_message_id:u.message.message_id})
   await api(MAIN_TOKEN,"answerCallbackQuery",{callback_query_id:u.message.message_id,text:"Bot removed"})
  }

  if(t==="/start")await api(MAIN_TOKEN,"sendMessage",{chat_id:c,text:"🤖 Auto Reaction Bot\nSelect feature 👇",reply_markup:{inline_keyboard:[
   [{text:"😊 Reaction Packs",callback_data:"packs"}],
   [{text:"🎛 Filters & Rules",callback_data:"filters"}],
   [{text:"⏱ Timing & Schedule",callback_data:"timing"}],
   [{text:"🛡 Admin Control",callback_data:"admin"}],
   [{text:"♻ Reset All Rules",callback_data:"reset"}]
  ]}})

  if(t==="/test"){
   const l=await get("/last")
   if(l){
    const cfg=await get("/channels/"+l.chat)||{}
    await processReaction(MAIN_TOKEN,l,cfg)
    let bots=await get("/added_bots")||[]
    for(const bot of bots){
     await processReaction(bot,l,cfg)
    }
   }
  }
 }

 if(u.callback_query){
  const q=u.callback_query
  const c=q.message.chat.id
  const m=q.message.message_id
  const cfg=await get("/channels/"+c)||{}

  if(q.data==="back_main")await mainMenu(c,m)
  if(q.data.startsWith("mode_")){
   const mode=q.data.split("_")[1]
   await set("/channels/"+c+"/mode",mode)
   await mainMenu(c,m,"✅ Mode activated: "+mode)
  }
 }

 if(u.channel_post){
  const p=u.channel_post
  const chat=p.chat.id
  const msg=p.message_id
  const cfg=await get("/channels/"+chat)||{}
  if(cfg.disabled)return res.end("OK")
  if(cfg.night && (new Date().getHours()<cfg.night.start||new Date().getHours()>cfg.night.end))return res.end("OK")
  if(cfg.textOnly && !p.text)return res.end("OK")
  if(cfg.mediaOnly && !p.photo && !p.video)return res.end("OK")
  if(cfg.skipPoll && p.poll)return res.end("OK")
  if(cfg.skipForward && p.forward_from)return res.end("OK")
  if(cfg.prob && Math.random()>cfg.prob)return res.end("OK")

  await processReaction(MAIN_TOKEN,p,cfg)
  let bots=await get("/added_bots")||[]
  for(const bot of bots){
   await processReaction(bot,p,cfg)
  }

  await set("/last",{chat,msg})
  await set("/history/"+chat+"/"+msg,{emojis:"sent",time:Date.now()})
 }

 res.json({ok:true})
}
