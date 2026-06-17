import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

const PLATFORMS = [
  { id:"instagram", label:"Instagram",   icon:"📸", color:"#E1306C", bg:"linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", maxChars:2200, canSchedule:true },
  { id:"facebook",  label:"Facebook",    icon:"👥", color:"#1877F2", bg:"#1877F2",  maxChars:63206, canSchedule:true },
  { id:"tiktok",    label:"TikTok",      icon:"🎵", color:"#00C9D4", bg:"linear-gradient(135deg,#010101,#69C9D0)", maxChars:2200, canSchedule:false },
  { id:"twitter",   label:"X / Twitter", icon:"𝕏", color:"#888",    bg:"#111",     maxChars:280,   canSchedule:false },
];
const TONES = ["Elegant & refined","Warm & inviting","Bold & exciting","Playful & fun","Storytelling"];
const GOALS = ["Drive reservations","Showcase the dish","Build brand awareness","Promote a special","Engage community"];
const STORAGE_KEY="bh:posts", SETTINGS_KEY="bh:settings", GOLD="#c9a84c", GRAPH="https://graph.facebook.com/v19.0";
const BRAND=`You are the social media voice for Beacon Hills, an upscale fine-dining restaurant in Omaha, Nebraska.
Brand: sophisticated yet approachable, farm-to-table ethos, celebrating Nebraska's best ingredients.
Chef John Benton leads the kitchen with modern techniques (sous vide, housemade pasta, charcuterie, artisan stocks).
Pricing: upscale. Audience: food lovers, date-night diners, business professionals in Omaha.`;

const BUDGET_TIERS=[
  {label:"Starter", daily:5,  weekly:35,  reach:[300,500],   impr:[2800,3500],   clicks:[28,56],   res:[2,4]},
  {label:"Growth",  daily:15, weekly:105, reach:[900,1300],  impr:[8400,10500],  clicks:[84,168],  res:[5,14]},
  {label:"Boost",   daily:30, weekly:210, reach:[1800,2600], impr:[16800,21000], clicks:[168,336], res:[10,27]},
  {label:"Max",     daily:50, weekly:350, reach:[3000,4500], impr:[28000,35000], clicks:[280,560], res:[18,45]},
];
const AD_OBJECTIVES=[
  {id:"OUTCOME_TRAFFIC",    label:"Drive Reservations", icon:"🍽️", desc:"Optimizes for clicks to your booking page"},
  {id:"OUTCOME_AWARENESS",  label:"Brand Awareness",    icon:"👁️",  desc:"Max reach across Omaha fine dining audience"},
  {id:"OUTCOME_ENGAGEMENT", label:"Boost Engagement",   icon:"💬", desc:"Likes, shares, comments — grow your following"},
];

const IDEAS_KEY="bh:ideas";
const BH_PROFILE=`BEACON HILLS RESTAURANT — Deep Brand Profile
Location: Aksarben Village, Omaha, Nebraska
Chef: John Benton — sous vide, charcuterie, housemade pasta, artisan stocks and sauces
Brand voice: Sophisticated yet approachable fine dining. Farm-to-table ethos celebrating Nebraska's best.
Target: Adults 28-65, HHI $75k+, date nights, business dinners, special occasions, culinary enthusiasts.

STAR DISHES (high sales + margin — campaign gold):
Peanut Chicken, Chicken Pot Pie, Short Rib Stroganoff, Reuben, Shrimp Bruschetta Pasta,
Walleye preparations, Crispy Chicken Sandwich, Wagyu Steak Frites.

HIGH-MARGIN PUZZLES (strong campaign push candidates):
Signature Crab Cake, Glacier 51 Seabass, Ribeye, Salmon dishes.

SEASONAL SPECIALTY: Softshell Crab (spring/summer — premium, limited availability).

UNIQUE REVENUE ASSETS:
- The Elmwood Room: Private event space, primary banquet revenue driver
- Chef's Collection: Premium catering tier (passed hors d'oeuvres, chef stations)
- Active catering program for off-site events
- Strong wine and craft cocktail program

MARKETING PRIORITIES (ranked):
1. Drive weeknight reservations (Mon/Tue are weakest — high opportunity)
2. Fill the Elmwood Room with corporate events and private parties
3. Build catering pipeline via Chef's Collection
4. Showcase Chef Benton's technique and seasonal creativity
5. Highlight locally-sourced Nebraska ingredients
6. Grow social following and engagement

CONTENT STRENGTHS: Beautiful plating, dramatic tableside moments, seasonal ingredients,
behind-the-scenes kitchen craft, Chef John's story and technique.`;

function getSeason(m){return m>=2&&m<=4?"Spring":m>=5&&m<=7?"Summer":m>=8&&m<=10?"Fall":"Winter";}

// ─── Anthropic API helper ─────────────────────────────────────────────────────
function anthropicHeaders(apiKey){
  if(!apiKey)throw new Error("Add your Anthropic API key in ⚙️ Settings to use AI features.");
  return{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"};
}

// ─── Password input ───────────────────────────────────────────────────────────
function PasswordInput({value,onChange,placeholder,inputStyle}){
  const [show,setShow]=useState(false);
  return(<div style={{position:"relative"}}>
    <input type={show?"text":"password"} value={value} onChange={onChange} placeholder={placeholder} style={{...inputStyle,paddingRight:42}}/>
    <button type="button" onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#666",cursor:"pointer",fontSize:15,padding:4,lineHeight:1}}>{show?"🙈":"👁️"}</button>
  </div>);
}

async function loadIdeas(){try{const v=localStorage.getItem(IDEAS_KEY);return v?JSON.parse(v):null;}catch{return null;}}
async function saveIdeas(d){try{localStorage.setItem(IDEAS_KEY,JSON.stringify(d));}catch{}}


// ─── Storage ──────────────────────────────────────────────────────────────────
async function loadHistory(){try{const v=localStorage.getItem(STORAGE_KEY);return v?JSON.parse(v):[]}catch{return[]}}
async function saveHistory(p){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(p))}
  catch(e){if(e.name==="QuotaExceededError"&&p.length>5){const s=p.slice(0,Math.max(5,Math.floor(p.length/2))).map(x=>({...x,thumb:undefined}));try{localStorage.setItem(STORAGE_KEY,JSON.stringify(s))}catch{}}}
}
async function loadSettings(){try{const v=localStorage.getItem(SETTINGS_KEY);return v?JSON.parse(v):{}}catch{return{}}}
async function saveSettings(s){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(s))}catch{}}

async function generateCampaignIdeas(apiKey){
  const now=new Date();
  const dateStr=now.toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  const season=getSeason(now.getMonth());
  const res=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",headers:anthropicHeaders(apiKey),
    body:JSON.stringify({
      model:"claude-opus-4-8",
      max_tokens:2000,
      tools:[{"type":"web_search_20260209","name":"web_search"}],
      system:BH_PROFILE,
      messages:[{role:"user",content:`Today is ${dateStr}. Current season: ${season}.

Please search the web for:
1. Current restaurant and fine dining social media trends right now
2. Upcoming events in Omaha Nebraska in the next 60 days
3. What food content is trending on Instagram and TikTok this season
4. Any notable food holidays, national food days, or culinary moments coming up

Then using everything you know about Beacon Hills and what you just found, generate exactly 5 campaign ideas that are highly specific, timely, and immediately actionable for Beacon Hills right now.

Respond ONLY with a valid JSON array of 5 objects. No markdown, no preamble:
[{
  "id":"unique_slug",
  "title":"Campaign Name",
  "type":"Seasonal|Trending|Event|Chef Feature|Menu Spotlight|Community|Elmwood Room",
  "urgency":"This Week|This Month|Evergreen",
  "whyNow":"1-2 sentences: specific timing or trend reason why this matters right now",
  "concept":"2-3 sentences: the campaign idea and angle",
  "posts":[
    {"idea":"specific post idea with visual description","platform":"Instagram|Facebook|Both","format":"Photo|Reel|Story|Carousel"}
  ],
  "hashtags":["#tag1","#tag2","#tag3"],
  "paidRecommendation":"Organic Only|Boost Post|Full Campaign",
  "suggestedBudget":"$X/day or null",
  "effort":"Low|Medium|High",
  "dishes":["dish names that star in this campaign"],
  "trendSource":"what trend or event is driving this"
}]`}]
    })
  });
  const d=await res.json();
  const text=d.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||"[]";
  const clean=text.replace(/```json|```/g,"").trim();
  const start=clean.indexOf("["),end=clean.lastIndexOf("]");
  if(start===-1||end===-1)throw new Error("No JSON array found");
  return JSON.parse(clean.slice(start,end+1));
}


// ─── Image helpers ────────────────────────────────────────────────────────────
function makeThumbnail(dataUrl,size=120){
  return new Promise(resolve=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas"),r=img.width/img.height;c.width=r>=1?size:size*r;c.height=r>=1?size/r:size;c.getContext("2d").drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",0.6))};img.src=dataUrl});
}

// ─── AI: Organic content ──────────────────────────────────────────────────────
async function generateContent({imageBase64,mimeType,tone,goal,notes,platforms,apiKey}){
  const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:anthropicHeaders(apiKey),
    body:JSON.stringify({model:"claude-opus-4-8",max_tokens:1000,messages:[{role:"user",content:[
      {type:"image",source:{type:"base64",media_type:mimeType,data:imageBase64}},
      {type:"text",text:`${BRAND}\n\nGenerate social media content for: ${platforms.map(p=>p.label).join(", ")}.\nTone: ${tone}. Goal: ${goal}.${notes?`\nChef notes: ${notes}`:""}\n\nFor EACH platform return JSON: { platform, caption, hashtags (array), postingTime, photoTip }.\nRespond ONLY with a valid JSON array, no markdown.`}
    ]}]})});
  const d=await res.json();const raw=d.content?.map(b=>b.text||"").join("")||"[]";
  return JSON.parse(raw.replace(/```json|```/g,"").trim());
}
async function refineCaption({caption,hashtags,platform,feedback,apiKey}){
  const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:anthropicHeaders(apiKey),
    body:JSON.stringify({model:"claude-opus-4-8",max_tokens:600,messages:[{role:"user",content:
      `${BRAND}\n\nCurrent ${platform} caption:\n"${caption}"\n\nCurrent hashtags: ${hashtags?.join(" ")||""}\n\nChef's refinement request: "${feedback}"\n\nRewrite the caption based on the feedback. Keep brand voice.\n\nRespond ONLY with valid JSON: { "caption": "...", "hashtags": ["..."] }\nNo markdown.`
    }]})});
  const d=await res.json();const raw=d.content?.map(b=>b.text||"").join("")||"{}";
  return JSON.parse(raw.replace(/```json|```/g,"").trim());
}

// ─── AI: Ad creative ──────────────────────────────────────────────────────────
async function generateAdCreative({imageBase64,mimeType,notes,apiKey}){
  const prompt=`${BRAND}

Omaha market context: Target demographic — adults 28–65, household income $75k+, within 20 miles of Aksarben Village. They dine out 2–4x/month, value experience over price. Occasions: date nights, business dinners, celebrations, weekend indulgence. Competitive landscape: mid-size metro, sophisticated palate, loyal to quality establishments.

Generate a high-converting Meta (Facebook/Instagram) PAID AD creative. This is an advertisement, not an organic post. It needs a scroll-stopping hook, clear value proposition, and a compelling reason to act NOW.${notes?`\nPhoto context from chef: ${notes}`:""}

Return ONLY this exact JSON (no markdown):
{
  "headline": "max 40 chars — punchy, curiosity-driven or desire-driven",
  "primaryText": "max 125 chars — strong hook + benefit, conversational tone",
  "description": "max 30 chars — urgency or social proof",
  "ctaType": "BOOK_TRAVEL",
  "audienceInsight": "1 sentence: who specifically this ad targets and why they respond",
  "adAngle": "1 sentence: the emotional or desire angle this ad leverages"
}`;
  const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:anthropicHeaders(apiKey),
    body:JSON.stringify({model:"claude-opus-4-8",max_tokens:400,messages:[{role:"user",content:[
      {type:"image",source:{type:"base64",media_type:mimeType,data:imageBase64}},
      {type:"text",text:prompt}
    ]}]})});
  const d=await res.json();const raw=d.content?.map(b=>b.text||"").join("")||"{}";
  return JSON.parse(raw.replace(/```json|```/g,"").trim());
}

