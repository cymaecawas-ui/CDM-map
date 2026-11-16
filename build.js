import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for (const item of ['index.php','.htaccess','api','src','public','database','supabase','README.md']) await cp(item,`dist/${item}`,{recursive:true});
console.log('PHP application files copied to dist/. Configure api/config.local.php in the deployed copy and serve it with PHP-capable Apache.');
