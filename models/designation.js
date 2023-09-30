"use strict";
module.exports = (sequelize, DataTypes) => {
  const Designation = sequelize.define(
    "Designation",
    {
      name: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
      }
    },
    {}
  );
  Designation.associate = function(models) {
    // associations can be defined here
  };
  return Designation;
};
