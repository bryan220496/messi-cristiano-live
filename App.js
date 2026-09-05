import React, {useEffect, useMemo, useRef, useState} from 'react';
import {SafeAreaView, View, Text, Image, StyleSheet, Pressable, Animated, ScrollView, TextInput, Switch} from 'react-native';
import {StatusBar} from 'expo-status-bar';

const GIFT_RULES = [
  {name:'Rosa', player:'messi', points:1, emoji:'🌹'},
  {name:'Rosquilla', player:'messi', points:10, emoji:'🍩'},
  {name:'Gorra', player:'messi', win:true, emoji:'🧢'},
  {name:'Rosa blanca', player:'cristiano', points:1, emoji:'🤍'},
  {name:'Capibara', player:'cristiano', points:10, emoji:'🦫'},
  {name:'Sombrero y bigote', player:'cristiano', win:true, emoji:'🎩'}
];

const INITIAL = {messi:0, cristiano:0, winner:null, last:'Esperando regalos...', events:[]};

export default function App(){
  const [game,setGame] = useState(INITIAL);
  const [running,setRunning] = useState(false);
  const [seconds,setSeconds] = useState(120);
  const [roundLength,setRoundLength] = useState(120);
  const [serverUrl,setServerUrl] = useState('ws://TU_SERVIDOR:8080');
  const [autoReconnect,setAutoReconnect] = useState(true);
  const [connected,setConnected] = useState(false);
  const [tab,setTab] = useState('battle');
  const ws = useRef(null); const reconnect = useRef(null); const pulse = useRef(new Animated.Value(1)).current;

  const reactToGift = (giftName, quantity=1, user='Espectador') => {
    const rule = GIFT_RULES.find(x=>x.name.toLowerCase()===String(giftName).toLowerCase());
    if(!rule || !runningRef.current) return;
    setGame(prev=>{
      const next={...prev, events:[{user,gift:giftName,quantity,time:new Date().toLocaleTimeString()},...prev.events].slice(0,20),last:`${user}: ${giftName} ×${quantity}`};
      if(prev.winner) return prev; if(rule.win) return {...next,winner:rule.player};
      next[rule.player] += rule.points*quantity;
      return next;
    });
    Animated.sequence([Animated.timing(pulse,{toValue:1.12,duration:100,useNativeDriver:true}),Animated.spring(pulse,{toValue:1,useNativeDriver:true})]).start();
  };

  const startRound=()=>{setGame(INITIAL);setSeconds(Number(roundLength)||120);setRunning(true)};
  const reset=()=>{setRunning(false);setSeconds(Number(roundLength)||120);setGame(INITIAL)};

  useEffect(()=>{
    if(!running || seconds<=0 || game.winner) return;
    const id=setInterval(()=>setSeconds(s=>s<=1?0:s-1),1000); return()=>clearInterval(id);
  },[running,seconds,game.winner]);
  useEffect(()=>{if(seconds===0)setRunning(false)},[seconds]);

  useEffect(()=>{
    let cancelled=false;
    const connect=()=>{
      if(cancelled || !serverUrl || serverUrl.includes('TU_SERVIDOR')) return;
      try{
        const socket=new WebSocket(serverUrl);
        socket.onopen=()=>setConnected(true);
        socket.onclose=()=>{setConnected(false); if(autoReconnect && !cancelled) reconnect.current=setTimeout(connect,3000)};
        socket.onerror=()=>setConnected(false);
        socket.onmessage=e=>{try{const d=JSON.parse(e.data); if(d.type==='gift'){reactToGift(d.gift,d.quantity||1,d.user||'Espectador');} else if(d.event==='gift'){const x=d.data||{}; const gift=x.giftName||''; const quantity=Number(x.repeatCount)||1; const user=(x.user&&x.user.nickname)||x.user_unique_id||'Espectador'; reactToGift(gift,quantity,user);}}catch{}};
        ws.current=socket;
      }catch{setConnected(false)}
    };
    connect(); return()=>{cancelled=true; if(reconnect.current)clearTimeout(reconnect.current); if(ws.current)ws.current.close()};
  },[serverUrl,autoReconnect]);

  const max=Math.max(game.messi,game.cristiano,1);
  const pctM=game.messi/max*100, pctC=game.cristiano/max*100;
  const timer=useMemo(()=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`,[seconds]);

  return <SafeAreaView style={styles.safe}><StatusBar style="light"/><ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>MESSI <Text style={styles.gold}>VS</Text> CRISTIANO</Text>
    <Text style={styles.sub}>LIVE BATTLE • Regalos en tiempo real</Text>

    <View style={styles.nav}>{[['battle','⚽ Batalla'],['rules','🎁 Reglas'],['settings','⚙️ Ajustes']].map(([id,label])=><Pressable key={id} onPress={()=>setTab(id)} style={[styles.navBtn,tab===id&&styles.navActive]}><Text style={styles.navText}>{label}</Text></Pressable>)}</View>

    {tab==='battle' && <>
      <View style={styles.top}><View style={[styles.dot,{backgroundColor:connected?'#2be27c':'#f0aa27'}]}/><Text style={styles.status}>{connected?'LIVE conectado':'Modo demo / sin servidor'}</Text><Text style={styles.timer}>{timer}</Text></View>
      <View style={styles.artBox}><Image source={require('./game-art.png')} style={styles.art}/></View>
      <Animated.View style={[styles.scoreRow,{transform:[{scale:pulse}]}]}>
        <ScoreCard title="MESSI" score={game.messi} side="messi" pct={pctM}/><Text style={styles.vs}>VS</Text><ScoreCard title="CRISTIANO" score={game.cristiano} side="cristiano" pct={pctC}/>
      </Animated.View>
      {game.winner && <View style={styles.winner}><Text style={styles.winText}>🏆 {game.winner==='messi'?'¡MESSI GANA!':'¡CRISTIANO GANA!'}</Text></View>}
      {!game.winner && seconds===0 && <View style={styles.winner}><Text style={styles.winText}>{game.messi===game.cristiano?'🤝 ¡EMPATE!':game.messi>game.cristiano?'🏆 ¡MESSI GANA!':'🏆 ¡CRISTIANO GANA!'}</Text></View>}
      <View style={styles.last}><Text style={styles.small}>ÚLTIMO REGALO</Text><Text style={styles.lastText}>{game.last}</Text></View>
      <View style={styles.actions}><Pressable style={styles.primary} onPress={startRound}><Text style={styles.primaryText}>▶ NUEVA RONDA</Text></Pressable><Pressable style={styles.secondary} onPress={reset}><Text style={styles.secondaryText}>↻ REINICIAR</Text></Pressable></View>
      <Text style={styles.section}>DEMOSTRACIÓN</Text><Text style={styles.help}>Pulsa un regalo para simular lo que recibiría la app desde el LIVE.</Text>
      <View style={styles.gifts}>{GIFT_RULES.map(r=><Pressable key={r.name} style={styles.gift} onPress={()=>reactToGift(r.name,1,'Demo')}><Text style={styles.giftEmoji}>{r.emoji}</Text><Text style={styles.giftName}>{r.name}</Text><Text style={styles.giftPts}>{r.win?'GANA':`+${r.points}`}</Text></Pressable>)}</View>
      <Text style={styles.section}>ÚLTIMOS EVENTOS</Text>{game.events.length===0?<Text style={styles.empty}>Todavía no hay regalos.</Text>:game.events.map((e,i)=><View style={styles.event} key={i}><Text style={styles.eventUser}>{e.user}</Text><Text style={styles.eventGift}>{e.gift} ×{e.quantity}</Text><Text style={styles.eventTime}>{e.time}</Text></View>)}
    </>}

    {tab==='rules' && <Rules/>}
    {tab==='settings' && <>
      <Text style={styles.section}>CONEXIÓN DEL SERVIDOR</Text><Text style={styles.help}>Introduce la dirección WSS/WS de tu puente de TikTok LIVE.</Text>
      <TextInput value={serverUrl} onChangeText={setServerUrl} autoCapitalize="none" style={styles.input} placeholder="wss://tu-servidor.com" placeholderTextColor="#666"/>
      <View style={styles.settingRow}><Text style={styles.settingText}>Reconexión automática</Text><Switch value={autoReconnect} onValueChange={setAutoReconnect}/></View>
      <Text style={styles.section}>DURACIÓN DE RONDA</Text><View style={styles.duration}>{[60,120,180,300].map(n=><Pressable key={n} onPress={()=>setRoundLength(n)} style={[styles.durationBtn,Number(roundLength)===n&&styles.durationActive]}><Text style={styles.durationText}>{n/60} min</Text></Pressable>)}</View>
      <Text style={styles.section}>FORMATO DE EVENTO</Text><View style={styles.code}><Text style={styles.codeText}>{'{"type":"gift","gift":"Rosquilla","quantity":1,"user":"Nombre"}'}</Text></View>
      <Text style={styles.help}>El puente debe enviar este evento a la app. Los regalos desconocidos se ignoran.</Text>
    </>}
  </ScrollView></SafeAreaView>
}

function ScoreCard({title,score,side,pct}){return <View style={[styles.card,side==='messi'?styles.blue:styles.red]}><Text style={styles.player}>{title}</Text><Text style={styles.score}>{score}</Text><View style={styles.bar}><View style={[styles.fill,{width:`${pct}%`}]}/></View><Text style={styles.cardHint}>{side==='messi'?'🌹 1  •  🍩 10  •  🧢 GANA':'🤍 1  •  🦫 10  •  🎩 GANA'}</Text></View>}
function Rules(){return <><Text style={styles.section}>REGLAS DE LA BATALLA</Text>{GIFT_RULES.map(r=><View style={styles.rule} key={r.name}><Text style={styles.ruleEmoji}>{r.emoji}</Text><View style={{flex:1}}><Text style={styles.ruleName}>{r.name}</Text><Text style={styles.rulePlayer}>{r.player==='messi'?'Messi':'Cristiano'}</Text></View><Text style={styles.ruleValue}>{r.win?'VICTORIA':`+${r.points}`}</Text></View>)}<View style={styles.info}><Text style={styles.infoTitle}>Cómo jugar</Text><Text style={styles.help}>1. Inicia una ronda. 2. Conecta el puente LIVE. 3. Cada regalo suma automáticamente. 4. Gorra o sombrero + bigote termina la ronda al instante.</Text></View></>}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#050507'},container:{padding:14,paddingBottom:50},title:{color:'#fff',fontSize:25,fontWeight:'900',textAlign:'center',marginTop:8},gold:{color:'#ffd43d'},sub:{color:'#999',textAlign:'center',marginTop:3,marginBottom:12},nav:{flexDirection:'row',backgroundColor:'#111116',borderRadius:13,padding:4,marginBottom:12},navBtn:{flex:1,padding:10,borderRadius:10},navActive:{backgroundColor:'#292932'},navText:{color:'#ccc',textAlign:'center',fontWeight:'800',fontSize:12},top:{flexDirection:'row',alignItems:'center',marginBottom:8},dot:{width:9,height:9,borderRadius:5,marginRight:7},status:{color:'#bbb',fontSize:12,flex:1},timer:{color:'#ffd43d',fontSize:22,fontWeight:'900'},artBox:{width:'100%',height:360,overflow:'hidden',backgroundColor:'#000'},art:{width:'100%',height:360,resizeMode:'contain'},scoreRow:{flexDirection:'row',alignItems:'stretch',marginTop:8},card:{flex:1,borderRadius:15,padding:11},blue:{backgroundColor:'#0b4c86'},red:{backgroundColor:'#9b1111'},vs:{color:'#ffd43d',fontWeight:'900',alignSelf:'center',padding:3},player:{color:'#fff',textAlign:'center',fontWeight:'900',fontSize:15},score:{color:'#fff',textAlign:'center',fontSize:42,fontWeight:'900'},bar:{height:5,backgroundColor:'rgba(0,0,0,.35',borderRadius:5,overflow:'hidden'},fill:{height:5,backgroundColor:'#fff'},cardHint:{color:'#fff',fontSize:9,textAlign:'center',marginTop:6,fontWeight:'800'},winner:{backgroundColor:'#ffd43d',padding:10,borderRadius:14,marginTop:10},winText:{color:'#171717',textAlign:'center',fontWeight:'900',fontSize:21},last:{backgroundColor:'#15151b',borderRadius:13,padding:11,marginTop:10},small:{color:'#777',fontSize:9,fontWeight:'900'},lastText:{color:'#fff',fontSize:16,fontWeight:'800',marginTop:3},actions:{flexDirection:'row',gap:8,marginTop:10},primary:{flex:1,backgroundColor:'#ffd43d',padding:13,borderRadius:12},primaryText:{color:'#111',textAlign:'center',fontWeight:'900'},secondary:{padding:13,borderRadius:12,backgroundColor:'#24242c'},secondaryText:{color:'#fff',fontWeight:'900'},section:{color:'#fff',fontWeight:'900',fontSize:17,marginTop:20,marginBottom:7},help:{color:'#8d8d96',fontSize:12,lineHeight:17},gifts:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'},gift:{width:'48%',backgroundColor:'#18181f',borderRadius:13,padding:10,marginBottom:7},giftEmoji:{fontSize:23},giftName:{color:'#fff',fontWeight:'800',marginTop:2},giftPts:{color:'#ffd43d',fontWeight:'900',marginTop:2},event:{flexDirection:'row',backgroundColor:'#121218',padding:9,borderRadius:10,marginBottom:5},eventUser:{color:'#fff',fontWeight:'800',width:'30%'},eventGift:{color:'#ddd',flex:1},eventTime:{color:'#666',fontSize:10},empty:{color:'#666'},rule:{flexDirection:'row',alignItems:'center',backgroundColor:'#15151b',borderRadius:13,padding:12,marginBottom:7},ruleEmoji:{fontSize:28,width:45},ruleName:{color:'#fff',fontWeight:'900'},rulePlayer:{color:'#888',fontSize:11,marginTop:2},ruleValue:{color:'#ffd43d',fontWeight:'900'},info:{backgroundColor:'#111116',borderRadius:14,padding:13,marginTop:14},infoTitle:{color:'#fff',fontWeight:'900',marginBottom:5},input:{backgroundColor:'#15151b',color:'#fff',borderRadius:12,padding:13,marginTop:6},settingRow:{backgroundColor:'#15151b',padding:13,borderRadius:12,marginTop:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},settingText:{color:'#fff',fontWeight:'800'},duration:{flexDirection:'row',gap:7},durationBtn:{flex:1,padding:12,backgroundColor:'#15151b',borderRadius:11},durationActive:{backgroundColor:'#ffd43d'},durationText:{textAlign:'center',color:'#fff',fontWeight:'900'},code:{backgroundColor:'#0b0b0f',padding:13,borderRadius:12,marginTop:5},codeText:{color:'#bcbcbc',fontSize:11}}
)