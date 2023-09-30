'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('PurchaseGoodsReceiptNotes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      docNum: Sequelize.STRING,
      series: Sequelize.STRING,
      businessPartnerId: {
        type: Sequelize.INTEGER,
        references: {
          model: "BusinessPartners",
          key: "id",
        },
      },
      docDate: Sequelize.DATE,
      postingDate: Sequelize.DATE,
      dueDate: Sequelize.DATE,
      branchId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Branches",
          key: "id",
        },
      },
      remarks: Sequelize.STRING,
      billingAddress: Sequelize.JSONB,
      shippingAddress: Sequelize.JSONB,
      totalDiscount: {
        type: Sequelize.DECIMAL(16, 4),
        defaultValue: 0,
      },
      totalTax: {
        type: Sequelize.DECIMAL(16, 4),
        defaultValue: 0,
      },
      totalBeforeDiscount: {
        type: Sequelize.DECIMAL(16, 4),
        defaultValue: 0,
      },
      totalDiscountPercentage: {
        type: Sequelize.DECIMAL(16, 4),
        defaultValue: 0,
      },
      totalDiscountSum: {
        type: Sequelize.DECIMAL(16, 4),
        defaultValue: 0,
      },
      grandTotal: {
        type: Sequelize.DECIMAL(16, 4),
        defaultValue: 0,
      },
      attachments: {
        type: Sequelize.ARRAY(Sequelize.JSONB),
        allowNull: true,
      },
      currencyId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Currencies",
          key: "id",
        },
      },
      status: Sequelize.STRING,
      month: Sequelize.INTEGER,
      year: Sequelize.INTEGER,
      quarter: Sequelize.INTEGER,
      createdUser: Sequelize.UUID,

      deleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        onUpdate: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      deletedAt: {
        type: Sequelize.DATE,
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('PurchaseGoodsReceiptNotes');
  }
};