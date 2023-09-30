const multer = require('multer')
const fs = require('fs')

var storage = multer.diskStorage({
    destination: function (req, file, cb) {


        const dir = `public/uploads/excel`

        fs.exists(dir, exist => {
            if (!exist) return fs.mkdir(dir, error => cb(error, dir))

            return cb(null, dir)
        })
    },
    filename: function (req, file, cb) {
        var filename = file.originalname;
        var fileExtension = filename.split(".")[1];
        cb(null, Date.now() + "." + fileExtension);
    }
});

var upload = multer({
    limits: {
        fieldNameSize: 100,
        fileSize: 1024 * 1024 * 5
    },
    storage
});

module.exports = upload