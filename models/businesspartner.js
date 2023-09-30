'use strict';
module.exports = (sequelize, DataTypes) => {
  const BusinessPartner = sequelize.define('BusinessPartner', {
    code: {
      type: DataTypes.STRING,
      validate: {
        notEmpty: true,
        // len: {
        //   args: 3,
        //   msg: "code must be at least 3 characters in length",
        // },
        isUnique: function (value, next) {
          var self = this
          BusinessPartner.findOne({
              where: {
                code: value,
              },
            })
            .then(function (rs) {
              // reject if a different user wants to use the same docNum
              if (rs && self.id !== rs.id) {
                return next("code already in use!")
              }
              return next()
            })
            .catch(function (err) {
              return next(err)
            })
        },
      },
    },
    name: DataTypes.STRING,
    type: DataTypes.STRING,
    billingAddress: DataTypes.JSONB,
    shippingAddress: DataTypes.JSONB,
    bankCode: DataTypes.STRING,
    bankName: DataTypes.STRING,
    bankSwiftCode: DataTypes.STRING,
    bankCountryId: DataTypes.INTEGER,
    bankCreditLimit: DataTypes.DECIMAL(16, 4),
    attachments: DataTypes.ARRAY(DataTypes.JSONB),
    glAccountId: DataTypes.INTEGER,
    currencyId: DataTypes.INTEGER,
    remarks: DataTypes.STRING,
    phone: DataTypes.STRING,
    mobile: DataTypes.STRING,
    deleted: DataTypes.BOOLEAN,
  }, {});
  BusinessPartner.associate = function (models) {
    // associations can be defined here
    // BusinessPartner.belongsTo(models.GLAccount, {
    //   foreignKey: "glAccountId",
    // })
    BusinessPartner.belongsTo(models.Currency, {
      foreignKey: "currencyId",
    })
    BusinessPartner.belongsTo(models.Country, {
      foreignKey: "bankCountryId",
      as: "bankCountry"
    })
  };
  return BusinessPartner;
};