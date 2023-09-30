"use strict";
module.exports = (sequelize, DataTypes) => {
  const Employee = sequelize.define(
    "Employee", {
      name: DataTypes.STRING,
      secondName: {
        type: DataTypes.STRING
      },
      lastName: {
        type: DataTypes.STRING
      },
      empId: {
        type: DataTypes.INTEGER
      },
      accountNO: {
        type: DataTypes.STRING
      },
      phone: {
        type: DataTypes.STRING
      },
      localAddress: {
        type: DataTypes.STRING
      },
      Address: {
        type: DataTypes.STRING
      },
      countryId: {
        type: DataTypes.STRING
      },
      gender: {
        type: DataTypes.STRING
      },
      marital: {
        type: DataTypes.STRING
      },
      children: {
        type: DataTypes.STRING
      },
      children: {
        type: DataTypes.STRING
      },
      family: {
        type: DataTypes.STRING
      },
      dob: {
        type: DataTypes.DATE
      },
      religion: {
        type: DataTypes.STRING
      },
      joiningDate: {
        type: DataTypes.DATE
      },
      designationId: {
        type: DataTypes.INTEGER
      },
      documents: {
        type: DataTypes.ARRAY(DataTypes.JSONB)
      },
      profileImage: DataTypes.STRING,
      deletedAt: DataTypes.DATE,
      visaNumber: DataTypes.STRING,
      visaExpiryDate: DataTypes.STRING,
      visaFile: DataTypes.STRING,
      prNumber: DataTypes.STRING,
      prExpiryDate: DataTypes.STRING,
      prFile: DataTypes.STRING,
      healthCardNumber: DataTypes.STRING,
      healthCardExpiryDate: DataTypes.STRING,
      healthCardFile: DataTypes.STRING,
      drivingLicenseNumber: DataTypes.STRING,
      drivingLicenseExpiryDate: DataTypes.STRING,
      drivingLicenseFile: DataTypes.STRING,
    }, {}
  );
  Employee.associate = function (models) {
    // associations can be defined here

    Employee.belongsTo(models.Employee, {
      foreignKey: "empId",
      targetKey: "id",
      as: "Employer"
    });
    // Employee.belongsTo(models.Organization, {
    //   foreignKey: "countryId"
    // });
    Employee.belongsTo(models.Designation, {
      foreignKey: "designationId"
    });
  };
  return Employee;
};