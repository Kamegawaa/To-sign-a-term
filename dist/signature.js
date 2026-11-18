// Pontos normalizados preservam a assinatura ao girar o iPad.
export function signaturePad(canvas){
  const ctx=canvas.getContext('2d');let strokes=[],stroke=null,pointer=null;
  canvas.style.touchAction='none';
  function paint(){
    const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);
    ctx.scale(dpr,dpr);ctx.strokeStyle='#172c42';ctx.lineWidth=2.2;ctx.lineCap='round';ctx.lineJoin='round';
    for(const points of strokes){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x*r.width,p.y*r.height):ctx.moveTo(p.x*r.width,p.y*r.height));ctx.stroke();}
  }
  const point=e=>{const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};};
  canvas.onpointerdown=e=>{if(pointer!==null)return;e.preventDefault();pointer=e.pointerId;canvas.setPointerCapture(pointer);stroke=[point(e)];strokes.push(stroke);};
  canvas.onpointermove=e=>{if(e.pointerId!==pointer||!stroke)return;e.preventDefault();stroke.push(point(e));paint();};
  const end=e=>{if(e.pointerId!==pointer)return;stroke=null;pointer=null;};
  canvas.onpointerup=end;canvas.onpointercancel=end;
  const resize=new ResizeObserver(paint);resize.observe(canvas);paint();
  return {clear(){strokes=[];stroke=null;paint();},destroy(){resize.disconnect();},capture(){
    const points=strokes.flat();
    if(points.length<6)throw Error('Faça a assinatura dentro da área indicada.');
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    if(maxX-minX<.04||maxY-minY<.015)throw Error('A assinatura está muito pequena. Limpe e assine novamente.');
    const output=document.createElement('canvas'),pad=8;
    output.width=Math.ceil((maxX-minX)*canvas.width)+pad*2;output.height=Math.ceil((maxY-minY)*canvas.height)+pad*2;
    output.getContext('2d').drawImage(canvas,minX*canvas.width,minY*canvas.height,(maxX-minX)*canvas.width,(maxY-minY)*canvas.height,pad,pad,output.width-pad*2,output.height-pad*2);
    return {image:output.toDataURL('image/png'),at:new Date().toISOString()};
  }};
}
