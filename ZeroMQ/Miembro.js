// Programa cliente de la implementación del chat utilizando ZeroMQ
const zmq = require('zeromq');


class Miembro{
    constructor(alias, socketReq, socketSub){
        this.alias = alias;
        this.socketReq = socketReq;
        this.socketSub = socketSub;
        
        // Socket para enviar mensajes por la consola
        // (interfaz para enviar mensajes)
        this.teclado = process.openStdin();

        // Logica de las comunicaciones
        this.socketReq.on('message', (mensajeRecibido) => {
            //console.log(mensajeRecibido.toString());
            return
        });

        this.socketSub.on('message', (mensajeChat) => {
            const mensajeSegmentado = mensajeChat.toString().split('\t');
            const metodo = mensajeSegmentado[0];
            const aliasMiembro = mensajeSegmentado[1];
            const mensajeAImprimir = mensajeSegmentado[2] || '';

            switch (metodo){
                case 'nuevoMiembro':
                    this.nuevoMiembro(aliasMiembro);
                    break;
                case 'tieneUnMensaje':
                    this.tieneUnMensaje(aliasMiembro, mensajeAImprimir);
                    break;
                case 'hanAbandonadoGrupo':
                    this.hanAbandonadoGrupo(aliasMiembro);
                    break;
                default:
                    console.log('Mensaje recibido no se ajusta a ningun metodo de la lógica');
            }
        });
    }

    // ............................................................
    // LÓGICA MIEMBRO
    // ............................................................

    nuevoMiembro(nombreNuevo){
        if (nombreNuevo !== this.alias){
            console.log(`\t"${nombreNuevo}" acaba de unirse al chat`);
        } else{
            console.log(`\tBienvenido al chat "${nombreNuevo}"`);
            this.teclado.on('data', (datos) => {
                // Este console.log es por estética
                console.log('');
                const mensaje = datos.toString();
                this.enviarMensaje(mensaje);
            });
        }
    }

    hanAbandonadoGrupo(elQueSeVa){
        console.log(`\t"${elQueSeVa}" ha abandonado el chat`);
    }

    tieneUnMensaje(nombreMiembro, mensajeAImprimir){
        if (nombreMiembro !== this.alias){
            console.log(`${nombreMiembro}: ${mensajeAImprimir}`);
        }
    }

    enviarMensaje(nuevoMensaje){
        this.difundirMensaje(nuevoMensaje);
    }

    meVoy(){
        this.salirSala(this.alias);
    }


    // ............................................................
    // PROXY LÓGICA SERVIDOR
    // ............................................................

    difundirMensaje(mensaje){
        const metodo = 'difundirMensaje';
        this.socketReq.send(`${metodo}\t${this.alias}\t${mensaje}`);
    }

    entrarSala(nombreNuevo){
        const metodo = 'entrarSala';
        this.socketReq.send(`${metodo}\t${nombreNuevo}`);
    }

    salirSala(nombre){
        const metodo = 'salirSala';
        this.socketReq.send(`${metodo}\t${nombre}`);
    }
}


function main(){
    // Variables de entrada al programa
    const alias = process.argv[2] || "anónimo";
    const direccionServidor = process.argv[3] || "localhost";
    const puertoReq = process.argv[4] || 3000;
    const puertoSub = process.argv[5] || 3001;

    // sockets
    const socketReq = zmq.socket('req');
    const socketSub = zmq.socket('sub');
    socketReq.connect(`tcp://${direccionServidor}:${puertoReq}`);
    socketSub.connect(`tcp://${direccionServidor}:${puertoSub}`);
    socketSub.subscribe('');


    // Creación de participante
    const miembro = new Miembro(alias, socketReq, socketSub);
    miembro.entrarSala(alias);


    process.on('SIGINT', async () => {
        miembro.meVoy();
        socketReq.close();
        socketSub.close();
        console.log("Cerramos sesión");
        process.exit(0);
    });
}

main();