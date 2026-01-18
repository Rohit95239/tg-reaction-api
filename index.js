import fetch from "node-fetch"

const TOKEN="8586460757:AAGX9K3yT-44wXNkPHD5IEQ79UsqM7QG7m4"
const DB="https://tg-token-finder-default-rtdb.firebaseio.com"

const ALL=["👍","👎","❤","🔥","🥰","👏","😁","🤔","🤯","😱","🤬","😢","🎉","🤩","🤮","💩","🙏","👌","🕊","🤡","🥱","🥴","😍","🐳","❤‍🔥","🌚","🌭","💯","🤣","⚡","🍌","🏆","💔","🤨","😐","🍓","🍾","💋","🖕","😈","😴","😭","🤓","👻","👨‍💻","👀","🎃","🙈","😇","😨","🤝","✍","🤗","🫡","🎅","🎄","☃","💅","🤪","🗿","🆒","💘","🙉","🦄","😘","💊","🙊","😎","👾","🤷‍♂","🤷","🤷‍♀","😡"]
const POS=ALL.filter(e=>!["👎","🤬","💔","🤮","💩","🖕","😡"].includes(e))
const NEG=["👎","🤬","💔","🤮","💩","😡","😢","😭"]

const api=(t,m,d)=>fetch("https://api.telegram.org/bot"+t+"/"+m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)})
const get=p=>fetch(DB+p+".json").then(r=>r.json())
const set=(p,d)=>fetch(DB+p+".json",{method:"PUT",body:JSON.stringify(d)})
const del=p=>fetch(DB+p+".json",{method:"DELETE"})

const pick=a=>a[Math.floor(Math.random()*a.length)]
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
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,text:
   "🤖 Reaction Control Panel\n\nUse buttons to configure\n\n/add <bot_token>\n/remove <bot_token>",
   reply_markup:{inline_keyboard:[
    [{text:"🎭 Mode",callback_data:"sec_mode"}],
    [{text:"⚙ Filters",callback_data:"sec_filter"}],
    [{text:"⏱ Timing",callback_data:"sec_time"}],
    [{text:"🎯 Smart Rules",callback_data:"sec_smart"}],
    [{text:"♻ Reset",callback_data:"reset"}]
   ]}})
  }

  if(t.startsWith("/add ")){
   const bt=t.split(" ")[1]
   if(bt){
    await set("/bots/"+bt.replace(/\W/g,""),{token:bt})
    await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,text:"✅ Bot added"})
   }
  }

  if(t.startsWith("/remove ")){
   const bt=t.split(" ")[1]
   if(bt){
    await del("/bots/"+bt.replace(/\W/g,""))
    await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,text:"❌ Bot removed"})
   }
  }

  if(t==="/test"){
   const l=await get("/last")
   if(l){
    const bots=await get("/bots")||{}
    await react(TOKEN,l.chat,l.msg,[pick(POS)])
    for(const k in bots)await react(bots[k].token,l.chat,l.msg,[pick(POS)])
   }
  }
 }

 if(u.callback_query){
  const q=u.callback_query
  const c=q.message.chat.id
  const m=q.message.message_id

  if(q.data==="sec_mode"){
   await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,text:
   "🎭 Reaction Mode",
   reply_markup:{inline_keyboard:[
    [{text:"😊 Positive",callback_data:"mode_pos"}],
    [{text:"😈 Negative",callback_data:"mode_neg"}],
    [{text:"🎭 Mixed",callback_data:"mode_mix"}]
   ]}})
  }

  if(q.data==="sec_filter"){
   await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,text:
   "⚙ Filters",
   reply_markup:{inline_keyboard:[
    [{text:"📝 Text Only",callback_data:"f_text"}],
    [{text:"🖼 Media Only",callback_data:"f_media"}],
    [{text:"📊 Skip Polls",callback_data:"f_poll"}],
    [{text:"🔁 Skip Forwards",callback_data:"f_fwd"}]
   ]}})
  }

  if(q.data==="sec_time"){
   await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,text:
   "⏱ Timing",
   reply_markup:{inline_keyboard:[
    [{text:"🌙 Night Mode",callback_data:"t_night"}],
    [{text:"🎲 Probability",callback_data:"t_prob"}],
    [{text:"⏳ Delay",callback_data:"t_delay"}]
   ]}})
  }

  if(q.data==="sec_smart"){
   await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,text:
   "🎯 Smart Rules",
   reply_markup:{inline_keyboard:[
    [{text:"#️⃣ Hashtag",callback_data:"s_hash"}],
    [{text:"🔗 Link",callback_data:"s_link"}],
    [{text:"📏 Length",callback_data:"s_len"}],
    [{text:"📌 Pinned Boost",callback_data:"s_pin"}]
   ]}})
  }

  if(q.data.startsWith("mode_")){
   await set("/channels/"+c+"/mode",q.data.split("_")[1])
   await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,text:"✅ Mode updated"})
  }

  if(q.data==="reset"){
   await del("/channels/"+c)
   await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,text:"♻ All settings reset"})
  }

  if(q.data.startsWith("f_")||q.data.startsWith("t_")||q.data.startsWith("s_")){
   await set("/channels/"+c+"/"+q.data,true)
   await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,text:"✅ Setting enabled"})
  }
 }

 if(u.channel_post){
  const p=u.channel_post
  const chat=p.chat.id
  const msg=p.message_id
  const cfg=await get("/channels/"+chat)||{}
  const txt=p.text||""
  const bots=await get("/bots")||{}

  if(cfg.t_night && new Date().getHours()<6)return res.end("OK")
  if(cfg.f_text && !p.text)return res.end("OK")
  if(cfg.f_media && !p.photo && !p.video)return res.end("OK")
  if(cfg.f_poll && p.poll)return res.end("OK")
  if(cfg.f_fwd && p.forward_from)return res.end("OK")
  if(cfg.t_prob && Math.random()>0.5)return res.end("OK")

  let pack=cfg.mode==="neg"?NEG:cfg.mode==="pos"?POS:[...POS,...NEG]
  if(cfg.s_link && /http/.test(txt))pack=["🔗","🌐","⚡"]
  if(cfg.s_hash && /#/.test(txt))pack=["🏷","🔥","📢"]
  if(cfg.s_len && txt.length>200)pack=["📝","🤓","👀"]
  if(cfg.s_pin && p.pinned_message)pack.push("🚀")

  if(cfg.t_delay)await sleep(2000)

  await react(TOKEN,chat,msg,[pick(pack)])
  for(const k in bots)await react(bots[k].token,chat,msg,[pick(pack)])

  await set("/last",{chat,msg})
 }

 res.json({ok:true})
}
