import amqp from "amqplib";
import dotenv from "dotenv";
import io from "socket.io-client";
import express from 'express';
import fetch from "node-fetch";
const app = express();
dotenv.config();

const HOSTNAME = '127.0.0.1';
const PORTSERVER = process.env.PORTSERVER || 4004;

const socket = io("http://3.133.107.127:4000");

app.listen(PORTSERVER,HOSTNAME, () => {
    console.log(`Servidor funcionando en el puerto ${PORTSERVER} y el hostname: ${HOSTNAME}`);
});

const hostname=process.env.HOST||'localhost';
const protocol=process.env.PROTOCOL;
const user=process.env.USER;
const password=process.env.PASSWORD;
const queueChangeRes=process.env.QUEUE_CHANGE_IRRIGATION_RESPONSE;
const port=process.env.PORT;

//queues
const queueNotiI=process.env.QUEUE_NOTI_I;
const queueReq=process.env.QUEUE_REQUEST_IRRIGATION;
const queueChange=process.env.QUEUE_CHANGE_IRRIGATION;
const queueRes=process.env.QUEUE_RESPONSE_IRRIGATION;

const rabbitSettings={
    protocol: protocol,
    hostname: hostname,
    port: port,
    username: user,
    password: password
}

async function connect() {
    try {
      const connected = await amqp.connect(rabbitSettings);
      console.log("conexion exitosa");
      return connected;
    } catch (error) {
      console.error("Error =>", error);
      return null;
    }
  }
  
async function createChannel(connection, queue) {
    const channel = await connection.createChannel();
    await channel.assertQueue(queue);
    return channel;
}

const connected=await connect();

const channelNotiI=await createChannel(connected, queueNotiI);
console.log('canal notifiaction system hecho de manera exitosa');

const channelSystemRes= await createChannel(connected, queueRes);
console.log('canal notifiaction system hecho de manera exitosa');

const channelChange= await createChannel(connected, queueChange);
console.log('canal notifiaction system hecho de manera exitosa');

const channelSystemReq= await createChannel(connected, queueReq);
console.log('canal notifiaction system hecho de manera exitosa');



channelNotiI.consume(queueNotiI,(msg)=>{
    if(msg){
        console.log('recived: ', msg.content.toString());
        sendSocket();
        channelNotiI.ack(msg);
    }else{
        console.log('Consumer Noti cancelled by server');
    }
});

channelChange.consume(queueChange,(request)=>{
    if(request){
        const objectReceive=JSON.parse(data.content.toString());
        console.log('recived: ',objectReceive);
        sendResponse(queueChangeRes,objectReceive);
        channelChange.ack(data);
    }else{
        console.log('Consumer Change cancelled by server');
    }
});

channelSystemReq.consume(queueReq,(request)=>{
    if(request){
        const objectReceive=JSON.parse(request.content.toString());
        console.log('recived: ', objectReceive);
        askList(objectReceive);
        channelSystemReq.ack(request);
    }else{
        console.log('Consumer request cancelled by server');
    }
});



const sendSocket= async()=>{
    const idObject={
        id: socket.id,
        module:'system'
    }
    socket.emit('identify',idObject)
}

const askList=(request)=>{
    let objectResponse;
    fetch(`http://3.133.125.251:8080/irrigation/system/${request.id}/risks`)
        .then(response => response.json())
        .then(data =>{
            console.log(data);
            objectResponse={response: data, socket: request.socket}
            sendResponse(queueRes,objectResponse);
        })
        .catch(error => console.error(error));
}


const sendResponse=async(response, queue)=>{
    const connected = await connect();
    const channel = await connected.createChannel(queue);
    console.log(object);
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(response)));
    console.log('respuesta enviada a la cola');
}

