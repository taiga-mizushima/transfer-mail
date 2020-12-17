'use strict';

const aws = require('aws-sdk');
// const iconv = require('iconv-lite');

exports.handler = (event, context, callback) => {

    var message = event.Records[0].Sns.Message;
    var msgjson = JSON.parse(message);
    console.log('Content received from SNS:',msgjson.content);

    const generator  = (function *() {

        try {
            // メッセージ抽出
            const mailParse = yield extractMail(msgjson.content, generator);

            // メッセージ送信
            yield sendMessage(mailParse, generator);

            callback(null,'succeed!');

        } catch (e) {
            callback(e.message);
        }
    })();

    /* 処理開始 */
    generator.next();
};

// メッセージ抽出
function extractMail(content, generator) {

    const simpleParser = require('mailparser').simpleParser;

    simpleParser(content)
        .then(mail=> {

            // タグ除去
            var mailtext = mail.textAsHtml.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'');
            console.log('mailtext:', mailtext);

            // エンコード
            // var enctext = iconv.decode(mailtext, 'ascii');
            // console.log('enctext:', enctext);

            const mailParse = {
                text: mailtext,
                subject: mail.subject
            };
            generator.next(mailParse);
        })
        .catch(err=> {
            console.log(err);
        });
}

// メッセージを送信する
function sendMessage(sendMailInfo, generator) {

    const ses = new aws.SES({region: 'us-east-1'});

    var adress;
    var keyward = process.env.KEY_WARD;

    if (sendMailInfo.subject.includes(keyward)) {
        adress = process.env.FORWARD_1ST;
    }
    else {
        adress = process.env.FORWARD_2ND;
    }

    var mlparams = {
       Destination: {
           ToAddresses: [adress]
       },
       Message: {
           Body: {
               Text: { Data: sendMailInfo.text,
                       Charset: 'ascii'
               }
           },
           Subject: { Data: "FowardingTest"
           }
       },
        Source: "recipient@nciawsws.tk"
    };

    console.log('Sending Email ..');
    console.log('mlparams :', mlparams);
    ses.sendEmail(mlparams, function (err, data) {
        if (err) {
            console.log(err, err.stack);
            generator.throw(new Error('SES Error'));
            return;
        } else {
            console.log('Send Successful');
            console.log(data);
            generator.next();
        }
    });
}
