const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const _ = require("lodash");
const Moment = require("moment");
const paginate = require("express-paginate");
const db = require("../models/index");
const GoodsIssue = require("../models").GoodsIssue;
const GoodsIssueItem = require("../models").GoodsIssueItem;
const WarehouseItem = require("../models").WarehouseItems;
const Branch = require("../models").Branch;
const OIVL = require("../models").OIVL;
const TransactionNumber = require("../models").TransactionNumbers;
const ItemMaster = require("../models").ItemMaster;
const Warehouse = require("../models").Warehouse;
const GoodsIssueOIVL = require("../models").GoodsIssueOIVL;
const OIVLBarcodes = require("../models").OIVLBarcodes;
const ItemMasterUOMs = require("../models").ItemMasterUOMs;
const OIVLBundleNumbers = require("../models").OIVLBundleNumbers;
const helper = require("../helpers/helper");

exports.list = async (req, res, next) => {
  var filter = [];
  var include = [
    {
      model: GoodsIssueItem,
      as: "GoodsIssueItems",
      include: [
        {
          model: ItemMaster,
          as: "ItemMaster",
        },
        {
          model: Warehouse,
          as: "Warehouse",
        },
      ],
    },
    {
      model: Branch,
      as: "Branch",
    },
  ];

  if (req.query.filtered != undefined) {
    req.query.filtered = JSON.stringify(req.query.filtered);

    var filtered = JSON.parse(req.query.filtered);
    for (var i = 0; i < filtered.length; i++) {
      filtered[i] = JSON.parse(filtered[i]);
    }

    filter = filtered.map((data) => {
      if (data.param == "statusId") {
        return {
          [data.param]: {
            [Op.eq]: data.value,
          },
        };
      } else {
        return {
          [data.param]: {
            [Op.iLike]: `${data.value}%`,
          },
        };
      }
    });
  }

  let whereCondition = {
    deleted: {
      [Op.eq]: false,
    },
  };
  if (filter.length > 0) {
    whereCondition = {
      [Op.and]: filter,
      deleted: {
        [Op.eq]: false,
      },
    };
  }

  await GoodsIssue.findAndCountAll({
    // order: [
    //     [req.query.sorted.id, req.query.sorted.desc]
    // ],
    include: include,
    limit: req.query.limit,
    offset: req.skip,
    where: whereCondition,
    order: [["createdAt", "DESC"]],
  })
    .then(async (results) => {
      const itemCount = results.count;
      const pageCount = Math.ceil(results.count / req.query.limit);

      return res.send({
        data: results.rows,
        pageCount,
        itemCount,
        pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
      });
    })
    .catch((error) => {
      return res.status(400).send({
        error: error,
      });
    });
};

exports.create = async (req, res, next) => {
  let { goodsIssue } = req.body;
  const { GoodsIssueItems } = goodsIssue;

  let issueData = _.omit(goodsIssue, ["GoodsIssueItems"]);

  const nextDocNo = await getNextDocumentNumber("GIS", goodsIssue.series);

  let transaction;

  if (nextDocNo) {
    issueData.docNum = nextDocNo.nextNumber;
    goodsIssue.docNum = nextDocNo.nextNumber;
  }

  let month = Moment(issueData.docDate).month() + 1;
  let year = Moment(issueData.docDate).year();
  let quarter = Moment(issueData.docDate).quarter();

  issueData.month = month;
  issueData.year = year;
  issueData.quarter = quarter;

  try {
    transaction = await db.sequelize.transaction().catch((e) => {
      console.log(e);
      throw e;
    });

    const newGoodsIssue = await GoodsIssue.create(issueData, {
      transaction,
    }).catch((e) => {
      console.log(e);
      throw e;
    });

    if (newGoodsIssue.id) {
      for (let i = 0; i < GoodsIssueItems.length; i++) {
        GoodsIssueItems[i].goodsIssueId = newGoodsIssue.id;

        await GoodsIssueItem.create(GoodsIssueItems[i], {
          transaction,
        }).catch((e) => {
          console.log(e);
          throw e;
        });

        await updateOIVLData(GoodsIssueItems[i], newGoodsIssue.id, transaction);

        await updateOnHandQuantity(GoodsIssueItems[i], transaction);

        await addOIVLData(
          { ...goodsIssue, id: newGoodsIssue.id },
          GoodsIssueItems[i],
          transaction
        );
      }

      // commit
      await transaction.commit();

      return res.status(200).send({
        newGoodsIssue,
        success: true,
        message: "Success",
      });
    } else {
      return res.status(400).send({
        success: false,
        message: "Failed",
      });
    }
  } catch (err) {
    // Rollback transaction only if the transaction object is defined
    if (transaction) await transaction.rollback();
    console.log(err);
    return res.status(400).send({
      success: false,
      message: "Failed",
      error: err,
    });
  }
};

