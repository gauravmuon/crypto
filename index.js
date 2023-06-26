const axios = require("axios");
const _theGraphApi = "https://api.thegraph.com/subgraphs/name/gauravmuon/cryptobattles";

// this function will fetch passed number of latest rounds data
const fetchRounds = async (roundsCount = 10) => {

  // ordering blocks in descending order and fetching given number of top blocks
  const roundEndedData =
    (await axios.post(_theGraphApi, {
      query: `
        {
          roundEndeds(
            first:${roundsCount + 1},
            orderBy:blockNumber,
            orderDirection:desc
          ){
            poolId,
            timestamp,
            startPrice,
            endPrice,
            indexedPoolId,
            blockNumber
          }
        } 
      `
    }))?.data?.data?.roundEndeds;

  if (roundEndedData.length) {

    // first block will be latest and last will be oldest in roundEndedData list
    const minBlock = roundEndedData[roundEndedData?.length - 1]?.blockNumber;
    const maxBlock = roundEndedData[0]?.blockNumber;

    console.log({ minBlock, maxBlock });

    // fetching all blocks between above two blocks, ie minBlock and maxBlock
    // in descending order of block numbers
    const tradePlacedData =
      (await axios.post(_theGraphApi, {
        query: `
      {
        tradePlaceds(
          orderBy:blockNumber, 
          orderDirection:desc,
  	      where:{blockNumber_gt:${minBlock}}
        ){
            poolId,
            sender,
            amount,
            prediction,
            newTotal,
            indexedPoolId,
            indexedSender,
            avatarUrl,
            countryCode,
            roundStartTime,
            whiteLabelId,
            blockNumber
          }
        } 
      `
      }))?.data?.data?.tradePlaceds;


    const tradeWinningsSentData =
      (await axios.post(_theGraphApi, {
        query: `
        {
          tradeWinningsSents(
            orderBy:blockNumber, 
            orderDirection:desc,
            where:{blockNumber_gt:${minBlock}}
          ){
              blockNumber,
              poolId,
              sender,
              tradeAmount,
              winningsAmount,
              indexedSender,
              whiteLabelId
            }
          } 
        `
      }))?.data?.data?.tradeWinningsSents;

    // using two pointer technique for assigning blocks of tradePlacedData
    // falling in between two blocks window of roundEndedData
    let [i, j] = [roundEndedData.length - 1, tradePlacedData.length - 1];
    if (i > 0) {
      while (i >= 0) {
        roundEndedData[i].trades = [];
        while (j >= 0) {
          if (parseInt(tradePlacedData[j]?.blockNumber) < parseInt(roundEndedData[i]?.blockNumber)) {
            roundEndedData[i].trades.push(tradePlacedData[j--]);
          } else {
            i--;
            break;
          }
        }
      }
    }

    // using two pointer technique for assigning blocks of tradeWinningsSentData
    // falling in between two blocks window of roundEndedData
    [i, j] = [roundEndedData.length - 1, tradeWinningsSentData.length - 1];
    if (i > 0) {
      while (i > 0) {
        roundEndedData[i].winners = [];
        while (j >= 0) {
          if (parseInt(tradeWinningsSentData[j]?.blockNumber) < parseInt(roundEndedData[i - 1]?.blockNumber)) {
            roundEndedData[i].winners.push(tradeWinningsSentData[j--]);
          } else {
            i--;
            break;
          }
        }
      }
    }
    // pushing remaining entries in the first element of roundEndedData
    if (i == 0) {
      roundEndedData[i].winners = [];
      while (j >= 0) {
        roundEndedData[i].winners.push(tradeWinningsSentData[j--]);
      }
    }
    // console.log(tradePlacedData);
  }
  // deleting last entry, it was considered for boundries(edge case handling)
  roundEndedData.splice(roundEndedData.length - 1);
  // add extra filed of bet results, which is can be calculated using start and end bet price
  roundEndedData?.forEach(data => data.winner = data.startPrice > data.endPrice ? "DOWN" : "UP");
  roundEndedData?.forEach(data => data.ist = new Date(Math.trunc(data.timestamp / 1000)).toString());


  // console.log(roundEndedData.map(d => d.trades));
  // console.log(roundEndedData.map(d => d.winners));
  console.log(roundEndedData);
};

fetchRounds(1);
