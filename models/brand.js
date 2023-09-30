'use strict';
module.exports = (sequelize, DataTypes) => {
  const Brand = sequelize.define('Brand', {
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
    deletedAt: DataTypes.DATE,
    statusId: DataTypes.INTEGER,
  }, {});
  Brand.associate = function (models) {
    // associations can be defined here
    Brand.belongsTo(models.Status, {
      foreignKey: "statusId",
      as: "status",
    })
  };
  return Brand;
};