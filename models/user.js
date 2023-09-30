const uuid = require('uuid');

"use strict"
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    username: DataTypes.STRING,
    isLocked: DataTypes.BOOLEAN,
    branchId: DataTypes.INTEGER,
    employeeId: DataTypes.INTEGER,
    statusId: DataTypes.INTEGER,
    isSuperAdmin: DataTypes.BOOLEAN,
    deletedAt: DataTypes.DATE,
  })
  User.associate = function (models) {
    // associations can be defined here
    User.belongsTo(models.Branch, {
      foreignKey: "branchId",
      as: "branch",
    })
    User.belongsTo(models.Status, {
      foreignKey: "statusId",
      as: "status",
    })
    User.hasMany(models.UserPrivilege, {
      foreignKey: "userId",
    })
    // User.belongsTo(models.Employee, {
    //   foreignKey: "employeeId",
    //   as: "employee",
    // })
  }
  User.beforeCreate((user, _) => {
    return user.id = uuid();
  });
  return User
}