async function analyzeFlyer({imageBase64,mimeType,apiKey}){
  const prompt=`${BRAND}

Analyze this event flyer for Beacon Hills restaurant and create a complete social media marketing campaign strategy. Extract every detail visible on the flyer.

Return ONLY this exact JSON (no markdown):
{
  "event":{
    "name":"event name",
    "date":"date as shown",
    "time":"time as shown or null",
    "location":"venue or location",
    "price":"ticket price or Free",
    "description":"2-3 sentence event summary",
    "theme":"overall vibe or theme"
  },
  "phases":[
    {"id":"awareness","label":"Awareness","timing":"3 weeks before event","goal":"Save the date, build early buzz","posts":[
      {"platform":"Instagram","caption":"engaging 150-200 char caption","hashtags":["#BeaconHills","#Omaha"],"postingTime":"best day/time"},
      {"platform":"Facebook","caption":"longer Facebook caption with full event details","hashtags":["#BeaconHills"],"postingTime":"best day/time"}
    ]},
    {"id":"excitement","label":"Build Excitement","timing":"2 weeks before","goal":"Share details, create FOMO","posts":[
      {"platform":"Instagram","caption":"...","hashtags":[...],"postingTime":"..."},
      {"platform":"Facebook","caption":"...","hashtags":[...],"postingTime":"..."}
    ]},
    {"id":"urgency","label":"Final Push","timing":"3 days before","goal":"Urgency, limited seats","posts":[
      {"platform":"Instagram","caption":"...","hashtags":[...],"postingTime":"..."},
      {"platform":"Facebook","caption":"...","hashtags":[...],"postingTime":"..."}
    ]},
    {"id":"dayof","label":"Day-Of Reminder","timing":"Morning of event","goal":"Remind followers, drive walk-ins","posts":[
      {"platform":"Instagram","caption":"...","hashtags":[...],"postingTime":"..."},
      {"platform":"Facebook","caption":"...","hashtags":[...],"postingTime":"..."}
    ]}
  ],
  "adCreative":{
    "headline":"max 40 char punchy headline",
    "primaryText":"max 125 char ad copy",
    "description":"max 30 char reinforcement",
    "ctaType":"LEARN_MORE",
    "suggestedDailyBudget":15,
    "campaignNote":"1 sentence on why paid ads work for this specific event"
  }
}`;
  const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:anthropicHeaders(apiKey),
    body:JSON.stringify({model:"claude-opus-4-8",max_tokens:1500,messages:[{role:"user",content:[
      {type:"image",source:{type:"base64",media_type:mimeType,data:imageBase64}},
      {type:"text",text:prompt}
    ]}]})});
  const d=await res.json();const raw=d.content?.map(b=>b.text||"").join("")||"{}";
  return JSON.parse(raw.replace(/```json|```/g,"").trim());
}


// ─── Meta Marketing API: Create campaign ─────────────────────────────────────
async function createAdCampaign({adAccountId,pageId,pageToken,headline,primaryText,ctaType,base64,mime,dailyBudget,objective}){
  // 1 — Upload image
  const blob=await fetch(`data:${mime};base64,${base64}`).then(r=>r.blob());
  const imgForm=new FormData();imgForm.append("access_token",pageToken);imgForm.append("filename",blob,"ad.jpg");
  const imgRes=await fetch(`${GRAPH}/act_${adAccountId}/adimages`,{method:"POST",body:imgForm});
  const imgData=await imgRes.json();
  if(imgData.error)throw new Error(`Image upload: ${imgData.error.message}`);
  const imageHash=Object.values(imgData.images||{})[0]?.hash;
  if(!imageHash)throw new Error("Image upload failed — no hash returned");
  // 2 — Campaign
  const campRes=await fetch(`${GRAPH}/act_${adAccountId}/campaigns`,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name:`Beacon Hills · ${headline} · ${new Date().toLocaleDateString()}`,objective,status:"PAUSED",special_ad_categories:[],access_token:pageToken})});
  const camp=await campRes.json();if(camp.error)throw new Error(`Campaign: ${camp.error.message}`);
  // 3 — Ad Set (Omaha geo targeting)
  const targeting={geo_locations:{custom_locations:[{latitude:41.2565,longitude:-95.9345,radius:20,distance_unit:"mile",address_string:"Omaha, Nebraska"}]},age_min:25,age_max:65,publisher_platforms:["facebook","instagram"],facebook_positions:["feed","story"],instagram_positions:["stream","story"]};
  const adSetRes=await fetch(`${GRAPH}/act_${adAccountId}/adsets`,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name:"Beacon Hills – Omaha Fine Dining",campaign_id:camp.id,daily_budget:dailyBudget*100,billing_event:"IMPRESSIONS",optimization_goal:objective==="OUTCOME_TRAFFIC"?"LINK_CLICKS":"REACH",bid_strategy:"LOWEST_COST_WITHOUT_CAP",targeting,status:"PAUSED",access_token:pageToken})});
  const adSet=await adSetRes.json();if(adSet.error)throw new Error(`Ad Set: ${adSet.error.message}`);
  // 4 — Creative
  const creativeRes=await fetch(`${GRAPH}/act_${adAccountId}/adcreatives`,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name:"BH Creative",object_story_spec:{page_id:pageId,link_data:{message:primaryText,link:"https://www.beaconhills.com",image_hash:imageHash,name:headline,call_to_action:{type:ctaType,value:{link:"https://www.beaconhills.com"}}}},access_token:pageToken})});
  const creative=await creativeRes.json();if(creative.error)throw new Error(`Creative: ${creative.error.message}`);
  // 5 — Ad
  const adRes=await fetch(`${GRAPH}/act_${adAccountId}/ads`,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name:"Beacon Hills Ad",adset_id:adSet.id,creative:{creative_id:creative.id},status:"PAUSED",access_token:pageToken})});
  const ad=await adRes.json();if(ad.error)throw new Error(`Ad: ${ad.error.message}`);
  return{campaignId:camp.id,adSetId:adSet.id,adId:ad.id};
}

// ─── Scheduling API ───────────────────────────────────────────────────────────
async function imgbbUpload(base64,imgbbKey){
  const form=new FormData();form.append("key",imgbbKey);form.append("image",base64);
  const res=await fetch("https://api.imgbb.com/1/upload",{method:"POST",body:form});
  const d=await res.json();if(!d.success)throw new Error(d.error?.message||"imgBB upload failed");return d.data.url;
}
async function scheduleFacebook({pageId,pageToken,caption,hashtags,base64,mime,scheduledTime}){
  const message=`${caption}\n\n${hashtags.join(" ")}`.trim();
  const blob=await fetch(`data:${mime};base64,${base64}`).then(r=>r.blob());
  const form=new FormData();form.append("access_token",pageToken);form.append("published","false");form.append("message",message);form.append("scheduled_publish_time",String(scheduledTime));form.append("source",blob,"photo.jpg");
  const res=await fetch(`${GRAPH}/${pageId}/photos`,{method:"POST",body:form});const d=await res.json();
  if(d.error)throw new Error(d.error.message);return d;
}
async function scheduleInstagram({igUserId,pageToken,imgbbKey,caption,hashtags,base64,scheduledTime}){
  const fullCaption=`${caption}\n\n${hashtags.join(" ")}`.trim();
  const imageUrl=await imgbbUpload(base64,imgbbKey);
  const containerRes=await fetch(`${GRAPH}/${igUserId}/media`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image_url:imageUrl,caption:fullCaption,published:false,scheduled_publish_time:scheduledTime,access_token:pageToken})});
  const container=await containerRes.json();if(container.error)throw new Error(container.error.message);
  const pubRes=await fetch(`${GRAPH}/${igUserId}/media_publish`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({creation_id:container.id,access_token:pageToken})});
  const pub=await pubRes.json();if(pub.error)throw new Error(pub.error.message);return pub;
}

// ─── Copy helpers ─────────────────────────────────────────────────────────────
function copyText(text){if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text).catch(()=>execCommandCopy(text));return execCommandCopy(text);}
function execCommandCopy(text){const el=document.createElement("textarea");el.value=text;el.style.cssText="position:fixed;top:0;left:0;opacity:0;pointer-events:none;";document.body.appendChild(el);el.focus();el.select();try{document.execCommand("copy")}catch{}document.body.removeChild(el);return Promise.resolve();}

// ─── Analytics ────────────────────────────────────────────────────────────────
function computeAnalytics(history){
  if(!history.length)return null;const now=new Date();
  const weekBuckets=Array.from({length:8},(_,i)=>{const d=new Date(now);d.setDate(d.getDate()-(7*(7-i)));return{label:`${d.getMonth()+1}/${d.getDate()}`,start:d.getTime(),posts:0}});
  history.forEach(p=>{for(let i=weekBuckets.length-1;i>=0;i--){if(p.id>=weekBuckets[i].start){weekBuckets[i].posts++;break;}}});
  const platC={};history.forEach(p=>p.platforms?.forEach(pid=>{platC[pid]=(platC[pid]||0)+1;}));
  const platformData=PLATFORMS.map(p=>({name:p.label,icon:p.icon,value:platC[p.id]||0,color:p.color})).filter(p=>p.value>0).sort((a,b)=>b.value-a.value);
  const toneC={};history.forEach(p=>{if(p.tone)toneC[p.tone]=(toneC[p.tone]||0)+1;});
  const toneData=TONES.map(t=>({name:t,value:toneC[t]||0})).filter(t=>t.value>0).sort((a,b)=>b.value-a.value);
  const maxTone=Math.max(...toneData.map(t=>t.value),1);
  const goalC={};history.forEach(p=>{if(p.goal)goalC[p.goal]=(goalC[p.goal]||0)+1;});
  const goalData=GOALS.map(g=>({name:g,value:goalC[g]||0})).filter(g=>g.value>0).sort((a,b)=>b.value-a.value);
  const maxGoal=Math.max(...goalData.map(g=>g.value),1);
  const days=[...new Set(history.map(p=>new Date(p.id).toDateString()))];let streak=0;
  const today=new Date().toDateString(),yesterday=new Date(Date.now()-86400000).toDateString();
  if(days.includes(today)||days.includes(yesterday)){let c=days.includes(today)?new Date():new Date(Date.now()-86400000);while(days.includes(c.toDateString())){streak++;c=new Date(c.getTime()-86400000);}}
  const wa=Date.now()-7*86400000,ma=Date.now()-30*86400000;
  const thisWeek=history.filter(p=>p.id>wa).length,thisMonth=history.filter(p=>p.id>ma).length;
  const dC=Array(7).fill(0);history.forEach(p=>{dC[new Date(p.id).getDay()]++;});
  const bestDay=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dC.indexOf(Math.max(...dC))];
  const heatmap=[];for(let w=9;w>=0;w--){const wk=[];for(let d=0;d<7;d++){const day=new Date(now);day.setDate(day.getDate()-w*7-(6-d));wk.push({key:day.toDateString(),count:history.filter(p=>new Date(p.id).toDateString()===day.toDateString()).length});}heatmap.push(wk);}
  return{weekBuckets,platformData,toneData,goalData,maxTone,maxGoal,streak,thisWeek,thisMonth,bestDay,heatmap,total:history.length};
}

// ─── ScheduleModal ────────────────────────────────────────────────────────────
function ScheduleModal({platform,onConfirm,onCancel,settings,scheduling}){
  const minDt=new Date(Date.now()+11*60*1000).toISOString().slice(0,16);
  const maxDt=new Date(Date.now()+29*24*60*60*1000).toISOString().slice(0,16);
  const [dt,setDt]=useState(new Date(Date.now()+60*60*1000).toISOString().slice(0,16));
  const missing=platform.id==="instagram"?(!settings.igUserId||!settings.imgbbKey||!settings.pageToken):(!settings.pageId||!settings.pageToken);
  return(
    <div style={S.modalOverlay}><div style={S.modal}>
      <div style={{fontSize:10,letterSpacing:2,color:GOLD,marginBottom:6,textTransform:"uppercase"}}>Schedule Post</div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}><span style={{fontSize:22}}>{platform.icon}</span><span style={{fontSize:15,fontWeight:600,color:"#f0ead6"}}>{platform.label}</span></div>
      {missing?<div style={{background:"#2a1a0a",border:"1px solid #5a3a0a",borderRadius:10,padding:14,marginBottom:14,fontSize:13,color:"#f0a84c",lineHeight:1.6}}>⚠️ Missing credentials in Settings.</div>:<>
        <div style={{fontSize:10,letterSpacing:2,color:GOLD,marginBottom:8,textTransform:"uppercase"}}>Schedule for</div>
        <input type="datetime-local" min={minDt} max={maxDt} value={dt} onChange={e=>setDt(e.target.value)} style={{width:"100%",background:"#1c1c1c",border:"1px solid #333",borderRadius:10,color:"#f0ead6",padding:"10px 14px",fontSize:15,fontFamily:"Georgia,serif",marginBottom:4,boxSizing:"border-box"}}/>
        <div style={{fontSize:11,color:"#555",marginBottom:16}}>Min: 10 min · Max: 29 days</div>
      </>}
      <div style={{display:"flex",gap:8}}>
        {!missing&&<button style={{...S.copyBtn,background:scheduling?"#2a2a2a":GOLD,flex:1,opacity:scheduling?0.6:1}} onClick={()=>!scheduling&&onConfirm(Math.floor(new Date(dt).getTime()/1000))} disabled={scheduling}>{scheduling?"Scheduling…":"📅 Confirm Schedule"}</button>}
        <button style={{...S.copyBtn,background:"#2a2a2a",color:"#888",flex:missing?"1 1 auto":"0 0 80px"}} onClick={onCancel} disabled={scheduling}>{missing?"Close":"Cancel"}</button>
      </div>
    </div></div>
  );
}

