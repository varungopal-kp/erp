'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ProductionOrders', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      docNum: Sequelize.STRING,
      series: Sequelize.STRING,
      docDate: Sequelize.DATE,
      productId: {
        type: Sequelize.INTEGER,
        references: {
          model: "ItemMasters",
          key: "id",
        },
      },
      bomId: {
        type: Sequelize.INTEGER,
        references: {
          model: "BillOfMaterials",
          key: "id",
        },
      },
      branchId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Branches",
          key: "id",
        },
      },
      description: Sequelize.STRING,
      customerOrderNo: Sequelize.STRING,
      dueDate: Sequelize.DATE,
      startDate: Sequelize.DATE,
      productionTypeId: Sequelize.INTEGER,
      plannedQuantity: Sequelize.DECIMAL(16, 4),
      receivedQuantity: Sequelize.DECIMAL(16, 4),
      rejectedQty: Sequelize.DECIMAL(16, 4),
      uomId: {
        type: Sequelize.INTEGER,
        references: {
          model: "UOMs",
          key: "id",
        },
      },
      warehouseId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Warehouses",
          key: "id",
        },
      },
      unitCost: Sequelize.DECIMAL(16, 4),
      totalCost: Sequelize.DECIMAL(16, 4),
      attachments: Sequelize.ARRAY(Sequelize.JSONB),
      createdUser: Sequelize.UUID,
      salesOrders: Sequelize.ARRAY(Sequelize.JSONB),
      actualQuantity: Sequelize.DECIMAL(16, 4),
      actualUnitCost: Sequelize.DECIMAL(16, 4),
      actualTotalCost: Sequelize.DECIMAL(16, 4),
      statusId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Statuses",
          key: "id",
        },
      },
      salesOrderPlanId: {
        type: Sequelize.INTEGER,
        references: {
          model: "SalesOrderPlans",
          key: "id",
        },
      },
      barcode: Sequelize.STRING,
      initialNumber: Sequelize.INTEGER,
      deleted: Sequelize.BOOLEAN,
      productionUnitId: {
        type: Sequelize.INTEGER,
        references: {
          model: "ProductionUnits",
          key: "id",
        },
      },
      month: Sequelize.INTEGER,
      year: Sequelize.INTEGER,
      quarter: Sequelize.INTEGER,
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
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('ProductionOrders');
  }
};