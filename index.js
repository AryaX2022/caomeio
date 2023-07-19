const express = require('express');
const app = express();
const https = require('https');

const log = require('log-to-file');

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const { S3Client, GetObjectCommand, ListObjectsV2Command, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
//const { Upload } = require("@aws-sdk/lib-storage");
var AWS = require('aws-sdk');
//const stream = require('stream');
const {Readable, PassThrough } = require('stream');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");


var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: '6983299@gmail.com',
        pass: process.env.GMAIL_PWD
    }
});

let destFolder = "uploads/";
//let destFolder = "/tmp/";   //render.com不支持本地文件存储 TODO：ffmpeg 获取stream，然后处理。

const multer = require("multer");
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, destFolder)
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})
const upload = multer({ storage: storage });

var ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const s3Client = new S3Client({
    credentials: {
        accessKeyId: "jxxpimx7rapd6eg6rqgimfmvh6za",
        secretAccessKey: process.env.S3_KEY,
    },
    region: "us-1",
    endpoint: "https://gateway.storjshare.io",
});

const s3 = new AWS.S3({
    accessKeyId: "jxxpimx7rapd6eg6rqgimfmvh6za",
    secretAccessKey: process.env.S3_KEY,
    endpoint: "https://gateway.storjshare.io",
});

var jwt = require("jsonwebtoken");
var bodyParser = require('body-parser')
// create application/json parser
var jsonParser = bodyParser.json()
// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

require('dotenv').config()
//console.log(process.env.USRN);
const secret = "arya-secret"
const serviceAccount = {
    "type": "service_account",
    "project_id": process.env.PROJ_ID,
    "private_key_id": process.env.PRV_KEY_ID,
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCvwu8BJ/wfN8Ju\noH2MnhwBIJuacxv3YUvQYT8ESFguEvvMtN64QbSiKsahGQepQt8HBUZwW4dyG4LG\nqzNjjEALBB2tZayxks3Y7E0dX5XRx4KtZVR94BxDUnut1y+2NP24ShFllUgKlv3V\n9n6lfsTFI+pDmkPWOsFRw8apgsODS3Rrlyb4Wjd1/xLaOS7lq05vGqO/aWsVOH7N\nGFEMA8M4iC5lGzpiReqAhorWcbqwfyxGxg6FfQBSKlw9sAvvNfUjBeWpL/emtg5z\nDL+1X7XJielEQK119Tdi71uCJKUL9x9USHgF5LCNfJv6Ie1FRxE06k/GaakBAtAV\nHSt3jL+BAgMBAAECggEABgRK0UPQpjLu9YGJ+rvY4pL+sKlbHjtW8JG7qgZd+mnM\n8+OHMlCRgfGr7gzgzcMLxn5API1tlBLsBagLsM82zAm+iFaQNF39rPzd4PEKPG2z\nhAMRguOepBFZSYixye+DdgEXGl6jYjVsCByRllHCI6uIk/recqF9R7LHhLsEvWRT\ntZkxDwFEx/cIsQXVDrJlaSOS99aQhFxLXniGdUus9QJmZY7ViNfrqPPJS5ZpSPj7\nguepUlXRUL3Vbb5Kd1nySlCDmpqPaqH6VsiAYbkVLOCZklfYo1RHko+7h8hCxH2D\nWKFMWSpQsDMIWg9LpEK+RyS2gSZUKuGH8pbH1YiljwKBgQDzQ4IrnjjFhUm7/ov4\nAidFtijg//Zih/n+bjNGf/RXwFl6lpl7mN/qKBSkyhQpSHGexmNG2y733tSFNEbI\nNnPGopCFofj1JH3MTU+yUVe1uDD9VwXnuSquvPvhHGlYdNvHGNDbrlPRQf7OPpJm\n6KjNtREiXfnwFq66CH1Bc5OAnwKBgQC49q9LUaY7xQa8sUhyyrPjzf+6B1VTL8Ev\ncDGsJMcamm5T9hNkkIVhaIpKE+4ZfijE6dvD19FafKzT1T0x9jcgJsrZ0wyPPPf2\nSxHfUqJI/KmZ8m5LR7nxPu8wSG4K8yjT9yhO+zv+N2IgczMhxQol2CsljNsPq4v2\nFeX8H2sr3wKBgB+4s+bAMSMAqIbNQK9MiJZ8lIQSnKxokt7su977nH884+4qaUVG\nwBwmsdpzR4HCop5TvGpm9o74Dbp5AKnm/93tIO9sGazN32Geyz+zf76AkFLY4DpB\nWSGEH0xRiiMwyeACimm7J87nzjRS0IB+4lRAwkU6//ag3pP/u2Wnjpp9AoGAWD/y\n8UfavafLCBq6C3Mlk2qFOhgnoNInJWAtgwnlKY9HVq4RIKlHymsbmC6cKvOjthgy\nb+W4EKltuICEeyMTuDZqELX+xxT65jt5IomFvrc2oKon76kgUbeKXgog3v6Xm1LQ\nm6aJQEjie8MbQWCG7/mM1JS5LGfYFqjqG3pOIxcCgYAXTD3wQQ3ziywWbJ0Z9QBd\nTSJSZftqd6AB6ureUix46riZIaueSs8pTBMDNccb6OWT3mlFHcI/0RS1LGKGBtNX\n7kGtK7Rhgol2wm6xnkCXS0aRqCHaH7Ncegfrc44XxxGQXQBEciBGQi0SjDSIhG49\nutplCQuNjYLsNkDQTzvdtQ==\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-d2b41@caomeio.iam.gserviceaccount.com",
    "client_id": "112200692160902207799",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-d2b41%40caomeio.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
};

const cors = require('cors');
app.use(cors({
    //TODO
    origin: ['http://192.168.1.3:5173','http://127.0.0.1:5174','http://127.0.0.1:5173', 'https://caomeio.web.app']
}));


initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const { collection, DocumentData, addDoc, getDocs, setDoc, doc, updateDoc, increment, FieldValue, Timestamp, serverTimestamp  } = require('firebase-admin/firestore');

// const T_COMMENTS = 'vcomments';
// const T_CONSUMES = 'vconsumes';
// const T_ITEMS = 'vitems';
// const T_PID = 'vpid';
// const T_USERS = 'vusers';

const PAGE_SIZE = 6;
const T_COMMENTS = 'vcomments0';
const T_CONSUMES = 'vconsumes0';

const T_ITEMS = 'vitems0';
const T_PID = 'vpid0';
const T_USERS = 'vusers0';

app.get('/', (req, res) => {
    console.log("Good");
	res.json({"msg":"Alive"});
});

app.post("/v/try2geturl", jsonParser, async function (request,response){
    const params = {
        Bucket: 'caomeio',
        Key: request.body.key
    }

    let command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3Client, command);
    console.log(url);
    response.json({ret:url});
})

