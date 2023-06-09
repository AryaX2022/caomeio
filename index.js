const express = require('express');
const app = express();
const https = require('https');

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, HeadObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({
    credentials: {
        accessKeyId: "jxxpimx7rapd6eg6rqgimfmvh6za",
        secretAccessKey: "j2ns2h5er2o5zj2y4mpxp4tn5ycvbx2dvlp67fubif4e6vnm2vxoc",
    },
    region: "us-1",
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
    //origin: ['http://127.0.0.1:5174','http://127.0.0.1:5173']
    origin: ['http://localhost:3000','http://127.0.0.1:5174','http://127.0.0.1:5173', 'https://caomeio.web.app']
}));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
// const tname = "models";
const tname = "modelsV2";

const { collection, DocumentData, addDoc, getDocs, setDoc, doc, updateDoc, increment, FieldValue, Timestamp, serverTimestamp  } = require('firebase-admin/firestore');

app.get('/', (req, res) => {
    console.log("Good");
	res.json({"msg":"Alive"});
});

app.get('/transfer', async function(req, res){
    let id = req.query.id;
    const modelRef = db.collection(tname).doc(id.toString());
    const result = await modelRef.update({"stats.downloadCount": FieldValue.increment(1)});
    //res.json({ret:result});

  let url = req.query.url;
  console.log(url);
  //res.send(`<h1>${req.params.id}</h1>`);
  //res.end();
  
  https.get(url, (response) => {
    console.log(response);
    console.log("获取location:");
    console.log(response.headers["location"]);
    res.json({target:response.headers["location"]});
  }).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
  });

});

function compare( a, b ) {
    if ( a.stats.ratingCount < b.stats.ratingCount ){
        return 1;
    }
    if ( a.stats.ratingCount > b.stats.ratingCount ){
        return -1;
    }
    return 0;
}

app.get('/productsPaged/:pageIndex/:tag', async function(req, res) {

    let pageIndex = req.params.pageIndex;
    let tag = req.params.tag;

    let ratingCountStart = 9999;
    let ratingCountEnd = 100;

    if(pageIndex >= 2) {
        ratingCountStart =  100 - (pageIndex-2)*10;
        ratingCountEnd = ratingCountStart-10;
    }

    if(ratingCountEnd <= 0) {
        res.json({items:[]});
        return;
    }


    let querySnapshot = db.collection(tname)

    if(tag != "all") {
        querySnapshot = querySnapshot.where('tags', 'array-contains', tag);
    }
    const models = await querySnapshot
        .orderBy('stats.ratingCount','desc')
        .startAt(ratingCountStart).endBefore(ratingCountEnd)
        .select('id','name','coverImg','stats','flag','type')
        .get();

    console.log(models.size);

    var products = []
    models.forEach((doc) => {
        products.push(doc.data());
    });
    products.sort(compare);
    //return products;
    res.json({items:products});

});

app.get('/productsHome', async function(req, res) {

    let modelsRef = await db.collection(tname)
	const models = await modelsRef.select('id','name','coverImgUrl','stats').get();
	//console.log(models);
    var products = []
    models.forEach((doc) => {
        products.push(doc.data());
    });
	products.sort(compare);
    //return products;
    res.json({items:products});
  
});

// const fs = require('fs')
// let imglist = []
// app.get('/check', async function(req, res) {
//     const models = await db.collection(tname).get();
//     //console.log(models);
//     var file = fs.createWriteStream('array.txt');
//     models.forEach((doc) => {
//         let item = doc.data();
//
//         //console.log(item.id);
//
//         for (var j = 0, lenVer = item.modelVersions.length; j < lenVer; j++) {
//
//             for (var k = 0, lenImgs = item.modelVersions[j].images.length; k < lenImgs; k++) {
//                 //console.log(item.modelVersions[j].images[k].url);
//                 let img = item.modelVersions[j].images[k];
//
//                 // const path = 'H:\\GitProject\\vue3\\model4ai\\src\\assets\\images\\' + img.url;
//                 //
//                 // try {
//                 //     if (!fs.existsSync(path)) {
//                 //         //imglist.push(img.url);
//                 //         file.write(`${img.url}\n`)
//                 //         //console.log(""+img.url+"',");
//                 //     }
//                 // } catch(err) {
//                 //     console.error(err)
//                 // }
//             }
//         }
//
//
//     });
//     file.end();
//     //console.log(imglist);
// });
//

app.get('/products', async function(req, res) {

    const models = await db.collection(tname).get();
    console.log(models);
    var products = []
    models.forEach((doc) => {
        products.push(doc.data());
    });
    products.sort(compare);
    //return products;
    res.json({items:products});
  
});

