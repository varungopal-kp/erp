'use strict';
module.exports = (sequelize, DataTypes) => {
  const UserPrivilege = sequelize.define('UserPrivilege', {
    moduleId: DataTypes.INTEGER,
    userId: DataTypes.UUID,
    read: DataTypes.BOOLEAN,
    write: DataTypes.BOOLEAN,
    delete: DataTypes.BOOLEAN,
  }, {});
  UserPrivilege.associate = function (models) {
    // associations can be defined here
    UserPrivilege.belongsTo(models.Module, {
      foreignKey: "moduleId",
    })
    UserPrivilege.belongsTo(models.User, {
      foreignKey: "userId"
    })
  };
  return UserPrivilege;
};