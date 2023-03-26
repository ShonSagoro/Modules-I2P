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
    console.log(hostname);
    try {
        //Connection
        const connected=await amqp.connect(rabbitSettings);
        console.log('conexion exitosa');


        //chanels Create
        const channelInit=await connected.createChannel(queueInit);
        console.log('canal init hecho de manera exitosa');

        const channelNotiU=await connected.createChannel(queueNotiU);
        console.log('canal notification user hecho de manera exitosa');
        
        const channelLoginReq=await connected.createChannel(queueLoginReq);
        console.log('canal notification user hecho de manera exitosa');


        //Listen queues
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

    } catch (error) {
        console.error("Error =>", error);
    }
}

connect();

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

const login=(form)=>{
    axios.post('http://localhost:8080/login', {
        email:form.email,
        password:form.password,
      })
      .then(function (response) {
        console.log(response);
        
      })
      .catch(function (error) {
        console.log(error);
      });
}