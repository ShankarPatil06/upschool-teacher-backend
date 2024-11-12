const { PublishCommand } = require("@aws-sdk/client-sns");
const { sns } = require('../awsConfig');
const { helper : {fortmatData} } = require('../helper');

exports.process = async function (reqData) {
    let snsParams = {
        Message: JSON.stringify(reqData),
        MessageStructure: `String`,
        TopicArn: process.env.SEND_OTP_ARN
    };

    console.log(`SNS publish params : ${fortmatData(snsParams)}`);
    const data = await sns.send(new PublishCommand(snsParams));
    console.log("Success.", data.$metadata.httpStatusCode);
    return data.$metadata;
}