import amqp from "amqplib";
import dotenv from "dotenv";
import io from "socket.io-client";
import express from 'express';
import fetch from "node-fetch";
const app = express();
dotenv.config();

const HOSTNAME = '127.0.0.1';
const PORTSERVER = process.env.PORTSERVER || 3000;

const socket = io("http://127.0.0.1:4000");

app.listen(PORTSERVER,HOSTNAME, () => {
    console.log(`Servidor funcionando en el puerto ${PORTSERVER} y el hostname: ${HOSTNAME}`);
});

const hostname=process.env.HOST||'localhost';
const protocol=process.env.PROTOCOL;
const user=process.env.USER;
const password=process.env.PASSWORD;
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

channelChange.consume(queueChange,(idObject)=>{
    if(idObject){
        const id=JSON.parse(idObject.content.toString())
        console.log(id);
        askList(id);
        channelChange.ack(idObject);
    }else{
        console.log('Consumer Noti cancelled by server');
    }
});

channelSystemReq.consume(queueReq,(idObject)=>{
    if(idObject){
        const id=JSON.parse(idObject.content.toString());
        console.log('recived: ', id);
        askList(id);
        channelSystemReq.ack(idObject);
    }else{
        console.log('Consumer Noti cancelled by server');
    }
});



const sendSocket= async()=>{
    const idObject={
        id: socket.id,
        module:'system'
    }
    socket.emit('identify',idObject)
}

const askList=(idSystem)=>{
    fetch(`http://localhost:8080/irrigation/system/${idSystem}/risks`)
        .then(response => response.json())
        .then(data =>{
            console.log(data);
            sendToResponseSystemQueue(data);
        })
        .catch(error => console.error(error));
}


const sendToResponseSystemQueue=async(response)=>{
    channelSystemRes.sendToQueue(queueRes, Buffer.from(JSON.stringify(response)));
    console.log('respuesta enviada a la cola');
}