exports.update = async (req, res, next) => {
  console.log("***************************UPDATE**************************");
  let { goodsIssue } = req.body;
  const { LineItems } = goodsIssue;

  const goodsIssueId = req.params.id;

  let transaction = await db.sequelize.transaction().catch((e) => {
    console.log(e);
    throw e;
  });

  await deleteExistingDocument(
    goodsIssue,
    LineItems,
    goodsIssueId,
    transaction
  );

  let issueData = _.omit(goodsIssue, ["LineItems"]);

  try {
    const newGoodsIssue = await GoodsIssue.create(issueData, {
      transaction,
    }).catch((e) => {
      console.log(e);
      throw e;
    });

    if (newGoodsIssue.id) {
      for (let i = 0; i < LineItems.length; i++) {
        LineItems[i].goodsIssueId = newGoodsIssue.id;

        await GoodsIssueItem.create(LineItems[i], {
          transaction,
        }).catch((e) => {
          console.log(e);
          throw e;
        });

        await updateOnHandQuantity(LineItems[i], transaction);

        await addOIVLData(goodsIssue, LineItems[i], transaction);

        await updateOIVLData(LineItems[i], newGoodsIssue.id, transaction);
      }

      // commit
      await transaction.commit();

      return res.status(200).send({
        newGoodsIssue,
        success: true,
        message: "Success",
      });
    } else {
      return res.status(400).send({
        success: false,
        message: "Failed",
      });
    }
  } catch (err) {
    // Rollback transaction only if the transaction object is defined
    if (transaction) await transaction.rollback();
    console.log(err);
    return res.status(400).send({
      success: false,
      message: "Failed",
      error: err,
    });
  }
};

const updateOnHandQuantity = async (LineItems, transaction) => {
  console.log(
    "###########################updateOnHandQuantity###################################"
  );
  let quantity = await helper.getConvertedQuantity(
    LineItems.uomId,
    LineItems.itemMasterId,
    LineItems.quantity
  );

  await WarehouseItem.findOne({
    where: {
      itemMasterId: LineItems.itemMasterId,
      warehouseId: LineItems.warehouseId,
    },
    transaction,
  })
    .then(async (data) => {
      if (data) {
        let onHand = Math.round(parseFloat(data.onHand) - parseFloat(quantity));

        if (onHand < 0) {
          onHand = 0;
        }

        await data
          .update(
            {
              onHand: +onHand,
            },
            {
              transaction,
            }
          )
          .catch((e) => {
            console.log(e);
            throw e;
          });
      } else {
        let warehouseItemData = {
          itemMasterId: LineItems.itemMasterId,
          warehouseId: LineItems.warehouseId,
          price: LineItems.unitPrice,
        };

        await WarehouseItem.create(warehouseItemData, {
          transaction,
        }).catch((e) => {
          console.log(e);
          throw e;
        });
      }
    })
    .catch((e) => {
      console.log(e);
      throw e;
    });
};

const addOIVLData = async (goodsIssue, item, transaction) => {
  console.log(
    "####################################addOIVLData#########################"
  );

  let data = {
    docNum: goodsIssue.docNum,
    docDate: goodsIssue.docDate,
    docType: "GIS",
    documentId: goodsIssue.id,
    itemMasterId: item.itemMasterId,
    warehouseId: item.warehouseId,
    outQty: item.quantity,
    price: item.unitPrice,
    cost: item.unitPrice,
  };

  await OIVL.create(data, {
    transaction,
  }).catch((e) => {
    console.log(e);
    throw e;
  });
};