app.get('/product/:id', async function(req, res) {
	console.log(req.params.id);
	const model = await db.collection(tname).doc(req.params.id.toString()).get();
	res.json({item:model.data()});  
});

app.get('/urlCopied/:id', async function(req, res) {
    console.log(req.params.id);
    const modelRef = db.collection(tname).doc(req.params.id.toString());
    const result = await modelRef.update({"stats.urlcopied": FieldValue.increment(1)});
    res.json({ret:result});
});

app.get('/favorite/:id', async function(req, res) {
    console.log(req.params.id);
    const modelRef = db.collection(tname).doc(req.params.id.toString());
    const result = await modelRef.update({"stats.favoriteCount": FieldValue.increment(1)});
    res.json({ret:result});
});

app.get('/rating/:id', async function(req, res) {
    console.log(req.params.id);
    let rating = req.query.rating;
    //console.log(rating);
    const modelRef = db.collection(tname).doc(req.params.id.toString());
    const model = await modelRef.get();
    //console.log(model.data().stats.rating);
    let newrating = (model.data().stats.rating * model.data().stats.ratingCount + parseFloat(rating))/(model.data().stats.ratingCount+1);
    //console.log(newrating);
    const result = await modelRef.update({"stats.ratingCount": FieldValue.increment(1), "stats.rating":newrating});

    res.json({ret:newrating});
});

app.post('/auth/signin', jsonParser, async function (request, response) {

    console.log(request.body);
    const userRef = db.collection('musers');
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
    request.body.createtime = new Date();
    // Add a new document in collection "cities" with ID 'LA'
    const res = await db.collection('musers').doc(request.body.username).set(request.body);
    response.json({data:{message:'注册成功'}});
});

app.get('/user', async function (request, response) {
    let token = request.headers["x-access-token"];

    if (!token) {
        return response.status(403).send({
            message: "No token provided!"
        });
    }

    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            return response.status(401).send({
                message: "Unauthorized!"
            });
        }
        request.userId = decoded.id;
    });

    console.log(request.userId);
    response.json({ret:0});

});

app.post('/user/profile',jsonParser, async function(request,response) {
    let token = request.headers["x-access-token"];

    if (!token) {
        return response.status(403).send({
            message: "No token provided!"
        });
    }

    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            return response.status(401).send({
                message: "Unauthorized!"
            });
        }
        //request.userId = decoded.id;
    });
    console.log(request.body);
    const userRef = db.collection('musers').doc(request.body.username);
    const result = await userRef.set({"customizedAvatar": request.body.customizedAvatar},{merge:true}); //将新数据与现有文档合并，以避免覆盖整个文档
    response.json({ret:0});
});

// const multer = require("multer");
// const dest = multer({ dest: "files/" });
// function uploadFiles(req, res) {
//     console.log(req);
//     console.log(req.files);
//     console.log(req.body);
//     res.json({ret: req.files});
// }
//
// app.post("/upload", dest.array("image"), uploadFiles);

app.post('/post/new', jsonParser,async function (request, response) {
    let token = request.headers["x-access-token"];

    if (!token) {
        return response.status(403).send({
            message: "No token provided!"
        });
    }

    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            return response.status(401).send({
                message: "Unauthorized!"
            });
        }
        //request.userId = decoded.id;
    });

    //console.log(request.userId);
    //console.log(request.body);
    request.body.createtime = new Date();
    const res = await db.collection('mposts').add(request.body);

    response.json({ret:res.id});

});

app.get('/posts', async function(req, res) {

    const postsShot = await db.collection('mposts').get();
    var posts = []
    postsShot.forEach((doc) => {
        let data = doc.data();
        data.id = doc.id;
        posts.push(data);
    });
    //return products;
    res.json({items:posts});

});

app.get('/post/:id', async function(req, res) {
    console.log(req.params.id);
    const model = await db.collection('mposts').doc(req.params.id.toString()).get();
    res.json({item:model.data()});
});

app.post('/post/reply/:id', jsonParser, async function(req, res) {
    console.log(req.params.id);
    const modelRef = db.collection('mposts').doc(req.params.id.toString());
    const model = await modelRef.get();
    let replies = []
    if(model.data().replies != null) {
        replies = model.data().replies;
    }
    req.body.createtime = new Date();
    replies.push(req.body);
    const result = await modelRef.set({"replies": replies},{merge:true});
    res.json({ret:result});
});

app.post('/post/review/:id', async  function(req,res) {
    const modelRef = db.collection('mposts').doc(req.params.id);
    const result = await modelRef.update({"review": FieldValue.increment(1)});
    res.json({ret:result});
});

