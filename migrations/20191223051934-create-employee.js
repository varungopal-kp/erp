"use strict";
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable("Employees", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      secondName: {
        type: Sequelize.STRING
      },
      lastName: {
        type: Sequelize.STRING
      },
      empId: {
        type: Sequelize.INTEGER
      },
      accountNO: {
        type: Sequelize.STRING
      },
      phone: {
        type: Sequelize.STRING
      },
      localAddress: {
        type: Sequelize.STRING
      },
      Address: {
        type: Sequelize.STRING
      },
      countryId: {
        type: Sequelize.INTEGER
      },
      gender: {
        type: Sequelize.STRING
      },
      marital: {
        type: Sequelize.STRING
      },
      children: {
        type: Sequelize.STRING
      },
      children: {
        type: Sequelize.STRING
      },
      family: {
        type: Sequelize.STRING
      },
      dob: {
        type: Sequelize.DATE
      },
      religion: {
        type: Sequelize.STRING
      },
      joiningDate: {
        type: Sequelize.DATE
      },
      designationId: {
        type: Sequelize.INTEGER
      },
      documents: {
        type: Sequelize.ARRAY(Sequelize.JSONB)
      },
      visaNumber: {
        type: Sequelize.STRING
      },
      visaExpiryDate: {
        type: Sequelize.DATE
      },
      visaFile: {
        type: Sequelize.STRING
      },
      prNumber: {
        type: Sequelize.STRING
      },
      prExpiryDate: {
        type: Sequelize.DATE
      },
      prFile: {
        type: Sequelize.STRING
      },
      healthCardNumber: {
        type: Sequelize.STRING
      },
      healthCardExpiryDate: {
        type: Sequelize.DATE
      },
      healthCardFile: {
        type: Sequelize.STRING
      },
      drivingLicenseNumber: {
        type: Sequelize.STRING
      },
      drivingLicenseExpiryDate: {
        type: Sequelize.DATE
      },
      drivingLicenseFile: {
        type: Sequelize.STRING
      },
      profileImage: {
        type: Sequelize.STRING
      },
      deletedAt: Sequelize.DATE,
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable("Employees");
  }
};