async function getCurrentPid() {
    const doc = await db.collection(T_PID).doc("current").get();
    //const docRef = db.collection(T_PID).doc("current");
    const data = doc.data();
    console.log(data);
    return data.pid;

    // try {
    //     const pid = fs.readFileSync('pid.txt', 'utf8');
    //     return pid;
    // } catch (e) {
    //     console.error(e);
    // }
}

async function setCurrentPid() {
    const docRef = db.collection(T_PID).doc("current");
    await docRef.update({"pid": FieldValue.increment(1)});

    // try {
    //     //fs.writeFileSync('next.txt',next)
    //     fs.writeFileSync('pid.txt', pid)
    // } catch (e) {
    //     console.error(e);
    // }

}

function getFilesSortedByModifiedDate(directoryPath) {
    const files = fs.readdirSync(directoryPath);

    const fileStats = files.map((file) => {
        const filePath = `${directoryPath}/${file}`;
        const stat = fs.statSync(filePath);
        return { file, mtime: stat.mtimeMs };
    });

    fileStats.sort((a, b) => a.mtime - b.mtime);

    return fileStats.map((fileStat) => fileStat.file);
}

async function getMediasFromLocal(dir) {

    const filenames = getFilesSortedByModifiedDate(dir);

    for (const file of filenames) {
        //console.log(n);
        let pid = await getCurrentPid();
        let data = {filename: file, pid: pid, createtime: new Date()}
        console.log(data);
        const res = await db.collection(T_ITEMS).add(data);
        //pid = pid + 1;
        setCurrentPid();
    }

}

app.post('/v/deleteField', async function (request, response) {
    const items = await db.collection(T_ITEMS).get();
    items.forEach(item => {
        const doc = db.collection(T_ITEMS).doc(item.id);

        doc.update({next:FieldValue.delete()});
    })
    console.log("Done");
    response.json({ret:1});
})


//*************************************************
// ***        特别注意    **************************
// ***   pid 的值： 本地 与 远程 保持一致  ************
//*************************************************
//遍历本地文件夹中已处理好的文件，将文件信息保存到数据库
//next.txt pid.txt 需要部署发布到生产环境。 且，需要将生产环境中的这两个文件，同步到本地环境。
app.post('/v/getFromLocalAndSave2Db', jsonParser, async function (request, response) {
    //输入参数：本地mp4文件夹路径
    getMediasFromLocal('I:\\Outputs\\ready');
    console.log("Done");
    response.json({ret:1});
})


async function addcomments2db(id, username, nickname, avatar, date, comment) {
    const res = await db.collection(T_COMMENTS).add({
        itemId: id,
        username: username,
        nickname: nickname,
        avatar: avatar,
        createtime: date,
        comment: comment
    });
}


let normal = ["😛","😍","😋","😻","🤪"];
let hot = ["漂亮!", "NICE", "🔥🔥🔥🔥🔥", "受不了了", "建议将声音拉满哦，效果爆表😀", "我喜欢", "我的菜"];
let sexy = ["我喜欢", "不错", "这...😛😛", "我的菜", "这谁受的了哦", "ying了ying了", "可以", "漂亮", "很好", "够大😛😛😛"];
let sayes = ["受不了了", "Amazing", "这谁受的了", "辣身材", "WOW", "NICE", "快..给我箱卫生纸", "一个字就是干", "ying了ying了", "大家不要笑我，我直接把飞机打下来了😜", "大家把音量拉满试试效果😛😛", "大家排好队啊，一个一个来，不要插队","漂亮", "很好", "我喜欢", "我有一个大胆的想法...😆😆😆", "必须把音量拉满🔥🔥🔥"];
let snake = ["WOW", "NICE", "我喜欢", "不错", "😍😍😍", "我的菜", "当pao架子应该挺不错的"]
let fresh = ["养眼😍😍😍", "大家不要抢，这个归我啦", "我的菜", "妹子不错", "我喜欢", "我的菜", "漂亮", "很好", "Good"]
let light = ["跳得不错哦", "跳得不赖😍😍", "音量加大感觉更棒😀", "就是这个调调", "喜欢", "妹子不错"]
let attr = ["受不了了", "WOW", "一个字就是干", "ying了ying了", "够骚😁😁", "骚劲十足，我喜欢😁😁😍😍"];

async function comment4item(id, tags) {

    let r_normal = normal[Math.floor(Math.random() * normal.length)];
    let r_hot = hot[Math.floor(Math.random() * hot.length)];
    let r_sexy = sexy[Math.floor(Math.random() * sexy.length)];
    let r_snake = snake[Math.floor(Math.random() * snake.length)];
    let r_fresh = fresh[Math.floor(Math.random() * fresh.length)];
    let r_light = light[Math.floor(Math.random() * light.length)];
    let r_attr = attr[Math.floor(Math.random() * attr.length)];
    let r_sayes = sayes[Math.floor(Math.random() * sayes.length)];

    function sub() {
        let sub = Math.floor(Math.random() * 10) > 7 ? normal[Math.floor(Math.random() * normal.length)] : "";
        for(let i = 0; i < Math.floor(Math.random() * 4); i++) {
            sub = sub + sub;
        }
        return sub;
    }
    //console.log(sub);

    function nor() {
        let ret = "";
        let restr = normal[Math.floor(Math.random() * normal.length)];
        let start = Math.floor(Math.random() * 10) + 5;
        let end = Math.floor(Math.random() * 35) + start;
        for(let i = start; i <= end; i++) {
            ret = ret + restr;
        }
        return ret;
    }

    function randomDate(start, end, startHour, endHour) {
        var date = new Date(+start + Math.random() * (end - start));
        var hour = startHour + Math.random() * (endHour - startHour) | 0;
        date.setHours(hour);
        return date;
    }

    async function getRaduser() {
        let num = Math.floor(Math.random() * 100);
        let key = 'u' + num.toString();
        const userDoc = await db.collection("vusers").doc(key).get();
        return userDoc.data();
    }

    //console.log(nor());
    if(tags.includes("light")) {
        //console.log(r_light+sub());
        let raduser = await getRaduser();
        let createtime = randomDate( new Date(2023,2,10), new Date(2023,5,29), 0, 24 );
        addcomments2db(id, raduser.username, raduser.nickname, raduser.avatar, createtime, r_light+sub());
    }
    if(tags.includes("fresh")) {
        //console.log(r_fresh+sub());
        let raduser = await getRaduser();
        let createtime = randomDate( new Date(2023,2,10), new Date(2023,5,29), 0, 24 );
        addcomments2db(id, raduser.username, raduser.nickname, raduser.avatar, createtime, r_fresh+sub());
    }
    if(tags.includes("sexy")) {
        //console.log(r_sexy+sub());
        let raduser = await getRaduser();
        let createtime = randomDate( new Date(2023,2,10), new Date(2023,5,29), 0, 24 );
        addcomments2db(id, raduser.username, raduser.nickname, raduser.avatar, createtime, r_sexy+sub());
    }
    if(tags.includes("attr")) {
        //console.log(r_attr+sub());
        let raduser = await getRaduser();
        let createtime = randomDate( new Date(2023,2,10), new Date(2023,5,29), 0, 24 );
        addcomments2db(id, raduser.username, raduser.nickname, raduser.avatar, createtime, r_attr+sub());
    }
    if(tags.includes("hot")) {
        //console.log(r_hot+sub());
        let raduser = await getRaduser();
        let createtime = randomDate( new Date(2023,2,10), new Date(2023,5,29), 0, 24 );
        addcomments2db(id, raduser.username, raduser.nickname, raduser.avatar, createtime, r_hot+sub());
    }
    if(tags.includes("snake")) {
        //console.log(r_snake+sub());
        let raduser = await getRaduser();
        let createtime = randomDate( new Date(2023,2,10), new Date(2023,5,29), 0, 24 );
        addcomments2db(id, raduser.username, raduser.nickname, raduser.avatar, createtime, r_snake+sub());
    }
    console.log(nor());
    let raduser = await getRaduser();
    let createtime = randomDate( new Date(2023,2,10), new Date(2023,5,29), 0, 24 );
    addcomments2db(id, raduser.username, raduser.nickname, raduser.avatar, createtime, nor());

    if(tags.includes("sayes")) {
        //console.log(r_sayes+sub());
        let raduser = await getRaduser();
        let createtime = randomDate( new Date(2023,2,10), new Date(2023,5,29), 0, 24 );
        addcomments2db(id, raduser.username, raduser.nickname, raduser.avatar, createtime, r_sayes+sub());
    }
}

