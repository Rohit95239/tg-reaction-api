import fetch from "node-fetch"

const TOKEN="8586460757:AAGX9K3yT-44wXNkPHD5IEQ79UsqM7QG7m4"
const DB="https://tg-token-finder-default-rtdb.firebaseio.com"

const POS=["👍","❤","🔥","🥰","👏","😁","🎉","🤩","💯","⚡","😍","🙏","👌","🏆"]
const NEG=["👎","🤬","💔","🤮","💩","😡","😢","😭","🤡","🖕"]

const api=(t,m,d)=>fetch("https://api.telegram.org/bot"+t+"/"+m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)})
const get=p=>fetch(DB+p+".json").then(r=>r.json())
const set=(p,d)=>fetch(DB+p+".json",{method:"PATCH",body:JSON.stringify(d)})
const del=p=>fetch(DB+p+".json",{method:"DELETE"})
const pick=a=>a[Math.floor(Math.random()*a.length)]
const sleep=m=>new Promise(r=>setTimeout(r,m))

const react=(t,c,m,e)=>fetch("https://api.telegram.org/bot"+t+"/setMessageReaction",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:c,message_id:m,reaction:e.map(x=>({type:"emoji",emoji:x}))})})

const menu={
 inline_keyboard:[
  [{text:"▶ Enable",callback_data:"enable"},{text:"⏸ Pause",callback_data:"pause"}],
  [{text:"🎭 Mode",callback_data:"mode"},{text:"⚙ Filters",callback_data:"filter"}],
  [{text:"⏱ Timing",callback_data:"time"},{text:"🔁 Control",callback_data:"control"}],
  [{text:"📊 Status",callback_data:"status"},{text:"🧪 Test",callback_data:"test"}]
 ]
}

