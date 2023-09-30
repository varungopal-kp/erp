const aws = require('../util/aws')
const multer = require('multer')
const multerS3 = require('multer-s3')

const S3_BUCKET = process.env.Bucket
const s3 = aws.getClient()

var upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: S3_BUCKET,
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
            cb(null, {
                fieldName: file.fieldname
            });
        },
        key: function (req, file, cb) {
            cb(null, Date.now().toString())
        }
    })
})

module.exports = upload