app.post('/v/autocomment', jsonParser, async function(req, res) {

    // let id = req.body.id;
    // let tags = req.body.tags;
    let count = 0;

    const itemsDoc = await db.collection("vitems").get();
    itemsDoc.forEach(doc =>  {
        if(doc.data().tags != undefined) {
            comment4item(doc.id, doc.data().tags);
            count++;
            console.log(count);
        }
    });

    res.json({ret:1});

})

//设置标签
app.post('/v/setags', jsonParser, async function(req, res) {
    console.log(req.body.ids);

    req.body.tags.forEach(t => {
        tagObjects[t] = []
    });

    for (const id of req.body.ids) {
        console.log(id);
        const docRef = db.collection(T_ITEMS).doc(id);

        const doc = await docRef.get();
        let tags = []
        if(doc.data().tags != null) {
            tags = doc.data().tags;
        }
        req.body.tags.forEach(t => {
            if(!tags.includes(t)) {
                tags.push(t);
            }
        });

        const result = await docRef.set({tags: tags},{merge:true});
    }

    res.json({ret:1});
});

//设置作者
app.post('/v/setuploader', jsonParser, async function(req, res) {
    console.log(req.body.ids);
    const userDoc = await db.collection(T_USERS).doc(req.body.uploader).get();
    const user = userDoc.data();

    for (const key of req.body.ids) {
        console.log(key);
        const docRef = db.collection(T_ITEMS).doc(key);
        let nickname = user.nickname != undefined ? user.nickname : "";
        const result = await docRef.set({uploader: {avatar:user.avatar,username:user.username, nickname:nickname }},{merge:true});
    }

    res.json({ret:1});
});

//设置coin
app.post('/v/setcoin', jsonParser, async function(req, res) {
    console.log(req.body.keys);
    for (const key of req.body.keys) {
        console.log(key);
        const docRef = db.collection(T_ITEMS).doc(key);
        const result = await docRef.set({coin: req.body.coin},{merge:true});
    }

    res.json({ret:1});
});

//设置精华
app.post('/v/setbest', jsonParser, async function(req, res) {
    console.log(req.body.keys);
    for (const key of req.body.keys) {
        console.log(key);
        const docRef = db.collection(T_ITEMS).doc(key);
        const result = await docRef.set({isbest: req.body.flag},{merge:true});
    }

    res.json({ret:1});
});


// ******* 构建轻量级缓存 ************

var snakeItems = []
var hotItems = []
var sexItems = []
var freshItems = []
var bestItems = []
var sayesItems = []
var lightItems = []
var attrItems = []

let tagObjects = {
    "snake": snakeItems,
    "hot": hotItems,
    "sexy": sexItems,
    "fresh": freshItems,
    "best": bestItems,
    "sayes": sayesItems,
    "light": lightItems,
    "attr": attrItems,
}

let pagedObjects = {}

var mediaUrlItems = {}

// ******* 构建轻量级缓存 ************


//根据tag获取，可缓存
app.post("/v/getMediaByTag", jsonParser, async function(request, response) {
    console.log(request.body.tag);
    let tag = request.body.tag;
    let admin = isAdmin(request);
    if (tagObjects[tag].length == 0) {
        console.log("Fetch from DB");
        const vitems = await db.collection(T_ITEMS).where('tags', 'array-contains', tag).orderBy("createtime", "desc").get();
        vitems.forEach(doc => {
            //如果不是管理员，跳过status为0的。TODO
            let data = doc.data();
            data.id = doc.id;

            if(data.status != undefined && data.status == 0) {
                if(admin) {
                    tagObjects[tag].push(data);
                }
            } else {
                tagObjects[tag].push(data);
            }

        })
    }
    response.json(tagObjects[request.body.tag]);
})

async function findUrlByKey(key, expire) {
    const params = {
        Bucket: 'caomeio',
        Key: key
    }

    let command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3Client, command, {expiresIn: expire});
    //console.log(url);
    return url;
}

app.post("/v/getMediaRandomly", jsonParser, async function(request,response) {

    let data = null;
    let tag = request.body.tag;

    let lastPid = request.body.pid;

    console.log(tag);

    //如果是有tag过滤：则先拉取集合，然后从集合中随机获取一个
    //如果没有tag过滤：直接到db中获取

    if(tag !== undefined && tag !== '' && tag !== "all") {
        await getMediaByTag(tag);
        let items = tagObjects[tag];

        let num = Math.floor(Math.random() * items.length);
        //let num = 20;
        console.log(num);

        data = await getMediaById(items[num].id);

    } else {
        let currentPid = await getCurrentPid();
        let num = Math.floor(Math.random() * currentPid);   //随机吧
        //let num = request.body.pid != undefined ? request.body.pid : currentPid;
        //console.log("随机数:" + num.toString());
        const docs = await db.collection(T_ITEMS).where("pid","<",num).orderBy("pid","desc").limit(1).get().then(async querySnapshot => {

            if (!querySnapshot.empty) {
                let doc = querySnapshot.docs[0];
                //console.log(doc.id);
                data = await getMediaById(doc.id);
            } else {
                console.log("No document corresponding to the query!");
            }
        });
    }

    response.json(data);
})

