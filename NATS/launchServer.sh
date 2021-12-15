# Levantamos contenedor que sostenga a NATS
# Hacinedo "bind" en el puerto 4222 del host

sudo docker run -d --rm --name nats-server -p 4222:4222 nats

echo "No olvides tumbar el contenedor con NATS cuando cierres el servidor del chat"
echo "Comando: sudo docker stop nats-server"
# Lanzamos el servidor del chat
node Servidor.js