// ─── AdBuilder ────────────────────────────────────────────────────────────────
function AdBuilder({imageBase64,imageMime,notes,settings}){
  const [open,setOpen]=useState(false);
  const [adCreative,setAd]=useState(null);
  const [generating,setGen]=useState(false);
  const [tierIdx,setTier]=useState(1);
  const [objective,setObj]=useState("OUTCOME_TRAFFIC");
  const [status,setStatus]=useState("idle");
  const [result,setResult]=useState(null);
  const [errMsg,setErr]=useState(null);
  const tier=BUDGET_TIERS[tierIdx];
  const hasAdAccount=!!(settings.adAccountId&&settings.pageId&&settings.pageToken);

  const genAd=async()=>{setGen(true);setAd(null);setErr(null);setResult(null);setStatus("idle");
    try{const c=await generateAdCreative({imageBase64,mimeType:imageMime,notes,apiKey:settings.anthropicApiKey||""});setAd(c);}
    catch(e){setErr(e.message||"Failed to generate ad creative.");}
    setGen(false);};

  const handleOpen=()=>{setOpen(true);if(!adCreative&&!generating)genAd();};

  const launch=async()=>{setStatus("launching");setErr(null);
    try{const r=await createAdCampaign({adAccountId:settings.adAccountId,pageId:settings.pageId,pageToken:settings.pageToken,headline:adCreative.headline,primaryText:adCreative.primaryText,ctaType:adCreative.ctaType||"BOOK_TRAVEL",base64:imageBase64,mime:imageMime,dailyBudget:tier.daily,objective});setResult(r);setStatus("success");}
    catch(e){setErr(e.message||"Campaign creation failed. Check credentials in Settings.");setStatus("error");}};

  if(!open)return(
    <div style={{margin:"16px 14px 0",background:"linear-gradient(135deg,#130d20,#0a1525)",borderRadius:16,padding:18,border:"1px solid #2e1f50",cursor:"pointer"}} onClick={handleOpen}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:32}}>📣</span>
        <div><div style={{fontSize:16,fontWeight:700,color:"#f0ead6"}}>Create a Meta Ad Campaign</div><div style={{fontSize:12,color:"#666",marginTop:3}}>AI-targeted · Omaha fine dining market · One-tap launch</div></div>
        <span style={{color:"#444",fontSize:18,marginLeft:"auto"}}>▼</span>
      </div>
    </div>
  );

  return(
    <div style={{margin:"16px 14px 0",background:"#130d20",borderRadius:16,overflow:"hidden",border:"1px solid #2e1f50"}}>
      <div style={{background:"linear-gradient(135deg,#1f1035,#0a1a35)",padding:"14px 16px",display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:22}}>📣</span>
        <span style={{fontSize:15,fontWeight:700,color:"#f0ead6",flex:1}}>Meta Ad Campaign Builder</span>
        <button style={{background:"none",border:"none",color:"#555",fontSize:18,cursor:"pointer"}} onClick={()=>setOpen(false)}>▲</button>
      </div>

      <div style={{padding:16}}>
        {/* Market Intelligence */}
        <div style={{background:"#0a1020",borderRadius:12,padding:14,marginBottom:16,border:"1px solid #1a2a50"}}>
          <div style={{fontSize:10,letterSpacing:2,color:"#7eb8f7",marginBottom:10,textTransform:"uppercase"}}>Omaha Market Intelligence</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {[
              ["🎯","Target audience","~160–200k fine dining enthusiasts within 20mi"],
              ["👥","Demographics","Ages 25–65 · HHI $75k+ · Dine out 2–4×/month"],
              ["📍","Geography","Omaha metro · Council Bluffs · Papillion · Bellevue"],
              ["📊","Market edge","Mid-size metro: lower CPM than Chicago/KC, high purchase intent"],
            ].map(([icon,lbl,val])=>(
              <div key={lbl} style={{display:"flex",gap:8,fontSize:12}}>
                <span style={{flexShrink:0}}>{icon}</span>
                <span style={{color:"#7eb8f7",flexShrink:0,minWidth:100}}>{lbl}</span>
                <span style={{color:"#666"}}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ad Creative */}
        <div style={{fontSize:10,letterSpacing:2,color:GOLD,marginBottom:10,textTransform:"uppercase"}}>AI Ad Creative</div>
        {generating&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"16px 0",color:"#666",fontSize:13}}><div style={{width:16,height:16,borderRadius:"50%",border:"2px solid #333",borderTop:`2px solid ${GOLD}`,animation:"spin 0.8s linear infinite",flexShrink:0}}/>Analyzing photo · Writing ad copy for Omaha market…</div>}
        {errMsg&&!adCreative&&<div style={{background:"#2a0f0f",borderRadius:10,padding:12,marginBottom:12,color:"#ff8a8a",fontSize:13,border:"1px solid #5a1f1f"}}>❌ {errMsg}</div>}
        {adCreative&&(
          <div style={{background:"#0a0a14",borderRadius:12,padding:14,marginBottom:14,border:"1px solid #1a1a30"}}>
            {[
              {lbl:"HEADLINE",max:40,val:adCreative.headline,big:true},
              {lbl:"PRIMARY TEXT",max:125,val:adCreative.primaryText},
              {lbl:"DESCRIPTION",max:30,val:adCreative.description},
            ].map(({lbl,max,val,big})=>(
              <div key={lbl} style={{marginBottom:12}}>
                <div style={{fontSize:9,color:"#444",letterSpacing:1.5,marginBottom:4}}>{lbl} <span style={{color:(val?.length||0)>max?"#ff6b6b":"#333"}}>({val?.length||0}/{max})</span></div>
                <div style={{fontSize:big?15:13,fontWeight:big?700:400,color:big?"#f0ead6":"#c8c0ae",lineHeight:1.5}}>{val}</div>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <div style={{flex:1}}>
                <div style={{fontSize:9,color:"#444",letterSpacing:1.5,marginBottom:4}}>CTA BUTTON</div>
                <div style={{fontSize:11,color:"#7eb8f7",background:"#0d1a30",padding:"4px 10px",borderRadius:6,display:"inline-block"}}>{(adCreative.ctaType||"").replace(/_/g," ")}</div>
              </div>
            </div>
            {adCreative.audienceInsight&&(
              <div style={{marginTop:12,padding:10,background:"#0a1020",borderRadius:8,border:"1px solid #1a2a50"}}>
                <div style={{fontSize:9,color:"#7eb8f7",letterSpacing:1.5,marginBottom:4}}>WHY THIS WORKS</div>
                <div style={{fontSize:11,color:"#666",lineHeight:1.6}}>{adCreative.audienceInsight}</div>
                {adCreative.adAngle&&<div style={{fontSize:11,color:"#555",marginTop:4,lineHeight:1.5}}>Angle: {adCreative.adAngle}</div>}
              </div>
            )}
          </div>
        )}
        {(adCreative||errMsg)&&<button style={{...S.actionBtn,width:"100%",marginBottom:16,fontSize:12,padding:"9px"}} onClick={genAd} disabled={generating}>{generating?"Generating…":"↺ Regenerate Ad Creative"}</button>}

        {/* Objective */}
        <div style={{fontSize:10,letterSpacing:2,color:GOLD,marginBottom:10,textTransform:"uppercase"}}>Campaign Objective</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
          {AD_OBJECTIVES.map(o=>(
            <button key={o.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:objective===o.id?"#1a1035":"#0a0a14",border:`1px solid ${objective===o.id?"#4a2a8a":"#1a1a30"}`,borderRadius:10,cursor:"pointer",textAlign:"left"}} onClick={()=>setObj(o.id)}>
              <span style={{fontSize:18}}>{o.icon}</span>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:objective===o.id?"#c8b0f5":"#c8c0ae"}}>{o.label}</div><div style={{fontSize:11,color:"#555",marginTop:2}}>{o.desc}</div></div>
              {objective===o.id&&<span style={{color:"#9b7ef5",fontSize:14}}>✓</span>}
            </button>
          ))}
        </div>

        {/* Budget tiers */}
        <div style={{fontSize:10,letterSpacing:2,color:GOLD,marginBottom:10,textTransform:"uppercase"}}>Daily Budget</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          {BUDGET_TIERS.map((t,i)=>(
            <button key={i} style={{padding:"12px 10px",background:tierIdx===i?"#0f1f0f":"#0a0a14",border:`1px solid ${tierIdx===i?"#2a5a2a":"#1a1a30"}`,borderRadius:12,cursor:"pointer",textAlign:"center"}} onClick={()=>setTier(i)}>
              <div style={{fontSize:20,fontWeight:700,color:tierIdx===i?GOLD:"#f0ead6"}}>${t.daily}<span style={{fontSize:11,fontWeight:400,color:"#555"}}>/day</span></div>
              <div style={{fontSize:10,color:tierIdx===i?"#a8f0a8":"#555",marginTop:3}}>{t.label}</div>
              <div style={{fontSize:10,color:"#444",marginTop:2}}>${t.weekly}/wk</div>
            </button>
          ))}
        </div>

        {/* Projections */}
        <div style={{background:"#0a150a",borderRadius:12,padding:14,marginBottom:16,border:"1px solid #1a3a1a"}}>
          <div style={{fontSize:10,letterSpacing:2,color:"#4caf50",marginBottom:12,textTransform:"uppercase"}}>Projected Results · ${tier.daily}/day · Omaha Market</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[
              {lbl:"Daily Reach",        val:`${tier.reach[0].toLocaleString()}–${tier.reach[1].toLocaleString()}`},
              {lbl:"Weekly Impressions", val:`${(tier.impr[0]/1000).toFixed(1)}k–${(tier.impr[1]/1000).toFixed(1)}k`},
              {lbl:"Weekly Clicks",      val:`${tier.clicks[0]}–${tier.clicks[1]}`},
              {lbl:"Est. Reservations",  val:`${tier.res[0]}–${tier.res[1]}/wk`},
            ].map(({lbl,val})=>(
              <div key={lbl} style={{background:"#0a1a0a",borderRadius:8,padding:"10px 12px",border:"1px solid #1a3a1a"}}>
                <div style={{fontSize:17,fontWeight:700,color:"#a8f0a8"}}>{val}</div>
                <div style={{fontSize:10,color:"#4a7a4a",marginTop:3}}>{lbl}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:10,color:"#2a4a2a",marginTop:10,lineHeight:1.6}}>Based on Omaha CPM ~$10–14 · CTR 1.0–1.8% · Reservation conversion 5–8%</div>
        </div>

        {/* Launch section */}
        {status==="success"?(
          <div style={{background:"#0a150a",borderRadius:12,padding:14,border:"1px solid #2e5e2e"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#a8f0a8",marginBottom:8}}>✅ Campaign Created!</div>
            <div style={{fontSize:12,color:"#666",lineHeight:1.8,marginBottom:12}}>Campaign ID: <strong style={{color:"#c8c0ae"}}>{result?.campaignId}</strong><br/>Status: <strong style={{color:GOLD}}>PAUSED</strong> — your ad is ready. Review the creative in Meta Ads Manager and click Publish to go live.</div>
            <button style={{...S.copyBtn,background:GOLD}} onClick={()=>window.open("https://business.facebook.com/adsmanager","_blank")}>Open Meta Ads Manager →</button>
          </div>
        ):!hasAdAccount?(
          <div style={{background:"#150d25",borderRadius:12,padding:14,border:"1px solid #3a1a5a"}}>
            <div style={{fontSize:10,letterSpacing:2,color:"#9b7ef5",marginBottom:8,textTransform:"uppercase"}}>One More Setting Needed</div>
            <div style={{fontSize:13,color:"#c8b0f5",lineHeight:1.7,marginBottom:4}}>Add your <strong>Ad Account ID</strong> in ⚙️ Settings to enable one-tap campaign launch.</div>
            <div style={{fontSize:11,color:"#555",lineHeight:1.6}}>Find it in Meta Ads Manager → it looks like <strong style={{color:"#888"}}>act_123456789</strong>. Also add <strong style={{color:"#888"}}>ads_management</strong> permission to your token.</div>
          </div>
        ):adCreative?(
          <div>
            {errMsg&&<div style={{background:"#2a0f0f",borderRadius:10,padding:12,marginBottom:10,color:"#ff8a8a",fontSize:13,border:"1px solid #5a1f1f"}}>❌ {errMsg}</div>}
            <button style={{...S.copyBtn,background:status==="launching"?"#2a2a2a":"linear-gradient(135deg,#2a1040,#0a1535)",color:"#c8b0f5",border:"1px solid #4a2a8a",opacity:status==="launching"?0.6:1,fontSize:15}} onClick={launch} disabled={status==="launching"}>
              {status==="launching"?"🚀 Launching Campaign…":`🚀 Launch · $${tier.daily}/day · ${tier.label}`}
            </button>
            <div style={{fontSize:11,color:"#2e1f50",textAlign:"center",marginTop:8}}>Created PAUSED — review in Ads Manager before going live</div>
          </div>
        ):null}
      </div>
    </div>
  );
}

// ─── FlyerCampaign ────────────────────────────────────────────────────────────
function FlyerCampaign({flyer,image,settings,onBack}){
  const [cMode,setCMode]=useState("organic");
  const [adTierIdx,setAdTierIdx]=useState(1);
  const [adObj,setAdObj]=useState("OUTCOME_TRAFFIC");
  const [adStatus,setAdStatus]=useState("idle");
  const [adResult,setAdResult]=useState(null);
  const [adErr,setAdErr]=useState(null);
  const {event,phases,adCreative}=flyer||{};
  const tier=BUDGET_TIERS[adTierIdx];
  const hasAdAccount=!!(settings.adAccountId&&settings.pageId&&settings.pageToken);

  const launchAd=async()=>{
    setAdStatus("launching");setAdErr(null);
    try{const r=await createAdCampaign({adAccountId:settings.adAccountId,pageId:settings.pageId,pageToken:settings.pageToken,headline:adCreative?.headline||event?.name||"Beacon Hills Event",primaryText:adCreative?.primaryText||event?.description||"",ctaType:adCreative?.ctaType||"LEARN_MORE",base64:image.base64,mime:image.mime,dailyBudget:tier.daily,objective:adObj});setAdResult(r);setAdStatus("success");}
    catch(e){setAdErr(e.message);setAdStatus("error");}
  };

  return(<div style={{flex:1,overflowY:"auto",paddingBottom:100}}>
    {/* Event card */}
    <div style={{display:"flex",gap:12,padding:"14px 14px 0",alignItems:"flex-start"}}>
      <img src={image.preview} style={{width:80,height:80,objectFit:"cover",borderRadius:10,flexShrink:0,border:"1px solid #2a2a2a"}} alt="flyer"/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:17,fontWeight:700,color:"#f0ead6",lineHeight:1.3}}>{event?.name}</div>
        {event?.date&&<div style={{fontSize:13,color:GOLD,marginTop:5}}>{event.date}{event?.time?" at "+event.time:""}</div>}
        {event?.location&&<div style={{fontSize:12,color:"#888",marginTop:3}}>{event.location}</div>}
        {event?.price&&<div style={{fontSize:12,color:"#a8f0a8",marginTop:3}}>{event.price}</div>}
      </div>
    </div>
    {event?.description&&<div style={{margin:"10px 14px 0",fontSize:13,color:"#888",lineHeight:1.55,padding:12,background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a"}}>{event.description}</div>}

    {/* Mode toggle */}
    <div style={{display:"flex",gap:8,padding:"14px 14px 0"}}>
      <button style={{flex:1,padding:"11px 8px",borderRadius:10,border:"1px solid",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"Georgia,serif",background:cMode==="organic"?GOLD:"#1c1c1c",borderColor:cMode==="organic"?GOLD:"#333",color:cMode==="organic"?"#141414":"#c8c0ae"}} onClick={()=>setCMode("organic")}>Free Posts</button>
      <button style={{flex:1,padding:"11px 8px",borderRadius:10,border:"1px solid",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"Georgia,serif",background:cMode==="paid"?"#1a1035":"#1c1c1c",borderColor:cMode==="paid"?"#5a2a9a":"#333",color:cMode==="paid"?"#c8b0f5":"#c8c0ae"}} onClick={()=>setCMode("paid")}>Paid Campaign</button>
    </div>

    {/* ORGANIC: phases */}
    {cMode==="organic"&&phases?.map((phase,pi)=>(
      <div key={phase.id||pi}>
        <div style={{margin:"14px 14px 0",background:"linear-gradient(135deg,#1a1a1a,#141414)",borderRadius:"12px 12px 0 0",padding:"12px 14px",border:"1px solid #2a2a2a",borderBottom:"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#f0ead6"}}>{phase.label}</div>
            <div style={{fontSize:10,color:GOLD,marginTop:3,letterSpacing:1}}>{phase.timing?.toUpperCase()}</div>
          </div>
          <div style={{fontSize:11,color:"#555",textAlign:"right",maxWidth:130,lineHeight:1.4}}>{phase.goal}</div>
        </div>
        {phase.posts?.map((post,posti)=>{
          const plat=PLATFORMS.find(p=>p.label.toLowerCase()===(post.platform||"").toLowerCase())||PLATFORMS[0];
          return <PlatformCard key={posti} result={post} platform={plat} imageBase64={image.base64} imageMime={image.mime} settings={settings}/>;
        })}
      </div>
    ))}

    {/* PAID: ad campaign */}
    {cMode==="paid"&&<div style={{padding:"14px 14px 0"}}>
      {adCreative&&<div style={{background:"#0a0a14",borderRadius:12,padding:14,marginBottom:14,border:"1px solid #1a1a30"}}>
        <div style={{fontSize:10,letterSpacing:2,color:GOLD,marginBottom:10,textTransform:"uppercase"}}>Event Ad Creative</div>
        <div style={{marginBottom:8}}><div style={{fontSize:9,color:"#444",letterSpacing:1.5,marginBottom:3}}>HEADLINE ({adCreative.headline?.length||0}/40)</div><div style={{fontSize:15,fontWeight:700,color:"#f0ead6"}}>{adCreative.headline}</div></div>
        <div style={{marginBottom:8}}><div style={{fontSize:9,color:"#444",letterSpacing:1.5,marginBottom:3}}>PRIMARY TEXT ({adCreative.primaryText?.length||0}/125)</div><div style={{fontSize:13,color:"#c8c0ae",lineHeight:1.5}}>{adCreative.primaryText}</div></div>
        {adCreative.campaignNote&&<div style={{marginTop:10,padding:10,background:"#0a1020",borderRadius:8,fontSize:11,color:"#555",lineHeight:1.5}}>{adCreative.campaignNote}</div>}
      </div>}
      <div style={{fontSize:10,letterSpacing:2,color:GOLD,marginBottom:10,textTransform:"uppercase"}}>Campaign Objective</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
        {AD_OBJECTIVES.map(o=><button key={o.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:adObj===o.id?"#1a1035":"#0a0a14",border:`1px solid ${adObj===o.id?"#4a2a8a":"#1a1a30"}`,borderRadius:10,cursor:"pointer",textAlign:"left"}} onClick={()=>setAdObj(o.id)}><span style={{fontSize:18}}>{o.icon}</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:adObj===o.id?"#c8b0f5":"#c8c0ae"}}>{o.label}</div><div style={{fontSize:11,color:"#555",marginTop:2}}>{o.desc}</div></div>{adObj===o.id&&<span style={{color:"#9b7ef5",fontSize:14}}>✓</span>}</button>)}
      </div>
      <div style={{fontSize:10,letterSpacing:2,color:GOLD,marginBottom:10,textTransform:"uppercase"}}>Daily Budget</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
        {BUDGET_TIERS.map((t,i)=><button key={i} style={{padding:"12px 10px",background:adTierIdx===i?"#0f1f0f":"#0a0a14",border:`1px solid ${adTierIdx===i?"#2a5a2a":"#1a1a30"}`,borderRadius:12,cursor:"pointer",textAlign:"center"}} onClick={()=>setAdTierIdx(i)}><div style={{fontSize:20,fontWeight:700,color:adTierIdx===i?GOLD:"#f0ead6"}}>${t.daily}<span style={{fontSize:11,fontWeight:400,color:"#555"}}>/day</span></div><div style={{fontSize:10,color:adTierIdx===i?"#a8f0a8":"#555",marginTop:3}}>{t.label}</div></button>)}
      </div>
      <div style={{background:"#0a150a",borderRadius:12,padding:14,marginBottom:14,border:"1px solid #1a3a1a"}}>
        <div style={{fontSize:10,letterSpacing:2,color:"#4caf50",marginBottom:10,textTransform:"uppercase"}}>Projected Results - ${tier.daily}/day</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[{lbl:"Daily Reach",val:tier.reach[0].toLocaleString()+"-"+tier.reach[1].toLocaleString()},{lbl:"Weekly Impressions",val:(tier.impr[0]/1000).toFixed(1)+"k-"+(tier.impr[1]/1000).toFixed(1)+"k"},{lbl:"Weekly Clicks",val:tier.clicks[0]+"-"+tier.clicks[1]},{lbl:"Est. Conversions",val:tier.res[0]+"-"+tier.res[1]+"/wk"}].map(({lbl,val})=><div key={lbl} style={{background:"#0a1a0a",borderRadius:8,padding:"10px 12px",border:"1px solid #1a3a1a"}}><div style={{fontSize:16,fontWeight:700,color:"#a8f0a8"}}>{val}</div><div style={{fontSize:10,color:"#4a7a4a",marginTop:3}}>{lbl}</div></div>)}
        </div>
      </div>
      {adStatus==="success"?(
        <div style={{background:"#0a150a",borderRadius:12,padding:14,border:"1px solid #2e5e2e"}}><div style={{fontSize:14,fontWeight:700,color:"#a8f0a8",marginBottom:8}}>Campaign Created!</div><div style={{fontSize:12,color:"#666",lineHeight:1.8,marginBottom:12}}>Campaign ID: <strong style={{color:"#c8c0ae"}}>{adResult?.campaignId}</strong> - Status: <strong style={{color:GOLD}}>PAUSED</strong></div><button style={{...S.copyBtn,background:GOLD}} onClick={()=>window.open("https://business.facebook.com/adsmanager","_blank")}>Open Meta Ads Manager</button></div>
      ):!hasAdAccount?(
        <div style={{background:"#150d25",borderRadius:12,padding:14,border:"1px solid #3a1a5a"}}><div style={{fontSize:13,color:"#c8b0f5",lineHeight:1.7}}>Add your Ad Account ID in Settings to launch paid event campaigns.</div></div>
      ):(
        <div>{adErr&&<div style={{background:"#2a0f0f",borderRadius:10,padding:12,marginBottom:10,color:"#ff8a8a",fontSize:13,border:"1px solid #5a1f1f"}}>{adErr}</div>}<button style={{...S.copyBtn,background:adStatus==="launching"?"#2a2a2a":"linear-gradient(135deg,#2a1040,#0a1535)",color:"#c8b0f5",border:"1px solid #4a2a8a",opacity:adStatus==="launching"?0.6:1,fontSize:15}} onClick={launchAd} disabled={adStatus==="launching"}>{adStatus==="launching"?"Launching...":"Launch Event Campaign - $"+tier.daily+"/day"}</button><div style={{fontSize:11,color:"#2e1f50",textAlign:"center",marginTop:8}}>Created PAUSED - review in Ads Manager before going live</div></div>
      )}
    </div>}
  </div>);
}


