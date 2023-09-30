"use strict";
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable("ItemMasters", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      code: {
        type: Sequelize.STRING,
        unique: true,
      },
      name: {
        type: Sequelize.STRING,
        unique: true,
      },
      hierarchyCode: {
        type: Sequelize.STRING
      },
      barcode: {
        type: Sequelize.STRING
      },
      onHand: {
        type: Sequelize.DECIMAL(16, 4),
        defaultValue: 0.0
      },
      ordered: {
        type: Sequelize.DECIMAL(16, 4),
        defaultValue: 0.0
      },
      committed: {
        type: Sequelize.DECIMAL(16, 4),
        defaultValue: 0.0
      },
      minimumStock: {
        type: Sequelize.INTEGER
      },
      maximumStock: {
        type: Sequelize.INTEGER
      },
      inventoryUOMId: {
        type: Sequelize.INTEGER,
        references: {
          model: "UOMs",
          key: "id"
        }
      },
      purchaseUOMId: {
        type: Sequelize.INTEGER,
        references: {
          model: "UOMs",
          key: "id"
        }
      },
      salesUOMId: {
        type: Sequelize.INTEGER,
        references: {
          model: "UOMs",
          key: "id"
        }
      },
      categoryId: {
        type: Sequelize.INTEGER,
        references: {
          model: "ItemCategories",
          key: "id"
        }
      },
      departmentId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Departments",
          key: "id"
        }
      },
      brandId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Brands",
          key: "id"
        }
      },
      warehouseId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Warehouses",
          key: "id"
        }
      },
      valuationMethod: {
        type: Sequelize.STRING
      },
      makeBuy: {
        type: Sequelize.STRING
      },
      length: {
        type: Sequelize.DECIMAL(16, 4)
      },
      width: {
        type: Sequelize.DECIMAL(16, 4)
      },
      height: {
        type: Sequelize.DECIMAL(16, 4)
      },
      weight: {
        type: Sequelize.DECIMAL(16, 4)
      },
      thickness: {
        type: Sequelize.DECIMAL(16, 4)
      },
      latestBarcode: Sequelize.STRING,
      lengthUOMId: {
        type: Sequelize.INTEGER,
        references: {
          model: "UOMs",
          key: "id"
        }
      },
      widthUOMId: {
        type: Sequelize.INTEGER,
        references: {
          model: "UOMs",
          key: "id"
        }
      },
      heightUOMId: {
        type: Sequelize.INTEGER,
        references: {
          model: "UOMs",
          key: "id"
        }
      },
      weightUOMId: {
        type: Sequelize.INTEGER,
        references: {
          model: "UOMs",
          key: "id"
        }
      },
      thicknessUOMId: {
        type: Sequelize.INTEGER,
        references: {
          model: "UOMs",
          key: "id"
        }
      },
      materialId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Materials",
          key: "id"
        }
      },
      remarks: {
        type: Sequelize.STRING
      },
      bundleString1: Sequelize.STRING,
      bundleString2: Sequelize.STRING,
      bundleInitialNumber: {
        type: Sequelize.INTEGER,
        defaultValue: 100
      },
      bundleNextNumber: Sequelize.INTEGER,
      statusId: {
        type: Sequelize.INTEGER,
        defaultValue: 1
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
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable("ItemMasters");
  }
};