const updateOIVLData = async (lineItem, goodsIssueId, transaction) => {
  console.log(
    "####################################updateOIVLData#########################"
  );

  const itemMaster = await ItemMaster.findOne({
    where: {
      id: lineItem.itemMasterId,
    },
  });

  if (itemMaster && itemMaster.id)
    switch (itemMaster.managementTypeId) {
      case 1: // Management type is NONE
        await updateOIVLWhenNoManagementType(lineItem, transaction);
        break;
      case 2: // Management type is BATCH WISE
        await updateOIVLWhenBatch(lineItem, goodsIssueId, transaction);
        break;

      case 3: // Management type is SERIALLY NUMBERED
        await updateOIVLWhenSeriallyNumbered(
          lineItem,
          goodsIssueId,
          transaction
        );
        break;
      case 4: // Management type is BATCH WITH BUNDLE
        await updateOIVLWhenBatchWithBundle(
          lineItem,
          goodsIssueId,
          transaction
        );
        break;

      default:
        await updateOIVLWhenNoManagementType(lineItem, transaction);
        break;
    }
};

const updateOIVLWhenBatchWithBundle = async (
  lineItem,
  goodsIssueId,
  transaction
) => {
  console.log(
    "####################################updateOIVLWhenBatchWithBundle#########################"
  );
  if (lineItem && lineItem.OIVLs && lineItem.OIVLs.length > 0) {
    for (let i = 0; i < lineItem.OIVLs.length; i++) {
      const selectedOIVLBundle = lineItem.OIVLs[i];

     let quantityInBaseUnit = await helper.getConvertedQuantity(
        lineItem.uomId,
        lineItem.itemMasterId,
        selectedOIVLBundle.numberOfPieces || 0
      );


      //Update OIVL out quantity
      await OIVL.increment(
        {
          outQty: quantityInBaseUnit,
        },
        {
          where: {
            id: selectedOIVLBundle.oivlId,
          },
          transaction,
        }
      ).catch((e) => {
        console.log(e);
        throw e;
      });

      //Decrement OIVL open quantity
      await OIVL.decrement(
        {
          openQty: quantityInBaseUnit,
        },
        {
          where: {
            id: selectedOIVLBundle.oivlId,
          },
          transaction,
        }
      ).catch((e) => {
        console.log(e);
        throw e;
      });

      //Insert Sales Deliver OIVLs
      await GoodsIssueOIVL.create(
        {
          goodsIssueId,
          oivlId: selectedOIVLBundle.oivlId,
          quantity: quantityInBaseUnit,
        },
        {
          transaction,
        }
      ).catch((e) => {
        console.log(e);
        throw e;
      });

      //Update Bundle Status
      const piecesDiff =
        +selectedOIVLBundle._numberOfPieces -
        +selectedOIVLBundle.numberOfPieces;
      await db.OIVLBundleNumbers.update(
        {
          available: piecesDiff == 0 ? false : true,
          numberOfPieces: piecesDiff,
        },
        {
          where: {
            id: selectedOIVLBundle.id,
          },
          transaction,
        }
      ).catch((e) => {
        console.log(e);
        throw e;
      });

      //Insert goodsIssue Bundles
      await db.GoodsIssueBundles.create(
        {
          goodsIssueId,
          oivlId: selectedOIVLBundle.oivlId,
          oivlBundleId: selectedOIVLBundle.id,
          numberOfPieces: selectedOIVLBundle.numberOfPieces,
        },
        {
          transaction,
        }
      ).catch((e) => {
        throw e;
      });
    }
  } else {
    console.log("No OIVLs selected for an Item which is batch wise managed");
    throw "No OIVLs selected for an Item which is batch wise managed";
  }
};

const updateOIVLWhenNoManagementType = async (lineItem, transaction) => {
  console.log(
    "####################################updateOIVLWhenNoManagementType#########################"
  );
  const oivlObject = await OIVL.findOne({
    where: {
      itemMasterId: lineItem.itemMasterId,
      warehouseId: lineItem.warehouseId,
      openQty: {
        [Op.gt]: 0,
      },
      deleted: false,
    },
    order: [["id", "ASC"]],
  });

  if (!oivlObject) throw "No OIVL found for no batch item!!";

  let quantityInBaseUnit = await helper.getConvertedQuantity(
    lineItem.uomId,
    lineItem.itemMasterId,
    lineItem.quantity
  );

  await oivlObject
    .update(
      {
        outQty: +oivlObject.outQty + +quantityInBaseUnit,
        openQty: +oivlObject.openQty - +quantityInBaseUnit,
      },
      { transaction }
    )
    .catch((e) => {
      console.log(e);
      throw e;
    });
};