// ─── PlatformCard ─────────────────────────────────────────────────────────────
function PlatformCard({result,platform,imageBase64,imageMime,settings}){
  const [caption,setCaption]=useState(result.caption);
  const [hashtags,setHashtags]=useState(result.hashtags||[]);
  const [mode,setMode]=useState("view");
  const [editCap,setEditCap]=useState(result.caption);
  const [editTags,setEditTags]=useState((result.hashtags||[]).join(" "));
  const [feedback,setFeedback]=useState("");
  const [refining,setRefining]=useState(false);
  const [copied,setCopied]=useState(false);
  const [showSched,setShowSched]=useState(false);
  const [scheduling,setSched]=useState(false);
  const [schedMsg,setSchedMsg]=useState(null);
  const isEdited=caption!==result.caption;
  const full=`${caption}\n\n${hashtags.join(" ")}`.trim();
  const copy=()=>copyText(full).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);});
  const saveEdit=()=>{setCaption(editCap.trim());setHashtags(editTags.trim().split(/\s+/).filter(h=>h.startsWith("#")));setMode("view");};
  const cancelEdit=()=>{setEditCap(caption);setEditTags(hashtags.join(" "));setMode("view");};
  const handleRefine=async()=>{if(!feedback.trim())return;setRefining(true);
    try{const u=await refineCaption({caption,hashtags,platform:platform.label,feedback,apiKey:settings.anthropicApiKey||""});if(u.caption){setCaption(u.caption);setEditCap(u.caption);}if(u.hashtags?.length){setHashtags(u.hashtags);setEditTags(u.hashtags.join(" "));}setFeedback("");setMode("view");}
    catch{}setRefining(false);};
  const handleSchedule=async(scheduledTime)=>{setSched(true);setSchedMsg(null);
    try{if(platform.id==="facebook")await scheduleFacebook({pageId:settings.pageId,pageToken:settings.pageToken,caption,hashtags,base64:imageBase64,mime:imageMime||"image/jpeg",scheduledTime});
    else if(platform.id==="instagram")await scheduleInstagram({igUserId:settings.igUserId,pageToken:settings.pageToken,imgbbKey:settings.imgbbKey,caption,hashtags,base64:imageBase64,scheduledTime});
    const d=new Date(scheduledTime*1000);setSchedMsg({ok:true,text:`Scheduled for ${d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})} at ${d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}`});setShowSched(false);}
    catch(err){setSchedMsg({ok:false,text:err.message||"Scheduling failed."});setShowSched(false);}setSched(false);};
  return(
    <div style={S.card}>
      {copied&&<div style={S.toast}><span style={{fontSize:20}}>✅</span><div><div style={{fontWeight:700,fontSize:15}}>Copied to clipboard!</div><div style={{fontSize:12,opacity:0.8,marginTop:2}}>{platform.label} caption + hashtags</div></div></div>}
      {showSched&&<ScheduleModal platform={platform} settings={settings||{}} scheduling={scheduling} onConfirm={handleSchedule} onCancel={()=>setShowSched(false)}/>}
      <div style={{...S.cardHead,background:platform.bg}}>
        <span style={{fontSize:20}}>{platform.icon}</span>
        <span style={S.platformName}>{platform.label}</span>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {isEdited&&<span style={{fontSize:9,letterSpacing:1,color:"rgba(255,255,255,0.6)",background:"rgba(0,0,0,0.3)",borderRadius:4,padding:"2px 5px"}}>EDITED</span>}
          <span style={{fontSize:11,color:"rgba(255,255,255,0.7)",fontFamily:"monospace"}}>{full.length}/{platform.maxChars}</span>
        </div>
      </div>
      <div style={S.cardBody}>
        {mode==="view"&&(<>
          <p style={S.caption}>{caption}</p>
          {hashtags.length>0&&<div style={S.tagWrap}>{hashtags.map(h=> <span key={h} style={S.tag}>{h}</span>)}</div>}
          <div style={S.metaBox}>
            <div><span style={S.metaLbl}>⏰ Best time</span><span style={S.metaVal}>{result.postingTime}</span></div>
            <div style={{marginTop:6}}><span style={S.metaLbl}>📷 Photo tip</span><span style={S.metaVal}>{result.photoTip}</span></div>
          </div>
          {schedMsg&&<div style={{borderRadius:10,padding:"10px 12px",marginBottom:10,background:schedMsg.ok?"#0f1a0f":"#2a0f0f",border:`1px solid ${schedMsg.ok?"#2e5e2e":"#5a1f1f"}`,fontSize:13,color:schedMsg.ok?"#a8f0a8":"#ff8a8a"}}>{schedMsg.ok?"📅 "+schedMsg.text:"❌ "+schedMsg.text}</div>}
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <button style={S.actionBtn} onClick={()=>{setEditCap(caption);setEditTags(hashtags.join(" "));setMode("edit");}}>✏️ Edit</button>
            <button style={{...S.actionBtn,borderColor:"#3a2e10",color:GOLD}} onClick={()=>setMode("refine")}>✨ Refine</button>
            {isEdited&&<button style={{...S.actionBtn,borderColor:"#3a1010",color:"#ff8a8a",flex:"0 0 auto",padding:"8px 10px"}} onClick={()=>{setCaption(result.caption);setHashtags(result.hashtags||[]);setEditCap(result.caption);setEditTags((result.hashtags||[]).join(" "));}}>↺</button>}
          </div>
          <button style={{...S.copyBtn,background:copied?"#22c55e":GOLD,transform:copied?"scale(0.97)":"scale(1)",transition:"all 0.15s",marginBottom:imageBase64&&platform.canSchedule?8:0}} onClick={copy}>{copied?"✓  Copied!":"Copy Caption + Tags"}</button>
          {imageBase64&&platform.canSchedule&&<button style={{...S.copyBtn,background:"#1a1f2e",color:"#7eb8f7",border:"1px solid #2a3a5a"}} onClick={()=>{setSchedMsg(null);setShowSched(true);}}>📅 Schedule in Meta Business Suite</button>}
        </>)}
        {mode==="edit"&&(<>
          <div style={{fontSize:10,letterSpacing:2,color:GOLD,marginBottom:8,textTransform:"uppercase"}}>Edit Caption</div>
          <textarea style={{...S.textarea,minHeight:120,marginBottom:12}} value={editCap} onChange={e=>setEditCap(e.target.value)} autoFocus/>
          <div style={{fontSize:10,letterSpacing:2,color:GOLD,marginBottom:8,textTransform:"uppercase"}}>Hashtags <span style={{color:"#555",fontWeight:400}}>(space-separated)</span></div>
          <textarea style={{...S.textarea,minHeight:60,marginBottom:12,fontSize:13}} value={editTags} onChange={e=>setEditTags(e.target.value)} placeholder="#hashtag1 #hashtag2"/>
          <div style={{display:"flex",gap:8}}><button style={{...S.copyBtn,background:GOLD,flex:1}} onClick={saveEdit}>✓ Save Changes</button><button style={{...S.copyBtn,background:"#2a2a2a",color:"#888",flex:"0 0 80px"}} onClick={cancelEdit}>Cancel</button></div>
        </>)}
        {mode==="refine"&&(<>
          <div style={{fontSize:10,letterSpacing:2,color:GOLD,marginBottom:8,textTransform:"uppercase"}}>Current caption</div>
          <p style={{...S.caption,opacity:0.5,fontSize:13,marginBottom:12}}>{caption}</p>
          <div style={{fontSize:10,letterSpacing:2,color:GOLD,marginBottom:8,textTransform:"uppercase"}}>How should I improve it?</div>
          <textarea style={{...S.textarea,minHeight:80,marginBottom:12}} value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder={"e.g. \"Make it shorter\"\n\"More urgency\"\n\"Emphasize the truffle\""} autoFocus disabled={refining}/>
          <div style={{display:"flex",gap:8}}>
            <button style={{...S.copyBtn,background:refining?"#2a2a2a":GOLD,flex:1,opacity:(!feedback.trim()||refining)?0.5:1}} onClick={handleRefine} disabled={!feedback.trim()||refining}>{refining?"Refining…":"✨ Refine Caption"}</button>
            <button style={{...S.copyBtn,background:"#2a2a2a",color:"#888",flex:"0 0 80px"}} onClick={()=>{setMode("view");setFeedback("");}} disabled={refining}>Cancel</button>
          </div>
          {refining&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,color:"#666",fontSize:12}}><div style={{width:14,height:14,borderRadius:"50%",border:"2px solid #333",borderTop:`2px solid ${GOLD}`,animation:"spin 0.8s linear infinite",flexShrink:0}}/>Rewriting for {platform.label}…</div>}
        </>)}
      </div>
    </div>
  );
}