export default async(req,res)=>{
 if(req.method!=="POST")return res.end("OK")
 const u=req.body

 if(u.message){
  const c=u.message.chat.id
  const mid=u.message.message_id
  const txt=u.message.text||""
  const reply=u.message.reply_to_message?.text||""

  if(txt==="/start"){
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,parse_mode:"HTML",text:
   "<b>🤖 Reaction Manager</b>\n\nReactions are <b>disabled</b> by default.\nEnable the bot to start automatic reactions.\n\nUse the panel below 👇",reply_markup:menu})
  }

  if(txt.startsWith("/add ")){
   const t=txt.split(" ")[1]
   if(t)await set("/bots/"+t.replace(/\W/g,""),{token:t})
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,parse_mode:"HTML",text:"<b>✅ Bot added</b>\n\nThis bot will also react when enabled."})
  }

  if(txt.startsWith("/remove ")){
   const t=txt.split(" ")[1]
   if(t)await del("/bots/"+t.replace(/\W/g,""))
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,parse_mode:"HTML",text:"<b>❌ Bot removed</b>"})
  }

  if(reply==="⏳ Enter reaction delay (seconds)"){
   await set("/channels/"+c,{delay:parseInt(txt)*1000})
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,parse_mode:"HTML",text:"<b>✅ Delay saved</b>",reply_markup:menu})
  }

  if(reply==="🎲 Enter reaction probability (0-100)"){
   await set("/channels/"+c,{prob:parseInt(txt)})
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,parse_mode:"HTML",text:"<b>✅ Probability saved</b>",reply_markup:menu})
  }

  if(reply==="🔢 Enter reaction count (1-5)"){
   await set("/channels/"+c,{count:Math.max(1,Math.min(5,parseInt(txt)))})
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,parse_mode:"HTML",text:"<b>✅ Reaction count saved</b>",reply_markup:menu})
  }
 }

 if(u.callback_query){
  const q=u.callback_query
  const c=q.message.chat.id
  const m=q.message.message_id
  const d=q.data

  const alert=t=>api(TOKEN,"answerCallbackQuery",{callback_query_id:q.id,text:t,show_alert:true})

  if(d==="enable"){
   await set("/channels/"+c,{enabled:true})
   await alert("Reactions enabled")
   await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:"▶ <b>Bot Enabled</b>",reply_markup:menu})
  }

  if(d==="pause"){
   await set("/channels/"+c,{enabled:false})
   await alert("Reactions paused")
   await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:"⏸ <b>Bot Paused</b>\n\nNo reactions will be sent.",reply_markup:menu})
  }

  if(d==="mode"){
   await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:"🎭 <b>Reaction Mode</b>",reply_markup:{
    inline_keyboard:[
     [{text:"😊 Positive",callback_data:"mode_pos"},{text:"😈 Negative",callback_data:"mode_neg"}],
     [{text:"🎭 Mixed",callback_data:"mode_mix"}],
     [{text:"⬅ Back",callback_data:"back"}]
    ]
   }})
  }

  if(d.startsWith("mode_")){
   await set("/channels/"+c,{mode:d.split("_")[1]})
   await alert("Mode updated")
   await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:"<b>✅ Mode saved</b>",reply_markup:menu})
  }

  if(d==="time"){
   await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:"⏱ <b>Timing Settings</b>",reply_markup:{
    inline_keyboard:[
     [{text:"⏳ Delay",callback_data:"set_delay"},{text:"🎲 Probability",callback_data:"set_prob"}],
     [{text:"🔢 Reaction Count",callback_data:"set_count"}],
     [{text:"⬅ Back",callback_data:"back"}]
    ]
   }})
  }

  if(d==="set_delay")await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:m,parse_mode:"HTML",text:"⏳ Enter reaction delay (seconds)",reply_markup:{force_reply:true}})
  if(d==="set_prob")await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:m,parse_mode:"HTML",text:"🎲 Enter reaction probability (0-100)",reply_markup:{force_reply:true}})
  if(d==="set_count")await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:m,parse_mode:"HTML",text:"🔢 Enter reaction count (1-5)",reply_markup:{force_reply:true}})

  if(d==="status"){
   const cfg=await get("/channels/"+c)||{}
   await alert("Status loaded")
   await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:
   "<b>📊 Bot Status</b>\n\n"+
   "Enabled: "+(cfg.enabled?"Yes":"No")+"\n"+
   "Mode: "+(cfg.mode||"Mixed")+"\n"+
   "Delay: "+((cfg.delay||0)/1000)+"s\n"+
   "Probability: "+(cfg.prob||100)+"%\n"+
   "Reactions/Post: "+(cfg.count||1),
   reply_markup:menu})
  }

  if(d==="back"){
   await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:"<b>🤖 Reaction Manager</b>",reply_markup:menu})
  }

  if(d==="test"){
   const cfg=await get("/channels/"+c)||{}
   if(cfg.enabled!==true)return alert("Bot is paused")
   const l=await get("/last")
   const bots=await get("/bots")||{}
   if(l){
    const pack=cfg.mode==="neg"?NEG:cfg.mode==="pos"?POS:[...POS,...NEG]
    const cnt=cfg.count||1
    const emojis=Array.from({length:cnt},()=>pick(pack))
    await react(TOKEN,l.chat,l.msg,emojis)
    for(const k in bots)await react(bots[k].token,l.chat,l.msg,emojis)
   }
  }
 }

 if(u.channel_post){
  const p=u.channel_post
  const chat=p.chat.id
  const msg=p.message_id
  const cfg=await get("/channels/"+chat)||{}
  const bots=await get("/bots")||{}

  if(cfg.enabled!==true)return res.end("OK")
  if(cfg.prob && Math.random()*100>cfg.prob)return res.end("OK")

  if(cfg.delay)await sleep(cfg.delay)

  const pack=cfg.mode==="neg"?NEG:cfg.mode==="pos"?POS:[...POS,...NEG]
  const cnt=cfg.count||1
  const emojis=Array.from({length:cnt},()=>pick(pack))

  try{
   await react(TOKEN,chat,msg,emojis)
   for(const k in bots)await react(bots[k].token,chat,msg,emojis)
  }catch(e){
   await set("/channels/"+chat,{enabled:false})
  }

  await set("/last",{chat,msg})
 }

 res.json({ok:true})
}
