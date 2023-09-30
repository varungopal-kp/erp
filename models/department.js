'use strict';
module.exports = (sequelize, DataTypes) => {
  const Department = sequelize.define('Department', {
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

    branchId: DataTypes.INTEGER,
    statusId: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
  }, {});
  Department.associate = function (models) {
    // associations can be defined here
    Department.belongsTo(models.Branch, {
        foreignKey: "branchId",
        as: "branch",
      }),
      Department.belongsTo(models.Status, {
        foreignKey: "statusId",
        as: "status",
      })
  };
  return Department;
};