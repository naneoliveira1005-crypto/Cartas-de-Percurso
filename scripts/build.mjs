import{mkdir,copyFile,readdir,rm}from'node:fs/promises';import path from'node:path';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const entry of await readdir('.',{withFileTypes:true})){
 if(entry.isFile()&&/\.(html|js|css|svg|png|webmanifest)$/.test(entry.name))await copyFile(entry.name,path.join('dist',entry.name));
}
await copyFile('e23.html','dist/homologacao.html');
console.log('Arquivos públicos preparados em dist. Nenhum dado privado ou conta de teste incluído.');
