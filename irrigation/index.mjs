import amqp from "amqplib";
import dotenv from "dotenv";
import io from "socket.io-client";

const socket = io("http://127.0.0.1:4000");

dotenv.config();

const hostname=process.env.HOST||'localhost';
const protocol=process.env.PROTOCOL;
const user=process.env.USER;
const password=process.env.PASSWORD;
const port=process.env.PORT;
const queueNotiI=process.env.QUEUE_NOTI_I;
const a=1;

const rabbitSettings={
    protocol: protocol,
    hostname: hostname,
    port: port,
    username: user,
    password: password
}


async function connect() {
    console.log(hostname);
    try {
        const connected=await amqp.connect(rabbitSettings);
        console.log('conexion exitosa');
        const channelNotiI=await connected.createChannel(queueNotiI);
        console.log('canal hecho de manera exitosa');

        channelNotiI.consume(queueNotiI,(msg)=>{
            if(msg){
                console.log('recived: ', msg.content.toString());
                sendSocket();
                channelNotiI.ack(msg);
            }else{
                console.log('Consumer Noti cancelled by server');
            }
        })


    } catch (error) {
        console.error("Error =>", error);
    }
}

const sendSocket= async()=>{
    const idObject={
        id: socket.id,
        module:'irrigation'
    }
    socket.emit('identify',idObject)
}



connect();