const updateOIVLWhenBatch = async (lineItem, goodsIssueId, transaction) => {
  console.log(
    "####################################updateOIVLWhenBatch#########################"
  );
  if (lineItem && lineItem.OIVLs && lineItem.OIVLs.length > 0) {
    for (let i = 0; i < lineItem.OIVLs.length; i++) {
      const selectedOIVL = lineItem.OIVLs[i];

      if (!selectedOIVL.quantity) continue;

      const oivl = await OIVL.findOne({
        where: {
          id: selectedOIVL.oivlId,
          openQty: {
            [Op.gt]: 0,
          },
          deleted: false,
        },
        transaction,
      });

      if (!oivl) throw new Error("OIVL not found!");

      let quantityInBaseUnit = await helper.getConvertedQuantity(
        lineItem.uomId,
        lineItem.itemMasterId,
        selectedOIVL.quantity
      );

      //Update OIVL out quantity and  open quantity
      await oivl
        .update(
          {
            outQty: +oivl.outQty + +quantityInBaseUnit,
            openQty: +oivl.openQty - +quantityInBaseUnit,
          },
          { transaction }
        )
        .catch((e) => {
          console.log(e);
          throw e;
        });

      //Insert Production Issue OIVLs
      await GoodsIssueOIVL.create(
        {
          goodsIssueId: goodsIssueId,
          oivlId: selectedOIVL.oivlId,
          quantity: quantityInBaseUnit,
        },
        {
          transaction,
        }
      ).catch((e) => {
        console.log(e);
        throw e;
      });
    }
  } else {
    console.log("No OIVLs selected for an Item which is batch wise managed");
    throw "No OIVLs selected for an Item which is batch wise managed";
  }
};

const updateOIVLWhenSeriallyNumbered = async (
  lineItem,
  goodsIssueId,
  transaction
) => {
  console.log(
    "####################################updateOIVLWhenSeriallyNumbered#########################"
  );
  if (lineItem && lineItem.OIVLs && lineItem.OIVLs.length > 0) {
    for (let i = 0; i < lineItem.OIVLs.length; i++) {
      const selectedOIVLBarcode = lineItem.OIVLs[i];

      if (!selectedOIVLBarcode.check) break;

      //Update OIVL out quantity
      await OIVL.increment(
        {
          outQty: 1,
        },
        {
          where: {
            id: selectedOIVLBarcode.oivlId,
          },
          transaction,
        }
      ).catch((e) => {
        console.log(e);
        throw e;
      });

      //Decrement OIVL open quantity
      await OIVL.decrement(
        {
          openQty: 1,
        },
        {
          where: {
            id: selectedOIVLBarcode.oivlId,
          },
          transaction,
        }
      ).catch((e) => {
        console.log(e);
        throw e;
      });

      //Update OIVL Barcode status
      await OIVLBarcodes.update(
        {
          available: false,
        },
        {
          where: {
            id: selectedOIVLBarcode.oivlBarcodeId,
          },
          transaction,
        }
      ).catch((e) => {
        console.log(e);
        throw e;
      });

      //Insert Production Issue OIVLs
      await GoodsIssueOIVL.create(
        {
          goodsIssueId: goodsIssueId,
          oivlId: selectedOIVLBarcode.oivlId,
          oivlBarcodeId: selectedOIVLBarcode.oivlBarcodeId,
          quantity: 1,
        },
        {
          transaction,
        }
      ).catch((e) => {
        console.log(e);
        throw e;
      });
    }
  } else {
    console.log(
      "No OIVL Barcodes selected for an Item which is serially numbered"
    );
    throw "No OIVL Barcodes selected for an Item which is serially numbered";
  }
};

