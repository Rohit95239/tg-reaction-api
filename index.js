import fetch from "node-fetch"

const TOKEN="8586460757:AAGX9K3yT-44wXNkPHD5IEQ79UsqM7QG7m4"
const DB="https://tg-token-finder-default-rtdb.firebaseio.com"

const ALL=["👍","👎","❤","🔥","🥰","👏","😁","🤔","🤯","😱","🤬","😢","🎉","🤩","🤮","💩","🙏","👌","🕊","🤡","🥱","🥴","😍","🐳","❤‍🔥","🌚","🌭","💯","🤣","⚡","🍌","🏆","💔","🤨","😐","🍓","🍾","💋","🖕","😈","😴","😭","🤓","👻","👨‍💻","👀","🎃","🙈","😇","😨","🤝","✍","🤗","🫡","🎅","🎄","☃","💅","🤪","🗿","🆒","💘","🙉","🦄","😘","💊","🙊","😎","👾","🤷‍♂","🤷","🤷‍♀","😡"]
const POS=ALL.filter(e=>!["👎","🤬","💔","🤮","💩","🖕","😡"].includes(e))
const NEG=["👎","🤬","💔","🤮","💩","😡","😢","😭"]

const api=(m,d)=>fetch("https://api.telegram.org/bot"+TOKEN+"/"+m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)})
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

const react=(c,m,e)=>fetch("https://api.telegram.org/bot"+TOKEN+"/setMessageReaction",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:c,message_id:m,reaction:e.map(x=>({type:"emoji",emoji:x}))})})

const mainMenu=async(c,m,text="🤖 Auto Reaction Bot\nSelect feature 👇")=>{
 await api("editMessageText",{chat_id:c,message_id:m,text,reply_markup:{inline_keyboard:[
  [{text:"😊 Reaction Packs",callback_data:"packs"}],
  [{text:"🎛 Filters & Rules",callback_data:"filters"}],
  [{text:"⏱ Timing & Schedule",callback_data:"timing"}],
  [{text:"🛡 Admin Control",callback_data:"admin"}],
  [{text:"♻ Reset All Rules",callback_data:"reset"}]
 ]}})
}

export default async(req,res)=>{
 if(req.method!=="POST")return res.end("OK")
 const u=req.body

 if(u.message){
  const c=u.message.chat.id
  const t=u.message.text||""

  if(t==="/start")await api("sendMessage",{chat_id:c,text:"🤖 Auto Reaction Bot\nSelect feature 👇",reply_markup:{inline_keyboard:[
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
    let pack=cfg.mode==="neg"?NEG:cfg.mode==="pos"?POS:[...POS,...NEG]
    await react(l.chat,l.msg,[pick(pack,cfg.weight)])
   }
  }
 }

 if(u.callback_query){
  const q=u.callback_query
  const c=q.message.chat.id
  const m=q.message.message_id
  const cfg=await get("/channels/"+c)||{}

  if(q.data==="reset"){
   await del("/channels/"+c)
   await api("editMessageText",{chat_id:c,message_id:m,text:"♻ All rules cleared"})
  }

  if(q.data==="packs"){
   await api("editMessageText",{chat_id:c,message_id:m,text:"Select Reaction Mode:",reply_markup:{inline_keyboard:[
    [{text:"😊 Positive",callback_data:"mode_pos"}],
    [{text:"😈 Negative",callback_data:"mode_neg"}],
    [{text:"🎭 Mixed",callback_data:"mode_mix"}],
    [{text:"⬅ Back",callback_data:"back_main"}]
   ]}})
  }

  if(q.data==="filters"){
   await api("editMessageText",{chat_id:c,message_id:m,text:"Filters & Rules:",reply_markup:{inline_keyboard:[
    [{text:"Text Only",callback_data:"filter_text"}],
    [{text:"Media Only",callback_data:"filter_media"}],
    [{text:"Skip Poll",callback_data:"filter_poll"}],
    [{text:"Skip Forwarded",callback_data:"filter_forward"}],
    [{text:"Keyword Rule",callback_data:"filter_keyword"}],
    [{text:"Hashtag Rule",callback_data:"filter_hashtag"}],
    [{text:"Link Detection",callback_data:"filter_link"}],
    [{text:"⬅ Back",callback_data:"back_main"}]
   ]}})
  }

  if(q.data==="timing"){
   await api("editMessageText",{chat_id:c,message_id:m,text:"Timing & Probability:",reply_markup:{inline_keyboard:[
    [{text:"Set Delay",callback_data:"timing_delay"}],
    [{text:"Reaction Interval",callback_data:"timing_interval"}],
    [{text:"Probability %",callback_data:"timing_prob"}],
    [{text:"Night Mode",callback_data:"timing_night"}],
    [{text:"Schedule",callback_data:"timing_schedule"}],
    [{text:"Cooldown",callback_data:"timing_cool"}],
    [{text:"⬅ Back",callback_data:"back_main"}]
   ]}})
  }

  if(q.data==="admin"){
   await api("editMessageText",{chat_id:c,message_id:m,text:"Admin Control:",reply_markup:{inline_keyboard:[
    [{text:"Whitelist",callback_data:"admin_white"}],
    [{text:"Blacklist",callback_data:"admin_black"}],
    [{text:"Silent Mode",callback_data:"admin_silent"}],
    [{text:"Paid Plan Lock",callback_data:"admin_paid"}],
    [{text:"White Label Mode",callback_data:"admin_label"}],
    [{text:"⬅ Back",callback_data:"back_main"}]
   ]}})
  }

  if(q.data.startsWith("mode_")){
   const mode=q.data.split("_")[1]
   await set("/channels/"+c+"/mode",mode)
   await mainMenu(c,m,"✅ Mode activated: "+mode)
  }

  if(q.data==="back_main")await mainMenu(c,m)
 }

 if(u.channel_post){
  const p=u.channel_post
  const chat=p.chat.id
  const msg=p.message_id
  const txt=p.text||""
  const cfg=await get("/channels/"+chat)||{}

  if(cfg.disabled)return res.end("OK")
  if(cfg.night && (new Date().getHours()<cfg.night.start||new Date().getHours()>cfg.night.end))return res.end("OK")
  if(cfg.textOnly && !p.text)return res.end("OK")
  if(cfg.mediaOnly && !p.photo && !p.video)return res.end("OK")
  if(cfg.skipPoll && p.poll)return res.end("OK")
  if(cfg.skipForward && p.forward_from)return res.end("OK")
  if(cfg.prob && Math.random()>cfg.prob)return res.end("OK")

  let pack=cfg.mode==="neg"?NEG:cfg.mode==="pos"?POS:[...POS,...NEG]
  if(/http/.test(txt))pack=["🔗","🌐","⚡"]
  if(/#/.test(txt))pack=["🏷","🔥","📢"]
  if(txt.length>200)pack=["📝","🤓","👀"]
  if(p.pinned_message || p.pinned)pack.push("🚀")
  if(/bad|scam|fake/i.test(txt))pack=NEG

  let count=cfg.multi?Math.floor(Math.random()*4)+2:1
  let chosen=[]
  for(let i=0;i<count;i++)chosen.push(pick(pack,cfg.weight))

  if(cfg.delay)await sleep(cfg.delay*1000)

  try{await react(chat,msg,chosen)}
  catch{await set("/channels/"+chat+"/disabled",true)}

  await set("/last",{chat,msg})
  await set("/history/"+chat+"/"+msg,{emojis:chosen,time:Date.now()})
 }

 res.json({ok:true})
}