async function getMediaById(id) {
    const doc = await db.collection(T_ITEMS).doc(id).get();
    //console.log(doc.data());
    let data = doc.data();
    console.log(data);
    if (data != undefined) {

        data.id = doc.id;

        data.vcomments = [];
        const comments = await db.collection(T_COMMENTS).where("itemId", "==", data.id).orderBy("createtime", "desc").get();
        comments.forEach(c => {
            data.vcomments.push(c.data());
        });

        let mediaUrl = '';
        if (mediaUrlItems.hasOwnProperty(data.filename) && mediaUrlItems[data.filename]['expire'] > new Date()) {
            //console.log("直接获取....")
            //console.log(mediaUrlItems[request.body.key]['expire']);
            mediaUrl = mediaUrlItems[data.filename]['url'];
        } else {
            //console.log("no");

            const url = await findUrlByKey(data.filename, 3600 * 24 * 7);

            var date = new Date();
            date.setDate(date.getDate() + 7);
            mediaUrlItems[data.filename] = {expire: date, url: url}

            mediaUrl = url;
        }

        console.log(mediaUrl);

        data.mediaUrl = mediaUrl;
        data.downloadUrl = await findUrlByKey(data.filename.replace('_', '@'), 900);
        if (data.price != undefined) {
            data.presecondsUrl = await findUrlByKey(data.filename.replace("_", "_p_"), 900);
        }
    }
    return data;
}

//根据id获取doc，同时查询url
app.post("/v/getMediaById", jsonParser, async function(request,response){
    response.json(await getMediaById(request.body.id));
})

// app.post("/v/download", jsonParser, async function(request,response){
//     request.body.filename = request.body.filename.replace('_','@');
//     console.log(request.body.filename);
//     const params = {
//         Bucket: 'caomeio',
//         Key: request.body.filename
//     }
//
//     let command = new GetObjectCommand(params);
//     const url = await getSignedUrl(s3Client, command);
//     console.log(url);
//
//     response.json({ret:url});
// })

function isAdmin(request) {
    let token = request.headers["x-access-token"];
    //console.log("token:");
    //console.log(token);

    if (!token) {
        return false;
    }

    return jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            return false;
        }
        console.log("decoded.id:");
        console.log(decoded.id);
        if(decoded.id === "admin") {
            console.log("yes");
            return true;
        } else {
            console.log("no");
            return false;
        }
    });
}

//分页查询
app.post("/v/getMediaPaged", jsonParser, async function(request, response) {
    let pageIndex = request.body.pageIndex;
    let ret = [];

    let admin = isAdmin(request);
    console.log("admin?");
    console.log(admin);

    let pageKey = "PAGE" + pageIndex.toString();
    if(pagedObjects.hasOwnProperty(pageKey) && !admin) {    //如果是admin，那么每次从db中获取，不走缓存
        console.log("从pagedObjects获取:" + pageKey);
        ret = pagedObjects[pageKey];
    } else {
        let startT = Date.now();

        console.log("admin?");
        console.log(admin);

        let currentPid = await getCurrentPid();
        //console.log(currentPid);

        let start = currentPid - (pageIndex-1) * PAGE_SIZE;
        let end = start - PAGE_SIZE;

        console.log(start);
        console.log(end);
        const vitems = await db.collection(T_ITEMS)
            .orderBy('pid','desc')
            .startAt(start)
            .endBefore(end)
            .get();

        let endT = Date.now();
        console.log("1，耗时：" + (endT-startT).toString() );
        console.log("获取到文档个数:" + vitems.size);

        startT = Date.now();


        vitems.forEach(doc => {
            //如果不是管理员，跳过status为0的。
            let data = doc.data();
            data.id = doc.id;

            //console.log(data);

            if(data.status != undefined && data.status == 0) {
                if(admin) {
                    ret.push(data);
                }
            } else {
                ret.push(data);
            }
        })
        endT = Date.now();
        console.log("2，耗时：" + (endT-startT).toString() );

        pagedObjects[pageKey] = ret;
    }

    response.json(ret);
})


async function getMediaUrlFromBucketAndSave2Db(bucket, key) {
    const params = {
        Bucket: bucket,
        Key: key
    }

    let command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3Client, command);
    console.log(url);

    //Now save this url into db
    //No need to save url? Just parse it in realtime?
    //await db.collection('items').add({filename:key, defaultUrl:url, createtime:new Date()});
}

//遍历，bucket中的object
app.post('/v/listFromBucket', jsonParser, async function (request, response)  {
    let bucket = 'caomeio'

    const command = new ListObjectsV2Command({
        Bucket: bucket,
        // The default and maximum number of keys returned is 1000. This limits it to
        // one for demonstration purposes.
        MaxKeys: 100,
    });

    let count = 0;

    try {
        let isTruncated = true;

        //console.log("Your bucket contains the following objects:\n")
        let contents = "";

        //返回所有的，每次返回最多100
        while (isTruncated) {
            const { Contents, IsTruncated, NextContinuationToken } = await s3Client.send(command);

            for (const item of Contents) {
                //await getMediaUrlFromBucketAndSave2Db(bucket, item.Key);
                //统计bucket中文件个数
                count++;
            }

            //const contentsList = Contents.map((c) => ` • ${c.Key}`).join("\n");
            //contents += contentsList + "\n";
            isTruncated = IsTruncated;
            command.input.ContinuationToken = NextContinuationToken;
        }
        console.log(contents);

    } catch (err) {
        console.error(err);
    }

    response.json({"Count of Keys":count});
})

//删除bucket中所有的object
app.post('/v/deleteAllFromBucket', jsonParser, async function (request, response)  {
    let count = 0

    filenames = fs.readdirSync('H:\\GitProject\\nodejs\\caomeio\\uploads\\todel');
    for (const file of filenames) {
        let count = 0
        console.log(file);

        const params = {
            Bucket: 'caomeio',
            Key: file
        }

        let commandDel = new DeleteObjectCommand(params);
        await s3Client.send(commandDel);

        const docRef = db.collection(T_PID).doc("current");
        await docRef.update({"pid": FieldValue.increment(-1)});

        console.log("Del done");

        count++;
    }

    response.json({"Count of Keys":count});
})

async function s3del(key) {
    const params = {
        Bucket: 'caomeio',
        Key: key
    }

    let commandDel = new DeleteObjectCommand(params);
    await s3Client.send(commandDel);
}

app.post('/v/deleteItemByFilename', jsonParser, async function (request, response)  {
    console.log(request.body.filenames);
    for (const filename of request.body.filenames) {
        console.log(filename);

        s3del(filename);
        console.log(filename + " deleted");

        let jpgfilename = filename.replace(".mp4",".jpg");
        s3del(jpgfilename);
        let giffilename = filename.replace(".mp4",".gif");
        s3del(giffilename);

        let newName = filename.replace("_","@");
        s3del(newName);

        let preName = filename.replace("_","_p_");
        s3del(preName);
    }

    console.log("Del done");

    response.json({ret:1});
})

