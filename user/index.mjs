import amqp from "amqplib";
import dotenv from "dotenv";
import io from "socket.io-client";
import express from 'express';
import fetch from "node-fetch";
const app = express();

dotenv.config();

const socket = io("http://127.0.0.1:4000");
const HOSTNAME = '127.0.0.1';
const PORTSERVER = process.env.PORTSERVER || 3000;

app.listen(PORTSERVER,HOSTNAME, () => {
    console.log(`Servidor funcionando en el puerto ${PORTSERVER} y el hostname: ${HOSTNAME}`);
});


//rabbit
const hostname=process.env.HOST||'localhost';
const protocol=process.env.PROTOCOL;
const user=process.env.USER;
const password=process.env.PASSWORD;
const port=process.env.PORT;
const queueInit=process.env.QUEUE_INIT;

const queueNotiU=process.env.QUEUE_NOTI_U;
const exchangeName = process.env.EXCHANGENAME;
const exchangeType = process.env.EXCHANGETYPE;
const routingKey = process.env.ROUTINGKEY;

const queueLoginReq=process.env.QUEUE_REQUEST_LOGIN;


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


const channelInit=await createChannel(connected, queueInit);
console.log('canal init hecho de manera exitosa');

const channelNotiU=await createChannel(connected, queueNotiU);
console.log('canal notification user hecho de manera exitosa');

const channelLoginReq=await createChannel(connected, queueLoginReq);
console.log('canal notification user hecho de manera exitosa');



channelInit.consume(queueInit,(msg)=>{
    if(msg!==null){
        handleInitialEvent(channelInit);
        console.log('recived: ', msg.content.toString());

        channelInit.ack(msg); //lo saca de la cola
       
    }else{
        console.log('Consumer cancelled by server');
    }
});

channelNotiU.consume(queueNotiU,(msg)=>{
    if(msg){
        console.log('recived: ', msg.content.toString());
        sendSocket();
        channelNotiU.ack(msg);
    }else{
        console.log('Consumer Noti cancelled by server');
    }
})

channelLoginReq.consume(queueLoginReq,(msg)=>{
    if(msg!==null){
        handleInitialEvent(channelInit);
        console.log('recived: ', msg.content.toString());

        channelInit.ack(msg); //lo saca de la cola
       
    }else{
        console.log('Consumer cancelled by server');
    }
})

//methods
const handleInitialEvent= async (channel)=>{
    await channel.assertExchange(exchangeName, exchangeType, { durable: true });
    await channel.publish(exchangeName, routingKey, Buffer.from("true"));
    console.log("ya lo envie")
}

const sendSocket= async()=>{
    const idObject={
        id: socket.id,
        module:'user'
    }
    socket.emit('identify',idObject)
}

const login= async(form)=>{
    axios.post('http://localhost:8080/login', {
        email:form.email,
        password:form.password,
      })
      .then(function (response) {
        console.log(response);
        //crea canal
        sendAPILogin(response); 
        console.log('canal notification user hecho de manera exitosa');
      })
      .catch(function (error) {
        console.log(error);
      });
}

const sendAPILogin=async(response)=>{
    const queueLoginRes=process.env.QUEUE_RESPONSE_LOGIN;
    const channelLoginRes=await connected.createChannel(queueLoginRes);
    console.log('canal notification user hecho de manera exitosa');
    
    channelLoginRes.sendToQueue(queue, Buffer.from(JSON.stringify(response)));
    console.log('respuesta enviada a la cola', response);
    
}
var requestOptions = {
    method: 'GET',
    redirect: 'follow'
  };
  

