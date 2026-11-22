export const MAX_BYTES=25*1024*1024;
export function inspectFile(bytes,declared,kind){
 const head=new TextDecoder('latin1').decode(bytes.slice(0,32));
 let mime=declared.toLowerCase().split(';')[0];
 if(['audio/mp3','audio/x-mp3'].includes(mime))mime='audio/mpeg';
 if(mime==='audio/x-wav')mime='audio/wav';
 if(mime==='audio/x-m4a')mime='audio/mp4';
 if(!bytes.length||bytes.length>MAX_BYTES)throw Error('TAMANHO_INVALIDO');
 if(['material','completo'].includes(kind)&&!(mime==='application/pdf'&&head.startsWith('%PDF-')))throw Error('PDF_INVALIDO');
 if(kind==='transcricao'&&!((mime==='application/pdf'&&head.startsWith('%PDF-'))||mime==='text/plain'))throw Error('TRANSCRICAO_INVALIDA');
 if(kind==='audio'){
  const valid=(mime==='audio/mpeg'&&(head.startsWith('ID3')||(bytes[0]===255&&(bytes[1]&224)===224)))||
   (mime==='audio/ogg'&&head.startsWith('OggS'))||(mime==='audio/wav'&&head.startsWith('RIFF')&&head.slice(8,12)==='WAVE')||
   (mime==='audio/mp4'&&head.slice(4,8)==='ftyp')||(mime==='audio/webm'&&bytes[0]===26&&bytes[1]===69&&bytes[2]===223&&bytes[3]===163);
  if(!valid)throw Error('AUDIO_INVALIDO');
 }
 if(!['material','completo','transcricao','audio'].includes(kind))throw Error('TIPO_INVALIDO');
 return mime;
}