const deleteExistingDocument = async (
  goodsIssue,
  LineItems,
  goodsIssueId,
  transaction
) => {
  await deleteGoodsIssue(goodsIssueId, transaction);

  await deleteGoodsIssueOIVLs(goodsIssueId, transaction);

  await deleteOIVLs(goodsIssue, transaction);

  await updateWarehouseItemsOnDelete(
    goodsIssue,
    LineItems,
    goodsIssueId,
    transaction
  );
};

const deleteGoodsIssue = async (goodsIssueId, item, transaction) => {
  const goodsIssueObj = await GoodsIssue.findOne({
    where: {
      id: goodsIssueId,
      deleted: false,
    },
  }).catch((error) => {
    console.log(error);
    return error;
  });

  if (!goodsIssueObj) {
    return "record Not Found";
  }

  goodsIssueObj
    .update(
      {
        deleted: true,
      },
      {
        transaction,
      }
    )
    .catch((e) => console.log(e));
};

const deleteOIVLs = async (goodsIssue, item, transaction) => {
  const existingOIVL = await OIVL.findAll({
    where: {
      docType: {
        [Op.eq]: "GIS",
      },
      docNum: {
        [Op.eq]: goodsIssue.docNum,
      },
      documentId: goodsIssue.id,
      deleted: false,
    },
    attributes: ["id"],
    raw: true,
  }).catch((error) => {
    console.log(error);
    throw error;
  });

  const ids = existingOIVL.map((data) => {
    return data.id;
  });

  for (let i = 0; i < ids.length; i++) {
    const oivlObj = await OIVL.findOne({
      where: {
        id: {
          [Op.eq]: ids[i],
        },
      },
    }).catch((error) => {
      console.log(error);
      throw error;
    });

    oivlObj
      .update(
        {
          deleted: true,
        },
        {
          transaction,
        }
      )
      .catch((error) => {
        console.log(error);
        throw error;
      });
  }
};

const updateWarehouseItemsOnDelete = async (
  goodsIssue,
  LineItems,
  goodsIssueId,
  transaction
) => {
  const goodsIssueItems = await GoodsIssueItem.findAll({
    where: {
      goodsIssueId: {
        [Op.eq]: goodsIssueId,
      },
    },
    attributes: ["itemMasterId", "quantity", "warehouseId"],
    raw: true,
  });

  for (let i = 0; i < goodsIssueItems.length; i++) {
    const item = goodsIssueItems[i];

    await WarehouseItem.findOne({
      where: {
        itemMasterId: item.itemMasterId,
        warehouseId: item.warehouseId,
      },
    })
      .then(async (data) => {
        if (data) {
          let onHand = Math.round(
            parseFloat(data.onHand) + parseFloat(item.quantity)
          );

          if (onHand < 0) {
            onHand = 0;
          }

          await data
            .update(
              {
                onHand: +onHand,
              },
              {
                transaction,
              }
            )
            .catch((error) => {
              console.log(error);
              throw error;
            });
        }
      })
      .catch((error) => {
        console.log(error);
        throw error;
      });
  }
};

const deleteGoodsIssueOIVLs = async (goodsIssueId, transaction) => {
  console.log(
    "############################################deleteGoodsIssueOIVLs##################################"
  );
  const goodsIssueOIVLs = await GoodsIssueOIVL.findAll({
    where: {
      goodsIssueId: goodsIssueId,
    },
    attributes: ["oivlId", "oivlBarcodeId", "quantity", "id"],
    raw: true,
  });

  for (let i = 0; i < goodsIssueOIVLs.length; i++) {
    const item = goodsIssueOIVLs[i];

    if (item.oivlBarcodeId) {
      // Update OIVL Barcode status
      await OIVLBarcodes.update(
        {
          available: true,
        },
        {
          where: {
            id: item.oivlBarcodeId,
          },
        },
        {
          transaction,
        }
      ).catch((e) => {
        console.log(e);
        throw e;
      });
    }

    // Increment OIVL Open Qty
    await OIVL.increment(
      {
        openQty: item.quantity,
      },
      {
        where: {
          id: item.oivlId,
        },
      },
      {
        transaction,
      }
    ).catch((e) => {
      console.log(e);
      throw e;
    });

    // Decrement OIVL Out Qty
    await OIVL.decrement(
      {
        outQty: item.quantity,
      },
      {
        where: {
          id: item.oivlId,
        },
      },
      {
        transaction,
      }
    ).catch((e) => {
      console.log(e);
      throw e;
    });

    // Delete Production Issue OIVL
    await GoodsIssueOIVL.update(
      {
        deletedAt: Moment.now(),
      },
      {
        where: {
          id: item.id,
        },
      },
      {
        transaction,
      }
    ).catch((e) => {
      console.log(e);
      throw e;
    });
  }
};

