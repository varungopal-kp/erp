'use strict';
module.exports = (sequelize, DataTypes) => {
  const TransactionNumber = sequelize.define('TransactionNumbers', {
    objectCode: DataTypes.STRING,
    series: DataTypes.STRING,
    transactionTypeId: DataTypes.INTEGER,
    initialNumber: DataTypes.INTEGER,
    nextNumber: DataTypes.INTEGER,
    lastNumber: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
  }, {});
  TransactionNumber.associate = function (models) {
    // associations can be defined here
    TransactionNumber.belongsTo(models.TransactionTypes, {
      foreignKey: "transactionTypeId",
      as: "TransactionType",
    })
  };
  return TransactionNumber;
};