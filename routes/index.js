var express = require("express");
var router = express.Router();

const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const db = require("../models/index");
const ItemMaster = require("../models").ItemMaster;
const ProductionOrder = require("../models").ProductionOrder;
const ProductionIssue = require("../models").ProductionIssue;
const ProductionIssueOIVLs = require("../models").ProductionIssueOIVLs;
const OIVLBarcodes = require("../models").OIVLBarcodes;
const OIVL = require("../models").OIVL;
const UOM = require("../models").UOM;
const trim = require("../helpers/helper").trim;
const moment = require("moment");

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});

router.get("/print/barcode/item/:id", async function (req, res, next) {
  try {
    const id = req.param("id");
    const ids = JSON.parse(req.param("ids"));
    const pageCount = req.param("pageCount") || 1;
    const typeId = req.param("typeId");
    if ((ids, pageCount)) {
      const item = await ItemMaster.findOne({
        where: {
          id: {
            [Op.eq]: id,
          },
        },
        include: [
          {
            model: OIVL,
            where: {
              id: {
                [Sequelize.Op.in]: ids,
              },
            },
            required: false,
          },
          {
            model: UOM,
            as: "InventoryUOM",
            required: false,
          },
        ],
      }).then(function (data) {
        return data.toJSON();
      });

      let printData = Array.from({ length: pageCount }).fill(item.OIVLs);
      printData = [].concat.apply([], printData);

      if (printData.length == 0) {
        throw { message: "No barcode found" };
      }

      item.printData = printData;
      res.render("print/print1", { data: item, moment, trim });
    }
  } catch (error) {
    return res.status(400).send({
      error: error.message,
    });
  }
});

router.get(
  "/print/barcode/productionOrder/:id",
  async function (req, res, next) {
    try {
      const id = req.param("id");
      const ids = JSON.parse(req.param("ids"));
      
      if (ids) {
        const productionOrder = await ProductionOrder.findOne({
          where: {
            id: {
              [Op.eq]: id,
            },
          },
          include: [
            {
              model: db.OIVLBundleNumbers,
              attributes: [
                "id",
                "productionOrderId",
                "productionReceiptId",
                "bundleNumber",
                "numberOfPieces",
                "available",
              ],
              include: [
                {
                  model: db.OIVL,
                  attributes: ["docDate"],
                },
                {
                  model: db.ProductionReceipt,
                  attributes: ["series", "docNum", "docDate"],
                },
              ],
              // where: {
              //     available: true
              // },
              required: false,
            },
            {
              model: ProductionIssue,
              attributes: ["id"],
              include: [
                {
                  model: ProductionIssueOIVLs,
                  attributes: ["oivlId", "oivlBarcodeId"],
                  include: [
                    {
                      model: OIVL,
                      attributes: ["itemMasterId", "barcode"],
                      include: {
                        model: ItemMaster,
                        attributes: ["code", "name"],
                        as: "ItemMaster",
                      },
                    },
                    {
                      model: OIVLBarcodes,
                      attributes: ["itemMasterId", "barcode"],
                      include: {
                        model: ItemMaster,
                        attributes: ["code", "name"],
                      },
                    },
                  ],
                },
              ],
            },
            {
              model: ItemMaster,
              include: {
                model: UOM,
                as: "InventoryUOM",
                attributes: ["code", "name"],
              },
            },
          ],
        }).then(function (data) {
          return data.toJSON();
        });

        let selectedRow = productionOrder.OIVLBundleNumbers.filter((_a) =>
          ids.includes(_a.id)
        );
        const coilNo = productionOrder.ProductionIssues.map((_a) =>
          _a.ProductionIssueOIVLs.map((_b) => _b.OIVL.barcode).filter(
            (_c) => _c
          )
        );
        selectedRow.map((_a) => {
          _a.ItemMaster = productionOrder.ItemMaster;
          if (coilNo) {
            _a.coilNo = coilNo.join();
          } else {
            _a.coilNo = "";
          }
        });
        console.log(selectedRow);
        res.render("print/print2", { data: selectedRow, moment, trim });
      }
    } catch (error) {
      return res.status(400).send({
        error: error.message,
      });
    }
  }
);

module.exports = router;