app.post('/v/deleteItemByKey', jsonParser, async function (request, response)  {
    for (const key of request.body.ids) {

        const doc = await db.collection(T_ITEMS).doc(key).get();
        if(doc.data() != undefined) {

            let filename = doc.data().filename;
            s3del(filename);
            //fs.unlinkSync('pictures/' + filename.replace(".mp4",".jpg"))
            //fs.unlinkSync('pictures/' + filename.replace(".mp4",".gif"))
            let jpgfilename = filename.replace(".mp4",".jpg");
            s3del(jpgfilename);
            let giffilename = filename.replace(".mp4",".gif");
            s3del(giffilename);

            let newName = filename.replace("_","@");
            s3del(newName);

            let preName = filename.replace("_","_p_");
            s3del(preName);


            const username = doc.data().uploader.username;
            const userRef = db.collection(T_USERS).doc(username);
            const user = await userRef.get();
            let ownedOfUser = []
            if(user.data().owned != undefined) {
                ownedOfUser = user.data().owned;
            }

            ownedOfUser = ownedOfUser.filter(function( obj ) {
                return obj.itemId !== key;
            });
            const resultOfUser = await userRef.set({"owned": ownedOfUser},{merge:true});
        }

        const res = await db.collection(T_ITEMS).doc(key).delete();

    }

    console.log("Del done");

    response.json({ret:1});
})

//更新一些项目的pid，与最新的pid互换，这样在分页中显示靠前
app.post('/v/updatePid', jsonParser, async function (request, response)  {
    let count = 0
    topPids = request.body.topPids;
    topIds = request.body.topIds;
    normalPids = request.body.normalPids;
    normalIds = request.body.normalIds;
    //upgrade: normal -> top
    for (const id of normalIds) {
        const itemRef = db.collection(T_ITEMS).doc(id);
        const topItemRef = db.collection(T_ITEMS).doc(topIds[count]);
        await itemRef.update('pid', topPids[count]);
        await topItemRef.update('pid', normalPids[count]);
        count++;
    }
    console.log("Done");

    response.json({"Count:":count});
})


//新评论
app.post('/v/newcomments', jsonParser, async function(request, response) {
    request.body.createtime = new Date();
    const result = await db.collection(T_COMMENTS).add(request.body);

    // const itemRef = db.collection(T_ITEMS).doc(request.body.id);
    // const item = await itemRef.get();
    // let comments = []
    // if(item.data().comments != null) {
    //     comments = item.data().comments;
    // }
    // let date = new Date();
    // comments.push({userId:request.body.userId, userName: request.body.userName, comments: request.body.comments, createtime: date});
    // const result = await itemRef.set({"comments": comments},{merge:true});
    //
    // const userRef = db.collection(T_USERS).doc(request.body.userId);
    // const user = await userRef.get();
    // let commentsOfUser = []
    // if(user.data().comments != null) {
    //     commentsOfUser = user.data().comments;
    // }
    // commentsOfUser.push({itemId: request.body.itemId, comments: request.body.comments, createtime: date});
    // const resultOfUser = await userRef.set({"comments": commentsOfUser},{merge:true});

    response.json({ret:result.id});
});

app.post('/v/getusercomments', jsonParser, async function(request, response) {
    const comments = await db.collection(T_COMMENTS).where("username","==",request.body.username).orderBy("createtime","desc").get();
    let vcomments = [];
    comments.forEach(c => {
        data = c.data();
        data.id = c.id;
        vcomments.push(data);
    })
    response.json(vcomments);
});

//收藏
app.post('/v/newcollect', jsonParser, async function(request, response) {
    const itemRef = db.collection(T_ITEMS).doc(request.body.id);
    const item = await itemRef.get();
    const result = await itemRef.update({"stats.favorite": FieldValue.increment(1)});

    const userRef = db.collection(T_USERS).doc(request.body.username);
    const user = await userRef.get();
    let favoritesOfUser = []
    if(user.data().favorites != undefined) {
        favoritesOfUser = user.data().favorites;
    }
    if(favoritesOfUser.filter(i => i.itemId == item.id).length == 0) {
        let coll = {itemId: item.id, filename: item.data().filename, createtime: new Date()};
        if(item.data().byuser != undefined) {
            coll.byuser = item.data().byuser;
        }
        favoritesOfUser.push(coll);
        const resultOfUser = await userRef.set({"favorites": favoritesOfUser},{merge:true});
    }

    response.json({ret:1});
});

app.post('/v/download', jsonParser, async function(request, response) {
    //个人下载限制
    const itemRef = db.collection(T_ITEMS).doc(request.body.id);
    const item = await itemRef.get();
    const result = await itemRef.update({"stats.download": FieldValue.increment(1)});
    response.json({ret:1});
});

app.post('/auth/signin', jsonParser, async function (request, response) {

    console.log(request.body);
    const userRef = db.collection(T_USERS);
    const snapshot = await userRef.where('username', '==', request.body.username).where('password', '==', request.body.password).get();
    if (snapshot.empty) {
        console.log('No user match.');
        response.json({ret:1, message:'用户名或密码不正确'});
    } else {

        var token = jwt.sign({ id: request.body.username }, secret);

        snapshot.forEach(doc => {
            let user = doc.data();
            user.accessToken = token;
            response.json({ret:0, user: user});
        });
    }
});

app.post('/auth/signup', jsonParser, async function (request, response) {
    console.log(request.body);

    let pass = true;

    const user = await db.collection(T_USERS).doc(request.body.username).get();
    const userByIpQuery = await db.collection(T_USERS).where("ip","==",request.body.ip).orderBy("createtime","desc").get();


    if(user.data() != undefined) {
        console.log("用户名已存在");
        pass = false;
        response.json({ret:0, message: '用户名已存在'});
    }

    if(userByIpQuery.size > 0) {
        // 1天内同一个ip不得再次注册
        let userByIp = userByIpQuery.docs[0].data();
        console.log(userByIp.createtime);
        let createtime = new Date(userByIp.createtime._seconds*1000);
        const now = new Date();
        if(createtime.getDate() === now.getDate() && createtime.getMonth() === now.getMonth() && createtime.getFullYear() === now.getFullYear()) {
            pass = false;
            response.json({ret:0, message: '今天，该IP地址已注册过啦，明天再来吧'});
        }
    }

    if(pass) {

        if(request.body.createtime == undefined) {
            request.body.createtime = new Date();
        }

        const initPrice = 20;
        request.body.balance = initPrice;  //注册，赠送20个


        const res = await db.collection(T_USERS).doc(request.body.username).set(request.body);

        await db.collection(T_CONSUMES).add({type: 1, username: request.body.username, desc: "新用户注册，赠送", createtime: new Date(), price: initPrice});

        response.json({ret:1, message:'注册成功'});

    }


});

app.post('/v/userdetail', jsonParser, async function (request, response)  {
    //TODO: 验证

    const userDoc = await db.collection(T_USERS).doc(request.body.username).get();

    response.json(userDoc.data());
})

app.post('/v/userupdate', jsonParser, async function (request, response)  {
    //TODO: 验证

    //console.log(request.body);

    const userRef = db.collection(T_USERS).doc(request.body.username);
    request.body.updatetime = new Date();
    await userRef.set(request.body,{merge:true});

    response.json({"ret:":1});
})


