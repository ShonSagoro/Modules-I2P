import amqp from "amqplib";
import dotenv from "dotenv";
import io from "socket.io-client";
import express from 'express';
import fetch from "node-fetch";
import FormData from "form-data";
import Readable from "stream";
const formData = new FormData();
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


const exchangeName = process.env.EXCHANGENAME;
const exchangeType = process.env.EXCHANGETYPE;
const routingKey = process.env.ROUTINGKEY;

const queueInit=process.env.QUEUE_INIT;
const queueNotiU=process.env.QUEUE_NOTI_U;
const queueLoginReq=process.env.QUEUE_REQUEST_LOGIN;
const queueRegisterReq=process.env.QUEUE_REQUEST_REG;


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

const channelRegisterReq=await createChannel(connected, queueRegisterReq);
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

channelLoginReq.consume(queueLoginReq,(form)=>{
    if(form!==null){
        console.log('recived: ', JSON.parse(msg.content.toString()));
        login(JSON.parse(form.content.toString()));
        channelLoginReq.ack(form); //lo saca de la cola
    }else{
        console.log('Consumer cancelled by server');
    }
})


channelRegisterReq.consume(queueRegisterReq,(form)=>{
    if(form!==null){
        console.log('recived: ', JSON.parse(form.content.toString()));
        registerUser(JSON.parse(form.content.toString()))
        channelRegisterReq.ack(form); //lo saca de la cola
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
    fetch(`http://localhost:8080/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: form.email,
            password: form.password
        })
    })
    .then(response => {
        const token = response.headers.get('authorization');
        getUserByEmail(form.email, token);
        return response.headers.get('authorization');
    })
    .then(data=>{console.log(data)})
    .catch(error => console.error(error));
}

const getUserByEmail=(email, token)=>{
    const headers={ 'Content-Type': 'application/json', 'Authorization': token };
    fetch(`http://localhost:8080/user/get/email`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            email: email
        })
    })
    .then(response => {
        return response.json();
    })
    .then(data =>{
        console.log(data);
        sendLoginInfoToRabbit(token, data)
    })
    .catch(error => console.error("error",error));
    
}

const registerUser=(form)=>{
    fetch(`http://localhost:8080/user/reg`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
          },
        body: JSON.stringify({
            email: form.email,
            name: form.name,
            password: form.password
        })
    })
    .then(response => {
        if(response.status===201){
            return response.json();
        }else{
            return false;
        }
    })
    .then(data =>{
        console.log(data);
        sendRegisterInfoToRabbit(data);
    })
    .catch(error => console.error("error",error));
}


const sendLoginInfoToRabbit=async(token, data)=>{
    const queueLoginRes=process.env.QUEUE_RESPONSE_LOGIN;
    const channeRes=await connected.createChannel(queueLoginRes);
    console.log('canal login response user hecho de manera exitosa');
    const response={token: token, data:data}
    channeRes.sendToQueue(queueLoginRes, Buffer.from(JSON.stringify(response)));
    console.log('respuesta enviada a la cola', response);
    
}

const sendRegisterInfoToRabbit=async(info)=>{
    const queueRegisterRes=process.env.QUEUE_RESPONSE_REG;
    const channelRes=await connected.createChannel(queueRegisterRes);
    console.log('canal register response user hecho de manera exitosa');

    channelRes.sendToQueue(queueRegisterRes, Buffer.from(JSON.stringify(info)));
    console.log('respuesta enviada a la cola', info);
}