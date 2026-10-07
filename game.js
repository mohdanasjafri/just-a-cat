const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const $=id=>document.getElementById(id);
let DPR=1,W=900,H=600,started=false,paused=false,day=1,time=0,phase=0,last=0,near=null;
const keys={};
const state={happy:75,hunger:75,energy:100,clean:80,money:50,plants:0,harvests:0,naps:0,boxes:0,meals:0,zoomies:0,ignored:0,personality:{},logs:[]};
const player={x:110,y:440,r:18,speed:210};
const objects=[];
const plants=[];
const decor=[];

function resize(){
 DPR=Math.min(devicePixelRatio||1,2); const r=canvas.getBoundingClientRect();
 W=Math.max(600,r.width);H=Math.max(430,r.height);canvas.width=W*DPR;canvas.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);
 buildWorld();
}
window.addEventListener("resize",resize);

function buildWorld(){
 objects.length=0;plants.length=0;decor.length=0;
 // Apartment rooms / interaction points scale with canvas.
 const sx=W/900,sy=H/600;
 const add=(id,name,x,y,emoji,action)=>objects.push({id,name,x:x*sx,y:y*sy,emoji,action});
 add("fridge","Fridge",700,210,"🧊","eat");
 add("stove","Stove",770,210,"🍳","cook");
 add("sink","Sink",650,210,"🚿","clean");
 add("sofa","Sofa",330,390,"🛋️","rest");
 add("tv","TV",230,300,"📺","tv");
 add("box","Cardboard Box",510,450,"📦","box");
 add("door","Front Door",820,480,"🚪","shop");
 add("bed","Human's Bed",150,180,"🛏️","sleep");
 add("balcony","Balcony Garden",690,410,"🌿","garden");
 decor.push({x:0,y:H*.57,w:W,h:3},{x:W*.53,y:0,w:3,h:H});
 if(plants.length===0){for(let i=0;i<3;i++)plants.push({x:(600+i*55)*sx,y:360*sy,growth:day>3?1:0,water:day%3!==0})}
}

