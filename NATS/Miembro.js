// Programa cliente de la implementación del chat utilizando ZeroMQ
const { connect, StringCodec } = require('nats');


class Miembro{
    constructor(alias, socketReq, socketSub){
        this.alias = alias;
        this.socketReq = socketReq;
        this.socketSub = socketSub;
        
        // Codificador y decodificador de NATS
        this.codificador = StringCodec();

        // Socket para enviar mensajes por la consola
        // (interfaz para enviar mensajes)
        this.teclado = process.openStdin();
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
        this.socketReq.publish('clienteServidor',this.codificador.encode(`${metodo}\t${this.alias}\t${mensaje}`));
    }

    entrarSala(nombreNuevo){
        const metodo = 'entrarSala';
        this.socketReq.publish('clienteServidor',this.codificador.encode(`${metodo}\t${nombreNuevo}`));
    }

    salirSala(nombre){
        const metodo = 'salirSala';
        this.socketReq.publish('clienteServidor',this.codificador.encode(`${metodo}\t${nombre}`));
    }
}


async function main(){
    // Variables de entrada al programa
    const alias = process.argv[2] || "anónimo";
    const direccionServidor = process.argv[3] || "localhost";

    // Servidor NATS: en esta aproximación el contenedor se levanta
    // En la misma máquina que el servidor chat
    // El puerto 4222 es el que NATS atiende las peticiones de los clientes
    // por defecto
    const SERVIDOR_NATS_URL = { servers: `${direccionServidor}:4222`}
    
    // sockets
    const socketReq = await connect(SERVIDOR_NATS_URL);
    const socketSub = socketReq.subscribe('chat');



    // Creación de participante
    const miembro = new Miembro(alias, socketReq, socketSub);
    miembro.entrarSala(alias);

    // Logica de las comunicaciones NATS

    for await(const notificacion of miembro.socketSub){
        const mensaje = miembro.codificador.decode(notificacion.data);
        const mensajeSegmentado = mensaje.split('\t');
        const metodo = mensajeSegmentado[0];
        const aliasMiembro = mensajeSegmentado[1];
        const mensajeAImprimir = mensajeSegmentado[2] || '';

        switch (metodo){
            case 'nuevoMiembro':
                miembro.nuevoMiembro(aliasMiembro);
                break;
            case 'tieneUnMensaje':
                miembro.tieneUnMensaje(aliasMiembro, mensajeAImprimir);
                break;
            case 'hanAbandonadoGrupo':
                miembro.hanAbandonadoGrupo(aliasMiembro);
                break;
            default:
                console.log('Mensaje recibido no se ajusta a ningun metodo de la lógica');
        }
    }


    process.on('SIGINT', async () => {
        miembro.meVoy();
        // Cerrar conexiones
        await socketReq.close();
        const err = await socketReq.closed();

        if (err){
            console.log(err);
        }else{
            console.log("Cerramos sesión");
            process.exit(0);
        }

    });
}

main();