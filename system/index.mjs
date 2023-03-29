import amqp from "amqplib";
import dotenv from "dotenv";
import io from "socket.io-client";
import express from 'express';
import fetch from "node-fetch";
const app = express();
dotenv.config();

const HOSTNAME = '127.0.0.1';
const PORTSERVER = process.env.PORTSERVER || 4002;


app.listen(PORTSERVER,HOSTNAME, () => {
    console.log(`Servidor funcionando en el puerto ${PORTSERVER} y el hostname: ${HOSTNAME}`);
});

const socket = io("http://127.0.0.1:4000");
// const socket = io("http://3.133.107.127:4000");


const hostname=process.env.HOST||'localhost';
const protocol=process.env.PROTOCOL;
const user=process.env.USER;
const password=process.env.PASSWORD;
const port=process.env.PORT;

//queues
const queueNotiS=process.env.QUEUE_NOTI_S;
const queueReq=process.env.QUEUE_REQUEST_SYSTEM;
const queueChange=process.env.QUEUE_CHANGE_SYSTEM;
const queueRes=process.env.QUEUE_RESPONSE_SYSTEM;

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

const channelNotiS=await createChannel(connected, queueNotiS);
console.log('canal notifiaction system hecho de manera exitosa');

const channelSystemRes= await createChannel(connected, queueRes);
console.log('canal notifiaction system hecho de manera exitosa');

const channelChange= await createChannel(connected, queueChange);
console.log('canal notifiaction system hecho de manera exitosa');

const channelSystemReq= await createChannel(connected, queueReq);
console.log('canal notifiaction system hecho de manera exitosa');



channelNotiS.consume(queueNotiS,(msg)=>{
    if(msg){
        console.log('recived: ', msg.content.toString());
        sendSocket();
        channelNotiS.ack(msg);
    }else{
        console.log('Consumer Noti cancelled by server');
    }
});

channelChange.consume(queueChange,(data)=>{
    if(data){
        const objectReceive=JSON.parse(data.content.toString());
        console.log('recived: ',objectReceive);
        askList(objectReceive);
        channelChange.ack(idObject);
    }else{
        console.log('Consumer Change cancelled by server');
    }
});

channelSystemReq.consume(queueReq,(data)=>{
    if(data){
        const objectReceive=JSON.parse(data.content.toString());
        console.log('recived: ', objectReceive);
        askList(objectReceive);
        channelSystemReq.ack(data);
    }else{
        console.log('Consumer Request cancelled by server');
    }
});



const sendSocket= async()=>{
    const idObject={
        id: socket.id,
        module:'system'
    }
    socket.emit('identify',idObject)
}

const askList=(objectReceive)=>{
    fetch(`http://3.133.125.251:8080/system/user/${objectReceive.id}/systems`)
        .then(response => response.json())
        .then(data =>{
            console.log(data);
            sendToResponseSystemQueue(data, objectReceive.socket);
        })
        .catch(error => console.error(error));
}


const sendToResponseSystemQueue=async(response, socket)=>{
    const objectSend={response: response, socket:socket}
    channelSystemRes.sendToQueue(queueRes, Buffer.from(JSON.stringify(objectSend)));
    console.log('respuesta enviada a la cola');
}