function fit(){
 const scaleX=W/900,scaleY=H/600;
 return {x:scaleX,y:scaleY};
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function log(t){state.logs.unshift(t);state.logs=state.logs.slice(0,7);$("log").innerHTML=state.logs.map(x=>`<li>${x}</li>`).join("")}
function toast(t){const el=$("toast");el.textContent=t;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),1800);log(t)}
function change(k,v){state[k]=clamp(state[k]+v,0,100)}
function setBars(){
 $("day").textContent=day;$("happy").textContent=Math.round(state.happy);$("hunger").textContent=Math.round(state.hunger);$("energy").textContent=Math.round(state.energy);$("money").textContent=state.money;
 $("happyBar").style.width=state.happy+"%";$("hungerBar").style.width=state.hunger+"%";$("energyBar").style.width=state.energy+"%";$("cleanBar").style.width=state.clean+"%";
 $("plants").textContent=plants.length;$("harvests").textContent=state.harvests;
}
function phaseName(){return ["MORNING","AFTERNOON","EVENING","NIGHT"][phase]}
function updateObjective(){
 const text=state.clean<40?"The house is becoming a disaster.":state.hunger<30?"The cat is thinking about eating the houseplant.":state.energy<20?"Maybe being a responsible adult was a mistake.":plants.some(p=>!p.water)?"A plant is thirsty.":day>=12?"Human comes back soon...":"Keep the house alive.";
 $("objective").textContent=text;$("timeLabel").textContent=phaseName();$("timeProgress").style.width=((1-(time%25)/25)*100)+"%";
}
function action(o){
 if(state.energy<5 && !["eat","rest","sleep"].includes(o.action)){toast("Too tired. Even cats have limits.");return}
 switch(o.action){
 case"eat": if(state.money<5){toast("No money for groceries. Try growing something.");return} state.money-=5;change("hunger",35);change("happy",6);state.meals++;change("energy",5);toast("The cat ate. Problem temporarily solved.");break;
 case"cook": if(state.money<3&&state.harvests<1){toast("Need ingredients.");return} if(state.harvests>0)state.harvests--;else state.money-=3;change("hunger",45);change("happy",10);state.meals++;change("energy",-10);toast("🍳 Gourmet meal achieved.");break;
 case"clean": change("clean",35);change("happy",3);change("energy",-12);toast("🧹 The house is 3% more adult.");break;
 case"rest": change("energy",28);change("happy",8);state.naps++;toast("😴 Professional napping.");break;
 case"tv": change("happy",15);change("energy",-5);toast("📺 Cat has discovered television.");break;
 case"box": change("happy",20);change("energy",-3);state.boxes++;toast("📦 BOX.");break;
 case"shop": if(state.money>=10){state.money-=10;change("hunger",10);toast("🛒 Groceries acquired.");}else toast("🪙 Not enough money.");break;
 case"sleep": if(time<70){toast("It's not bedtime yet.");return} nextDay();return;
 case"garden": garden();break;
 }
}
function garden(){
 let watered=0;
 plants.forEach(p=>{if(dist(player,p)<90){p.water=true;p.growth=Math.min(3,p.growth+1);watered++}});
 if(watered){change("energy",-10);change("happy",7);if(Math.random()<.5){state.harvests++;state.money+=5;state.harvests=Math.min(9,state.harvests);toast("🌱 Harvest! +5 coins.");}else toast("🌱 Plants watered.");}
 else toast("Walk closer to the balcony plants.");
}
function nextDay(){
 day++;phase=0;time=0;change("hunger",-25);change("happy",Math.round(state.clean<40?-8:3));state.energy=100;
 state.clean=clamp(state.clean-8,0,100);
 plants.forEach(p=>{p.water=false;if(p.growth>0&&Math.random()<.75)p.growth++});
 randomEvent();
 if(day>14){finish();return}
 player.x=110;player.y=440;toast("🌅 Day "+day+" — good morning.");
 if(day===4)toast("A note says: 'Please take care of my plants.'");
 if(day===8)toast("You found a photo behind the TV.");
 if(day===12)toast("The human is coming back soon...");
}
function randomEvent(){
 const events=[
 ["🐦 A bird appeared at the balcony. Cat forgot all responsibilities.",()=>{change("happy",12);state.ignored++}],
 ["📦 A mysterious package arrived. It is, unfortunately, another box.",()=>{state.boxes++;change("happy",15)}],
 ["🥛 The cat knocked over a glass. +mess.",()=>{change("clean",-12);state.ignored++}],
 ["🐈 A neighborhood cat stared through the window. Social interaction complete.",()=>{change("happy",10)}],
 ["⚡ Power cut! TV unavailable.",()=>{change("happy",-3)}]
 ];const e=events[Math.floor(Math.random()*events.length)];e[1]();toast(e[0]);
}
function finish(){
 started=false;$("gameScreen").classList.add("hidden");$("endScreen").classList.remove("hidden");
 let p=state.boxes>=6?"CHAOS CAT":state.harvests>=6?"GARDENER CAT":state.meals>=8?"FOODIE CAT":state.naps>=7?"LAZY CAT":"RESPONSIBLE CAT";state.personality=p;
 $("endingTitle").textContent=p==="CHAOS CAT"?"THE HUMAN IS HOME. THE HOUSE... ISN'T.":"THE HUMAN IS HOME. 🥹";
 $("endingText").textContent=p==="RESPONSIBLE CAT"?"The apartment is warm, the plants are alive, and your human smiles. You did good.":p==="CHAOS CAT"?"Your human opens the door. A box falls. The cat is inside it. Nobody asks questions.":"Your human kneels down. The cat runs over. For a moment, the apartment feels like home again.";
 $("report").innerHTML=[["Days survived",14],["Plants grown",state.harvests],["Meals eaten",state.meals],["Boxes entered",state.boxes],["Naps",state.naps],["Cat personality",p]].map(a=>`<div>${a[0]}<b>${a[1]}</b></div>`).join("");
}
function restartDay(){day=Math.max(1,day);phase=0;time=0;state.energy=100;player.x=110;player.y=440;paused=false;$("pauseScreen").classList.add("hidden");toast("Day restarted.");}
function start(demo=false){
 Object.assign(state,{happy:75,hunger:75,energy:100,clean:80,money:demo?120:50,plants:0,harvests:demo?4:0,naps:0,boxes:0,meals:0,zoomies:0,ignored:0,personality:{},logs:[]});
 day=demo?4:1;phase=0;time=0;started=true;paused=false;$("titleScreen").classList.add("hidden");$("endScreen").classList.add("hidden");$("pauseScreen").classList.add("hidden");$("gameScreen").classList.remove("hidden");buildWorld();log("🐈 A new day begins.");toast(demo?"🎤 Demo mode: show them the cat!":"🐈 Human is away. You run the house now.");
}
function move(dt){
 let x=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),y=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
 if(!x&&!y)return;const len=Math.hypot(x,y);x/=len;y/=len;player.x=clamp(player.x+x*player.speed*dt,25,W-25);player.y=clamp(player.y+y*player.speed*dt,25,H-25);change("energy",-dt*.45);
}
function nearest(){
 let best=null,bd=75;for(const o of objects){const d=dist(player,o);if(d<bd){best=o;bd=d}}
 $("interaction").innerHTML=best?`Press <b>E</b> · ${best.emoji} ${best.name}`:"Walk near something and press <b>E</b>";
 return best;
}
function draw(){
 ctx.clearRect(0,0,W,H);
 // floor
 ctx.fillStyle="#cbb89b";ctx.fillRect(0,0,W,H);
 // rooms
 ctx.fillStyle="#bda98e";ctx.fillRect(0,0,W,H*.57);ctx.fillStyle="#d5c2a5";ctx.fillRect(0,H*.57,W,H*.43);
 ctx.fillStyle="#765f4c";ctx.fillRect(0,H*.57,W,3);ctx.fillRect(W*.53,0,3,H);
 // rugs
 ctx.fillStyle="#9c7d68";ctx.fillRect(W*.18,H*.63,W*.26,H*.18);ctx.fillStyle="#ad9479";ctx.fillRect(W*.60,H*.12,W*.32,H*.20);
 // furniture
 objects.forEach(o=>{let color="#806957";if(o.id==="bed")color="#a88978";if(o.id==="fridge"||o.id==="stove"||o.id==="sink")color="#8b8e88";if(o.id==="tv")color="#302d2a";
   ctx.fillStyle=color;ctx.globalAlpha=.25;ctx.fillRect(o.x-32,o.y-22,64,44);ctx.globalAlpha=1;
   ctx.font="28px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(o.emoji,o.x,o.y);
 });
 // plants
 plants.forEach((p,i)=>{ctx.font="30px sans-serif";ctx.fillText(p.growth>=3?"🍅":p.growth>=1?"🌱":"🪴",p.x,p.y);if(!p.water){ctx.font="10px sans-serif";ctx.fillStyle="#7b5c45";ctx.fillText("thirsty",p.x,p.y+25)}});
 // cat
 ctx.font="38px sans-serif";ctx.fillText("🐈",player.x,player.y);
 // shadows
 ctx.globalAlpha=.12;ctx.fillStyle="#000";ctx.beginPath();ctx.ellipse(player.x,player.y+17,20,7,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 ctx.textAlign="left";ctx.textBaseline="alphabetic";
}
function frame(t){
 const dt=Math.min(.05,(t-last)/1000||0);last=t;
 if(started&&!paused){time+=dt;move(dt);if(time>100&&phase<3){phase++;time=0;if(phase===3)toast("🌙 Night. The cat should sleep.");}if(time>100&&phase===3)nextDay();updateObjective();setBars();}
 nearest();draw();requestAnimationFrame(frame);
}
window.addEventListener("keydown",e=>{
 keys[e.key.toLowerCase()]=true;
 if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault();
 if(!started)return;
 if(e.key.toLowerCase()==="e"&&!paused){const o=nearest();if(o)action(o)}
 if(e.key.toLowerCase()==="p"){paused=!paused;$("pauseScreen").classList.toggle("hidden",!paused)}
 if(e.key.toLowerCase()==="r"&&paused)restartDay();
});
window.addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
$("startBtn").onclick=()=>start(false);$("demoBtn").onclick=()=>start(true);$("resumeBtn").onclick=()=>{paused=false;$("pauseScreen").classList.add("hidden")};$("restartBtn").onclick=restartDay;$("againBtn").onclick=()=>start(false);
resize();setBars();requestAnimationFrame(frame);