app.post('/model/comments/:id', jsonParser, async function(req, res) {
    console.log(req.params.id);
    const modelRef = db.collection('mcomments').doc(req.params.id.toString());
    const model = await modelRef.get();
    let comments = []
    if(model != null && model.data() != null && model.data().comments != null) {
        comments = model.data().comments;
    }
    console.log(req.body);
    req.body.createtime = new Date();
    comments.push(req.body);
    const result = await modelRef.set({"comments": comments});
    res.json({ret:result});
});
app.get('/model/comments/:id', async function(req, res) {
    console.log(req.params.id);
    const model = await db.collection('mcomments').doc(req.params.id.toString()).get();
    res.json({item:model.data()});
});

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


app.put('/v/add', jsonParser,async function (request, response) {
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

    // const params = {
    //     Bucket: 'demo-bucket',
    //     Key: request.body.filename
    //@djnico29-7239975689447918850.mp4
    // }
    //
    // let command = new GetObjectCommand(params);
    // const url = await getSignedUrl(s3Client, command);
    // console.log(url);
    // request.body.defaultVideoUrl = url;

    let next = getNextMedia();
    request.body.next = next;

    request.body.createtime = new Date();
    const res = await db.collection('vitems').add(request.body);
    setNextMedia(request.body.filename);

    response.json({ret:res.id});
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


const fs = require('fs')

function getPid() {
    try {
        const pid = fs.readFileSync('pid.txt');
        return pid;
    } catch (e) {
        console.error(e);
    }
}

function getNextMedia() {
    try {
        const filename = fs.readFileSync('next.txt','utf8');
        const pid = fs.readFileSync('pid.txt','utf8');
        console.log(filename);
        return [filename,pid];
    } catch (e) {
        console.error(e);
    }
}

function setNextMedia(nextFilename, pid) {
    try {
        fs.writeFileSync('next.txt',nextFilename)
        fs.writeFileSync('pid.txt',pid)
    } catch (e) {
        console.error(e);
    }

}

function getMediasFromLocal(dir) {
    //const dir = '';
    filenames = fs.readdirSync(dir);
    filenames.forEach(file => {
        let n = getNextMedia();
        //console.log(n);
        let pid = Number(n[1]);
        let data = {filename:file, next:n[0], pid:pid, createtime:new Date()}
        console.log(data);
        const res = db.collection('vitems').add(data);
        pid = pid + 1;
        setNextMedia(file,pid.toString());
    });

}

//*************************************************
// ***        特别注意    **************************
// ***   pid 的值： 本地 与 远程 保持一致  ************
//*************************************************
//遍历本地文件夹中已处理好的文件，将文件信息保存到数据库
//next.txt pid.txt 需要部署发布到生产环境。 且，需要将生产环境中的这两个文件，同步到本地环境。
app.post('/v/getFromLocalAndSave2Db', jsonParser, async function (request, response) {
    //输入参数：本地mp4文件夹路径
    getMediasFromLocal('I:\\Outputs\\Locker\\nomark_made\\done');
    response.json({ret:1});
})

//分页查询
app.post("/v/getMediaPaged", jsonParser, async function(request, response) {
    let currentPid = getPid();
    let pageIndex = request.body.pageIndex;
    let start = currentPid - (pageIndex-1)*20;
    let end = start - 20;

    console.log(start);
    console.log(end);
    const vitems = await db.collection('vitems')
        .orderBy('pid','desc')
        .startAt(start)
        .endBefore(end)
        .get();
    let ret = [];
    vitems.forEach(doc => {
        ret.push(doc.data());
    })
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
        //let contents = "";

        //返回所有的，每次返回最多100
        while (isTruncated) {
            const { Contents, IsTruncated, NextContinuationToken } = await s3Client.send(command);

            for (const item of Contents) {
                //await getMediaUrlFromBucketAndSave2Db(bucket, item.Key);
                //统计bucket中文件个数
                count++;
            }

            // const contentsList = Contents.map((c) => ` • ${c.Key}`).join("\n");
            // contents += contentsList + "\n";
            isTruncated = IsTruncated;
            command.input.ContinuationToken = NextContinuationToken;
        }
        //console.log(contents);

    } catch (err) {
        console.error(err);
    }

    response.json({"Count of Keys":count});
})

//删除bucket中所有的object
app.post('/v/deleteAllFromBucket', jsonParser, async function (request, response)  {
    let count = 0

    filenames = fs.readdirSync('I:\\Outputs\\Locker\\nomark_made\\orig');
    for (const file of filenames) {
        let count = 0
        console.log(file);

        const params = {
            Bucket: 'caomeio',
            Key: file
        }

        let commandDel = new DeleteObjectCommand(params);
        await s3Client.send(commandDel);
        console.log("Del done");

        count++;

    }


    response.json({"Count of Keys":count});
})

app.listen(3001, () => console.log(('listening :)')))