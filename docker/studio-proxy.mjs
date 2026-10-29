// Prisma Studio only listens on 127.0.0.1 inside its container, which Docker can't publish.
// Forward 0.0.0.0:5555 -> 127.0.0.1:5556 so http://localhost:5555 works from your browser.
import net from 'node:net';

net
  .createServer((client) => {
    const studio = net.connect(5556, '127.0.0.1');
    const close = () => {
      client.destroy();
      studio.destroy();
    };
    client.on('error', close);
    studio.on('error', close);
    client.pipe(studio).pipe(client);
  })
  .listen(5555, '0.0.0.0');
