import sodium from 'libsodium-wrappers';

async function start() {
  console.log('🔐 Inicializando libsodium...');
  await sodium.ready;
  console.log('✅ Libsodium listo');
  
  await import('./index.js');
}

start().catch(console.error);
