'use strict';
module.exports = (sequelize, DataTypes) => {
  const Branch = sequelize.define('Branch', {
    code: {
      type: DataTypes.STRING,
      validate: {
        notEmpty: {
          args: true,
          msg: "Code field should not be empty",
        },
      },
    },
    name: {
      type: DataTypes.STRING,
      validate: {
        notEmpty: {
          args: true,
          msg: "Name field should not be empty",
        },
      },
    },
    organizationId: DataTypes.INTEGER,
    address: DataTypes.STRING,
    zipCode: DataTypes.STRING,
    country: DataTypes.STRING,
    website: DataTypes.STRING,
    phone: DataTypes.STRING,
    email: DataTypes.STRING,
    fax: DataTypes.STRING,
    printHeader: DataTypes.STRING,
    registrationNo: DataTypes.STRING,
    statusId: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
  }, {});
  Branch.associate = function (models) {
    // associations can be defined here
    Branch.belongsTo(models.Organization, {
        foreignKey: "organizationId",
        as: "organization",
      }),
      Branch.belongsTo(models.Status, {
        foreignKey: "statusId",
        as: "status",
      }),
      Branch.hasMany(models.Department, {
        foreignKey: "branchId",
        as: "Departments",
      })
  };
  return Branch;
};