// ─── IdeaCard ─────────────────────────────────────────────────────────────────
function IdeaCard({idea,onStart}){
  const [expanded,setExpanded]=useState(false);
  const urgencyColor=idea.urgency==="This Week"?"#ff6b6b":idea.urgency==="This Month"?GOLD:"#555";
  const typeColor={"Seasonal":"#4caf50","Trending":"#e1306c","Event":"#1877f2","Chef Feature":GOLD,"Menu Spotlight":"#00c9d4","Community":"#9b7ef5","Elmwood Room":"#f0a84c"}[idea.type]||"#888";
  return(
    <div style={{margin:"10px 14px 0",background:"#1a1a1a",borderRadius:14,overflow:"hidden",border:"1px solid #2a2a2a"}}>
      {/* Header */}
      <div style={{padding:"14px 14px 12px",cursor:"pointer"}} onClick={()=>setExpanded(e=>!e)}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8}}>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:700,color:"#f0ead6",lineHeight:1.3,marginBottom:6}}>{idea.title}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <span style={{fontSize:9,letterSpacing:1.5,color:typeColor,background:typeColor+"22",borderRadius:4,padding:"2px 7px",textTransform:"uppercase"}}>{idea.type}</span>
              <span style={{fontSize:9,letterSpacing:1.5,color:urgencyColor,background:urgencyColor+"22",borderRadius:4,padding:"2px 7px",textTransform:"uppercase"}}>{idea.urgency}</span>
              <span style={{fontSize:9,letterSpacing:1.5,color:"#555",background:"#222",borderRadius:4,padding:"2px 7px",textTransform:"uppercase"}}>Effort: {idea.effort}</span>
            </div>
          </div>
          <span style={{color:"#444",fontSize:16,flexShrink:0,marginTop:2}}>{expanded?"▲":"▼"}</span>
        </div>
        <div style={{fontSize:12,color:"#888",lineHeight:1.55}}>{idea.whyNow}</div>
      </div>

      {/* Expanded content */}
      {expanded&&<div style={{borderTop:"1px solid #222",padding:14}}>
        <div style={{fontSize:13,color:"#c8c0ae",lineHeight:1.6,marginBottom:14}}>{idea.concept}</div>

        {idea.trendSource&&<div style={{background:"#0a1020",borderRadius:8,padding:"8px 12px",marginBottom:14,border:"1px solid #1a2a50",fontSize:11,color:"#7eb8f7"}}>
          Trend: {idea.trendSource}
        </div>}

        {idea.posts?.length>0&&(<>
          <div style={{fontSize:10,letterSpacing:2,color:GOLD,marginBottom:8,textTransform:"uppercase"}}>Post Ideas</div>
          {idea.posts.map((p,i)=>(
            <div key={i} style={{background:"#111",borderRadius:8,padding:"10px 12px",marginBottom:8,border:"1px solid #222"}}>
              <div style={{display:"flex",gap:6,marginBottom:5}}>
                <span style={{fontSize:9,color:p.platform==="Instagram"?"#e1306c":p.platform==="Facebook"?"#1877f2":"#888",background:"#1a1a1a",borderRadius:4,padding:"2px 6px",letterSpacing:1}}>{p.platform}</span>
                <span style={{fontSize:9,color:"#555",background:"#1a1a1a",borderRadius:4,padding:"2px 6px",letterSpacing:1}}>{p.format}</span>
              </div>
              <div style={{fontSize:12,color:"#888",lineHeight:1.5}}>{p.idea}</div>
            </div>
          ))}
        </>)}

        {idea.hashtags?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
          {idea.hashtags.map(h=><span key={h} style={{fontSize:11,color:GOLD,background:"#1f1a0e",borderRadius:6,padding:"3px 8px",border:"1px solid #3a2e10"}}>{h}</span>)}
        </div>}

        <div style={{background:"#0a150a",borderRadius:8,padding:"10px 12px",marginBottom:14,border:"1px solid #1a3a1a",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:10,color:"#4caf50",letterSpacing:1.5,marginBottom:2}}>PAID RECOMMENDATION</div>
            <div style={{fontSize:13,color:"#a8f0a8"}}>{idea.paidRecommendation}{idea.suggestedBudget?" - "+idea.suggestedBudget:""}</div>
          </div>
          {idea.dishes?.length>0&&<div style={{textAlign:"right"}}>
            <div style={{fontSize:10,color:GOLD,letterSpacing:1.5,marginBottom:2}}>FEATURES</div>
            <div style={{fontSize:11,color:"#888"}}>{idea.dishes.slice(0,2).join(", ")}</div>
          </div>}
        </div>

        <button style={{width:"100%",background:"linear-gradient(135deg,"+GOLD+",#a0792e)",color:"#141414",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif"}}
          onClick={()=>onStart(idea)}>
          Start This Campaign
        </button>
      </div>}
    </div>
  );
}

