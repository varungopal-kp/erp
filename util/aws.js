const aws = require("aws-sdk")

module.exports = {
    getClient: function(region) {
        aws.config.update({
            region: "ap-south-1", // Put your aws region here
            accessKeyId: process.env.AWSAccessKeyId,
            secretAccessKey: process.env.AWSSecretKey,
          })
        return new aws.S3()
    }
}