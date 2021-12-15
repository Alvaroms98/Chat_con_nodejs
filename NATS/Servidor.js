// Programa servidor de la implementación del chat utilizando ZeroMQ
const { connect, StringCodec } = require('nats');

class Servidor{
    constructor(socketRep, socketPub){
        this.socketRep = socketRep;
        this.socketPub = socketPub;

        // Codificador y decodificador de NATS
        this.codificador = StringCodec();
    }

    // ............................................................
    // LÓGICA SERVIDOR
    // ............................................................

    // La lógica del servidor únicamente redirecciona mensajes
    // por tanto, todo lo que hace es llamar a los proxys correspondientes
    // de los miembros para comunicar los mensajes y las acciones
    entrarSala(nombreNuevo){
        this.nuevoMiembro(nombreNuevo);
    }

    difundirMensaje(nombre,nuevoMensaje){
        this.tieneUnMensaje(nombre,nuevoMensaje);
    }

    salirSala(nombre){
        this.hanAbandonadoGrupo(nombre);
    }

    // ............................................................
    // PROXY LÓGICA MIEMBRO
    // ............................................................

    tieneUnMensaje(nombreMiembro, mensajeAImprimir){
        const metodo = 'tieneUnMensaje';
        this.socketPub.publish('chat',this.codificador.encode(`${metodo}\t${nombreMiembro}\t${mensajeAImprimir}`));
    }

    nuevoMiembro(nombreNuevo){
        const metodo = 'nuevoMiembro';
        this.socketPub.publish('chat',this.codificador.encode(`${metodo}\t${nombreNuevo}`));
    }

    hanAbandonadoGrupo(elQueSeVa){
        const metodo = 'hanAbandonadoGrupo';
        this.socketPub.publish('chat',this.codificador.encode(`${metodo}\t${elQueSeVa}`));
    }

}



async function main(){

    const direccionServidor = process.argv[2] || "localhost";

    // Servidor NATS: en esta aproximación el contenedor se levanta
    // En la misma máquina que el servidor chat
    // El puerto 4222 es el que NATS atiende las peticiones de los clientes
    // por defecto
    const SERVIDOR_NATS_URL = { servers: `${direccionServidor}:4222`}



    // sockets
    const socketPub = await connect(SERVIDOR_NATS_URL);
    const socketRep = socketPub.subscribe('clienteServidor');
    

    // Arrancar el servidor
    const servidor = new Servidor(socketRep,socketPub);


    // Lógica comunicaciones con NATS
    for await(const notificacion of servidor.socketRep){
        const mensaje = servidor.codificador.decode(notificacion.data);
        const mensajeSegmentado = mensaje.split('\t');
        const metodo = mensajeSegmentado[0];
        const aliasMiembro = mensajeSegmentado[1];
        const nuevoMensaje = mensajeSegmentado[2] || '';

        console.log(mensajeSegmentado);

        switch (metodo){
            case 'difundirMensaje':
                servidor.difundirMensaje(aliasMiembro, nuevoMensaje);
                break;
            case 'entrarSala':
                servidor.entrarSala(aliasMiembro);
                break;
            case 'salirSala':
                servidor.salirSala(aliasMiembro);
                break;
            default:
                console.log('Mensaje recibido no se ajusta a ningun metodo de la lógica');
        }    
    }


    process.on('SIGINT', async () => {
        // Cerrar conexiones
        await socketPub.close();
        const err = await socketPub.closed();

        if (err){
            console.log(err);
        }else{
            console.log("Apagando Servidor...");
            process.exit(0);
        }
    });
}

main();