// ─── IdeasTab ─────────────────────────────────────────────────────────────────
function IdeasTab({onStartCampaign,apiKey}){
  const [ideas,setIdeas]=useState(null);
  const [loading,setLoading]=useState(false);
  const [loadStep,setLoadStep]=useState("");
  const [err,setErr]=useState(null);
  const [lastUpdated,setLastUpdated]=useState(null);

  useEffect(()=>{
    loadIdeas().then(cached=>{
      if(cached?.ideas&&cached?.timestamp){
        const age=Date.now()-cached.timestamp;
        if(age<24*60*60*1000){setIdeas(cached.ideas);setLastUpdated(cached.timestamp);return;}
      }
      fetchIdeas();
    });
  },[]);

  const fetchIdeas=async()=>{
    setLoading(true);setErr(null);
    const steps=["Searching for Omaha events...","Scanning food trends...","Checking social media trends...","Building your campaign ideas..."];
    let si=0;setLoadStep(steps[0]);
    const iv=setInterval(()=>{si=(si+1)%steps.length;setLoadStep(steps[si]);},2200);
    try{
      const data=await generateCampaignIdeas(apiKey);
      clearInterval(iv);
      const cached={ideas:data,timestamp:Date.now()};
      setIdeas(data);setLastUpdated(Date.now());
      await saveIdeas(cached);
    }catch(e){clearInterval(iv);setErr("Could not generate ideas. Check connection and try again.");}
    setLoading(false);
  };

  const timeAgo=ts=>{const m=Math.floor((Date.now()-ts)/60000);return m<1?"just now":m<60?m+"m ago":Math.floor(m/60)+"h ago";};

  return(<div style={{flex:1,overflowY:"auto",padding:"0 0 100px"}}>
    {/* Header bar */}
    <div style={{padding:"14px 14px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <div style={{fontSize:10,letterSpacing:2,color:GOLD,textTransform:"uppercase"}}>Live Web Search + AI Strategy</div>
        {lastUpdated&&!loading&&<div style={{fontSize:11,color:"#555",marginTop:2}}>Updated {timeAgo(lastUpdated)}</div>}
      </div>
      <button style={{background:"#1c1c1c",border:"1px solid #333",color:GOLD,borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif",opacity:loading?0.5:1}} onClick={fetchIdeas} disabled={loading}>
        {loading?"Searching...":"Refresh"}
      </button>
    </div>

    {/* Loading */}
    {loading&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"50px 40px",textAlign:"center"}}>
      <div style={{width:56,height:56,borderRadius:"50%",border:"3px solid #2a2a2a",borderTop:"3px solid "+GOLD,animation:"spin 1s linear infinite",marginBottom:20}}/>
      <div style={{fontSize:16,fontWeight:600,color:"#f0ead6",marginBottom:8}}>Researching your market...</div>
      <div style={{fontSize:13,color:"#555"}}>{loadStep}</div>
    </div>}

    {/* Error */}
    {err&&!loading&&<div style={{margin:"14px",padding:14,background:"#2a0f0f",borderRadius:12,border:"1px solid #5a1f1f",color:"#ff8a8a",fontSize:13}}>{err}</div>}

    {/* Ideas */}
    {ideas&&!loading&&(<>
      <div style={{padding:"10px 14px 0",fontSize:11,color:"#555",lineHeight:1.6}}>
        Based on today's trends, local Omaha events, and Beacon Hills' strengths.
      </div>
      {ideas.map(idea=> <IdeaCard key={idea.id||idea.title} idea={idea} onStart={onStartCampaign}/>)}
      <div style={{margin:"14px",padding:12,background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",fontSize:11,color:"#444",textAlign:"center",lineHeight:1.6}}>
        Ideas refresh daily. Tap Refresh to pull the latest trends anytime.
      </div>
    </>)}

    {/* Empty state */}
    {!ideas&&!loading&&!err&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"60px 40px",textAlign:"center"}}>
      <div style={{fontSize:48,marginBottom:12}}>💡</div>
      <div style={{fontSize:16,color:"#888"}}>No ideas yet.</div>
      <button style={{marginTop:16,background:GOLD,color:"#141414",border:"none",borderRadius:10,padding:"12px 24px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif"}} onClick={fetchIdeas}>Generate Ideas</button>
    </div>}
  </div>);
}


// ─── HistoryCard ──────────────────────────────────────────────────────────────
function HistoryCard({post,onDelete,onReuse,settings}){
  const [expanded,setExpanded]=useState(false);
  const date=new Date(post.id).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  const time=new Date(post.id).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
  return(
    <div style={S.hCard}>
      <div style={S.hCardTop} onClick={()=>setExpanded(e=>!e)}>
        {post.thumb?<img src={post.thumb} alt="" style={S.hThumb}/>:<div style={{...S.hThumb,background:"#2a2a2a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🍽️</div>}
        <div style={{flex:1,minWidth:0}}>
          <div style={S.hDate}>{date} · {time}</div>
          <div style={S.hPlatforms}>{post.platforms?.map(pid=>{const p=PLATFORMS.find(x=>x.id===pid);return p? <span key={pid} style={{...S.hPill,background:p.color}}>{p.icon} {p.label}</span>:null;})}</div>
          <div style={S.hPreview}>{post.results?.[0]?.caption?.slice(0,80)}…</div>
          {post.tone&&<div style={S.hMeta}>{post.tone} · {post.goal}</div>}
        </div>
        <span style={{color:"#555",fontSize:18,paddingLeft:8}}>{expanded?"▲":"▼"}</span>
      </div>
      {expanded&&(
        <div style={{borderTop:"1px solid #2a2a2a",paddingBottom:12}}>
          {post.results?.map((r,i)=>{const plat=PLATFORMS.find(p=>p.label.toLowerCase()===r.platform?.toLowerCase())||PLATFORMS[0];return <PlatformCard key={i} result={r} platform={plat} settings={settings||{}}/>;} )}
          <div style={{display:"flex",gap:10,padding:"10px 14px 0"}}>
            <button style={S.hReuse} onClick={()=>onReuse(post)}>♻️ Reuse Settings</button>
            <button style={S.hDelete} onClick={()=>onDelete(post.id)}>🗑 Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AnalyticsTab ─────────────────────────────────────────────────────────────
function StatCard({label,value,sub,accent}){return(<div style={{background:"#1a1a1a",borderRadius:14,padding:"14px 16px",border:`1px solid ${accent?GOLD+"55":"#2a2a2a"}`,flex:1,minWidth:0}}><div style={{fontSize:26,fontWeight:700,color:accent?GOLD:"#f0ead6",lineHeight:1}}>{value}</div><div style={{fontSize:11,letterSpacing:1.5,color:GOLD,marginTop:4,textTransform:"uppercase"}}>{label}</div>{sub&&<div style={{fontSize:11,color:"#666",marginTop:3}}>{sub}</div>}</div>);}
function HBarRow({name,value,max,color}){const pct=max>0?(value/max)*100:0;return(<div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:"#c8c0ae"}}>{name}</span><span style={{fontSize:12,color:"#666"}}>{value}</span></div><div style={{background:"#2a2a2a",borderRadius:4,height:6,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:color||GOLD,borderRadius:4,transition:"width 0.6s ease"}}/></div></div>);}
const CT=({active,payload})=>active&&payload?.length?<div style={{background:"#1a1a1a",border:"1px solid #333",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#f0ead6"}}><div style={{color:GOLD,fontWeight:700}}>{payload[0].value} post{payload[0].value!==1?"s":""}</div></div>:null;
function AnalyticsTab({history}){
  const a=useMemo(()=>computeAnalytics(history),[history]);
  if(!history.length||!a)return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 40px",textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>📊</div><div style={{fontSize:16,color:"#888"}}>No data yet.</div></div>);
  const hC=n=>n===0?"#1e1e1e":n===1?"#5a3e1b":n===2?"#8a5f28":GOLD;
  return(<div style={{padding:"16px 14px 100px"}}>
    <div style={{display:"flex",gap:8,marginBottom:8}}><StatCard label="Total Posts" value={a.total} accent/><StatCard label="This Month" value={a.thisMonth} sub="last 30 days"/></div>
    <div style={{display:"flex",gap:8,marginBottom:20}}><StatCard label="This Week" value={a.thisWeek}/><StatCard label="Streak" value={`${a.streak}d`} sub={`Most active: ${a.bestDay}`}/></div>
    <div style={{background:"#1a1a1a",borderRadius:14,padding:16,marginBottom:14,border:"1px solid #2a2a2a"}}>
      <div style={{fontSize:10,letterSpacing:2,color:GOLD,marginBottom:12,textTransform:"uppercase"}}>Posting Calendar</div>
      <div style={{display:"flex",gap:3,overflowX:"auto"}}>{a.heatmap.map((wk,wi)=><div key={wi} style={{display:"flex",flexDirection:"column",gap:3}}>{wk.map((d,di)=><div key={di} style={{width:24,height:24,borderRadius:5,background:hC(d.count),flexShrink:0}}/>)}</div>)}</div>
      <div style={{display:"flex",gap:8,marginTop:10,alignItems:"center"}}><span style={{fontSize:10,color:"#555"}}>Less</span>{[0,1,2,3].map(n=><div key={n} style={{width:12,height:12,borderRadius:3,background:hC(n)}}/>)}<span style={{fontSize:10,color:"#555"}}>More</span></div>
    </div>
    <div style={{background:"#1a1a1a",borderRadius:14,padding:16,marginBottom:14,border:"1px solid #2a2a2a"}}>
      <div style={{fontSize:10,letterSpacing:2,color:GOLD,marginBottom:14,textTransform:"uppercase"}}>Posts Per Week (Last 8 Weeks)</div>
      <ResponsiveContainer width="100%" height={140}><BarChart data={a.weekBuckets} barCategoryGap="30%"><XAxis dataKey="label" tick={{fontSize:10,fill:"#555"}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{fontSize:10,fill:"#555"}} axisLine={false} tickLine={false} width={20}/><Tooltip content={<CT/>} cursor={{fill:"rgba(201,168,76,0.05)"}}/><Bar dataKey="posts" radius={[4,4,0,0]}>{a.weekBuckets.map((e,i)=><Cell key={i} fill={e.posts>0?GOLD:"#2a2a2a"}/>)}</Bar></BarChart></ResponsiveContainer>
    </div>
    <div style={{background:"#1a1a1a",borderRadius:14,padding:16,marginBottom:14,border:"1px solid #2a2a2a"}}>
      <div style={{fontSize:10,letterSpacing:2,color:GOLD,marginBottom:14,textTransform:"uppercase"}}>Platform Usage</div>
      <div style={{display:"flex",gap:12,alignItems:"center"}}>
        <PieChart width={110} height={110}><Pie data={a.platformData} dataKey="value" cx={50} cy={50} innerRadius={28} outerRadius={50} paddingAngle={3}>{a.platformData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie></PieChart>
        <div style={{flex:1}}>{a.platformData.map(p=><div key={p.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{width:10,height:10,borderRadius:"50%",background:p.color,flexShrink:0}}/><span style={{fontSize:13,color:"#c8c0ae",flex:1}}>{p.icon} {p.name}</span><span style={{fontSize:13,fontWeight:700,color:"#f0ead6"}}>{p.value}</span></div>)}</div>
      </div>
    </div>
    <div style={{background:"#1a1a1a",borderRadius:14,padding:16,marginBottom:14,border:"1px solid #2a2a2a"}}><div style={{fontSize:10,letterSpacing:2,color:GOLD,marginBottom:14,textTransform:"uppercase"}}>Tone Usage</div>{a.toneData.map(t=><HBarRow key={t.name} name={t.name} value={t.value} max={a.maxTone} color={GOLD}/>)}</div>
    <div style={{background:"#1a1a1a",borderRadius:14,padding:16,border:"1px solid #2a2a2a"}}>
      <div style={{fontSize:10,letterSpacing:2,color:GOLD,marginBottom:12,textTransform:"uppercase"}}>Insights</div>
      {a.platformData[0]&&<div style={S.insightRow}><span style={S.insightIcon}>🏆</span><span style={S.insightText}>Top platform: <strong style={{color:"#f0ead6"}}>{a.platformData[0].icon} {a.platformData[0].name}</strong> ({a.platformData[0].value} post{a.platformData[0].value!==1?"s":""})</span></div>}
      {a.toneData[0]&&<div style={S.insightRow}><span style={S.insightIcon}>🎨</span><span style={S.insightText}>Favourite tone: <strong style={{color:"#f0ead6"}}>{a.toneData[0].name}</strong></span></div>}
      {a.goalData[0]&&<div style={S.insightRow}><span style={S.insightIcon}>🎯</span><span style={S.insightText}>Primary goal: <strong style={{color:"#f0ead6"}}>{a.goalData[0].name}</strong></span></div>}
      <div style={S.insightRow}><span style={S.insightIcon}>📅</span><span style={S.insightText}>Most active day: <strong style={{color:"#f0ead6"}}>{a.bestDay}</strong></span></div>
      {a.streak>1&&<div style={S.insightRow}><span style={S.insightIcon}>🔥</span><span style={S.insightText}><strong style={{color:GOLD}}>{a.streak}-day posting streak</strong> — keep it going!</span></div>}
    </div>
  </div>);
}

// ─── SettingsTab ──────────────────────────────────────────────────────────────
function SettingsTab({settings,onSave}){
  const [anthropicApiKey,setAnthropicApiKey]=useState(settings.anthropicApiKey||"");
  const [pageId,setPageId]=useState(settings.pageId||"");
  const [pageToken,setPageToken]=useState(settings.pageToken||"");
  const [igUserId,setIgUserId]=useState(settings.igUserId||"");
  const [imgbbKey,setImgbbKey]=useState(settings.imgbbKey||"");
  const [adAccountId,setAdAccountId]=useState(settings.adAccountId||"");
  const [saved,setSaved]=useState(false);
  const [testing,setTesting]=useState(false);
  const [testMsg,setTestMsg]=useState(null);
  const [showGuide,setShowGuide]=useState(false);

  const handleSave=async()=>{
    const s={anthropicApiKey:anthropicApiKey.trim(),pageId:pageId.trim(),pageToken:pageToken.trim(),igUserId:igUserId.trim(),imgbbKey:imgbbKey.trim(),adAccountId:adAccountId.trim()};
    await saveSettings(s);onSave(s);setSaved(true);setTimeout(()=>setSaved(false),2000);};
  const handleTest=async()=>{
    if(!pageToken.trim()||!pageId.trim()){setTestMsg({ok:false,text:"Enter Page ID and Token first."});return;}
    setTesting(true);setTestMsg(null);
    try{const res=await fetch(`${GRAPH}/${pageId.trim()}?fields=name,fan_count&access_token=${pageToken.trim()}`);const d=await res.json();if(d.error)throw new Error(d.error.message);setTestMsg({ok:true,text:`✓ Connected to "${d.name}" (${(d.fan_count||0).toLocaleString()} followers)`});}
    catch(err){setTestMsg({ok:false,text:`✗ ${err.message}`});}setTesting(false);};

  const secretInputStyle={width:"100%",background:"#1c1c1c",border:"1px solid #333",borderRadius:10,color:"#f0ead6",padding:"10px 14px",fontSize:14,fontFamily:"Georgia,serif",boxSizing:"border-box"};
  const Field=({label,value,onChange,placeholder,hint,secret})=>(
    <div style={S.section}>
      <label style={S.lbl}>{label}</label>
      {hint&&<div style={{fontSize:11,color:"#555",marginBottom:8,lineHeight:1.5}}>{hint}</div>}
      {secret?<PasswordInput value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} inputStyle={secretInputStyle}/>:<input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={secretInputStyle}/>}
    </div>
  );

  return(<div style={{flex:1,overflowY:"auto",paddingBottom:100}}>
    <div style={{padding:"16px 16px 0"}}>
      <div style={{background:"#1a1f1a",border:"1px solid #2a3a2a",borderRadius:14,padding:14,marginBottom:4}}>
        <div style={{fontSize:13,color:"#a8d5aa",lineHeight:1.6}}>Enter your <strong>Anthropic API key</strong> to enable AI. Add Meta credentials to enable <strong>📅 Schedule</strong> and <strong>📣 Ad Campaigns</strong>.</div>
      </div>
    </div>
    <Field label="Anthropic API Key" value={anthropicApiKey} onChange={setAnthropicApiKey} placeholder="sk-ant-api03-…" hint="Required — powers all AI caption, idea, and flyer features. Get yours at console.anthropic.com." secret/>
    <button style={{...S.actionBtn,margin:"12px 16px 0",display:"block",width:"calc(100% - 32px)",textAlign:"center",padding:12,fontSize:13}} onClick={()=>setShowGuide(g=>!g)}>{showGuide?"▲ Hide Meta setup guide":"📖 How to get your Meta credentials"}</button>
    {showGuide&&(
      <div style={{margin:"10px 16px 0",background:"#111",borderRadius:14,padding:16,border:"1px solid #2a2a2a",fontSize:12,color:"#888",lineHeight:1.8}}>
        <div style={{color:GOLD,fontWeight:700,marginBottom:8,fontSize:13}}>One-time setup (~25 min)</div>
        {[
          ["1. Facebook Page Token","developers.facebook.com → Create App → Pages product → Graph API Explorer → generate token with pages_manage_posts + ads_management + instagram_content_publish → extend to long-lived (60 days)."],
          ["2. Facebook Page ID","Graph API Explorer → GET /me?fields=id,name → copy the id. Or find it under Page Settings → Page Transparency."],
          ["3. Instagram Business User ID","Graph API Explorer → GET /me/accounts → find your page → GET /{page-id}/instagram_accounts → grab the id."],
          ["4. imgBB API Key (free)","imgbb.com → free account → API → generate key. Used to host images for Instagram."],
          ["5. Ad Account ID","Meta Ads Manager → top left dropdown → your ad account → copy the ID (looks like act_123456789). Add ads_management permission to your token."],
        ].map(([title,body])=><div key={title} style={{marginBottom:12}}><div style={{color:"#c8c0ae",fontWeight:600,marginBottom:4}}>{title}</div><div>{body}</div></div>)}
      </div>
    )}
    <Field label="Facebook Page ID" value={pageId} onChange={setPageId} placeholder="123456789012345" hint="Your Beacon Hills Facebook Page ID"/>
    <Field label="Page Access Token" value={pageToken} onChange={setPageToken} placeholder="EAABsbCS..." hint="Long-lived token with pages_manage_posts + ads_management + instagram_content_publish" secret/>
    <Field label="Instagram Business User ID" value={igUserId} onChange={setIgUserId} placeholder="17841400000000" hint="Instagram Business account ID (not username)"/>
    <Field label="imgBB API Key" value={imgbbKey} onChange={setImgbbKey} placeholder="Your imgBB key" hint="Free at imgbb.com — used to host images for Instagram API" secret/>
    <Field label="Ad Account ID" value={adAccountId} onChange={setAdAccountId} placeholder="act_123456789" hint="Meta Ads Manager → your ad account ID. Required for one-tap ad campaigns."/>
    {testMsg&&<div style={{margin:"12px 16px 0",padding:12,background:testMsg.ok?"#0f1a0f":"#2a0f0f",borderRadius:10,border:`1px solid ${testMsg.ok?"#2e5e2e":"#5a1f1f"}`,fontSize:13,color:testMsg.ok?"#a8f0a8":"#ff8a8a"}}>{testMsg.text}</div>}
    <div style={{display:"flex",gap:8,padding:"16px 16px 0"}}>
      <button style={{...S.copyBtn,background:saved?"#22c55e":GOLD,flex:1,transition:"background 0.2s"}} onClick={handleSave}>{saved?"✓ Saved!":"Save Credentials"}</button>
      <button style={{...S.copyBtn,background:"#1a1f2e",color:"#7eb8f7",border:"1px solid #2a3a5a",flex:1,opacity:testing?0.5:1}} onClick={handleTest} disabled={testing}>{testing?"Testing…":"Test Connection"}</button>
    </div>
    <div style={{margin:"12px 16px 0",padding:12,background:"#1a1010",borderRadius:10,border:"1px solid #3a1a1a",fontSize:11,color:"#666",lineHeight:1.5}}>🔒 Stored only on this device. Never sent anywhere except Meta's own API.</div>
  </div>);
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function BeaconHillsSocialAgent(){
  const [tab,setTab]=useState("new");
  const [phase,setPhase]=useState("upload");
  const [images,setImages]=useState([]);
  const [tone,setTone]=useState(TONES[0]);
  const [goal,setGoal]=useState(GOALS[0]);
  const [notes,setNotes]=useState("");
  const [selPlat,setSelPlat]=useState(["instagram","facebook"]);
  const [resultGroups,setResultGroups]=useState([]);
  const [progress,setProgress]=useState({current:0,total:0});
  const [error,setError]=useState(null);
  const [history,setHistory]=useState([]);
  const [settings,setSettings]=useState({});
  const fileRef=useRef(null),cameraRef=useRef(null),flyerRef=useRef(null);
  const [flyerImage,setFlyerImage]=useState(null);
  const [flyerData,setFlyerData]=useState(null);
  const [flyerError,setFlyerError]=useState(null);

  useEffect(()=>{loadHistory().then(setHistory);loadSettings().then(setSettings);},[]);

  const handleFiles=useCallback(fileList=>{
    if(!fileList?.length)return;
    const files=Array.from(fileList).filter(f=>f.type.startsWith("image/")).slice(0,20);
    if(!files.length)return;
    Promise.all(files.map(f=>new Promise(res=>{const r=new FileReader();r.onload=e=>res({preview:e.target.result,base64:e.target.result.split(",")[1],mime:f.type||"image/jpeg",name:f.name});r.readAsDataURL(f);}))).then(imgs=>{setImages(imgs);setPhase("config");});
  },[]);

  const handleDrop=useCallback(e=>{e.preventDefault();handleFiles(e.dataTransfer.files);},[handleFiles]);
  const handleFlyerFile=useCallback(file=>{
    if(!file)return;
    const r=new FileReader();r.onload=e=>{
      const b64=e.target.result.split(",")[1];
      const img={preview:e.target.result,base64:b64,mime:file.type||"image/jpeg"};
      setFlyerImage(img);setFlyerData(null);setFlyerError(null);setPhase("flyer_analyzing");
      analyzeFlyer({imageBase64:b64,mimeType:file.type||"image/jpeg",apiKey:settings.anthropicApiKey||""})
        .then(d=>{setFlyerData(d);setPhase("flyer_campaign");})
        .catch(err=>{setFlyerError(err.message||"Could not analyze flyer.");setPhase("flyer_error");});
    };r.readAsDataURL(file);
  },[settings.anthropicApiKey]);
  const removeImage=idx=>{const u=images.filter((_,i)=>i!==idx);if(!u.length){setPhase("upload");setImages([]);}else setImages(u);};
  const togglePlat=id=>setSelPlat(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  const handleGenerate=async()=>{
    if(!images.length||selPlat.length===0)return;
    setPhase("loading");setError(null);setProgress({current:0,total:images.length});
    const active=PLATFORMS.filter(p=>selPlat.includes(p.id));
    const groups=[],newHistory=[];
    try{
      for(let i=0;i<images.length;i++){
        setProgress({current:i+1,total:images.length});
        const img=images[i];
        const data=await generateContent({imageBase64:img.base64,mimeType:img.mime,tone,goal,notes,platforms:active,apiKey:settings.anthropicApiKey||""});
        groups.push({preview:img.preview,base64:img.base64,mime:img.mime,results:data});
        const thumb=await makeThumbnail(img.preview);
        newHistory.push({id:Date.now()+i,platforms:selPlat,tone,goal,notes,results:data,thumb});
      }
      setResultGroups(groups);
      const updated=[...newHistory,...history].slice(0,100);
      setHistory(updated);await saveHistory(updated);setPhase("results");
    }catch{setError("Generation failed. Check connection and try again.");setPhase("config");}
  };

  const deletePost=async id=>{const u=history.filter(p=>p.id!==id);setHistory(u);await saveHistory(u);};
  const reuseSettings=post=>{setTone(post.tone||TONES[0]);setGoal(post.goal||GOALS[0]);setNotes(post.notes||"");setSelPlat(post.platforms||["instagram","facebook"]);setPhase("upload");setTab("new");};
  const reset=()=>{setPhase("upload");setImages([]);setResultGroups([]);setNotes("");setError(null);};

  const Header=({subtitle,showReset})=>(
    <header style={S.header}>
      <div style={S.logo}>BH</div>
      <div style={{flex:1}}><div style={S.appTitle}>Social Agent</div><div style={S.appSub}>{subtitle||"BEACON HILLS · OMAHA"}</div></div>
      {showReset&&<button style={S.resetBtn} onClick={reset}>↩ New</button>}
    </header>
  );
  const BottomNav=()=>(
    <nav style={S.nav}>
      {[["new","📷","Post"],["history","📋","History"],["ideas","💡","Ideas"],["analytics","📊","Stats"],["settings","⚙️","Setup"]].map(([id,icon,lbl])=>(
        <button key={id} style={{...S.navBtn,color:tab===id?GOLD:"#555"}} onClick={()=>setTab(id)}>
          <span style={{fontSize:20}}>{icon}</span><span style={S.navLbl}>{lbl}</span>
        </button>
      ))}
    </nav>
  );

  if(tab==="settings")return(<div style={S.root}><Header subtitle="META INTEGRATION"/><SettingsTab settings={settings} onSave={s=>{setSettings(s);}}/><BottomNav/></div>);
  if(tab==="analytics")return(<div style={S.root}><Header subtitle="ANALYTICS DASHBOARD"/><div style={{flex:1,overflowY:"auto"}}><AnalyticsTab history={history}/></div><BottomNav/></div>);
  if(tab==="ideas")return(<div style={S.root}><Header subtitle="CAMPAIGN IDEAS"/>
    <IdeasTab apiKey={settings.anthropicApiKey||""} onStartCampaign={idea=>{
      setNotes(idea.concept||"");
      const toneMap={"Seasonal":"Warm & inviting","Trending":"Bold & exciting","Chef Feature":"Storytelling","Menu Spotlight":"Elegant & refined","Event":"Bold & exciting","Community":"Warm & inviting","Elmwood Room":"Elegant & refined"};
      if(toneMap[idea.type])setTone(toneMap[idea.type]);
      setGoal(GOALS[0]);
      setSelPlat(idea.paidRecommendation==="Organic Only"?["instagram"]:["instagram","facebook"]);
      setTab("new");setPhase("upload");
    }}/>
    <BottomNav/>
  </div>);
  if(tab==="history")return(
    <div style={S.root}><Header subtitle={"POST HISTORY - " + history.length + " SAVED"}/>
      <div style={{flex:1,overflowY:"auto",padding:"12px 0 80px"}}>
        {!history.length?<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 40px",textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>📭</div><div style={{fontSize:16,color:"#888"}}>No posts yet.</div></div>
        :history.map(post=> <HistoryCard key={post.id} post={post} onDelete={deletePost} onReuse={reuseSettings} settings={settings}/>)}
      </div>
      <BottomNav/>
    </div>
  );

  if(phase==="upload")return(
    <div style={S.root}><Header/>
      <div style={{flex:1,padding:"20px 20px 100px",display:"flex",flexDirection:"column",gap:14}}>
        <div style={{textAlign:"center",padding:"20px 0 8px"}}><div style={{fontSize:52,lineHeight:1}}>🍽️</div><div style={{fontSize:18,fontWeight:600,marginTop:12,color:"#f0ead6"}}>Add photos to get started</div><div style={{fontSize:13,color:"#555",marginTop:4}}>Select one or multiple from gallery</div></div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button style={S.uploadBtn} onClick={()=>fileRef.current?.click()}><span style={{fontSize:28}}>🖼️</span><div><div style={{fontSize:16,fontWeight:600,color:"#f0ead6"}}>Choose from Gallery</div><div style={{fontSize:12,color:"#666",marginTop:2}}>Select multiple · JPG, PNG, HEIC</div></div></button>
          <button style={{...S.uploadBtn,background:"#1a1f1a",borderColor:"#2a3a2a"}} onClick={()=>cameraRef.current?.click()}><span style={{fontSize:28}}>📷</span><div><div style={{fontSize:16,fontWeight:600,color:"#f0ead6"}}>Take a Photo</div><div style={{fontSize:12,color:"#666",marginTop:2}}>Opens your camera directly</div></div></button>
        </div>
          <button style={{...S.uploadBtn,background:"#140a20",borderColor:"#3a1a5a"}} onClick={()=>flyerRef.current?.click()}>
            <span style={{fontSize:28}}>📋</span>
            <div><div style={{fontSize:16,fontWeight:600,color:"#f0ead6"}}>Upload Event Flyer</div><div style={{fontSize:12,color:"#666",marginTop:2}}>AI builds your full marketing campaign</div></div>
          </button>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
        <input ref={flyerRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleFlyerFile(e.target.files[0])}/>
        {!settings.anthropicApiKey&&<div style={{...S.tipBox,background:"#1a100a",borderColor:"#3a2010",color:"#f0a84c"}}>🔑 <strong>Add your Anthropic API key</strong> in ⚙️ Settings to enable AI features.</div>}
        {!settings.pageToken&&<div style={S.tipBox}>⚙️ <strong>Connect Meta</strong> to enable scheduling + ad campaigns — tap Settings.</div>}
        <div style={S.tipBox}>📱 <strong>Install:</strong> Chrome menu → "Add to Home Screen"</div>
      </div>
      <BottomNav/>
    </div>
  );

  if(phase==="config")return(
    <div style={S.root}><Header subtitle={images.length + (images.length!==1?" PHOTOS":" PHOTO") + " SELECTED"} showReset/>
      <div style={{flex:1,overflowY:"auto",paddingBottom:100}}>
        <div style={{display:"flex",gap:8,padding:"12px 14px",overflowX:"auto"}}>
          {images.map((img,i)=>(
            <div key={i} style={{position:"relative",flexShrink:0}}>
              <img src={img.preview} alt="" style={{width:90,height:90,objectFit:"cover",borderRadius:10,display:"block",border:"2px solid #2a2a2a"}}/>
              <button onClick={()=>removeImage(i)} style={{position:"absolute",top:-6,right:-6,width:20,height:20,borderRadius:"50%",background:"#ff4444",border:"none",color:"#fff",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
          ))}
          <button onClick={()=>fileRef.current?.click()} style={{width:90,height:90,flexShrink:0,background:"#1c1c1c",border:"2px dashed #3a3a3a",borderRadius:10,color:"#555",fontSize:24,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}><span>＋</span><span style={{fontSize:9,letterSpacing:1}}>MORE</span></button>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>{const prev=images;Promise.all(Array.from(e.target.files).filter(f=>f.type.startsWith("image/")).slice(0,20-prev.length).map(f=>new Promise(res=>{const r=new FileReader();r.onload=ev=>res({preview:ev.target.result,base64:ev.target.result.split(",")[1],mime:f.type||"image/jpeg",name:f.name});r.readAsDataURL(f)}))).then(n=>setImages([...prev,...n]));}}/>
        </div>
        {error&&<div style={S.errorBanner}>{error}</div>}
        <div style={S.section}><label style={S.lbl}>Platforms</label><div style={S.pills}>{PLATFORMS.map(p=> <button key={p.id} style={{...S.pill,background:selPlat.includes(p.id)?p.color:"#2a2a2a",borderColor:selPlat.includes(p.id)?p.color:"#3a3a3a"}} onClick={()=>togglePlat(p.id)}>{p.icon} {p.label}</button>)}</div></div>
        <div style={S.section}><label style={S.lbl}>Tone</label><div style={S.pills}>{TONES.map(t=> <button key={t} style={{...S.pill,background:tone===t?GOLD:"#2a2a2a",borderColor:tone===t?GOLD:"#3a3a3a"}} onClick={()=>setTone(t)}>{t}</button>)}</div></div>
        <div style={S.section}><label style={S.lbl}>Goal</label><div style={S.pills}>{GOALS.map(g=> <button key={g} style={{...S.pill,background:goal===g?GOLD:"#2a2a2a",borderColor:goal===g?GOLD:"#3a3a3a"}} onClick={()=>setGoal(g)}>{g}</button>)}</div></div>
        <div style={S.section}><label style={S.lbl}>Chef's notes (optional)</label><textarea style={S.textarea} placeholder="e.g. 48hr short rib, spring truffle, tonight's special…" value={notes} onChange={e=>setNotes(e.target.value)} rows={3}/></div>
        <div style={{padding:"0 16px"}}><button style={{...S.genBtn,opacity:selPlat.length===0?0.4:1}} disabled={selPlat.length===0} onClick={handleGenerate}>Generate {images.length>1?`Content for ${images.length} Photos`:"Content"} ✦</button></div>
      </div>
      <BottomNav/>
    </div>
  );

  if(phase==="flyer_error")return(
    <div style={S.root}><Header/>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 20px",textAlign:"center",gap:16}}>
        <div style={{fontSize:48}}>❌</div>
        <div style={{fontSize:16,fontWeight:600,color:"#f0ead6"}}>Flyer Analysis Failed</div>
        <div style={{fontSize:13,color:"#888",maxWidth:280,lineHeight:1.6}}>{flyerError||"Could not analyze the flyer."}</div>
        <button style={{...S.copyBtn,background:GOLD,width:"auto",padding:"12px 24px"}} onClick={()=>{setPhase("upload");setFlyerImage(null);setFlyerData(null);setFlyerError(null);}}>Try Again</button>
      </div>
      <BottomNav/>
    </div>
  );

  if(phase==="flyer_analyzing")return(
    <div style={{...S.root,justifyContent:"center",alignItems:"center",gap:0}}>
      <div style={S.spinner}/>
      <div style={{marginTop:24,fontSize:20,fontWeight:600}}>Analyzing your flyer...</div>
      <div style={{marginTop:8,fontSize:13,color:"#666",textAlign:"center",maxWidth:260}}>Reading event details and building your campaign strategy</div>
    </div>
  );

  if(phase==="flyer_campaign"&&flyerData&&flyerImage)return(
    <div style={S.root}>
      <header style={S.header}>
        <div style={S.logo}>BH</div>
        <div style={{flex:1}}><div style={S.appTitle}>Event Campaign</div><div style={S.appSub}>{flyerData?.event?.name||"EVENT PLANNER"}</div></div>
        <button style={S.resetBtn} onClick={()=>{setPhase("upload");setFlyerImage(null);setFlyerData(null);}}>Done</button>
      </header>
      <FlyerCampaign flyer={flyerData} image={flyerImage} settings={settings} onBack={()=>setPhase("upload")}/>
      <nav style={S.nav}>
        {[["new","Post"],["history","History"],["analytics","Analytics"],["settings","Settings"]].map(([id,lbl])=>(
          <button key={id} style={{...S.navBtn,color:tab===id?GOLD:"#555"}} onClick={()=>{setPhase("upload");setTab(id);}}>
            <span style={{fontSize:20}}>{id==="new"?"📷":id==="history"?"📋":id==="analytics"?"📊":"⚙️"}</span>
            <span style={S.navLbl}>{lbl}</span>
          </button>
        ))}
      </nav>
    </div>
  );

  if(phase==="loading"){const pct=progress.total>0?Math.round((progress.current/progress.total)*100):0;return(
    <div style={{...S.root,justifyContent:"center",alignItems:"center",gap:0}}>
      <div style={S.spinner}/><div style={{marginTop:24,fontSize:20,fontWeight:600}}>{progress.total>1?`Photo ${progress.current} of ${progress.total}`:"Crafting your content…"}</div>
      <div style={{marginTop:8,fontSize:13,color:"#666",textAlign:"center",maxWidth:260}}>Analyzing photo · Writing captions · Selecting hashtags</div>
      {progress.total>1&&<div style={{width:240,marginTop:20}}><div style={{background:"#2a2a2a",borderRadius:6,height:6,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:GOLD,borderRadius:6,transition:"width 0.4s ease"}}/></div><div style={{textAlign:"center",fontSize:12,color:"#555",marginTop:6}}>{pct}%</div></div>}
    </div>
  );}

  if(phase==="results"){
    const active=PLATFORMS.filter(p=>selPlat.includes(p.id));
    const resultSubtitle = resultGroups.length + (resultGroups.length!==1?' PHOTOS':' PHOTO') + ' - SAVED';
    return(
      <div style={S.root}><Header subtitle={resultSubtitle} showReset/>
        <div style={{flex:1,overflowY:"auto",paddingBottom:100}}>
          {resultGroups.map((group,gi)=>(
            <div key={gi}>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"16px 14px 0"}}>
                <img src={group.preview} alt="" style={{width:44,height:44,objectFit:"cover",borderRadius:8,flexShrink:0}}/>
                <div style={{flex:1,height:1,background:"#2a2a2a"}}/>
                <span style={{fontSize:11,color:"#555",flexShrink:0}}>Photo {gi+1} of {resultGroups.length}</span>
              </div>
              {group.results.map((r,i)=>{const plat=active.find(p=>p.label.toLowerCase()===r.platform?.toLowerCase())||active[i]||active[0];return <PlatformCard key={r.platform||i} result={r} platform={plat} imageBase64={group.base64} imageMime={group.mime} settings={settings}/>;} )}
              {gi===0&&<AdBuilder imageBase64={group.base64} imageMime={group.mime} notes={notes} settings={settings}/>}
            </div>
          ))}
          <div style={{margin:"16px",padding:14,background:"#0f1a0f",borderRadius:12,border:"1px solid #1e3a1e"}}>
            <div style={{fontSize:10,letterSpacing:2,color:"#4caf50",marginBottom:6}}>ALL SAVED TO HISTORY ✓</div>
            <div style={{fontSize:13,color:"#a8d5aa",lineHeight:1.5}}>{resultGroups.length} post{resultGroups.length!==1?"s":""} saved. {settings.pageToken?"Use Schedule to post or Ads to create a paid campaign.":"Add credentials in Settings to enable scheduling and ads."}</div>
          </div>
        </div>
        <BottomNav/>
      </div>
    );
  }
}

const S={
  root:{fontFamily:"'Georgia','Times New Roman',serif",background:"#141414",color:"#f0ead6",minHeight:"100vh",maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column"},
  header:{display:"flex",alignItems:"center",gap:12,padding:"18px 20px 14px",borderBottom:"1px solid #2a2a2a",background:"#1a1a1a",position:"sticky",top:0,zIndex:10},
  logo:{width:38,height:38,borderRadius:"50%",background:GOLD,color:"#141414",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,letterSpacing:1,flexShrink:0},
  appTitle:{fontSize:17,fontWeight:600,letterSpacing:0.5,color:"#f0ead6",lineHeight:1.2},
  appSub:{fontSize:9,letterSpacing:2,color:GOLD,marginTop:2},
  resetBtn:{marginLeft:"auto",background:"#2a2a2a",border:"1px solid #444",color:"#f0ead6",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:13},
  nav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"#1a1a1a",borderTop:"1px solid #2a2a2a",display:"flex",zIndex:20},
  navBtn:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"8px 0 12px",background:"none",border:"none",cursor:"pointer",transition:"color 0.15s"},
  navLbl:{fontSize:9,letterSpacing:0.5},
  uploadBtn:{display:"flex",alignItems:"center",gap:16,padding:"18px 20px",background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:16,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:"Georgia,serif"},
  tipBox:{padding:14,background:"#1c1c1c",borderRadius:12,fontSize:13,color:"#888",lineHeight:1.5,border:"1px solid #2a2a2a"},
  section:{padding:"14px 16px 0"},
  lbl:{display:"block",fontSize:10,letterSpacing:2,color:GOLD,marginBottom:10,textTransform:"uppercase"},
  pills:{display:"flex",flexWrap:"wrap",gap:8},
  pill:{padding:"8px 13px",borderRadius:20,border:"1px solid",cursor:"pointer",fontSize:13,color:"#fff",fontFamily:"Georgia,serif",transition:"all 0.15s"},
  textarea:{width:"100%",background:"#1c1c1c",border:"1px solid #333",borderRadius:12,color:"#f0ead6",padding:14,fontSize:14,fontFamily:"Georgia,serif",resize:"vertical",lineHeight:1.5,boxSizing:"border-box"},
  genBtn:{width:"100%",marginTop:16,background:"linear-gradient(135deg,#c9a84c,#a0792e)",color:"#141414",border:"none",borderRadius:14,padding:"18px",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif"},
  spinner:{width:72,height:72,borderRadius:"50%",border:"3px solid #2a2a2a",borderTop:"3px solid #c9a84c",animation:"spin 1s linear infinite"},
  card:{margin:"14px 14px 0",background:"#1a1a1a",borderRadius:16,overflow:"hidden",border:"1px solid #2a2a2a"},
  cardHead:{display:"flex",alignItems:"center",gap:10,padding:"11px 14px"},
  platformName:{flex:1,fontSize:14,fontWeight:700,color:"#fff"},
  cardBody:{padding:14},
  caption:{fontSize:14,lineHeight:1.65,color:"#e8e0cc",margin:"0 0 12px",whiteSpace:"pre-wrap"},
  tagWrap:{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12},
  tag:{fontSize:12,color:GOLD,background:"#1f1a0e",borderRadius:8,padding:"3px 8px",border:"1px solid #3a2e10"},
  metaBox:{background:"#111",borderRadius:10,padding:12,marginBottom:12},
  metaLbl:{display:"block",fontSize:10,letterSpacing:1.5,color:"#555",textTransform:"uppercase",marginBottom:2},
  metaVal:{fontSize:13,color:"#c8c0ae",lineHeight:1.4},
  copyBtn:{width:"100%",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,color:"#141414",cursor:"pointer",fontFamily:"Georgia,serif"},
  actionBtn:{flex:1,background:"#1c1c1c",border:"1px solid #333",color:"#c8c0ae",borderRadius:10,padding:"9px 8px",fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif",textAlign:"center"},
  toast:{position:"fixed",top:24,left:"50%",transform:"translateX(-50%)",background:"#1a2e1a",border:"1px solid #2e5e2e",borderRadius:14,padding:"14px 20px",display:"flex",alignItems:"center",gap:12,color:"#a8f0a8",zIndex:999,boxShadow:"0 8px 32px rgba(0,0,0,0.6)",minWidth:260,maxWidth:340,animation:"slideDown 0.2s ease"},
  errorBanner:{margin:"10px 14px 0",padding:12,background:"#2a0f0f",borderRadius:10,color:"#ff8a8a",fontSize:13,border:"1px solid #5a1f1f"},
  hCard:{margin:"10px 14px 0",background:"#1a1a1a",borderRadius:14,overflow:"hidden",border:"1px solid #2a2a2a"},
  hCardTop:{display:"flex",alignItems:"flex-start",gap:12,padding:14,cursor:"pointer"},
  hThumb:{width:64,height:64,borderRadius:10,objectFit:"cover",flexShrink:0},
  hDate:{fontSize:11,color:GOLD,letterSpacing:0.5,marginBottom:5},
  hPlatforms:{display:"flex",flexWrap:"wrap",gap:5,marginBottom:5},
  hPill:{fontSize:10,color:"#fff",borderRadius:6,padding:"2px 7px"},
  hPreview:{fontSize:13,color:"#888",lineHeight:1.4,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"},
  hMeta:{fontSize:11,color:"#555",marginTop:4},
  hReuse:{flex:1,background:"#1f1a0e",border:"1px solid #3a2e10",color:GOLD,borderRadius:10,padding:"10px",fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"},
  hDelete:{flex:1,background:"#1a0f0f",border:"1px solid #3a1010",color:"#ff8a8a",borderRadius:10,padding:"10px",fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"},
  insightRow:{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10},
  insightIcon:{fontSize:16,flexShrink:0,marginTop:1},
  insightText:{fontSize:13,color:"#888",lineHeight:1.5},
  modalOverlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100,padding:"0 0 20px"},
  modal:{background:"#1a1a1a",borderRadius:"20px 20px 16px 16px",padding:24,width:"100%",maxWidth:480,border:"1px solid #2a2a2a",boxShadow:"0 -8px 40px rgba(0,0,0,0.6)"},
};
const _s=document.createElement("style");
_s.textContent="@keyframes spin{to{transform:rotate(360deg)}}@keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}*{box-sizing:border-box}";
document.head.appendChild(_s);
