'use strict';
module.exports = (sequelize, DataTypes) => {
  const Organization = sequelize.define('Organization', {
    name: {
      type: DataTypes.STRING,
      validate: {
        notEmpty: {
          args: true,
          msg: "Name field should not be empty",
        },
      },
    },
    address: {
      type: DataTypes.STRING,
    },
    zipCode: DataTypes.STRING,
    country: DataTypes.STRING,
    website: DataTypes.STRING,
    phone: DataTypes.STRING,
    email: DataTypes.STRING,
    fax: DataTypes.STRING,
    printHeader: DataTypes.STRING,
    registrationNo: DataTypes.STRING,
    negativeStockPosting: DataTypes.BOOLEAN,
    deletedAt: DataTypes.DATE,
    currencyId: DataTypes.INTEGER,
  }, {});
  Organization.associate = function (models) {
    // associations can be defined here
    Organization.hasMany(models.Branch, {
      foreignKey: "organizationId",
      as: "Branches",
    })
    // Organization.hasMany(models.Department)
  }
  return Organization;
};