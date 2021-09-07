const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('fast-csv');
const fs = require('fs');

const upload = multer({ dest: '/tmp/' });

router.post('/api/trade', upload.single('trades'), function (req, res) {
  const tradesRows = [];

  // open uploaded file
  csv.fromPath(req.file.path)
      .on("data", function (data) {
          tradesRows.push(data); // push each row
      })
      .on("end", function () {
        // console.log(tradesRows)
        console.log("file arrived")
        fs.unlinkSync(req.file.path);   // remove temp file
        processTrades(tradesRows)
            .then((retData) => res.json(retData))
            .catch((err) => res.status(500).send(err));
      })
});

const getRate = async () => {
    // TODO - all these api calls require signup. i decided to skip it
    // the code bellow is an example on doing it if i had the key
    // const axios = require('axios');
    // const response = await axios.get('https://api.get-exchange-rates?api_key=MY-KEY')
    // return response.rate
    return Math.random() + 1
}
const processTrades = async (trades) => {

    // TODO handle corrupted csv file

    // remove header
    trades = trades.slice(1)
    const rate = await getRate()

    const data = trades.map((trade) => {
            const id = trade[0];
            const type = trade[1].toLowerCase();
            const price = Number(trade[2]);
            const amount = Number(trade[3]);
            let status = "Executed"
            if (type === "buy" && price <= rate)
                status = "Denied"
            else if (type === "sell" && price >= rate)
                status = "Denied"
            else if (type === "market") // TODO
                status = "Next Version"

            const ret = {[id]:{}}
            if (status === "Executed") {
                ret[id] = {
                    "status": status,
                    "amount": amount,
                    "price" : price,
                    "total" : amount * (1 + rate - price)
                }
            }
            else {
                ret[id] = {
                    "status": status
                }
            }
            return ret;
        }
    )

    return data
}

router.get('/api/get-rate', async function(req, res, next) {
    const rate = await getRate()
    res.json({ rate: rate });
});

module.exports = router;


