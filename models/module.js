'use strict';
module.exports = (sequelize, DataTypes) => {
  const Module = sequelize.define('Module', {
    name: DataTypes.STRING,
    slug: DataTypes.STRING,
    type: DataTypes.STRING
  }, {});
  Module.associate = function (models) {
    // associations can be defined here
  };
  return Module;
};