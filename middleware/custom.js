
module.exports.custom = function(req, res, next) {
    try {
        if(req.query.filter==undefined){
            req.query.filter='';
        }
        // if(req.query.limit<= 20 || req.query.limit==undefined){
        //     req.query.limit=20;
        // }
        if(req.query.sorted){
             req.query.sorted = JSON.parse(req.query.sorted[0])
            if(req.query.sorted.desc){
                req.query.sorted.desc='desc';
            }else{
                req.query.sorted.desc='asc';
            }
          }else{
             req.query.sorted={id:"id",desc:"desc"};
          }


    } catch (error) {

        console.error(error)

    }

    return next();

  }
