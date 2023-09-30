const AWS = require("aws-sdk");
const fs = require("fs");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const jsonexport = require("jsonexport");
const path = require("path");
const {
  Parser,
  transforms: { unwind },
  parseAsync,
} = require("json2csv");

const paths = require("../config/paths.json");

module.exports = {
  formatDate: (inputDate) => {
    if (inputDate) {
      var date = new Date(inputDate);

      var day;
      var month = parseInt(date.getMonth()) + 1;
      if (date.getDate() < 10) {
        day = "0" + date.getDate();
      } else {
        day = date.getDate();
      }

      if (month < 10) {
        return day + "-0" + month + "-" + date.getFullYear();
      }

      return day + "-" + month + "-" + date.getFullYear();
    } else return null;
  },
  getNextDocumentNumber: async (type, series, transaction) => {
    const TransactionNumber = require("../models").TransactionNumbers;

    const where = {
      objectCode: type,
    };

    if (series) {
      where.series = series;
    }

    return await TransactionNumber.findOne({
      where,
      attributes: ["nextNumber", "series"],
      raw: true,
      transaction,
    })
      .then((res) => {
        if (!res) {
          return null;
        }
        return res;
      })
      .catch((error) => {
        console.log(error);
        return error;
      });
  },
  getConvertedQuantity: async (uomId, itemMasterId, quantity) => {
    console.log(
      "#################################getConvertedQuantity#######################"
    );
    const ItemMaster = require("../models").ItemMaster;
    const ItemMasterUOMs = require("../models").ItemMasterUOMs;
    const UOM = require("../models").UOM;

    const itemMaster = await ItemMaster.findOne({
      where: {
        id: itemMasterId,
      },
    }).catch((error) => {
      console.log(error);
      throw error;
    });

    if (uomId == itemMaster.inventoryUOMId) return quantity;

    const itemMasterUOM = await ItemMasterUOMs.findOne({
      where: {
        itemMasterId,
        uomId,
      },
    }).catch((error) => {
      console.log(error);
      throw error;
    });

    if (!itemMasterUOM) {
      const uom = await UOM.findOne({
        where: {
          id: uomId,
        },
      }).catch((error) => {
        throw error;
      });

      throw new Error(
        `${uom.name} is not associated with ${itemMaster.name}! Please add it in the item master under inventory.`
      );
    }

    let conversionFactor =
      itemMasterUOM.conversionFactor && itemMasterUOM.conversionFactor > 0
        ? itemMasterUOM.conversionFactor
        : 1;

    return +quantity * conversionFactor;
  },
  getConvertedPrice: async (uomId, itemMasterId, price) => {
    console.log(
      "#################################getConvertedPrice#######################"
    );
    const ItemMaster = require("../models").ItemMaster;
    const ItemMasterUOMs = require("../models").ItemMasterUOMs;

    const itemMaster = await ItemMaster.findOne({
      where: {
        id: itemMasterId,
      },
    }).catch((error) => {
      console.log(error);
      throw error;
    });

    if (uomId == itemMaster.inventoryUOMId) return price;

    const itemMasterUOM = await ItemMasterUOMs.findOne({
      where: {
        itemMasterId: itemMasterId,
        uomId: uomId,
      },
    }).catch((error) => {
      console.log(error);
      throw error;
    });

    // console.log("uomId", uomId)
    // console.log("itemMasterId", itemMasterId)
    // console.log("quantity", quantity)

    if (!itemMasterUOM) throw new Error("ItemMasterUOM missing!!!");

    // console.log(console.log("itemMasterUOM", itemMasterUOM.conversionFactor))

    let conversionFactor =
      itemMasterUOM.conversionFactor && itemMasterUOM.conversionFactor > 0
        ? itemMasterUOM.conversionFactor
        : 1;

    return (+price / +conversionFactor).toFixed(4);
  },
  getConversionFactor: async (uomId, itemMasterId) => {
    console.log(
      "################################# getConversionFactor #######################"
    );
    const ItemMaster = require("../models").ItemMaster;
    const ItemMasterUOMs = require("../models").ItemMasterUOMs;

    const itemMaster = await ItemMaster.findOne({
      where: {
        id: itemMasterId,
      },
    }).catch((error) => {
      console.log(error);
      throw error;
    });

    if (uomId == itemMaster.inventoryUOMId) return 1;

    const itemMasterUOM = await ItemMasterUOMs.findOne({
      where: {
        itemMasterId,
        uomId,
      },
    }).catch((error) => {
      console.log(error);
      throw error;
    });

    if (!itemMasterUOM) throw new Error("itemMasterUOM not found!");

    return itemMasterUOM.conversionFactor || 1;
  },
  updateOIVLForNoBatchItems: async (itemMaster, issueQuantity, transaction) => {
    const OIVL = require("../models").OIVL;
    let totalPrice = 0;

    const oivls = await OIVL.findAll({
      where: {
        itemMasterId: itemMaster.id,
        openQty: {
          [Op.gt]: 0,
        },
      },
      order: [["id", "ASC"]],
    });

    if (!oivls || oivls.length == 0) {
      throw new Error(
        `No stock for item ${itemMaster.name} for back-flush Production Issue.`
      );
    }

    let oivlTotalOpenQty = oivls
      .map((oivl) => +oivl.openQty)
      .reduce((a, b) => a + b, 0);

    // console.log("convertedTotalQuantity", convertedTotalQuantity)
    // console.log("oivlTotalOpenQty", oivlTotalOpenQty)
    // console.log("issueQuantity", issueQuantity)
    if (oivlTotalOpenQty && issueQuantity > oivlTotalOpenQty) {
      throw new Error(
        `Stock not enough for item ${itemMaster.name} for back-flush Production Issue.`
      );
    }

    for (let i = 0; i < oivls.length; i++) {
      const oivl = oivls[i];

      let oivlOpenQty = oivl.openQty;

      if (issueQuantity === 0) break;

      if (oivlOpenQty >= issueQuantity) {
        // If there is enough open qty in the OIVL
        totalPrice = +oivl.price * issueQuantity;

        await oivl
          .decrement(
            {
              openQty: issueQuantity,
            },
            {
              transaction,
            }
          )
          .catch((e) => {
            console.log(e);
            throw e;
          });

        await oivl
          .increment(
            {
              outQty: issueQuantity,
            },
            {
              transaction,
            }
          )
          .catch((e) => {
            console.log(e);
            throw e;
          });

        issueQuantity = 0;
      } else {
        // If OIVL open qty is not enough for issuing
        totalPrice = +oivl.price * oivlOpenQty;

        await oivl
          .update(
            {
              openQty: 0,
            },
            {
              transaction,
            }
          )
          .catch((e) => {
            console.log(e);
            throw e;
          });

        await oivl
          .increment(
            {
              outQty: oivlOpenQty,
            },
            {
              transaction,
            }
          )
          .catch((e) => {
            console.log(e);
            throw e;
          });

        issueQuantity -= oivlOpenQty;
      }
    }

    return totalPrice;
  },
  exportReportToCSV: async (data, fileName) => {
    const csvData = await new Promise((resolve, reject) =>
      jsonexport(data, (err, csv) => {
        if (err) reject(err);
        else resolve(csv);
      })
    );

    const destinationPath =
      paths.reportExcelExport + `/${fileName}_${Date.now()}.csv`;

    await fs.readdir(paths.reportExcelExport, (err, files) => {
      if (err) throw err;

      for (const file of files) {
        fs.unlink(path.join(paths.reportExcelExport, file), (err) => {
          if (err) throw err;
        });
      }
    });

    await fs.writeFile(destinationPath, csvData, "utf8", function (err) {
      if (err) throw err;
    });

    return destinationPath.slice(7);
  },
  getErrorMessage: async (error, message) => {
    let returnMessage = "Oops, Something went wrong!";

    if (error && error.name) {
      switch (error.name) {
        case "SequelizeUniqueConstraintError":
          returnMessage = "Value for an input already in use!";

          if (error.errors[0] && error.errors[0].message)
            returnMessage = error.errors[0].message;

          break;

        case "SequelizeForeignKeyConstraintError":
          returnMessage = "Reference exist in another table!";
          break;

        case "Error":
          returnMessage = error.toString();
          break;

        default:
          break;
      }
    } else if (error) {
      returnMessage = error;
    } else {
      returnMessage = message;
    }

    return returnMessage;
  },
  createProductionOrderLog: async (
    productionOrderId,
    message,
    createdUser,
    transaction
  ) => {
    console.log(
      "#################################createProductionOrderLog#######################"
    );
    const ProductionOrderLog = require("../models").ProductionOrderLogs;

    const productionOrderLog = await ProductionOrderLog.create(
      {
        productionOrderId,
        message,
        createdUser,
      },
      {
        transaction,
      }
    ).catch((error) => {
      throw error;
    });

    if (!productionOrderLog) throw "Log insertion failed!";

    return true;
  },
  exportReportToCSV1: async (data, fileName, fields = [], nestedPaths = []) => {
    const transforms = [unwind({ paths: nestedPaths })];

    const json2csvParser = new Parser({ fields, transforms });

    const csvData = await json2csvParser.parse(data);

    const destinationPath =
      paths.reportExcelExport + `/${fileName}_${Date.now()}.csv`;

    await fs.readdir(paths.reportExcelExport, (err, files) => {
      if (err) throw err;

      for (const file of files) {
        fs.unlink(path.join(paths.reportExcelExport, file), (err) => {
          if (err) throw err;
        });
      }
    });

    await fs.writeFile(destinationPath, csvData, "utf8", function (err) {
      if (err) throw err;
    });

    return destinationPath.slice(7);
  },
  trim: (text, size = 80) => {
    try {
      const trim = text.length > size ? text.substring(0, size) + "..." : text;
      return trim;
    } catch (error) {
      return text;
    }
  },
};