//获取presign url: 用户上传文件时, 随机生成filename，文件不会存在。管理员上传时，批量操作，如果第一次没有上传成功，可重复执行。
app.post("/v/presign", jsonParser,async function (req, res) {
    try {
        console.log(req.body);
        let params = {
            Bucket: "caomeio",
            Key: req.body.key,
        };

        try {
            const command = new HeadObjectCommand(params);
            const response = await s3Client.send(command);
            console.log("Object exists");
            res.json({ret:0});
        } catch (e) {
            console.log("Object does not exist");
            let commandPut = new PutObjectCommand(params);
            const signedUrl = await getSignedUrl(s3Client, commandPut, {
                expiresIn: 600,
            });
            console.log(signedUrl);
            res.json({ ret: signedUrl });
        }

    } catch (err) {
        console.error(err);
    }
});

function cutPreSeconds4Mp4(filename, newfilename, seconds) {
    let filepath = destFolder;
    try {
        ffmpeg(filepath + filename)
            .outputOption("-ss", "0")
            .outputOption("-t", seconds.toString())
            .outputOption("-vf", "fade=t=out:st=" + (seconds-1).toString() + ":d=1")
            .save(filepath + newfilename)
            .on('end', function() {
                console.log('preseconds mp4 created!');
                fs.readFile(filepath + newfilename, function (err, data) {
                    //upload file Buffer to s3
                    upload2S3(newfilename, data);
                });
            });
    } catch (e) {
        log(e);
    }
}

function opsOnMp4(filename, watermarkFilename) {
    //从远程下载文件
    // const r = https.get(request.body.fileurl, function(res) {
    //     res.pipe(file);
    //
    //     // after download completed close filestream
    //     file.on("finish", () => {
    //         file.close();
    //         console.log("Download Completed");
    //
    //     });
    // });

    let filepath = destFolder;
    //console.log("go");
    console.log(filename);
    let out_jpg = "";
    let out_gif = "";

    let imgName = filename.replace(".mp4",".jpg");
    let gifName = filename.replace(".mp4",".gif");
    //console.log("here1");
    var proc = new ffmpeg(filepath + filename)
        .screenshots({
            count: 1,
            folder: 'pictures',
            filename: imgName,
            size: '?x375',
            timemarks: [ '0' ] // number of seconds
        }).on('end', function() {
            console.log('jpg created!');
            // var imgbbUploader = require('imgbb-uploader');
            // imgbbUploader("1609ad5c658c52faf7d11488e5f83c11", filepath + imgName)
            //     .then(response => {
            //         console.log(response.url);
            //         out_jpg = response.url;
            //     })
            //     .catch(error => console.error(1))
        });

    ffmpeg(filepath + filename)
        .outputOption("-ss", "0")
        .outputOption("-t", "2")
        .outputOption("-vf", "fps=5,scale=-1:375:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse")
        .save("pictures/" + gifName)
        .on('end', function() {
            console.log('gif created!');

            //var imgbbUploader = require('imgbb-uploader');
            // imgbbUploader("1609ad5c658c52faf7d11488e5f83c11", "pictures/" + gifName)
            //     .then(response => {
            //         console.log(response.url);
            //         out_gif = response.url;
            //     })
            //     .catch(error => console.error(1))
        });

    let position = Math.floor(Math.random() * 2) == 0 ? 'x=20:y=H-th-10' : 'x=20:y=20';

    ffmpeg(filepath + filename)
        .outputOption("-vf", 'drawtext=text=caomeio.web.app:' + position + ':fontsize=25:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2')
        .save(filepath + watermarkFilename)
        .on('end', function() {
            console.log('new mp4 created!');

            fs.readFile(destFolder + watermarkFilename, function (err, data) {
                //upload file Buffer to s3
                upload2S3(watermarkFilename, data);
            });

        });

}

async function upload2S3(filename, data) {
    const command = new PutObjectCommand({
        Bucket: 'caomeio',
        Key: filename,
        Body: data,
    });

    try {
        const response = await s3Client.send(command);
        console.log(response);
        //上传后删除本地文件
        //fs.unlinkSync(destFolder + filename);
    } catch (err) {
        console.error(err);
    }
}

async function add2db(data) {
    let pid = await getCurrentPid();
    data.pid = pid;

    data.createtime = new Date();
    if(data.price != undefined && data.price > 0) {
        data.status = 0;
    }
    const res = await db.collection(T_ITEMS).add(data);
    console.log(res.id);
    //pid = pid + 1;
    setCurrentPid(pid);

    const userRef = db.collection(T_USERS).doc(data.uploader.username);
    const user = await userRef.get();
    let ownedOfUser = []
    if(user.data().owned != undefined) {
        ownedOfUser = user.data().owned;
    }
    if(ownedOfUser.filter(i => i.itemId == res.id).length == 0) {
        let ownData = {itemId: res.id, byuser: data.byuser, filename: data.filename, createtime: data.createtime};
        if(data.price != undefined && data.price > 0) {
            ownData.priceAsked = data.price;
            ownData.status = data.status;
        }
        ownedOfUser.push(ownData);
        const resultOfUser = await userRef.set({"owned": ownedOfUser},{merge:true});
    }
}

app.post('/v/setprice', jsonParser, async function(req, res) {
    console.log(req.body.ids);
    console.log(req.body.priceConfirmed);
    for (const key of req.body.ids) {
        const docRef = db.collection(T_ITEMS).doc(key);
        await docRef.update({price:req.body.priceConfirmed, status: 1});

        let doc = await docRef.get();

        const userRef = db.collection(T_USERS).doc(doc.data().uploader.username);
        const user = await userRef.get();

        let ownedOfUser = [];
        if(user.data().owned != undefined) {
            ownedOfUser = user.data().owned;
        }
        let item = ownedOfUser.find(i => i.itemId === key);
        item.price = req.body.priceConfirmed;
        item.status = 1;
        console.log(ownedOfUser);

        let balance = req.body.priceConfirmed;
        if(user.data().balance != undefined) {
            balance = balance + user.data().balance;
        }

        const resultOfUser = await userRef.set({"owned": ownedOfUser, "balance": balance},{merge:true});
    }

    //更新缓存 TODO

    res.json({ret:1});

})

app.post("/v/getByKey", jsonParser, async function (req, res) {
    let url = await findUrlByKey(req.body.key, 6000);
    res.json({ret: url});
})

app.post("/v/ffmpegjs", async function(request, response) {

    // var inputStream = fs.createReadStream('uploads/_goodgirl-123456789.mp4');
    //
    // const buffers = [];
    // // node.js readable streams implement the async iterator protocol
    // for await (const data of inputStream) {
    //     buffers.push(data);
    // }
    // const finalBuffer = Buffer.concat(buffers);
    //
    // var sampleVideoData = new Uint8Array(finalBuffer);
    //
    //
    // var results = ffmpeg_run({
    //     arguments: "-t 5 -i _goodgirl-123456789.mp4 -vf showinfo -strict -2 output.gif",
    //     files: [
    //         {
    //             data: sampleVideoData,
    //             name: "_goodgirl-123456789.mp4"
    //         }
    //     ]
    // });
    //
    // // results is an Array of { data: UInt8Array, name: string }
    // results.forEach(function(file) {
    //     console.log("File recieved", file.name, file.data);
    // });

    response.json({ret:1});

})

