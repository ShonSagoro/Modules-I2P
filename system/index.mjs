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
const queueNotiS=process.env.QUEUE_NOTI_S;

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
        const channelNotiS=await connected.createChannel(queueNotiS);
        console.log('canal notifiaction system hecho de manera exitosa');

        channelNotiS.consume(queueNotiS,(msg)=>{
            if(msg){
                console.log('recived: ', msg.content.toString());
                sendSocket();
                channelNotiS.ack(msg);
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
        module:'system'
    }
    socket.emit('identify',idObject)
}

connect();