async function getNextDocumentNumber(type, series) {
  return await TransactionNumber.findOne({
    where: {
      objectCode: {
        [Op.eq]: type,
      },
      series: {
        [Op.eq]: series,
      },
    },
    attributes: ["nextNumber"],
    raw: true,
  })
    .then((res) => {
      if (!res) {
        return res.status(404).send({
          message: "record Not Found",
        });
      }
      return res;
    })
    .catch((error) => {
      console.log(error);
      return error;
    });
}

exports.getOne = async (req, res, next) => {
  const { id } = req.params;

  await GoodsIssue.findOne({
    where: {
      id: {
        [Op.eq]: id,
      },
      deleted: {
        [Op.eq]: false,
      },
    },
    include: [
      {
        model: GoodsIssueItem,
        as: "GoodsIssueItems",
        include: [
          {
            model: ItemMaster,
            as: "ItemMaster",
          },
          {
            model: Warehouse,
            as: "Warehouse",
          },
        ],
      },
      {
        model: Branch,
        as: "Branch",
      },
    ],
  })
    .then((result) => {
      if (!result) {
        return res.status(404).send({
          message: "record Not Found",
          success: false,
        });
      }
      return res.status(200).send({
        goodsIssue: result,
        success: true,
        message: "Success",
      });
    })
    .catch((error) =>
      res.status(400).send({
        error,
        success: false,
        message: "Failed",
      })
    );
};

exports.destroy = async (req, res, next) => {
  const { id } = req.params;

  const goodsIssue = await GoodsIssue.findOne({
    where: {
      id: {
        [Op.eq]: id,
      },
      deleted: {
        [Op.eq]: false,
      },
    },
    include: [
      {
        model: GoodsIssueItem,
        as: "GoodsIssueItems",
      },
    ],
  }).then((result) => {
    return result;
  });

  let transaction = await db.sequelize.transaction().catch((e) => {
    console.log(e);
    throw e;
  });

  if (goodsIssue) {
    try {
      await deleteExistingDocument(
        goodsIssue,
        goodsIssue.GoodsIssueItem,
        goodsIssue.id,
        transaction
      );

      await updateOIVLBundleNumbers(
        goodsIssue,
        transaction
      );

      await transaction.commit();
    } catch (err) {
      // Rollback transaction only if the transaction object is defined
      if (transaction) await transaction.rollback();
      console.log(err);
      return res.status(400).send({
        success: false,
        message: "Failed",
        error: err,
      });
    }
  } else {
    return res.status(400).send({
      success: false,
      message: "Document not found.",
    });
  }

  return res.status(200).send({
    success: true,
    message: "Success",
  });
};

const updateOIVLBundleNumbers = async (
  goodsIssue,
  transaction
) => {

  const existingIssueBundles = await db.GoodsIssueBundles.findAll({
    where: {
      goodsIssueId: goodsIssue.id,
    },
    raw: true,
  }).catch((error) => {
    console.log(error);
    throw error;
  });
  
  const ids = existingIssueBundles.map((data) => {
    return data.oivlBundleId;
  });
 
  for (let i = 0; i < ids.length; i++) {
    const oivlBundleNumbersObj = await OIVLBundleNumbers.findOne({
      where: {
        id: ids[i],
      },
    }).catch((error) => {
      console.log(error);
      throw error;
    });   
    const numberOfPieces = +oivlBundleNumbersObj.numberOfPieces + +existingIssueBundles[i].numberOfPieces;

    await oivlBundleNumbersObj
      .update(
        {
          available: true,
          numberOfPieces: numberOfPieces || 0,
        },
        {
          transaction,
        }
      )
      .catch((error) => {
        console.log(error);
        throw error;
      });
  }
};