function pass2s3(passthroughStream, destFilename) {
    const uploadStream = ({ Bucket, Key }) => {
        const pass = new PassThrough();
        return {
            writeStream: pass,
            promise: s3.upload({ Bucket, Key, Body: pass }).promise(),
        };
    }

    const { writeStream, promise } = uploadStream({Bucket: 'caomeio', Key: destFilename});
    const pipeline = passthroughStream.pipe(writeStream);

    promise.then(() => {
        console.log(destFilename + ' upload completed successfully');
    }).catch((err) => {
        console.log(destFilename + 'upload failed.', err.message);
    });
}


//var awsstream = s3.getObject({Bucket:"caomeio", Key: srcFilename}).createReadStream();

// const params = {
//     Bucket: "caomeio", Key: srcFilename
// }
// const command = new GetObjectCommand(params);
// const response = await s3Client.send(command);
// const awsstream = Readable.from(response.Body);

//awsstream.pipe( fs.createWriteStream("uploads/output1.mp4"));

// const inputForFFMPEG = new PassThrough();
// //awsstream.pipe( fs.createWriteStream("uploads/output2.mp4"));
// awsstream.pipe(inputForFFMPEG);
//
// var inputStream = fs.createReadStream('uploads/goodgirl-123456789.webm');
//
//
// var outStream = fs.createWriteStream('uploads/output2.mp4');
//

function ffmpeg2SecondsMp4(signedUrl, secondsFilename, seconds) {

    const passthroughStream = new PassThrough();

    var proc = new ffmpeg(signedUrl)
        .inputFormat('mp4')
        .toFormat('mp4')

        //.save(passthroughStream,{end:true})
        .addOutputOption('-movflags','frag_keyframe+empty_moov')
        .outputOption("-ss", "0")
        .outputOption("-t", seconds.toString())

        .on('error', function (err, stdout, stderr) {
            console.log('an error happened: ' + err.message);
        })
        .on('end', function () {
            console.log('Processing finished !');
        })
        .on('progress', function (progress) {
            console.log('Processing... ');
        });

    proc.output(passthroughStream,{ end:true }).run();
    pass2s3(passthroughStream, secondsFilename);

}

function ffmpeg2Gif(signedUrl, gifFilename) {

    var passthroughStream = new PassThrough();
    var proc = new ffmpeg(signedUrl)
        .inputFormat('mp4')
        .outputFormat('gif')
        .outputOption("-ss", "0")
        .outputOption("-t", "2")
        .outputOption("-vf", "fps=5,scale=-1:375:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse")
        //.save(passthroughStream2,{end:true}) //,{end:true}

        .on('error', function (err, stdout, stderr) {
            console.log('an error happened: ' + err.message);
        })
        .on('end', function () {
            console.log('gif created!');
        })
        .on('progress', function (progress) {
            console.log('Processing... ');
        });

    proc.output(passthroughStream,{ end:true }).run();

    pass2s3(passthroughStream, gifFilename);

}

function ffmpeg2Jpg(signedUrl, jpgFilename) {

    var passthroughStream = new PassThrough();
    var proc = new ffmpeg(signedUrl)
        .inputFormat('mp4')
        .outputOption("-ss", "0")
        .outputOption("-frames:v", "1")
        .outputOption("-f", "image2")
        .outputOption("-q:v", "2")
        //.save(passthroughStream2,{end:true}) //,{end:true}

        .on('error', function (err, stdout, stderr) {
            console.log('an error happened: ' + err.message);
        })
        .on('end', function () {
            console.log('jpg created!');
        })
        .on('progress', function (progress) {
            console.log('Processing... ');
        });

    proc.output(passthroughStream,{ end:true }).run();

    pass2s3(passthroughStream, jpgFilename);

}

function ffmpeg2WaMp4(signedUrl, watermarkFilename) {

    let position = Math.floor(Math.random() * 2) == 0 ? 'x=20:y=H-th-10' : 'x=20:y=20';

    var passthroughStream = new PassThrough();
    var proc = new ffmpeg(signedUrl)
        .inputFormat('mp4')
        .toFormat('mp4')
        .outputOption("-vf", 'drawtext=text=caomeio.web.app:' + position + ':fontsize=25:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2')
        .addOutputOption('-movflags','frag_keyframe+empty_moov')
        //.save(passthroughStream2,{end:true}) //,{end:true}

        .on('error', function (err, stdout, stderr) {
            console.log('an error happened: ' + err.message);
        })
        .on('end', function () {
            console.log('Processing finished !');
        })
        .on('progress', function (progress) {
            console.log('Processing... ');
        });

    proc.output(passthroughStream,{ end:true }).run();

    pass2s3(passthroughStream, watermarkFilename);

}

