// Programa servidor de la implementación del chat utilizando ZeroMQ
const zmq = require('zeromq');

class Servidor{
    constructor(socketRep, socketPub){
        this.socketRep = socketRep;
        this.socketPub = socketPub;


        // Lógica comunicaciones
        socketRep.on('message', (peticion) => {
            const mensajeSegmentado = peticion.toString().split('\t');
            const metodo = mensajeSegmentado[0];
            const aliasMiembro = mensajeSegmentado[1];
            const nuevoMensaje = mensajeSegmentado[2] || '';

            console.log(mensajeSegmentado);

            switch (metodo){
                case 'difundirMensaje':
                    this.difundirMensaje(aliasMiembro, nuevoMensaje);
                    break;
                case 'entrarSala':
                    this.entrarSala(aliasMiembro);
                    break;
                case 'salirSala':
                    this.salirSala(aliasMiembro);
                    break;
                default:
                    console.log('Mensaje recibido no se ajusta a ningun metodo de la lógica');
            }
            this.socketRep.send('');    
        });
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
        this.socketPub.send(`${metodo}\t${nombreMiembro}\t${mensajeAImprimir}`);
    }

    nuevoMiembro(nombreNuevo){
        const metodo = 'nuevoMiembro';
        this.socketPub.send(`${metodo}\t${nombreNuevo}`);
    }

    hanAbandonadoGrupo(elQueSeVa){
        const metodo = 'hanAbandonadoGrupo';
        this.socketPub.send(`${metodo}\t${elQueSeVa}`);
    }

}



function main(){
    const puertoRep = process.argv[2] || 3000;
    const puertoPub = process.argv[3] || 3001;

    // sockets
    const socketRep = zmq.socket('rep');
    const socketPub = zmq.socket('pub');

    socketRep.bind(`tcp://*:${puertoRep}`, (err) => {
        if (!err){
            console.log(`Escuchando peticiones en puerto ${puertoRep}`);
        } else{
            console.log(err);
        }
    });

    socketPub.bind(`tcp://*:${puertoPub}`, (err) => {
        if (!err){
            console.log(`Publicando mensajes en puerto ${puertoPub}`);
        } else{
            console.log(err);
        }
    });

    // Arrancar el servidor
    const servidor = new Servidor(socketRep,socketPub);

    process.on('SIGINT', () => {
        socketRep.close();
        socketPub.close();
        console.log("Apagando Servidor...");
        process.exit(0);
    });
}

main();