exports.ErrorBuatify = errors => {
  const errMessage = errors.map(obj => {
    var rObj = {}
    rObj[obj.path] = obj.message
    return rObj
  })

  return errMessage
}