function sendemail2me(subject, text) {
    var mailOptions = {
        from: '6983299@gmail.com',
        to: 'x6983299@outlook.com',
        subject: subject,
        text: text
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

app.post("/v/afterupload", jsonParser, async function(request, response) {
    let filename = request.body.filename;
    let price = request.body.price;

    //db
    add2db(request.body);

    console.log(filename);
    //let signedUrl = request.body.url;
    let signedUrl = await findUrlByKey(filename, 600);

    //let signedUrl = "https://caomeio.gateway.storjshare.io/_goodgirl-123456789.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=jxxpimx7rapd6eg6rqgimfmvh6za%2F20230626%2Fus-1%2Fs3%2Faws4_request&X-Amz-Date=20230626T130037Z&X-Amz-Expires=6000&X-Amz-Signature=68d5abaaa2549839a8796017be3636f7896842c18d50bab09bc2e7fd647df9ef&X-Amz-SignedHeaders=host&x-id=GetObject";

    //把stream buffer放到内存，后续多次使用 buffer->stream，转mp4/gif/jpg
    let gifFilename = filename.replace(".mp4",".gif");
    let jpgFilename = filename.replace(".mp4",".jpg");
    let watermarkFilename = filename.replace("_","@");

    ffmpeg2Jpg(signedUrl, jpgFilename);
    ffmpeg2Gif(signedUrl, gifFilename);

    if(price != undefined && price > 0) {
        let secondsFilename = filename.replace("_","_p_");
        //如果有设置price
        let seconds = request.body.preseconds;
        //截取前几秒，put到s3
        ffmpeg2SecondsMp4(signedUrl, secondsFilename, seconds);
    }
    ffmpeg2WaMp4(signedUrl, watermarkFilename);

    sendemail2me("用户上传", "文件已上传：" + filename);

    console.log("Here!");

    response.json({ret:1});

})

app.post("/v/turnfree2priced", jsonParser, async function(request, response) {
    let seconds = request.body.preseconds;
    let price = request.body.price;

    //更新
    const docRef = db.collection(T_ITEMS).doc(request.body.ids[0]);
    await docRef.set({"preseconds":seconds, "price": price, "status": 1},{merge:true});

    const doc = await docRef.get();
    let filename = doc.data().filename;
    console.log(filename);

    //let signedUrl = request.body.url;
    let signedUrl = await findUrlByKey(filename, 600);

    //let signedUrl = "https://caomeio.gateway.storjshare.io/_goodgirl-123456789.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=jxxpimx7rapd6eg6rqgimfmvh6za%2F20230626%2Fus-1%2Fs3%2Faws4_request&X-Amz-Date=20230626T130037Z&X-Amz-Expires=6000&X-Amz-Signature=68d5abaaa2549839a8796017be3636f7896842c18d50bab09bc2e7fd647df9ef&X-Amz-SignedHeaders=host&x-id=GetObject";

    //把stream buffer放到内存，后续多次使用 buffer->stream，转mp4/gif/jpg

    let watermarkFilename = filename.replace("_","@");

    if(price != undefined && price > 0) {
        let secondsFilename = filename.replace("_","_p_");
        //如果有设置price
        //截取前几秒，put到s3
        ffmpeg2SecondsMp4(signedUrl, secondsFilename, seconds);
    }
    ffmpeg2WaMp4(signedUrl, watermarkFilename);

    console.log("Here!");

    response.json({ret:1});

})


const cp = require('child_process');
app.post("/v/uploadtest", jsonParser,async function(request, response) {

    let filename = request.body.filename;
    let watermarkFilename = filename.replace("_","@");

    let signedUrl = request.body.url;

    var input_file = fs.createReadStream('uploads/_goodgirl-123456789.mp4');
    input_file.on('error', function(err) {
        console.log(err);
    });

    const passthroughStream = new PassThrough();
    //输出到stream还是有问题.

    var output_path = 'uploads/output.mp4';
    var output_stream = fs.createWriteStream('uploads/output.mp4');

    var ffmpeg = cp.spawn('ffmpeg', ['-i', signedUrl, '-f', 'mp4', '-movflags', 'frag_keyframe+empty_moov', 'pipe:1']);
    //input_file.pipe(ffmpeg.stdin);
    ffmpeg.stdout.pipe(passthroughStream);

    ffmpeg.stderr.on('data', function (data) {
        console.log(data.toString());
    });

    ffmpeg.stderr.on('end', function () {
        console.log('file has been converted succesfully');
    });

    ffmpeg.stderr.on('exit', function () {
        console.log('child process exited');
    });

    ffmpeg.stderr.on('close', function() {
        console.log('...closing time! bye');

        //pass2s3(passthroughStream, watermarkFilename);
    });

    response.json({ret:1});

})

//用户上传
app.post("/v/userupload", upload.single('file'), function(req, res) {
    console.log(req.file.filename);
    let data = JSON.parse(req.body["exdata"]);
    console.log(data);

    log(data);

    let filename = req.file.filename;

    if(data.price != undefined && data.price > 0) {
        let newfilename = filename.replace("_","_p_");
        //如果有设置price
        let seconds = data.preseconds;
        //截取前几秒，put到s3
        cutPreSeconds4Mp4(filename, newfilename, seconds);
    }

    //db
    add2db(data);

    let watermarkFilename = filename.replace("_","@");
    //ops: jpg, gif, watermark
    opsOnMp4(filename, watermarkFilename);

    //最后上传原文件，因为上传后删除需要放最后。否则，前面读取该原文件的时候，就会找不到了。
    fs.readFile(destFolder + filename, function (err, data) {
        //upload file Buffer to s3
        upload2S3(filename, data);
    });

    res.json({ ret: 1 });

});

app.post("/v/checkconsumed", jsonParser, async function(request, response) {
    let ret = -1;
    const vconsumes = await db.collection(T_CONSUMES).where("id","==",request.body.id).where("username","==",request.body.username).get();
    if(vconsumes.size > 0) {
        ret = 1;
    } else {
        ret = 0;
    }
    response.json({ret:ret});
})

app.post("/v/userconsume", jsonParser, async function(request, response) {
    let ret = -1;
    let balance = -1;
    const vconsumes = await db.collection(T_CONSUMES).where("id","==",request.body.id).where("username","==",request.body.username).get();
    if(vconsumes.size > 0) {             //如果之前已购买，则不需要重复消费
        ret = 1;
    } else {
        const userRef = db.collection(T_USERS).doc(request.body.username);
        const userDoc = await userRef.get();
        if(userDoc.data().balance != undefined && userDoc.data().balance >= request.body.price) {
            const vconsumes = await db.collection(T_CONSUMES).where("id","==",request.body.id).where("username","==",request.body.username).get();
            balance = userDoc.data().balance - request.body.price;
            await userRef.update({balance: balance});
            request.body.createtime = new Date();
            request.body.type = 0;
            const result = await db.collection(T_CONSUMES).add(request.body);

            ret = 1;
        } else {    //余额不足
            ret = 0;
        }
    }
    let data = {ret:ret};
    if(balance > -1) {
        data.balance = balance;
    }
    response.json(data);
})

app.post("/v/avatarupload", upload.single('image'), function(req, res) {
    console.log(req.file.filename);
    res.json({avatar:req.file.filename});
})

app.post("/v/useraccount", jsonParser, async function(request, response) {

    const userRef = db.collection(T_USERS).doc(request.body.username);
    const user = await userRef.get();

    let list = []
    if(user.data().owned != undefined) {
        user.data().owned.forEach(u => {
            list.push({type: 1, createtime: u.createtime, itemId: u.itemId, price: u.price, priceAsked: u.priceAsked, status: u.status});
        });
    }

    const vconsumes = await db.collection(T_CONSUMES).where("username","==",request.body.username).get();
    vconsumes.forEach(c => {
        list.push({type: c.data().type != undefined ? c.data().type : 0, createtime: c.data().createtime, itemId: c.data().id, price: c.data().price, desc: c.data().desc != undefined ? c.data().desc : null });
    });

    response.json(list);

})



app.post('/v/ffmpeg', async function(request,response) {
    //let filename = request.body.filename;
    //opsOnMp4(filename);

    //console.log(req.file.filename);
    //console.log(JSON.parse(req.body["exdata"]));

    let seconds = 8;

    ffmpeg("uploads/sample.mp4")
        .outputOption("-ss", "0")
        .outputOption("-t", seconds.toString())
        .outputOption("-vf", "fade=t=out:st=" + (seconds-1).toString() + ":d=1")
        .save("uploads/sample_modifed.mp4")
        .on('end', function() {
            console.log('mp4 created!');
            response.json({ret:1});
        });

});

app.put('/v/add', jsonParser, async function (request, response) {
    // let token = request.headers["x-access-token"];
    //
    // if (!token) {
    //     return response.status(403).send({
    //         message: "No token provided!"
    //     });
    // }
    //
    // jwt.verify(token, secret, (err, decoded) => {
    //     if (err) {
    //         return response.status(401).send({
    //             message: "Unauthorized!"
    //         });
    //     }
    //     //request.userId = decoded.id;
    // });

    response.json({ret:res.id});
});

// app.use("/pictures", express.static(__dirname + '/pictures'));
// app.use("/avatars", express.static(__dirname + '/uploads'));
app.listen(process.env.PORT, () => console.log(('listening :)')))