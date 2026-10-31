'use strict';
const fs=require('node:fs'),path=require('node:path');
// One persistent process; paths do not depend on the IDE's working directory.
process.chdir(__dirname);
(async()=>{try{
 // Rebuild on startup so source/artwork patches cannot serve stale dist assets.
 await require('./build.cjs');
 const at=process.argv.indexOf('--port');
 const port=Number(at>=0?process.argv[at+1]:(process.env.PORT||3000));
 if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid port: use --port NUMBER or PORT=NUMBER.');
 const {createServer}=require('./server.cjs');
 const server=createServer();
 server.once('error',error=>{console.error('[startup] '+error.stack);process.exitCode=1});
 server.listen(port,'0.0.0.0',()=>{
  const actual=server.address().port;
  console.log('  Local:   http://localhost:'+actual+'/');
  console.log('  Network: http://0.0.0.0:'+actual+'/');
  console.log('[ready] Online lobby + bots: /api/health');
 });
 const stop=()=>{server.rooms.close();server.closeAllConnections();server.close(()=>process.exit(0))};
 process.once('SIGTERM',stop);process.once('SIGINT',stop);
}catch(error){console.error('[startup] '+error.stack);process.exitCode=1}

})();
