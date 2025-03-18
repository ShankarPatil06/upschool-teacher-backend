const { PublishCommand } = require("@aws-sdk/client-sns");
const { sns } = require('../awsConfig');
const { helper : {fortmatData} } = require('../helper');

exports.process = async (reqData) => {
    let snsParams = {
        Message: JSON.stringify(reqData),
        MessageStructure: `String`,
        TopicArn: process.env.SEND_OTP_ARN
    };

    const data = await sns.send(new PublishCommand(snsParams));
    return data.$metadata;
}