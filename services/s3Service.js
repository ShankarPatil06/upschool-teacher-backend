
const { dynamoDbCon, s3 } = require('../awsConfig');


const deleteFile = async (fileName) => {
    const params = {
        Bucket: awsConfig.BucketName,
        Key: fileName
    };

    try {
        await awsConfig.s3.headObject(params).promise()
        console.log(`File "${fileName}" Found in S3`)
        try {
            await awsConfig.s3.deleteObject(params).promise()
            console.log(`File "${fileName}" deleted Successfully`)
        }
        catch (err) {
            console.log(`ERROR in file Deleting : ${JSON.stringify(err)}`)
        }
    } catch (err) {
        console.log(`File not Found ERROR : ${err.code}`)
    }
};

const download = async (key, location) => {
    const params = {
        Bucket: awsConfig.BucketName,
        Key: key,
    }

    const { Body } = await awsConfig.s3.getObject(params).promise()
    await fs.writeFile(location, Body)

    return true
}

const getFile = async (Key) => await s3.getObject({ Bucket: process.env.BUCKET_NAME, Key }).promise();

const getS3SignedUrl = async (fileKey) => 
{
    console.log("fileKey ------------------",fileKey);
    let Key = fileKey;
    let URL_EXPIRATION_SECONDS = 600;

    let s3Params = {
        Bucket: process.env.BUCKET_NAME,
        Key,
        Expires: URL_EXPIRATION_SECONDS,
    }
    let signedS3URL = await s3.getSignedUrlPromise('getObject', s3Params)

    return signedS3URL;

}

const upload = async (files) => {
    for (const file of files) {
        const params = {
            Bucket: awsConfig.BucketName,
            Key: file.name,
            Body: file.data,

            // Key: uploadPath,
            // Body: buff,
            ACL: "public-read",
            ContentType: ".png"
        };
        try {
            const stored = await awsConfig.s3.upload(params).promise()
            console.log(stored);
        } catch (err) {
            console.log(err)
        }
    }
};

const getFileByPartialKey = async(key) => {
    let objectList = await s3.listObjects({ Bucket: process.env.BUCKET_NAME, Prefix: key }).promise();
    const filteredObjects = objectList.Contents.filter(obj => obj.Key.includes(key));
    if (filteredObjects.length > 0) {
      const firstMatchingObjectKey = filteredObjects[0].Key;
      return firstMatchingObjectKey;
    }else{
        return false;
    }
}

module.exports = {
    deleteFile,
    download,
    getFile,
    getS3SignedUrl,
    upload,
    getFileByPartialKey
}