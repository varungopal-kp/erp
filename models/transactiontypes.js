'use strict';
module.exports = (sequelize, DataTypes) => {
  const TransactionTypes = sequelize.define('TransactionTypes', {
    code: DataTypes.STRING,
    name: DataTypes.STRING
  }, {});
  TransactionTypes.associate = function(models) {
    // associations can be defined here
  };
  return TransactionTypes;
};