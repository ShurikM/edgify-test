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

const calculate = (amount, rate, price) => {
    // TODO: not sure what is the correct equations
    // return amount * (1 + rate - price)
    return amount * rate
}
const processTrades = async (trades) => {

    // TODO handle corrupted csv file

    // remove header
    trades = trades.slice(1)

    // prepare data
    console.log('processing arrived data');
    const trades2 = trades.map((trade) => {
        const id = trade[0];
        const type = trade[1].toLowerCase();
        const price = trade[2];
        const allAmount = Number(trade[3]);
        const leftAmount = Number(trade[3]);
        const isMarket = trade[2].toLowerCase() === "market"
        return {
            status:'new',
            isMarket:isMarket,
            id: id,
            type: type,
            price: price,
            allAmount: allAmount,
            leftAmount: leftAmount,
        }
    })

    // first process all new market request
    console.log('processing market requests');
    const trades3 = trades2.map((t) => {
        if (t.status === 'new' && t.isMarket) {

            let neededOp = 'buy'
            if (t.type === "buy") neededOp = 'sell'

            // any operations available
            const available = trades2
                .filter((t) => t.status === 'new' && t.type === neededOp)
                .sort((t1,t2) => Number(t1.price) - Number(t2.price))

            // will amount be sufficient?
            if (available.length === 0 || available.map((t) => t.leftAmount)
                .reduce((partial_sum, a) => partial_sum + a,0) < t.allAmount) {
                t.status = "Denied"
                return t
            }

            // reduce the needed amount from the operations
            const prices = []
            available.map((a) => {
                if (t.leftAmount === 0) return a
                const minVal = Math.min(a.leftAmount, t.leftAmount)
                a.leftAmount -= minVal;
                t.leftAmount -= minVal;
                prices.push([minVal, a.price, a.id])

                // this was not clear what to do with half used operation
                a.rate = a.price
                a.status = "Executed"
            })

            // reaching this point t.leftAmount should be 0
            t.status = "Executed"
            const fullSum = prices.reduce((partial_sum, a) => partial_sum + a[0],0)
            t.rate = prices.reduce((partialRate,p) => partialRate + p[0]*p[1],0) / fullSum;
            t.orders = prices
        }
        return t
    })

    // process rest of new request
    console.log('processing non market requests');
    const rate = await getRate()
    const trades4 = trades3.map((t) => {
        if (t.status === 'new') {
            let status = "Executed"
            if (t.type === "buy" && t.price <= rate)
                status = "Denied"
            else if (t.type === "sell" && t.price >= rate)
                status = "Denied"

            t.status = status
            t.rate = rate
        }
        return t
    })

    // prepare response
    console.log('preparing response');
    const trades5 = trades4.map((t) => {
        const ret = {[t.id]: {}}
        if (t.status === "Executed") {
            ret[t.id] = {
                "status": t.status,
                "amount": t.allAmount,
                "price": t.price,
                "total": calculate(t.allAmount, t.rate, t.price)
            }
            if (t.isMarket)
                ret[t.id]['orders'] = t.orders
        } else {
            ret[t.id] = {
                "status": t.status
            }
        }
        return ret;
    })

    console.log('sending response');
    return trades5;
}

router.get('/api/get-rate', async function(req, res, next) {
    const rate = await getRate()
    res.json({ rate: rate });
});

module.exports = router;


